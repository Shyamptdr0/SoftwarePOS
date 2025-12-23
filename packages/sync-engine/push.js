// Sync Engine - Push Module
// Handles pushing local changes to Supabase

const { createClient } = require('@supabase/supabase-js');
const { getDatabase } = require('../database/connection');
const ProductQueries = require('../database/queries/products');
const SalesQueries = require('../database/queries/sales');
const InventoryQueries = require('../database/queries/inventory');

class SyncPush {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.db = getDatabase();
    this.productQueries = new ProductQueries();
    this.salesQueries = new SalesQueries();
    this.inventoryQueries = new InventoryQueries();
  }

  // Push all pending changes to Supabase
  async pushAll() {
    const results = {
      products: { success: 0, failed: 0, errors: [] },
      sales: { success: 0, failed: 0, errors: [] },
      inventory: { success: 0, failed: 0, errors: [] }
    };

    try {
      // Push products
      const productsResult = await this.pushProducts();
      results.products = productsResult;

      // Push sales
      const salesResult = await this.pushSales();
      results.sales = salesResult;

      // Push inventory transactions
      const inventoryResult = await this.pushInventory();
      results.inventory = inventoryResult;

      // Log sync operation
      await this.logSyncOperation('push', 'all', null, 'success', null);

      return results;
    } catch (error) {
      await this.logSyncOperation('push', 'all', null, 'error', error.message);
      throw error;
    }
  }

  // Push pending products
  async pushProducts() {
    const result = { success: 0, failed: 0, errors: [] };
    
    try {
      const pendingProducts = await this.productQueries.getPendingSync();
      
      for (const product of pendingProducts) {
        try {
          const productData = this.transformProductForSupabase(product);
          
          let response;
          if (product.sync_status === 'conflict') {
            // Handle conflict - use latest updated_at
            response = await this.supabase
              .from('products')
              .upsert(productData, { onConflict: 'id' });
          } else {
            response = await this.supabase
              .from('products')
              .upsert(productData);
          }

          if (response.error) {
            throw new Error(response.error.message);
          }

          // Mark as synced locally
          await this.productQueries.markAsSynced(product.id);
          result.success++;
          
          // Log success
          await this.logSyncOperation('push', 'products', product.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: product.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('push', 'products', product.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to push products: ${error.message}`);
    }
  }

  // Push pending sales
  async pushSales() {
    const result = { success: 0, failed: 0, errors: [] };
    
    try {
      const pendingSales = await this.salesQueries.getPendingSync();
      
      for (const sale of pendingSales) {
        try {
          // Get sale items
          const saleWithItems = await this.salesQueries.getById(sale.id);
          
          const saleData = this.transformSaleForSupabase(saleWithItems);
          
          // Push sale
          const saleResponse = await this.supabase
            .from('sales')
            .upsert(saleData.main);

          if (saleResponse.error) {
            throw new Error(saleResponse.error.message);
          }

          // Push sale items
          if (saleData.items && saleData.items.length > 0) {
            const itemsResponse = await this.supabase
              .from('sale_items')
              .upsert(saleData.items);

            if (itemsResponse.error) {
              throw new Error(itemsResponse.error.message);
            }
          }

          // Mark as synced locally
          await this.salesQueries.markAsSynced(sale.id);
          result.success++;
          
          // Log success
          await this.logSyncOperation('push', 'sales', sale.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: sale.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('push', 'sales', sale.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to push sales: ${error.message}`);
    }
  }

  // Push pending inventory transactions
  async pushInventory() {
    const result = { success: 0, failed: 0, errors: [] };
    
    try {
      const pendingTransactions = await this.inventoryQueries.getPendingSync();
      
      for (const transaction of pendingTransactions) {
        try {
          const transactionData = this.transformTransactionForSupabase(transaction);
          
          const response = await this.supabase
            .from('inventory_transactions')
            .upsert(transactionData);

          if (response.error) {
            throw new Error(response.error.message);
          }

          // Mark as synced locally
          await this.inventoryQueries.markAsSynced(transaction.id);
          result.success++;
          
          // Log success
          await this.logSyncOperation('push', 'inventory_transactions', transaction.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: transaction.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('push', 'inventory_transactions', transaction.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to push inventory transactions: ${error.message}`);
    }
  }

  // Transform product data for Supabase
  transformProductForSupabase(product) {
    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      tax_rate: product.tax_rate,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      unit: product.unit,
      image_url: product.image_url,
      is_active: Boolean(product.is_active),
      created_at: product.created_at,
      updated_at: product.updated_at,
      store_id: product.store_id,
      sync_status: 'synced'
    };
  }

  // Transform sale data for Supabase
  transformSaleForSupabase(sale) {
    const mainData = {
      id: sale.id,
      bill_number: sale.bill_number,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      subtotal: sale.subtotal,
      discount_amount: sale.discount_amount,
      tax_amount: sale.tax_amount,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      staff_id: sale.staff_id,
      notes: sale.notes,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      store_id: sale.store_id,
      sync_status: 'synced'
    };

    const itemsData = sale.items?.map(item => ({
      id: item.id,
      sale_id: item.sale_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      tax_amount: item.tax_amount,
      total_price: item.total_price,
      created_at: item.created_at,
      sync_status: 'synced'
    })) || [];

    return { main: mainData, items: itemsData };
  }

  // Transform inventory transaction for Supabase
  transformTransactionForSupabase(transaction) {
    return {
      id: transaction.id,
      product_id: transaction.product_id,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      reference_type: transaction.reference_type,
      reference_id: transaction.reference_id,
      notes: transaction.notes,
      created_at: transaction.created_at,
      store_id: transaction.store_id,
      sync_status: 'synced'
    };
  }

  // Handle conflict resolution
  async resolveConflict(tableName, localRecord, remoteRecord) {
    // Use latest updated_at timestamp to determine winner
    const localDate = new Date(localRecord.updated_at);
    const remoteDate = new Date(remoteRecord.updated_at);
    
    if (localDate > remoteDate) {
      // Local record is newer, push it
      return 'push_local';
    } else if (remoteDate > localDate) {
      // Remote record is newer, pull it
      return 'pull_remote';
    } else {
      // Same timestamp, merge if possible or use local
      return 'push_local';
    }
  }

  // Check connectivity to Supabase
  async checkConnectivity() {
    try {
      const { data, error } = await this.supabase
        .from('sync_log')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const [productsCount, salesCount, inventoryCount] = await Promise.all([
        this.db.get("SELECT COUNT(*) as count FROM products WHERE sync_status = 'pending'"),
        this.db.get("SELECT COUNT(*) as count FROM sales WHERE sync_status = 'pending'"),
        this.db.get("SELECT COUNT(*) as count FROM inventory_transactions WHERE sync_status = 'pending'")
      ]);

      return {
        isConnected: await this.checkConnectivity(),
        pending: {
          products: productsCount.count,
          sales: salesCount.count,
          inventory: inventoryCount.count,
          total: productsCount.count + salesCount.count + inventoryCount.count
        },
        lastSync: await this.getLastSyncTime()
      };
    } catch (error) {
      return {
        isConnected: false,
        pending: { products: 0, sales: 0, inventory: 0, total: 0 },
        lastSync: null,
        error: error.message
      };
    }
  }

  // Get last sync time
  async getLastSyncTime() {
    try {
      const result = await this.db.get(`
        SELECT created_at FROM sync_log 
        WHERE operation = 'push' AND status = 'success'
        ORDER BY created_at DESC LIMIT 1
      `);
      
      return result ? result.created_at : null;
    } catch (error) {
      return null;
    }
  }

  // Log sync operation
  async logSyncOperation(operation, tableName, recordId, status, errorMessage) {
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
        tableName,
        recordId,
        status,
        errorMessage,
        'default-store'
      ]);
    } catch (error) {
      console.error('Failed to log sync operation:', error);
    }
  }

  // Force push specific record
  async forcePushRecord(tableName, recordId) {
    try {
      switch (tableName) {
        case 'products':
          const product = await this.productQueries.getById(recordId);
          if (product) {
            const productData = this.transformProductForSupabase(product);
            const response = await this.supabase
              .from('products')
              .upsert(productData);
            
            if (response.error) throw new Error(response.error.message);
            await this.productQueries.markAsSynced(recordId);
          }
          break;
          
        case 'sales':
          const sale = await this.salesQueries.getById(recordId);
          if (sale) {
            const saleData = this.transformSaleForSupabase(sale);
            await this.supabase.from('sales').upsert(saleData.main);
            if (saleData.items.length > 0) {
              await this.supabase.from('sale_items').upsert(saleData.items);
            }
            await this.salesQueries.markAsSynced(recordId);
          }
          break;
          
        case 'inventory_transactions':
          const transaction = await this.inventoryQueries.getTransactionById(recordId);
          if (transaction) {
            const transactionData = this.transformTransactionForSupabase(transaction);
            const response = await this.supabase
              .from('inventory_transactions')
              .upsert(transactionData);
            
            if (response.error) throw new Error(response.error.message);
            await this.inventoryQueries.markAsSynced(recordId);
          }
          break;
          
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
      
      await this.logSyncOperation('push', tableName, recordId, 'success', null);
      return true;
    } catch (error) {
      await this.logSyncOperation('push', tableName, recordId, 'error', error.message);
      throw error;
    }
  }

  // Retry failed sync operations
  async retryFailedOperations() {
    const failedLogs = await this.db.all(`
      SELECT DISTINCT table_name, record_id 
      FROM sync_log 
      WHERE operation = 'push' AND status = 'error'
      AND created_at > datetime('now', '-24 hours')
    `);
    
    const results = { success: 0, failed: 0 };
    
    for (const log of failedLogs) {
      try {
        await this.forcePushRecord(log.table_name, log.record_id);
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }
}

module.exports = SyncPush;
