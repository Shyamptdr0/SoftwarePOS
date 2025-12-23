// Inventory database queries
// CRUD operations for inventory management and stock tracking

const { getDatabase } = require('../connection');

class InventoryQueries {
  constructor() {
    this.db = getDatabase();
  }

  // Get all inventory transactions with filters
  async getAllTransactions(filters = {}) {
    let query = `
      SELECT it.*, p.name as product_name, p.sku as product_sku, p.barcode as product_barcode,
             p.stock_quantity as current_stock
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.productId) {
      query += ' AND it.product_id = ?';
      params.push(filters.productId);
    }
    
    if (filters.transactionType) {
      query += ' AND it.transaction_type = ?';
      params.push(filters.transactionType);
    }
    
    if (filters.referenceType) {
      query += ' AND it.reference_type = ?';
      params.push(filters.referenceType);
    }
    
    if (filters.startDate) {
      query += ' AND DATE(it.created_at) >= DATE(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND DATE(it.created_at) <= DATE(?)';
      params.push(filters.endDate);
    }
    
    if (filters.storeId) {
      query += ' AND it.store_id = ?';
      params.push(filters.storeId);
    }
    
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add ordering
    query += ' ORDER BY it.created_at DESC';
    
    // Add pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }
    
    return await this.db.all(query, params);
  }

  // Get inventory transaction by ID
  async getTransactionById(id) {
    const query = `
      SELECT it.*, p.name as product_name, p.sku as product_sku, p.barcode as product_barcode,
             p.stock_quantity as current_stock
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id
      WHERE it.id = ?
    `;
    
    return await this.db.get(query, [id]);
  }

  // Create inventory transaction
  async createTransaction(transactionData) {
    const query = `
      INSERT INTO inventory_transactions (
        id, product_id, transaction_type, quantity, reference_type,
        reference_id, notes, store_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      transactionData.id,
      transactionData.productId,
      transactionData.transactionType,
      transactionData.quantity,
      transactionData.referenceType || null,
      transactionData.referenceId || null,
      transactionData.notes || null,
      transactionData.storeId || 'default-store',
      'pending'
    ];
    
    await this.db.run(query, params);
    return await this.getTransactionById(transactionData.id);
  }

  // Stock IN operation
  async stockIn(productId, quantity, referenceType = 'purchase', referenceId = null, notes = '') {
    await this.db.beginTransaction();
    
    try {
      // Get current product
      const product = await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Update product stock
      const updateQuery = `
        UPDATE products SET
          stock_quantity = stock_quantity + ?,
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
        WHERE id = ?
      `;
      
      await this.db.run(updateQuery, [quantity, productId]);
      
      // Create inventory transaction
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          id, product_id, transaction_type, quantity, reference_type,
          reference_id, notes, store_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.db.run(transactionQuery, [
        transactionId,
        productId,
        'in',
        quantity,
        referenceType,
        referenceId,
        notes,
        product.store_id || 'default-store',
        'pending'
      ]);
      
      await this.db.commit();
      
      // Return updated product
      return await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Stock OUT operation
  async stockOut(productId, quantity, referenceType = 'sale', referenceId = null, notes = '') {
    await this.db.beginTransaction();
    
    try {
      // Get current product
      const product = await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (product.stock_quantity < quantity) {
        throw new Error('Insufficient stock');
      }
      
      // Update product stock
      const updateQuery = `
        UPDATE products SET
          stock_quantity = stock_quantity - ?,
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
        WHERE id = ?
      `;
      
      await this.db.run(updateQuery, [quantity, productId]);
      
      // Create inventory transaction
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          id, product_id, transaction_type, quantity, reference_type,
          reference_id, notes, store_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.db.run(transactionQuery, [
        transactionId,
        productId,
        'out',
        -quantity,
        referenceType,
        referenceId,
        notes,
        product.store_id || 'default-store',
        'pending'
      ]);
      
      await this.db.commit();
      
      // Return updated product
      return await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Stock adjustment
  async stockAdjustment(productId, newQuantity, notes = '') {
    await this.db.beginTransaction();
    
    try {
      // Get current product
      const product = await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        throw new Error('Product not found');
      }
      
      const difference = newQuantity - product.stock_quantity;
      
      if (difference === 0) {
        return product; // No adjustment needed
      }
      
      // Update product stock
      const updateQuery = `
        UPDATE products SET
          stock_quantity = ?,
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
        WHERE id = ?
      `;
      
      await this.db.run(updateQuery, [newQuantity, productId]);
      
      // Create inventory transaction
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          id, product_id, transaction_type, quantity, reference_type,
          reference_id, notes, store_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.db.run(transactionQuery, [
        transactionId,
        productId,
        'adjustment',
        difference,
        'adjustment',
        null,
        notes,
        product.store_id || 'default-store',
        'pending'
      ]);
      
      await this.db.commit();
      
      // Return updated product
      return await this.db.get('SELECT * FROM products WHERE id = ?', [productId]);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Get current inventory levels
  async getCurrentInventory(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    
    const params = [];
    
    if (filters.categoryId) {
      query += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    }
    
    if (filters.lowStock) {
      query += ' AND p.stock_quantity <= p.min_stock_level';
    }
    
    if (filters.outOfStock) {
      query += ' AND p.stock_quantity = 0';
    }
    
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.storeId) {
      query += ' AND p.store_id = ?';
      params.push(filters.storeId);
    }
    
    // Add ordering
    const orderBy = filters.orderBy || 'name';
    const orderDirection = filters.orderDirection || 'ASC';
    query += ` ORDER BY p.${orderBy} ${orderDirection}`;
    
    // Add pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }
    
    return await this.db.all(query, params);
  }

  // Get low stock products
  async getLowStockProducts(storeId = null) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color,
             (p.min_stock_level - p.stock_quantity) as shortage
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock_quantity <= p.min_stock_level
    `;
    
    const params = [];
    
    if (storeId) {
      query += ' AND p.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY shortage DESC';
    
    return await this.db.all(query, params);
  }

  // Get out of stock products
  async getOutOfStockProducts(storeId = null) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock_quantity = 0
    `;
    
    const params = [];
    
    if (storeId) {
      query += ' AND p.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY p.name ASC';
    
    return await this.db.all(query, params);
  }

  // Get inventory value
  async getInventoryValue(storeId = null) {
    let whereClause = 'WHERE is_active = 1';
    const params = [];
    
    if (storeId) {
      whereClause += ' AND store_id = ?';
      params.push(storeId);
    }
    
    const queries = [
      {
        key: 'total_value',
        query: `SELECT SUM(stock_quantity * cost_price) as value FROM products ${whereClause}`
      },
      {
        key: 'total_items',
        query: `SELECT SUM(stock_quantity) as quantity FROM products ${whereClause}`
      },
      {
        key: 'total_products',
        query: `SELECT COUNT(*) as count FROM products ${whereClause}`
      },
      {
        key: 'low_stock_count',
        query: `SELECT COUNT(*) as count FROM products ${whereClause} AND stock_quantity <= min_stock_level`
      },
      {
        key: 'out_of_stock_count',
        query: `SELECT COUNT(*) as count FROM products ${whereClause} AND stock_quantity = 0`
      }
    ];
    
    const stats = {};
    
    for (const queryInfo of queries) {
      const result = await this.db.get(queryInfo.query, params);
      stats[queryInfo.key] = result.value || result.quantity || result.count || 0;
    }
    
    return stats;
  }

  // Get inventory movements summary
  async getMovementsSummary(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (filters.startDate) {
      whereClause += ' AND DATE(created_at) >= DATE(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      whereClause += ' AND DATE(created_at) <= DATE(?)';
      params.push(filters.endDate);
    }
    
    if (filters.storeId) {
      whereClause += ' AND store_id = ?';
      params.push(filters.storeId);
    }
    
    const query = `
      SELECT 
        transaction_type,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) as quantity_in,
        SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) as quantity_out
      FROM inventory_transactions
      ${whereClause}
      GROUP BY transaction_type
      ORDER BY transaction_type
    `;
    
    return await this.db.all(query, params);
  }

  // Get product inventory history
  async getProductHistory(productId, filters = {}) {
    let query = `
      SELECT it.*, p.name as product_name, p.sku as product_sku
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id
      WHERE it.product_id = ?
    `;
    
    const params = [productId];
    
    if (filters.startDate) {
      query += ' AND DATE(it.created_at) >= DATE(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND DATE(it.created_at) <= DATE(?)';
      params.push(filters.endDate);
    }
    
    if (filters.transactionType) {
      query += ' AND it.transaction_type = ?';
      params.push(filters.transactionType);
    }
    
    query += ' ORDER BY it.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return await this.db.all(query, params);
  }

  // Batch stock operations
  async batchStockOperations(operations) {
    await this.db.beginTransaction();
    
    try {
      const results = [];
      
      for (const operation of operations) {
        let result;
        
        switch (operation.type) {
          case 'in':
            result = await this.stockIn(
              operation.productId,
              operation.quantity,
              operation.referenceType,
              operation.referenceId,
              operation.notes
            );
            break;
          case 'out':
            result = await this.stockOut(
              operation.productId,
              operation.quantity,
              operation.referenceType,
              operation.referenceId,
              operation.notes
            );
            break;
          case 'adjustment':
            result = await this.stockAdjustment(
              operation.productId,
              operation.newQuantity,
              operation.notes
            );
            break;
          default:
            throw new Error(`Invalid operation type: ${operation.type}`);
        }
        
        results.push(result);
      }
      
      await this.db.commit();
      return results;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Get transactions needing sync
  async getPendingSync() {
    const query = `
      SELECT * FROM inventory_transactions 
      WHERE sync_status = 'pending' OR sync_status = 'conflict'
      ORDER BY created_at ASC
    `;
    
    return await this.db.all(query);
  }

  // Mark transaction as synced
  async markAsSynced(id) {
    const query = `
      UPDATE inventory_transactions SET sync_status = 'synced' 
      WHERE id = ?
    `;
    
    await this.db.run(query, [id]);
  }

  // Export inventory data
  async exportInventory(filters = {}) {
    const inventory = await this.getCurrentInventory(filters);
    
    // Transform data for export
    return inventory.map(item => ({
      'SKU': item.sku,
      'Barcode': item.barcode || '',
      'Name': item.name,
      'Category': item.category_name || '',
      'Current Stock': item.stock_quantity,
      'Min Stock Level': item.min_stock_level,
      'Cost Price': item.cost_price,
      'Selling Price': item.selling_price,
      'Stock Value': item.stock_quantity * item.cost_price,
      'Unit': item.unit,
      'Status': item.stock_quantity === 0 ? 'Out of Stock' : 
               item.stock_quantity <= item.min_stock_level ? 'Low Stock' : 'In Stock'
    }));
  }

  // Export transactions data
  async exportTransactions(filters = {}) {
    const transactions = await this.getAllTransactions(filters);
    
    // Transform data for export
    return transactions.map(tx => ({
      'Date': tx.created_at,
      'Product': tx.product_name,
      'SKU': tx.product_sku,
      'Type': tx.transaction_type,
      'Quantity': tx.quantity,
      'Reference Type': tx.reference_type || '',
      'Reference ID': tx.reference_id || '',
      'Notes': tx.notes || '',
      'Current Stock': tx.current_stock
    }));
  }
}

module.exports = InventoryQueries;
