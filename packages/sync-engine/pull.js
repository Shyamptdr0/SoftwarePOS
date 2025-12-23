// Sync Engine - Pull Module
// Handles pulling changes from Supabase to local SQLite

const { createClient } = require('@supabase/supabase-js');
const { getDatabase } = require('../database/connection');
const ProductQueries = require('../database/queries/products');
const SalesQueries = require('../database/queries/sales');
const InventoryQueries = require('../database/queries/inventory');

class SyncPull {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.db = getDatabase();
    this.productQueries = new ProductQueries();
    this.salesQueries = new SalesQueries();
    this.inventoryQueries = new InventoryQueries();
  }

  // Pull all changes from Supabase
  async pullAll(lastSyncTime = null) {
    const results = {
      products: { success: 0, failed: 0, errors: [], conflicts: 0 },
      sales: { success: 0, failed: 0, errors: [], conflicts: 0 },
      inventory: { success: 0, failed: 0, errors: [], conflicts: 0 }
    };

    try {
      // Pull products
      const productsResult = await this.pullProducts(lastSyncTime);
      results.products = productsResult;

      // Pull sales
      const salesResult = await this.pullSales(lastSyncTime);
      results.sales = salesResult;

      // Pull inventory transactions
      const inventoryResult = await this.pullInventory(lastSyncTime);
      results.inventory = inventoryResult;

      // Log sync operation
      await this.logSyncOperation('pull', 'all', null, 'success', null);

      return results;
    } catch (error) {
      await this.logSyncOperation('pull', 'all', null, 'error', error.message);
      throw error;
    }
  }

  // Pull products from Supabase
  async pullProducts(lastSyncTime = null) {
    const result = { success: 0, failed: 0, errors: [], conflicts: 0 };
    
    try {
      let query = this.supabase.from('products').select('*');
      
      if (lastSyncTime) {
        query = query.gte('updated_at', lastSyncTime);
      }
      
      const { data: remoteProducts, error } = await query.order('updated_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      for (const remoteProduct of remoteProducts) {
        try {
          // Check if product exists locally
          const localProduct = await this.productQueries.getById(remoteProduct.id);
          
          if (localProduct) {
            // Handle potential conflict
            const conflictResolution = await this.resolveConflict('products', localProduct, remoteProduct);
            
            if (conflictResolution === 'conflict') {
              result.conflicts++;
              await this.handleConflict('products', localProduct, remoteProduct);
              continue;
            }
            
            if (conflictResolution === 'pull_remote') {
              // Update local product
              await this.updateLocalProduct(remoteProduct);
              result.success++;
            }
            // If push_local, skip this record
          } else {
            // Create new local product
            await this.createLocalProduct(remoteProduct);
            result.success++;
          }
          
          // Log success
          await this.logSyncOperation('pull', 'products', remoteProduct.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: remoteProduct.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('pull', 'products', remoteProduct.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to pull products: ${error.message}`);
    }
  }

  // Pull sales from Supabase
  async pullSales(lastSyncTime = null) {
    const result = { success: 0, failed: 0, errors: [], conflicts: 0 };
    
    try {
      let query = this.supabase.from('sales').select('*');
      
      if (lastSyncTime) {
        query = query.gte('updated_at', lastSyncTime);
      }
      
      const { data: remoteSales, error } = await query.order('updated_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      for (const remoteSale of remoteSales) {
        try {
          // Check if sale exists locally
          const localSale = await this.salesQueries.getById(remoteSale.id);
          
          if (localSale) {
            // Handle potential conflict
            const conflictResolution = await this.resolveConflict('sales', localSale, remoteSale);
            
            if (conflictResolution === 'conflict') {
              result.conflicts++;
              await this.handleConflict('sales', localSale, remoteSale);
              continue;
            }
            
            if (conflictResolution === 'pull_remote') {
              // Update local sale
              await this.updateLocalSale(remoteSale);
              result.success++;
            }
          } else {
            // Create new local sale
            await this.createLocalSale(remoteSale);
            result.success++;
          }
          
          // Pull sale items
          await this.pullSaleItems(remoteSale.id);
          
          // Log success
          await this.logSyncOperation('pull', 'sales', remoteSale.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: remoteSale.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('pull', 'sales', remoteSale.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to pull sales: ${error.message}`);
    }
  }

  // Pull sale items for a specific sale
  async pullSaleItems(saleId) {
    try {
      const { data: remoteItems, error } = await this.supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);
      
      if (error) throw new Error(error.message);
      
      // Delete existing local items for this sale
      await this.db.run('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
      
      // Insert new items
      for (const item of remoteItems) {
        await this.createLocalSaleItem(item);
      }
    } catch (error) {
      throw new Error(`Failed to pull sale items for sale ${saleId}: ${error.message}`);
    }
  }

  // Pull inventory transactions from Supabase
  async pullInventory(lastSyncTime = null) {
    const result = { success: 0, failed: 0, errors: [], conflicts: 0 };
    
    try {
      let query = this.supabase.from('inventory_transactions').select('*');
      
      if (lastSyncTime) {
        query = query.gte('created_at', lastSyncTime);
      }
      
      const { data: remoteTransactions, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      for (const remoteTransaction of remoteTransactions) {
        try {
          // Check if transaction exists locally
          const localTransaction = await this.inventoryQueries.getTransactionById(remoteTransaction.id);
          
          if (localTransaction) {
            // For transactions, we typically don't update existing ones
            // They are immutable records
            continue;
          } else {
            // Create new local transaction
            await this.createLocalTransaction(remoteTransaction);
            result.success++;
          }
          
          // Log success
          await this.logSyncOperation('pull', 'inventory_transactions', remoteTransaction.id, 'success', null);
          
        } catch (error) {
          result.failed++;
          result.errors.push({ id: remoteTransaction.id, error: error.message });
          
          // Log error
          await this.logSyncOperation('pull', 'inventory_transactions', remoteTransaction.id, 'error', error.message);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to pull inventory transactions: ${error.message}`);
    }
  }

  // Create local product from remote data
  async createLocalProduct(remoteProduct) {
    const productData = {
      id: remoteProduct.id,
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
    
    await this.productQueries.create(productData);
  }

  // Update local product from remote data
  async updateLocalProduct(remoteProduct) {
    const productData = {
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
    
    await this.productQueries.update(remoteProduct.id, productData);
  }

  // Create local sale from remote data
  async createLocalSale(remoteSale) {
    const saleData = {
      id: remoteSale.id,
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
    
    // Create sale without items (items handled separately)
    await this.db.run(`
      INSERT INTO sales (
        id, bill_number, customer_name, customer_phone, subtotal,
        discount_amount, tax_amount, total_amount, payment_method,
        payment_status, staff_id, notes, created_at, updated_at, store_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      saleData.id,
      saleData.billNumber,
      saleData.customerName,
      saleData.customerPhone,
      saleData.subtotal,
      saleData.discountAmount,
      saleData.taxAmount,
      saleData.totalAmount,
      saleData.paymentMethod,
      saleData.paymentStatus,
      saleData.staffId,
      saleData.notes,
      remoteSale.created_at,
      remoteSale.updated_at,
      saleData.storeId,
      'synced'
    ]);
  }

  // Update local sale from remote data
  async updateLocalSale(remoteSale) {
    const saleData = {
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
    
    await this.salesQueries.update(remoteSale.id, saleData);
  }

  // Create local sale item
  async createLocalSaleItem(remoteItem) {
    await this.db.run(`
      INSERT INTO sale_items (
        id, sale_id, product_id, quantity, unit_price,
        discount_amount, tax_amount, total_price, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      remoteItem.id,
      remoteItem.sale_id,
      remoteItem.product_id,
      remoteItem.quantity,
      remoteItem.unit_price,
      remoteItem.discount_amount,
      remoteItem.tax_amount,
      remoteItem.total_price,
      remoteItem.created_at,
      'synced'
    ]);
  }

  // Create local inventory transaction
  async createLocalTransaction(remoteTransaction) {
    const transactionData = {
      id: remoteTransaction.id,
      productId: remoteTransaction.product_id,
      transactionType: remoteTransaction.transaction_type,
      quantity: remoteTransaction.quantity,
      referenceType: remoteTransaction.reference_type,
      referenceId: remoteTransaction.reference_id,
      notes: remoteTransaction.notes,
      storeId: remoteTransaction.store_id
    };
    
    await this.inventoryQueries.createTransaction(transactionData);
  }

  // Handle conflict resolution
  async resolveConflict(tableName, localRecord, remoteRecord) {
    // Use latest updated_at timestamp to determine winner
    const localDate = new Date(localRecord.updated_at || localRecord.created_at);
    const remoteDate = new Date(remoteRecord.updated_at || remoteRecord.created_at);
    
    if (Math.abs(localDate - remoteDate) < 1000) { // Within 1 second
      // Same timestamp, check if records are identical
      if (JSON.stringify(localRecord) === JSON.stringify(remoteRecord)) {
        return 'identical';
      } else {
        return 'conflict';
      }
    } else if (localDate > remoteDate) {
      // Local record is newer
      return 'push_local';
    } else {
      // Remote record is newer
      return 'pull_remote';
    }
  }

  // Handle conflict between local and remote records
  async handleConflict(tableName, localRecord, remoteRecord) {
    // Mark local record as conflicted
    await this.db.run(`
      UPDATE ${tableName} SET sync_status = 'conflict' WHERE id = ?
    `, [localRecord.id]);
    
    // Log conflict
    await this.logSyncOperation('conflict', tableName, localRecord.id, 'conflict', 
      `Local: ${JSON.stringify(localRecord)} | Remote: ${JSON.stringify(remoteRecord)}`);
  }

  // Get last sync time from local database
  async getLastSyncTime() {
    try {
      const result = await this.db.get(`
        SELECT created_at FROM sync_log 
        WHERE operation = 'pull' AND status = 'success'
        ORDER BY created_at DESC LIMIT 1
      `);
      
      return result ? result.created_at : null;
    } catch (error) {
      return null;
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
      const isConnected = await this.checkConnectivity();
      const lastSync = await this.getLastSyncTime();
      
      return {
        isConnected,
        lastSync,
        status: isConnected ? 'ready' : 'offline'
      };
    } catch (error) {
      return {
        isConnected: false,
        lastSync: null,
        status: 'error',
        error: error.message
      };
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

  // Force pull specific record
  async forcePullRecord(tableName, recordId) {
    try {
      let remoteRecord;
      
      switch (tableName) {
        case 'products':
          const { data: product, error: productError } = await this.supabase
            .from('products')
            .select('*')
            .eq('id', recordId)
            .single();
          
          if (productError) throw new Error(productError.message);
          remoteRecord = product;
          break;
          
        case 'sales':
          const { data: sale, error: saleError } = await this.supabase
            .from('sales')
            .select('*')
            .eq('id', recordId)
            .single();
          
          if (saleError) throw new Error(saleError.message);
          remoteRecord = sale;
          
          // Also pull sale items
          await this.pullSaleItems(recordId);
          break;
          
        case 'inventory_transactions':
          const { data: transaction, error: transactionError } = await this.supabase
            .from('inventory_transactions')
            .select('*')
            .eq('id', recordId)
            .single();
          
          if (transactionError) throw new Error(transactionError.message);
          remoteRecord = transaction;
          break;
          
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
      
      // Update or create local record
      const localRecord = await this.db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId]);
      
      if (localRecord) {
        // Update existing record
        switch (tableName) {
          case 'products':
            await this.updateLocalProduct(remoteRecord);
            break;
          case 'sales':
            await this.updateLocalSale(remoteRecord);
            break;
          case 'inventory_transactions':
            // Transactions are immutable, skip
            break;
        }
      } else {
        // Create new record
        switch (tableName) {
          case 'products':
            await this.createLocalProduct(remoteRecord);
            break;
          case 'sales':
            await this.createLocalSale(remoteRecord);
            break;
          case 'inventory_transactions':
            await this.createLocalTransaction(remoteRecord);
            break;
        }
      }
      
      await this.logSyncOperation('pull', tableName, recordId, 'success', null);
      return true;
    } catch (error) {
      await this.logSyncOperation('pull', tableName, recordId, 'error', error.message);
      throw error;
    }
  }

  // Get remote changes count
  async getRemoteChangesCount(lastSyncTime = null) {
    try {
      const queries = [
        this.supabase.from('products').select('id', { count: 'exact' }),
        this.supabase.from('sales').select('id', { count: 'exact' }),
        this.supabase.from('inventory_transactions').select('id', { count: 'exact' })
      ];
      
      if (lastSyncTime) {
        queries[0] = queries[0].gte('updated_at', lastSyncTime);
        queries[1] = queries[1].gte('updated_at', lastSyncTime);
        queries[2] = queries[2].gte('created_at', lastSyncTime);
      }
      
      const [productsResult, salesResult, inventoryResult] = await Promise.all(queries);
      
      return {
        products: productsResult.count || 0,
        sales: salesResult.count || 0,
        inventory: inventoryResult.count || 0,
        total: (productsResult.count || 0) + (salesResult.count || 0) + (inventoryResult.count || 0)
      };
    } catch (error) {
      return { products: 0, sales: 0, inventory: 0, total: 0, error: error.message };
    }
  }
}

module.exports = SyncPull;
