// Product database queries
// CRUD operations for products management

const { getDatabase } = require('../connection');

class ProductQueries {
  constructor() {
    this.db = getDatabase();
  }

  // Get all products with optional filters
  async getAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.categoryId) {
      query += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    }
    
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.active !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.active ? 1 : 0);
    }
    
    if (filters.lowStock) {
      query += ' AND p.stock_quantity <= p.min_stock_level';
    }
    
    if (filters.storeId) {
      query += ' AND p.store_id = ?';
      params.push(filters.storeId);
    }
    
    // Add ordering
    query += ' ORDER BY p.name ASC';
    
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

  // Get product by ID
  async getById(id) {
    const query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;
    
    return await this.db.get(query, [id]);
  }

  // Get product by SKU
  async getBySku(sku) {
    const query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.sku = ?
    `;
    
    return await this.db.get(query, [sku]);
  }

  // Get product by barcode
  async getByBarcode(barcode) {
    const query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ?
    `;
    
    return await this.db.get(query, [barcode]);
  }

  // Create new product
  async create(productData) {
    const query = `
      INSERT INTO products (
        id, sku, barcode, name, description, category_id, cost_price,
        selling_price, tax_rate, stock_quantity, min_stock_level, unit,
        image_url, is_active, store_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      productData.id,
      productData.sku,
      productData.barcode || null,
      productData.name,
      productData.description || null,
      productData.categoryId || null,
      productData.costPrice || 0,
      productData.sellingPrice,
      productData.taxRate || 0,
      productData.stockQuantity || 0,
      productData.minStockLevel || 5,
      productData.unit || 'pcs',
      productData.imageUrl || null,
      productData.isActive !== false ? 1 : 0,
      productData.storeId || 'default-store',
      'pending'
    ];
    
    const result = await this.db.run(query, params);
    return await this.getById(productData.id);
  }

  // Update product
  async update(id, productData) {
    const query = `
      UPDATE products SET
        sku = ?, barcode = ?, name = ?, description = ?, category_id = ?,
        cost_price = ?, selling_price = ?, tax_rate = ?, stock_quantity = ?,
        min_stock_level = ?, unit = ?, image_url = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP, sync_status = ?
      WHERE id = ?
    `;
    
    const params = [
      productData.sku,
      productData.barcode || null,
      productData.name,
      productData.description || null,
      productData.categoryId || null,
      productData.costPrice || 0,
      productData.sellingPrice,
      productData.taxRate || 0,
      productData.stockQuantity || 0,
      productData.minStockLevel || 5,
      productData.unit || 'pcs',
      productData.imageUrl || null,
      productData.isActive !== false ? 1 : 0,
      'pending',
      id
    ];
    
    await this.db.run(query, params);
    return await this.getById(id);
  }

  // Delete product (soft delete by setting is_active = 0)
  async delete(id) {
    const query = `
      UPDATE products SET 
        is_active = 0, 
        updated_at = CURRENT_TIMESTAMP, 
        sync_status = 'pending'
      WHERE id = ?
    `;
    
    await this.db.run(query, [id]);
    return true;
  }

  // Permanently delete product
  async hardDelete(id) {
    const query = 'DELETE FROM products WHERE id = ?';
    const result = await this.db.run(query, [id]);
    return result.changes > 0;
  }

  // Update stock quantity
  async updateStock(id, quantity, transactionType = 'adjustment', notes = '') {
    await this.db.beginTransaction();
    
    try {
      // Get current product
      const product = await this.getById(id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Update product stock
      const updateQuery = `
        UPDATE products SET 
          stock_quantity = ?, 
          updated_at = CURRENT_TIMESTAMP, 
          sync_status = 'pending'
        WHERE id = ?
      `;
      
      await this.db.run(updateQuery, [quantity, id]);
      
      // Create inventory transaction
      const transactionQuery = `
        INSERT INTO inventory_transactions (
          id, product_id, transaction_type, quantity, reference_type, notes, store_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const quantityChange = quantity - product.stock_quantity;
      
      await this.db.run(transactionQuery, [
        transactionId,
        id,
        transactionType,
        quantityChange,
        'adjustment',
        notes,
        product.store_id || 'default-store',
        'pending'
      ]);
      
      await this.db.commit();
      return await this.getById(id);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Get low stock products
  async getLowStock(storeId = null) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
    `;
    
    const params = [];
    
    if (storeId) {
      query += ' AND p.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY (p.stock_quantity - p.min_stock_level) ASC';
    
    return await this.db.all(query, params);
  }

  // Search products by name, SKU, or barcode
  async search(searchTerm, storeId = null) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (
        p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?
      )
    `;
    
    const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
    
    if (storeId) {
      query += ' AND p.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY p.name ASC LIMIT 50';
    
    return await this.db.all(query, params);
  }

  // Get products by category
  async getByCategory(categoryId, storeId = null) {
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.is_active = 1
    `;
    
    const params = [categoryId];
    
    if (storeId) {
      query += ' AND p.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY p.name ASC';
    
    return await this.db.all(query, params);
  }

  // Get product statistics
  async getStats(storeId = null) {
    let whereClause = storeId ? 'WHERE store_id = ?' : '';
    const params = storeId ? [storeId] : [];
    
    const queries = [
      {
        key: 'total_products',
        query: `SELECT COUNT(*) as count FROM products ${whereClause}`
      },
      {
        key: 'active_products',
        query: `SELECT COUNT(*) as count FROM products ${whereClause} AND is_active = 1`
      },
      {
        key: 'low_stock_count',
        query: `SELECT COUNT(*) as count FROM products ${whereClause} AND stock_quantity <= min_stock_level AND is_active = 1`
      },
      {
        key: 'out_of_stock_count',
        query: `SELECT COUNT(*) as count FROM products ${whereClause} AND stock_quantity = 0 AND is_active = 1`
      },
      {
        key: 'total_stock_value',
        query: `SELECT SUM(stock_quantity * cost_price) as value FROM products ${whereClause} AND is_active = 1`
      }
    ];
    
    const stats = {};
    
    for (const queryInfo of queries) {
      const result = await this.db.get(queryInfo.query, params);
      stats[queryInfo.key] = result.count || result.value || 0;
    }
    
    return stats;
  }

  // Batch update products
  async batchUpdate(updates) {
    await this.db.beginTransaction();
    
    try {
      const results = [];
      
      for (const update of updates) {
        const result = await this.update(update.id, update.data);
        results.push(result);
      }
      
      await this.db.commit();
      return results;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Get products needing sync
  async getPendingSync() {
    const query = `
      SELECT * FROM products 
      WHERE sync_status = 'pending' OR sync_status = 'conflict'
      ORDER BY updated_at ASC
    `;
    
    return await this.db.all(query);
  }

  // Mark product as synced
  async markAsSynced(id) {
    const query = `
      UPDATE products SET sync_status = 'synced' 
      WHERE id = ?
    `;
    
    await this.db.run(query, [id]);
  }

  // Import products from array
  async importProducts(products, storeId = 'default-store') {
    await this.db.beginTransaction();
    
    try {
      const results = [];
      
      for (const productData of products) {
        // Check if product exists by SKU
        const existing = await this.getBySku(productData.sku);
        
        if (existing) {
          // Update existing product
          const result = await this.update(existing.id, { ...productData, storeId });
          results.push({ action: 'updated', data: result });
        } else {
          // Create new product
          const newProduct = {
            ...productData,
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            storeId
          };
          const result = await this.create(newProduct);
          results.push({ action: 'created', data: result });
        }
      }
      
      await this.db.commit();
      return results;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }
}

module.exports = ProductQueries;
