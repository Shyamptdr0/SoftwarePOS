// Sales database queries
// CRUD operations for sales, bills, and transactions

const { getDatabase } = require('../connection');

class SalesQueries {
  constructor() {
    this.db = getDatabase();
  }

  // Get all sales with optional filters
  async getAll(filters = {}) {
    let query = `
      SELECT s.*, u.email as staff_email, u.role as staff_role,
             COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN users u ON s.staff_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.startDate) {
      query += ' AND DATE(s.created_at) >= DATE(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND DATE(s.created_at) <= DATE(?)';
      params.push(filters.endDate);
    }
    
    if (filters.staffId) {
      query += ' AND s.staff_id = ?';
      params.push(filters.staffId);
    }
    
    if (filters.paymentMethod) {
      query += ' AND s.payment_method = ?';
      params.push(filters.paymentMethod);
    }
    
    if (filters.paymentStatus) {
      query += ' AND s.payment_status = ?';
      params.push(filters.paymentStatus);
    }
    
    if (filters.storeId) {
      query += ' AND s.store_id = ?';
      params.push(filters.storeId);
    }
    
    if (filters.search) {
      query += ' AND (s.bill_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY s.id';
    
    // Add ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'DESC';
    query += ` ORDER BY s.${orderBy} ${orderDirection}`;
    
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

  // Get sale by ID with items
  async getById(id) {
    const saleQuery = `
      SELECT s.*, u.email as staff_email, u.role as staff_role
      FROM sales s
      LEFT JOIN users u ON s.staff_id = u.id
      WHERE s.id = ?
    `;
    
    const itemsQuery = `
      SELECT si.*, p.name as product_name, p.sku as product_sku, p.barcode as product_barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.created_at
    `;
    
    const [sale, items] = await Promise.all([
      this.db.get(saleQuery, [id]),
      this.db.all(itemsQuery, [id])
    ]);
    
    if (sale) {
      sale.items = items;
    }
    
    return sale;
  }

  // Get sale by bill number
  async getByBillNumber(billNumber) {
    const saleQuery = `
      SELECT s.*, u.email as staff_email, u.role as staff_role
      FROM sales s
      LEFT JOIN users u ON s.staff_id = u.id
      WHERE s.bill_number = ?
    `;
    
    const itemsQuery = `
      SELECT si.*, p.name as product_name, p.sku as product_sku, p.barcode as product_barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.created_at
    `;
    
    const [sale, items] = await Promise.all([
      this.db.get(saleQuery, [billNumber]),
      this.db.all(itemsQuery, [sale?.id || ''])
    ]);
    
    if (sale) {
      sale.items = items;
    }
    
    return sale;
  }

  // Create new sale with items
  async create(saleData, items) {
    await this.db.beginTransaction();
    
    try {
      // Generate bill number
      const billNumber = await this.generateBillNumber();
      
      // Create sale
      const saleQuery = `
        INSERT INTO sales (
          id, bill_number, customer_name, customer_phone, subtotal,
          discount_amount, tax_amount, total_amount, payment_method,
          payment_status, staff_id, notes, store_id, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const saleParams = [
        saleId,
        billNumber,
        saleData.customerName || null,
        saleData.customerPhone || null,
        saleData.subtotal,
        saleData.discountAmount || 0,
        saleData.taxAmount || 0,
        saleData.totalAmount,
        saleData.paymentMethod || 'cash',
        saleData.paymentStatus || 'paid',
        saleData.staffId || null,
        saleData.notes || null,
        saleData.storeId || 'default-store',
        'pending'
      ];
      
      await this.db.run(saleQuery, saleParams);
      
      // Create sale items
      for (const item of items) {
        const itemQuery = `
          INSERT INTO sale_items (
            id, sale_id, product_id, quantity, unit_price,
            discount_amount, tax_amount, total_price, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const itemId = `si_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await this.db.run(itemQuery, [
          itemId,
          saleId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.discountAmount || 0,
          item.taxAmount || 0,
          item.totalPrice,
          'pending'
        ]);
        
        // Update product stock
        await this.updateProductStock(item.productId, item.quantity);
      }
      
      await this.db.commit();
      
      // Return complete sale with items
      return await this.getById(saleId);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Update sale
  async update(id, saleData) {
    const query = `
      UPDATE sales SET
        customer_name = ?, customer_phone = ?, subtotal = ?,
        discount_amount = ?, tax_amount = ?, total_amount = ?,
        payment_method = ?, payment_status = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP, sync_status = ?
      WHERE id = ?
    `;
    
    const params = [
      saleData.customerName || null,
      saleData.customerPhone || null,
      saleData.subtotal,
      saleData.discountAmount || 0,
      saleData.taxAmount || 0,
      saleData.totalAmount,
      saleData.paymentMethod,
      saleData.paymentStatus,
      saleData.notes || null,
      'pending',
      id
    ];
    
    await this.db.run(query, params);
    return await this.getById(id);
  }

  // Delete sale (soft delete by creating a void transaction)
  async voidSale(id, reason = 'Sale voided') {
    await this.db.beginTransaction();
    
    try {
      const sale = await this.getById(id);
      if (!sale) {
        throw new Error('Sale not found');
      }
      
      // Return items to stock
      for (const item of sale.items) {
        await this.returnProductToStock(item.product_id, item.quantity);
      }
      
      // Update sale status
      const query = `
        UPDATE sales SET
          payment_status = 'voided',
          notes = COALESCE(notes, '') || ' | VOIDED: ' || ?,
          updated_at = CURRENT_TIMESTAMP,
          sync_status = 'pending'
        WHERE id = ?
      `;
      
      await this.db.run(query, [reason, id]);
      
      await this.db.commit();
      return await this.getById(id);
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Update product stock (reduce on sale)
  async updateProductStock(productId, quantity) {
    const query = `
      UPDATE products SET
        stock_quantity = stock_quantity - ?,
        updated_at = CURRENT_TIMESTAMP,
        sync_status = 'pending'
      WHERE id = ? AND stock_quantity >= ?
    `;
    
    const result = await this.db.run(query, [quantity, productId, quantity]);
    
    if (result.changes === 0) {
      throw new Error('Insufficient stock for product');
    }
    
    // Create inventory transaction
    const transactionQuery = `
      INSERT INTO inventory_transactions (
        id, product_id, transaction_type, quantity, reference_type, reference_id,
        notes, store_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.run(transactionQuery, [
      transactionId,
      productId,
      'out',
      -quantity,
      'sale',
      `sale_${Date.now()}`,
      'Stock deducted from sale',
      'default-store',
      'pending'
    ]);
  }

  // Return product to stock (on sale void)
  async returnProductToStock(productId, quantity) {
    const query = `
      UPDATE products SET
        stock_quantity = stock_quantity + ?,
        updated_at = CURRENT_TIMESTAMP,
        sync_status = 'pending'
      WHERE id = ?
    `;
    
    await this.db.run(query, [quantity, productId]);
    
    // Create inventory transaction
    const transactionQuery = `
      INSERT INTO inventory_transactions (
        id, product_id, transaction_type, quantity, reference_type, reference_id,
        notes, store_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.run(transactionQuery, [
      transactionId,
      productId,
      'in',
      quantity,
      'sale_void',
      `sale_${Date.now()}`,
      'Stock returned from voided sale',
      'default-store',
      'pending'
    ]);
  }

  // Generate unique bill number
  async generateBillNumber() {
    const prefix = 'BILL';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    const query = `
      SELECT COUNT(*) as count 
      FROM sales 
      WHERE DATE(created_at) = DATE('now')
    `;
    
    const result = await this.db.get(query);
    const sequence = (result.count + 1).toString().padStart(4, '0');
    
    return `${prefix}${date}${sequence}`;
  }

  // Get sales statistics
  async getStats(filters = {}) {
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
    
    const queries = [
      {
        key: 'total_sales',
        query: `SELECT COUNT(*) as count FROM sales ${whereClause}`
      },
      {
        key: 'total_revenue',
        query: `SELECT SUM(total_amount) as total FROM sales ${whereClause} AND payment_status != 'voided'`
      },
      {
        key: 'today_sales',
        query: `SELECT COUNT(*) as count FROM sales WHERE DATE(created_at) = DATE('now') AND payment_status != 'voided'`
      },
      {
        key: 'today_revenue',
        query: `SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) = DATE('now') AND payment_status != 'voided'`
      },
      {
        key: 'average_sale',
        query: `SELECT AVG(total_amount) as avg FROM sales ${whereClause} AND payment_status != 'voided'`
      }
    ];
    
    const stats = {};
    
    for (const queryInfo of queries) {
      const result = await this.db.get(queryInfo.query, params);
      stats[queryInfo.key] = result.count || result.total || result.avg || 0;
    }
    
    return stats;
  }

  // Get top selling products
  async getTopProducts(limit = 10, filters = {}) {
    let whereClause = 'WHERE s.payment_status != "voided"';
    const params = [];
    
    if (filters.startDate) {
      whereClause += ' AND DATE(s.created_at) >= DATE(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      whereClause += ' AND DATE(s.created_at) <= DATE(?)';
      params.push(filters.endDate);
    }
    
    if (filters.storeId) {
      whereClause += ' AND s.store_id = ?';
      params.push(filters.storeId);
    }
    
    const query = `
      SELECT 
        p.id, p.name, p.sku, p.barcode,
        SUM(si.quantity) as total_quantity,
        SUM(si.total_price) as total_revenue,
        COUNT(DISTINCT si.sale_id) as sale_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, p.sku, p.barcode
      ORDER BY total_quantity DESC
      LIMIT ?
    `;
    
    params.push(limit);
    
    return await this.db.all(query, params);
  }

  // Get sales by payment method
  async getSalesByPaymentMethod(filters = {}) {
    let whereClause = 'WHERE payment_status != "voided"';
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
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM sales
      ${whereClause}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;
    
    return await this.db.all(query, params);
  }

  // Get daily sales summary
  async getDailySalesSummary(days = 30, storeId = null) {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_sale
      FROM sales
      WHERE payment_status != 'voided' AND DATE(created_at) >= DATE('now', '-${days} days')
    `;
    
    const params = [];
    
    if (storeId) {
      query += ' AND store_id = ?';
      params.push(storeId);
    }
    
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    return await this.db.all(query, params);
  }

  // Get recent sales
  async getRecent(limit = 10, storeId = null) {
    let query = `
      SELECT s.*, u.email as staff_email
      FROM sales s
      LEFT JOIN users u ON s.staff_id = u.id
      WHERE s.payment_status != 'voided'
    `;
    
    const params = [];
    
    if (storeId) {
      query += ' AND s.store_id = ?';
      params.push(storeId);
    }
    
    query += ' ORDER BY s.created_at DESC LIMIT ?';
    params.push(limit);
    
    return await this.db.all(query, params);
  }

  // Get sales needing sync
  async getPendingSync() {
    const query = `
      SELECT * FROM sales 
      WHERE sync_status = 'pending' OR sync_status = 'conflict'
      ORDER BY updated_at ASC
    `;
    
    return await this.db.all(query);
  }

  // Mark sale as synced
  async markAsSynced(id) {
    const query = `
      UPDATE sales SET sync_status = 'synced' 
      WHERE id = ?
    `;
    
    await this.db.run(query, [id]);
  }

  // Export sales data
  async exportSales(filters = {}) {
    const sales = await this.getAll(filters);
    
    // Transform data for export
    return sales.map(sale => ({
      'Bill Number': sale.bill_number,
      'Date': sale.created_at,
      'Customer': sale.customer_name || 'Walk-in',
      'Phone': sale.customer_phone || '',
      'Items': sale.item_count,
      'Subtotal': sale.subtotal,
      'Discount': sale.discount_amount,
      'Tax': sale.tax_amount,
      'Total': sale.total_amount,
      'Payment Method': sale.payment_method,
      'Status': sale.payment_status,
      'Staff': sale.staff_email || 'System'
    }));
  }
}

module.exports = SalesQueries;
