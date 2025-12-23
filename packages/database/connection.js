// Database connection manager for SQLite
// Handles both local SQLite and Supabase connections

const sqlite3 = require('sqlite3').verbose();
const { Database } = require('sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseConnection {
  constructor() {
    this.db = null;
    this.dbPath = path.join(process.cwd(), 'data', 'shreem-pos.db');
    this.isConnected = false;
  }

  // Initialize database connection
  async connect() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Connect to SQLite
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          throw err;
        }
        console.log('Connected to SQLite database');
        this.isConnected = true;
      });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      await this.run('PRAGMA journal_mode = WAL');
      
      return this.db;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.isConnected = false;
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Execute a query without returning results
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Get a single row
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get multiple rows
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Begin transaction
  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
  }

  // Commit transaction
  async commit() {
    await this.run('COMMIT');
  }

  // Rollback transaction
  async rollback() {
    await this.run('ROLLBACK');
  }

  // Check if table exists
  async tableExists(tableName) {
    const result = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  }

  // Get table schema
  async getTableSchema(tableName) {
    return await this.all(`PRAGMA table_info(${tableName})`);
  }

  // Backup database
  async backup(backupPath) {
    return new Promise((resolve, reject) => {
      const backup = this.db.backup(backupPath);
      
      backup.step(-1, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.finish(() => {
            console.log('Database backup completed');
            resolve();
          });
        }
      });
    });
  }

  // Restore database from backup
  async restore(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file does not exist');
    }

    await this.close();
    
    // Copy backup file to main database location
    fs.copyFileSync(backupPath, this.dbPath);
    
    // Reconnect
    await this.connect();
    
    console.log('Database restored from backup');
  }

  // Get database statistics
  async getStats() {
    const stats = {};
    
    // Get table row counts
    const tables = ['users', 'products', 'categories', 'sales', 'sale_items', 'inventory_transactions'];
    
    for (const table of tables) {
      try {
        const result = await this.get(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result.count;
      } catch (error) {
        stats[table] = 0;
      }
    }
    
    // Get database size
    try {
      const fileStats = fs.statSync(this.dbPath);
      stats.size = fileStats.size;
    } catch (error) {
      stats.size = 0;
    }
    
    return stats;
  }

  // Vacuum database to optimize size
  async vacuum() {
    await this.run('VACUUM');
    console.log('Database vacuumed');
  }

  // Rebuild indexes
  async reindex() {
    await this.run('REINDEX');
    console.log('Database indexes rebuilt');
  }

  // Check database integrity
  async checkIntegrity() {
    const result = await this.get('PRAGMA integrity_check');
    return result.integrity_check === 'ok';
  }

  // Get database version info
  async getVersion() {
    const result = await this.get('SELECT sqlite_version() as version');
    return result.version;
  }

  // Execute multiple statements in a transaction
  async transaction(queries) {
    await this.beginTransaction();
    
    try {
      const results = [];
      
      for (const query of queries) {
        const result = await this.run(query.sql, query.params);
        results.push(result);
      }
      
      await this.commit();
      return results;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  // Prepare statement for repeated execution
  prepare(sql) {
    return this.db.prepare(sql);
  }

  // Get connection status
  isReady() {
    return this.isConnected && this.db;
  }

  // Initialize database with schema
  async initialize() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      await this.beginTransaction();
      
      try {
        for (const statement of statements) {
          if (statement.trim()) {
            await this.run(statement);
          }
        }
        
        await this.commit();
        console.log('Database initialized with schema');
      } catch (error) {
        await this.rollback();
        throw error;
      }
    } else {
      throw new Error('Schema file not found');
    }
  }
}

// Singleton instance
let dbInstance = null;

// Get database instance
function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}

// Export database connection class and instance
module.exports = {
  DatabaseConnection,
  getDatabase
};
