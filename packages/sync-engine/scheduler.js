// Sync Engine - Scheduler Module
// Handles automatic sync scheduling and background operations

const { getDatabase } = require('../database/connection');
const SyncPush = require('./push');
const SyncPull = require('./pull');
const ConflictResolution = require('./conflict');

class SyncScheduler {
  constructor(supabaseUrl, supabaseKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.db = getDatabase();
    this.pushEngine = new SyncPush(supabaseUrl, supabaseKey);
    this.pullEngine = new SyncPull(supabaseUrl, supabaseKey);
    this.conflictResolver = new ConflictResolution();
    
    this.isRunning = false;
    this.syncInterval = null;
    this.currentSyncInterval = 300000; // 5 minutes default
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncStatus: null,
      lastSyncError: null
    };
  }

  // Start the sync scheduler
  async start() {
    if (this.isRunning) {
      console.log('Sync scheduler is already running');
      return;
    }

    try {
      // Load settings from database
      await this.loadSettings();
      
      // Set up interval
      this.syncInterval = setInterval(async () => {
        await this.performScheduledSync();
      }, this.currentSyncInterval);
      
      this.isRunning = true;
      console.log(`Sync scheduler started with ${this.currentSyncInterval/1000} second interval`);
      
      // Perform initial sync
      await this.performScheduledSync();
      
    } catch (error) {
      console.error('Failed to start sync scheduler:', error);
      throw error;
    }
  }

  // Stop the sync scheduler
  async stop() {
    if (!this.isRunning) {
      console.log('Sync scheduler is not running');
      return;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isRunning = false;
    console.log('Sync scheduler stopped');
  }

  // Load sync settings from database
  async loadSettings() {
    try {
      const setting = await this.db.get(
        'SELECT value FROM settings WHERE key = ?',
        ['sync_interval']
      );
      
      if (setting && setting.value) {
        const intervalSeconds = parseInt(setting.value);
        if (intervalSeconds > 0) {
          this.currentSyncInterval = intervalSeconds * 1000;
        }
      }
      
      // Load last sync time
      const lastSync = await this.db.get(`
        SELECT created_at FROM sync_log 
        WHERE operation IN ('push', 'pull') AND status = 'success'
        ORDER BY created_at DESC LIMIT 1
      `);
      
      if (lastSync) {
        this.lastSyncTime = lastSync.created_at;
      }
      
    } catch (error) {
      console.error('Failed to load sync settings:', error);
      // Use defaults
    }
  }

  // Update sync interval
  async updateSyncInterval(intervalSeconds) {
    if (intervalSeconds < 30) {
      throw new Error('Sync interval must be at least 30 seconds');
    }
    
    this.currentSyncInterval = intervalSeconds * 1000;
    
    // Save to database
    await this.db.run(
      'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [intervalSeconds.toString(), 'sync_interval']
    );
    
    // Restart scheduler with new interval
    if (this.isRunning) {
      await this.stop();
      await this.start();
    }
    
    console.log(`Sync interval updated to ${intervalSeconds} seconds`);
  }

  // Perform scheduled sync
  async performScheduledSync() {
    if (!this.isRunning) {
      return;
    }

    const syncId = `sync_${Date.now()}`;
    console.log(`Starting scheduled sync: ${syncId}`);
    
    try {
      // Check connectivity
      const isConnected = await this.pushEngine.checkConnectivity();
      if (!isConnected) {
        console.log('No connectivity, skipping sync');
        return;
      }

      // Perform sync
      const result = await this.executeSyncCycle();
      
      // Update stats
      this.syncStats.totalSyncs++;
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSyncStatus = 'success';
      this.syncStats.lastSyncError = null;
      this.lastSyncTime = new Date().toISOString();
      
      // Auto-resolve low severity conflicts
      await this.autoResolveConflicts();
      
      console.log(`Scheduled sync completed: ${syncId}`, result);
      
    } catch (error) {
      console.error(`Scheduled sync failed: ${syncId}`, error);
      
      // Update stats
      this.syncStats.totalSyncs++;
      this.syncStats.failedSyncs++;
      this.syncStats.lastSyncStatus = 'failed';
      this.syncStats.lastSyncError = error.message;
      
      // Log error
      await this.logSyncError('scheduled_sync', error.message);
    }
  }

  // Execute full sync cycle
  async executeSyncCycle() {
    const results = {
      push: null,
      pull: null,
      conflicts: [],
      duration: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Step 1: Push local changes
      console.log('Pushing local changes...');
      results.push = await this.pushEngine.pushAll();
      
      // Step 2: Pull remote changes
      console.log('Pulling remote changes...');
      results.pull = await this.pullEngine.pullAll(this.lastSyncTime);
      
      // Step 3: Detect and resolve conflicts
      console.log('Checking for conflicts...');
      results.conflicts = await this.detectAndResolveConflicts();
      
      results.duration = Date.now() - startTime;
      
      return results;
      
    } catch (error) {
      results.duration = Date.now() - startTime;
      throw error;
    }
  }

  // Detect and resolve conflicts
  async detectAndResolveConflicts() {
    const conflicts = await this.conflictResolver.getUnresolvedConflicts();
    const results = { resolved: 0, failed: 0, remaining: conflicts.length };
    
    if (conflicts.length === 0) {
      return results;
    }
    
    console.log(`Found ${conflicts.length} conflicts`);
    
    // Auto-resolve low severity conflicts
    const autoResolveResult = await this.conflictResolver.autoResolveLowSeverityConflicts();
    results.resolved += autoResolveResult.resolved;
    results.failed += autoResolveResult.failed;
    
    // For remaining conflicts, use latest wins strategy
    const remainingConflicts = conflicts.filter(c => 
      c.details.severity !== 'low'
    );
    
    for (const conflict of remainingConflicts) {
      try {
        await this.conflictResolver.resolveConflict(conflict, 'latest');
        results.resolved++;
      } catch (error) {
        results.failed++;
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
      }
    }
    
    results.remaining = conflicts.length - results.resolved - results.failed;
    
    return results;
  }

  // Auto-resolve conflicts
  async autoResolveConflicts() {
    try {
      const result = await this.conflictResolver.autoResolveLowSeverityConflicts();
      
      if (result.resolved > 0) {
        console.log(`Auto-resolved ${result.resolved} low-severity conflicts`);
      }
      
      if (result.failed > 0) {
        console.warn(`Failed to auto-resolve ${result.failed} conflicts`);
      }
      
      return result;
    } catch (error) {
      console.error('Auto-conflict resolution failed:', error);
      return { resolved: 0, failed: 0, errors: [error.message] };
    }
  }

  // Force immediate sync
  async forceSync(options = {}) {
    console.log('Starting forced sync...');
    
    const startTime = Date.now();
    
    try {
      // Check connectivity
      const isConnected = await this.pushEngine.checkConnectivity();
      if (!isConnected) {
        throw new Error('No connectivity available');
      }

      let result;
      
      if (options.direction === 'push') {
        result = { push: await this.pushEngine.pushAll(), pull: null };
      } else if (options.direction === 'pull') {
        result = { push: null, pull: await this.pullEngine.pullAll(this.lastSyncTime) };
      } else {
        result = await this.executeSyncCycle();
      }
      
      result.duration = Date.now() - startTime;
      
      // Update stats
      this.syncStats.totalSyncs++;
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSyncStatus = 'success';
      this.syncStats.lastSyncError = null;
      this.lastSyncTime = new Date().toISOString();
      
      console.log('Forced sync completed:', result);
      return result;
      
    } catch (error) {
      // Update stats
      this.syncStats.totalSyncs++;
      this.syncStats.failedSyncs++;
      this.syncStats.lastSyncStatus = 'failed';
      this.syncStats.lastSyncError = error.message;
      
      console.error('Forced sync failed:', error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const [pushStatus, pullStatus, conflictStats, pendingCounts] = await Promise.all([
        this.pushEngine.getSyncStatus(),
        this.pullEngine.getSyncStatus(),
        this.conflictResolver.getConflictStats(),
        this.getPendingCounts()
      ]);
      
      return {
        scheduler: {
          isRunning: this.isRunning,
          interval: this.currentSyncInterval / 1000,
          lastSyncTime: this.lastSyncTime,
          stats: this.syncStats
        },
        push: pushStatus,
        pull: pullStatus,
        conflicts: conflictStats,
        pending: pendingCounts
      };
      
    } catch (error) {
      return {
        scheduler: {
          isRunning: this.isRunning,
          interval: this.currentSyncInterval / 1000,
          lastSyncTime: this.lastSyncTime,
          stats: this.syncStats,
          error: error.message
        },
        push: { isConnected: false, error: error.message },
        pull: { isConnected: false, error: error.message },
        conflicts: [],
        pending: { total: 0 }
      };
    }
  }

  // Get pending records count
  async getPendingCounts() {
    try {
      const [products, sales, inventory] = await Promise.all([
        this.db.get("SELECT COUNT(*) as count FROM products WHERE sync_status = 'pending'"),
        this.db.get("SELECT COUNT(*) as count FROM sales WHERE sync_status = 'pending'"),
        this.db.get("SELECT COUNT(*) as count FROM inventory_transactions WHERE sync_status = 'pending'")
      ]);
      
      return {
        products: products.count,
        sales: sales.count,
        inventory: inventory.count,
        total: products.count + sales.count + inventory.count
      };
      
    } catch (error) {
      return { products: 0, sales: 0, inventory: 0, total: 0 };
    }
  }

  // Get sync history
  async getSyncHistory(limit = 50) {
    try {
      const query = `
        SELECT operation, table_name, record_id, status, error_message, created_at
        FROM sync_log
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      return await this.db.all(query, [limit]);
      
    } catch (error) {
      return [];
    }
  }

  // Get sync statistics
  async getSyncStatistics(days = 30) {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          operation,
          status,
          COUNT(*) as count
        FROM sync_log
        WHERE created_at >= DATE('now', '-${days} days')
        GROUP BY DATE(created_at), operation, status
        ORDER BY date DESC
      `;
      
      return await this.db.all(query);
      
    } catch (error) {
      return [];
    }
  }

  // Log sync error
  async logSyncError(operation, errorMessage) {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        INSERT INTO sync_log (
          id, operation, table_name, record_id, status, error_message, store_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.db.run(query, [
        logId,
        operation,
        'system',
        null,
        'error',
        errorMessage,
        'default-store'
      ]);
    } catch (error) {
      console.error('Failed to log sync error:', error);
    }
  }

  // Cleanup old sync logs
  async cleanupSyncLogs(daysToKeep = 90) {
    try {
      const query = `
        DELETE FROM sync_log 
        WHERE created_at < DATE('now', '-${daysToKeep} days')
      `;
      
      const result = await this.db.run(query);
      console.log(`Cleaned up ${result.changes} old sync log entries`);
      
      return result.changes;
      
    } catch (error) {
      console.error('Failed to cleanup sync logs:', error);
      return 0;
    }
  }

  // Export sync configuration
  async exportConfig() {
    return {
      scheduler: {
        isRunning: this.isRunning,
        interval: this.currentSyncInterval / 1000
      },
      supabase: {
        url: this.supabaseUrl,
        hasKey: !!this.supabaseKey
      },
      stats: this.syncStats
    };
  }

  // Import sync configuration
  async importConfig(config) {
    try {
      if (config.scheduler.interval) {
        await this.updateSyncInterval(config.scheduler.interval);
      }
      
      if (config.scheduler.isRunning !== this.isRunning) {
        if (config.scheduler.isRunning) {
          await this.start();
        } else {
          await this.stop();
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import sync config:', error);
      return false;
    }
  }

  // Health check
  async healthCheck() {
    const checks = {
      scheduler: this.isRunning,
      database: false,
      connectivity: false,
      lastSync: this.lastSyncTime,
      pendingCount: 0
    };
    
    try {
      // Check database
      await this.db.get('SELECT 1');
      checks.database = true;
      
      // Check connectivity
      checks.connectivity = await this.pushEngine.checkConnectivity();
      
      // Get pending count
      const pending = await this.getPendingCounts();
      checks.pendingCount = pending.total;
      
    } catch (error) {
      console.error('Health check failed:', error);
    }
    
    return checks;
  }
}

module.exports = SyncScheduler;
