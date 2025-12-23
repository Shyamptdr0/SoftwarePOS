'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { getProducts, getInventoryTransactions, createInventoryTransaction } from '@/lib/db';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    const currentStore = localStorage.getItem('currentStore') || '550e8400-e29b-41d4-a716-446655440001';
    setStoreId(currentStore);
    fetchInventoryData(currentStore);
  }, []);

  const fetchInventoryData = async (storeId) => {
    try {
      setLoading(true);
      const [productsData, transactionsData] = await Promise.all([
        getProducts(storeId),
        getInventoryTransactions(storeId, 100)
      ]);
      
      setProducts(productsData);
      setTransactions(transactionsData);
      
      // Transform products to inventory format
      const inventoryData = productsData.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock_quantity,
        minStock: product.min_stock_level,
        maxStock: product.min_stock_level * 5, // Calculate max stock as 5x min
        location: 'Main Store', // Default location
        lastRestocked: product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'Unknown',
        sellingPrice: product.selling_price,
        categoryName: product.categories?.name || 'Uncategorized'
      }));
      
      setInventory(inventoryData);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (itemId, adjustment, reason) => {
    try {
      const transactionType = adjustment > 0 ? 'in' : 'out';
      const quantity = Math.abs(adjustment);
      
      await createInventoryTransaction({
        product_id: itemId,
        transaction_type: transactionType,
        quantity: quantity,
        reference_type: 'manual_adjustment',
        reference_id: null,
        notes: reason,
        store_id: storeId
      });
      
      // Refresh data
      await fetchInventoryData(storeId);
      
      setShowAdjustModal(false);
      setAdjustingItem(null);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    }
  };

  const getStockStatus = (item) => {
    if (item.currentStock === 0) return { status: 'Out of Stock', color: 'red' };
    if (item.currentStock <= item.minStock) return { status: 'Low Stock', color: 'yellow' };
    if (item.currentStock >= item.maxStock) return { status: 'Overstock', color: 'blue' };
    return { status: 'In Stock', color: 'green' };
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.currentStock <= item.minStock;
    } else if (stockFilter === 'out') {
      matchesStock = item.currentStock === 0;
    } else if (stockFilter === 'overstock') {
      matchesStock = item.currentStock >= item.maxStock;
    }
    
    return matchesSearch && matchesStock;
  });

  const StockAdjustModal = ({ item, onAdjust, onCancel }) => {
    const [adjustment, setAdjustment] = useState(0);
    const [reason, setReason] = useState('');
    const [adjustmentType, setAdjustmentType] = useState('add');

    const handleSubmit = (e) => {
      e.preventDefault();
      const finalAdjustment = adjustmentType === 'add' ? adjustment : -adjustment;
      onAdjust(item.id, finalAdjustment, reason);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Adjust Stock - {item.name}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Stock
              </label>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {item.currentStock}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adjustment Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="add"
                    checked={adjustmentType === 'add'}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="mr-2"
                  />
                  Add Stock
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="remove"
                    checked={adjustmentType === 'remove'}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="mr-2"
                  />
                  Remove Stock
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select reason</option>
                <option value="purchase">New Purchase</option>
                <option value="return">Customer Return</option>
                <option value="damage">Damage/Loss</option>
                <option value="correction">Stock Correction</option>
                <option value="transfer">Location Transfer</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Adjust Stock
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <AppLayout 
      title="Inventory Management"
      description="Track and manage your product inventory"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
                <option value="overstock">Overstock</option>
              </select>
            </div>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add Product
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Min/Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Restocked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.sku}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.categoryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {item.currentStock}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.minStock} / {item.maxStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
                            {stockStatus.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lastRestocked}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setAdjustingItem(item);
                              setShowAdjustModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Adjust Stock
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            History
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdjustModal && adjustingItem && (
        <StockAdjustModal
          item={adjustingItem}
          onAdjust={handleStockAdjustment}
          onCancel={() => {
            setShowAdjustModal(false);
            setAdjustingItem(null);
          }}
        />
      )}
    </AppLayout>
  );
}
