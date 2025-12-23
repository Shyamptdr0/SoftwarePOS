'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from "@/components/ui/button"
import { Plus, Download } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    // Get store ID from localStorage or user context
    const currentStore = localStorage.getItem('currentStore') || '550e8400-e29b-41d4-a716-446655440001';
    setStoreId(currentStore);
    
    fetchDashboardData(currentStore);
  }, []);

  const fetchDashboardData = async (storeId) => {
    try {
      setLoading(true);
      
      // Fetch recent sales
      const salesResponse = await fetch(`/api/sales?storeId=${storeId}&limit=10`);
      const salesData = await salesResponse.json();
      
      if (salesData.success) {
        const transactions = salesData.data.map(sale => ({
          id: sale.bill_number,
          customer: sale.customer_name || 'Guest',
          amount: `$${parseFloat(sale.total_amount).toFixed(2)}`,
          status: sale.payment_status,
          time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setRecentTransactions(transactions);
      }

      // Fetch products for top products
      const productsResponse = await fetch(`/api/products?storeId=${storeId}`);
      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        const products = productsData.data.slice(0, 4).map((product, index) => ({
          name: product.name,
          sold: Math.floor(Math.random() * 50) + 10, // Mock sales data for now
          revenue: `$${(product.selling_price * (Math.floor(Math.random() * 50) + 10)).toFixed(2)}`
        }));
        setTopProducts(products);
      }

      // Calculate stats from real data
      const totalSales = salesData.success ? salesData.data.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) : 0;
      const todaySales = salesData.success ? salesData.data.filter(sale => {
        const saleDate = new Date(sale.created_at).toDateString();
        const today = new Date().toDateString();
        return saleDate === today;
      }).reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) : 0;

      setStats([
        { label: "Today's Sales", value: `$${todaySales.toFixed(2)}`, change: '+12%', positive: true },
        { label: 'Orders', value: salesData.success ? salesData.data.length.toString() : '0', change: '+8%', positive: true },
        { label: 'Products', value: productsData.success ? productsData.data.length.toString() : '0', change: '+5%', positive: true },
        { label: 'Revenue', value: `$${totalSales.toFixed(2)}`, change: '+15%', positive: true }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout 
      title="Dashboard"
      description="Welcome back! Here's your business overview."
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map((index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Top Products
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Transactions
            </h2>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.customer}
                    </p>
                    <p className="text-sm text-gray-500">{transaction.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.amount}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Products
            </h2>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">{product.sold} sold</p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.revenue}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            All Transactions
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      #{transaction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Product Performance
          </h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.revenue}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {product.sold} units sold
                  </span>
                  <div className="flex space-x-2">
                    <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                      Edit
                    </button>
                    <button className="text-sm text-red-600 hover:text-red-800 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
