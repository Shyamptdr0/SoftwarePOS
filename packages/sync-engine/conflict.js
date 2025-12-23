// Sync Engine - Conflict Resolution Module
// Handles conflict detection and resolution strategies

const { getDatabase } = require('../database/connection');
const ProductQueries = require('../database/queries/products');
const SalesQueries = require('../database/queries/sales');
const InventoryQueries = require('../database/queries/inventory');

class ConflictResolution {
  constructor() {
    this.db = getDatabase();
    this.productQueries = new ProductQueries();
    this.salesQueries = new SalesQueries();
    this.inventoryQueries = new InventoryQueries();
  }

  // Detect conflicts between local and remote records
  async detectConflicts(localRecords, remoteRecords, tableName) {
    const conflicts = [];
    
    // Create maps for easier lookup
    const localMap = new Map(localRecords.map(record => [record.id, record]));
    const remoteMap = new Map(remoteRecords.map(record => [record.id, record]));
    
    // Find records that exist in both but have differences
    for (const [id, localRecord] of localMap) {
      const remoteRecord = remoteMap.get(id);
      
      if (remoteRecord) {
        const conflict = await this.analyzeRecordConflict(localRecord, remoteRecord, tableName);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }

  // Analyze conflict between two records
  async analyzeRecordConflict(localRecord, remoteRecord, tableName) {
    const localTimestamp = new Date(localRecord.updated_at || localRecord.created_at);
    const remoteTimestamp = new Date(remoteRecord.updated_at || remoteRecord.created_at);
    
    // If timestamps are the same but records differ, it's a conflict
    if (Math.abs(localTimestamp - remoteTimestamp) < 1000) {
      const differences = this.findRecordDifferences(localRecord, remoteRecord);
      
      if (differences.length > 0) {
        return {
          type: 'timestamp_conflict',
          tableName,
          recordId: localRecord.id,
          localRecord,
          remoteRecord,
          differences,
          severity: this.calculateConflictSeverity(differences),
          timestamp: localTimestamp
        };
      }
    }
    
    // If records were updated around the same time (within 5 minutes)
    if (Math.abs(localTimestamp - remoteTimestamp) < 300000) {
      const differences = this.findRecordDifferences(localRecord, remoteRecord);
      
      if (differences.length > 0) {
        return {
          type: 'near_simultaneous_conflict',
          tableName,
          recordId: localRecord.id,
          localRecord,
          remoteRecord,
          differences,
          severity: this.calculateConflictSeverity(differences),
          localTimestamp,
          remoteTimestamp
        };
      }
    }
    
    return null;
  }

  // Find differences between two records
  findRecordDifferences(localRecord, remoteRecord) {
    const differences = [];
    const allKeys = new Set([...Object.keys(localRecord), ...Object.keys(remoteRecord)]);
    
    for (const key of allKeys) {
      const localValue = localRecord[key];
      const remoteValue = remoteRecord[key];
      
      // Skip system fields that shouldn't be compared
      if (['sync_status', 'id'].includes(key)) {
        continue;
      }
      
      // Compare values (handle null/undefined)
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        differences.push({
          field: key,
          localValue,
          remoteValue,
          type: this.getFieldType(key),
          impact: this.getFieldImpact(key)
        });
      }
    }
    
    return differences;
  }

  // Calculate conflict severity based on differences
  calculateConflictSeverity(differences) {
    let severity = 'low';
    
    for (const diff of differences) {
      if (diff.impact === 'critical') {
        severity = 'critical';
        break;
      } else if (diff.impact === 'high' && severity !== 'critical') {
        severity = 'high';
      } else if (diff.impact === 'medium' && severity === 'low') {
        severity = 'medium';
      }
    }
    
    return severity;
  }

  // Get field type for conflict resolution
  getFieldType(fieldName) {
    const numericFields = ['cost_price', 'selling_price', 'tax_rate', 'stock_quantity', 
                          'subtotal', 'total_amount', 'quantity', 'discount_amount'];
    
    const dateFields = ['created_at', 'updated_at'];
    
    const booleanFields = ['is_active'];
    
    if (numericFields.includes(fieldName)) return 'numeric';
    if (dateFields.includes(fieldName)) return 'date';
    if (booleanFields.includes(fieldName)) return 'boolean';
    return 'text';
  }

  // Get field impact level
  getFieldImpact(fieldName) {
    const criticalFields = ['id', 'sku', 'bill_number'];
    const highFields = ['selling_price', 'total_amount', 'quantity', 'stock_quantity'];
    const mediumFields = ['cost_price', 'tax_rate', 'discount_amount', 'payment_status'];
    
    if (criticalFields.includes(fieldName)) return 'critical';
    if (highFields.includes(fieldName)) return 'high';
    if (mediumFields.includes(fieldName)) return 'medium';
    return 'low';
  }

  // Resolve conflict using specified strategy
  async resolveConflict(conflict, strategy = 'latest') {
    switch (strategy) {
      case 'latest':
        return await this.resolveWithLatest(conflict);
      case 'local':
        return await this.resolveWithLocal(conflict);
      case 'remote':
        return await this.resolveWithRemote(conflict);
      case 'merge':
        return await this.resolveWithMerge(conflict);
      case 'manual':
        return await this.markForManualResolution(conflict);
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  // Resolve conflict by using latest timestamp
  async resolveWithLatest(conflict) {
    const { localRecord, remoteRecord, tableName, recordId } = conflict;
    
    const localTimestamp = new Date(localRecord.updated_at || localRecord.created_at);
    const remoteTimestamp = new Date(remoteRecord.updated_at || remoteRecord.created_at);
    
    if (localTimestamp > remoteTimestamp) {
      // Local is newer, keep local and mark remote as outdated
      await this.updateLocalSyncStatus(recordId, tableName, 'pending');
      return { resolution: 'local_wins', action: 'push_local' };
    } else {
      // Remote is newer, update local with remote data
      await this.updateLocalWithRemote(recordId, tableName, remoteRecord);
      return { resolution: 'remote_wins', action: 'pull_remote' };
    }
  }

  // Resolve conflict by keeping local version
  async resolveWithLocal(conflict) {
    const { recordId, tableName } = conflict;
    
    await this.updateLocalSyncStatus(recordId, tableName, 'pending');
    return { resolution: 'local_wins', action: 'push_local' };
  }

  // Resolve conflict by keeping remote version
  async resolveWithRemote(conflict) {
    const { recordId, tableName, remoteRecord } = conflict;
    
    await this.updateLocalWithRemote(recordId, tableName, remoteRecord);
    return { resolution: 'remote_wins', action: 'pull_remote' };
  }

  // Resolve conflict by merging records
  async resolveWithMerge(conflict) {
    const { localRecord, remoteRecord, tableName, recordId, differences } = conflict;
    
    const mergedRecord = await this.mergeRecords(localRecord, remoteRecord, differences);
    
    await this.updateLocalWithMerged(recordId, tableName, mergedRecord);
    
    return { 
      resolution: 'merged', 
      action: 'push_merged',
      mergedRecord,
      appliedMerges: differences.length
    };
  }

  // Merge two records intelligently
  async mergeRecords(localRecord, remoteRecord, differences) {
    const merged = { ...localRecord };
    
    for (const diff of differences) {
      const { field, localValue, remoteValue, type } = diff;
      
      switch (type) {
        case 'numeric':
          // For numeric fields, use the higher value for prices, sum for quantities
          if (field.includes('price') || field.includes('amount')) {
            merged[field] = Math.max(localValue, remoteValue);
          } else if (field.includes('quantity') || field.includes('stock')) {
            merged[field] = Math.max(localValue, remoteValue);
          } else {
            merged[field] = remoteValue; // Default to remote
          }
          break;
          
        case 'date':
          // Use the latest date
          merged[field] = new Date(Math.max(
            new Date(localValue), 
            new Date(remoteValue)
          )).toISOString();
          break;
          
        case 'boolean':
          // For booleans, true takes precedence
          merged[field] = localValue || remoteValue;
          break;
          
        case 'text':
          // For text fields, if local is empty, use remote, otherwise keep local
          merged[field] = localValue && localValue.trim() !== '' ? localValue : remoteValue;
          break;
          
        default:
          merged[field] = remoteValue;
      }
    }
    
    // Update the timestamp
    merged.updated_at = new Date().toISOString();
    
    return merged;
  }

  // Mark conflict for manual resolution
  async markForManualResolution(conflict) {
    const { recordId, tableName } = conflict;
    
    await this.updateLocalSyncStatus(recordId, tableName, 'conflict');
    
    // Store conflict details for manual review
    await this.storeConflictDetails(conflict);
    
    return { resolution: 'manual', action: 'requires_manual_intervention' };
  }

  // Update local record sync status
  async updateLocalSyncStatus(recordId, tableName, status) {
    const query = `UPDATE ${tableName} SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.db.run(query, [status, recordId]);
  }

  // Update local record with remote data
  async updateLocalWithRemote(recordId, tableName, remoteRecord) {
    await this.db.beginTransaction();
    
    try {
      switch (tableName) {
        case 'products':
          await this.productQueries.update(recordId, this.transformRemoteProduct(remoteRecord));
          break;
        case 'sales':
          await this.salesQueries.update(recordId, this.transformRemoteSale(remoteRecord));
          break;
        case 'inventory_transactions':
          // Transactions are immutable, don't update
          break;
        default:
          throw new Error(`Unknown table for update: ${tableName}`);
      }
      
      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Update local record with merged data
  async updateLocalWithMerged(recordId, tableName, mergedRecord) {
    await this.db.beginTransaction();
    
    try {
      switch (tableName) {
        case 'products':
          await this.productQueries.update(recordId, this.transformRemoteProduct(mergedRecord));
          break;
        case 'sales':
          await this.salesQueries.update(recordId, this.transformRemoteSale(mergedRecord));
          break;
        default:
          throw new Error(`Unknown table for update: ${tableName}`);
      }
      
      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Transform remote product for local update
  transformRemoteProduct(remoteProduct) {
    return {
      sku: remoteProduct.sku,
      barcode: remoteProduct.barcode,
      name: remoteProduct.name,
      description: remoteProduct.description,
      categoryId: remoteProduct.category_id,
      costPrice: remoteProduct.cost_price,
      sellingPrice: remoteProduct.selling_price,
      taxRate: remoteProduct.tax_rate,
      stockQuantity: remoteProduct.stock_quantity,
      minStockLevel: remoteProduct.min_stock_level,
      unit: remoteProduct.unit,
      imageUrl: remoteProduct.image_url,
      isActive: remoteProduct.is_active,
      storeId: remoteProduct.store_id
    };
  }

  // Transform remote sale for local update
  transformRemoteSale(remoteSale) {
    return {
      billNumber: remoteSale.bill_number,
      customerName: remoteSale.customer_name,
      customerPhone: remoteSale.customer_phone,
      subtotal: remoteSale.subtotal,
      discountAmount: remoteSale.discount_amount,
      taxAmount: remoteSale.tax_amount,
      totalAmount: remoteSale.total_amount,
      paymentMethod: remoteSale.payment_method,
      paymentStatus: remoteSale.payment_status,
      staffId: remoteSale.staff_id,
      notes: remoteSale.notes,
      storeId: remoteSale.store_id
    };
  }

  // Store conflict details for manual review
  async storeConflictDetails(conflict) {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
      INSERT INTO sync_log (
        id, operation, table_name, record_id, status, error_message, store_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      conflictId,
      'conflict',
      conflict.tableName,
      conflict.recordId,
      'conflict',
      JSON.stringify({
        type: conflict.type,
        severity: conflict.severity,
        differences: conflict.differences,
        localTimestamp: conflict.localTimestamp || conflict.timestamp,
        remoteTimestamp: conflict.remoteTimestamp
      }),
      'default-store'
    ]);
  }

  // Get all unresolved conflicts
  async getUnresolvedConflicts() {
    const query = `
      SELECT * FROM sync_log 
      WHERE operation = 'conflict' AND status = 'conflict'
      ORDER BY created_at DESC
    `;
    
    const conflicts = await this.db.all(query);
    
    // Parse conflict details
    return conflicts.map(conflict => ({
      ...conflict,
      details: JSON.parse(conflict.error_message)
    }));
  }

  // Resolve conflict manually with user input
  async resolveManually(conflictId, resolution) {
    try {
      const conflict = await this.db.get(
        'SELECT * FROM sync_log WHERE id = ? AND operation = "conflict"',
        [conflictId]
      );
      
      if (!conflict) {
        throw new Error('Conflict not found');
      }
      
      const details = JSON.parse(conflict.error_message);
      
      // Apply the user's resolution
      switch (resolution.action) {
        case 'keep_local':
          await this.updateLocalSyncStatus(conflict.record_id, conflict.table_name, 'pending');
          break;
        case 'keep_remote':
          // Would need remote record data here
          await this.updateLocalSyncStatus(conflict.record_id, conflict.table_name, 'pending');
          break;
        case 'merge':
          // Apply merged data
          await this.updateLocalSyncStatus(conflict.record_id, conflict.table_name, 'pending');
          break;
        default:
          throw new Error('Invalid resolution action');
      }
      
      // Mark conflict as resolved
      await this.db.run(
        'UPDATE sync_log SET status = "resolved" WHERE id = ?',
        [conflictId]
      );
      
      return true;
    } catch (error) {
      throw new Error(`Failed to resolve conflict: ${error.message}`);
    }
  }

  // Get conflict statistics
  async getConflictStats() {
    const query = `
      SELECT 
        table_name,
        COUNT(*) as conflict_count,
        COUNT(CASE WHEN JSON_EXTRACT(error_message, '$.severity') = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN JSON_EXTRACT(error_message, '$.severity') = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN JSON_EXTRACT(error_message, '$.severity') = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN JSON_EXTRACT(error_message, '$.severity') = 'low' THEN 1 END) as low_count
      FROM sync_log 
      WHERE operation = 'conflict' AND status = 'conflict'
      GROUP BY table_name
    `;
    
    return await this.db.all(query);
  }

  // Auto-resolve low-severity conflicts
  async autoResolveLowSeverityConflicts() {
    const conflicts = await this.getUnresolvedConflicts();
    const results = { resolved: 0, failed: 0, errors: [] };
    
    for (const conflict of conflicts) {
      if (conflict.details.severity === 'low') {
        try {
          await this.resolveConflict(conflict, 'latest');
          results.resolved++;
          
          // Mark as resolved
          await this.db.run(
            'UPDATE sync_log SET status = "auto_resolved" WHERE id = ?',
            [conflict.id]
          );
        } catch (error) {
          results.failed++;
          results.errors.push({ id: conflict.id, error: error.message });
        }
      }
    }
    
    return results;
  }
}

module.exports = ConflictResolution;
