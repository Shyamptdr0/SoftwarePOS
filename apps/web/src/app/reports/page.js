'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { getSales, getProducts } from '@/lib/db';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('sales');
  const [dateRange, setDateRange] = useState('7days');
  const [showExportModal, setShowExportModal] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    const currentStore = localStorage.getItem('currentStore') || '550e8400-e29b-41d4-a716-446655440001';
    setStoreId(currentStore);
    fetchReportData(currentStore);
  }, []);

  const fetchReportData = async (storeId) => {
    try {
      setLoading(true);
      const [sales, products] = await Promise.all([
        getSales(storeId, 100),
        getProducts(storeId)
      ]);
      
      setSalesData(sales);
      setProductsData(products);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return { startDate, endDate: now };
  };

  const getFilteredSalesData = () => {
    const { startDate, endDate } = getDateRangeFilter();
    
    return salesData
      .filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDate && saleDate <= endDate;
      })
      .reduce((acc, sale) => {
        const date = new Date(sale.created_at).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        
        if (existing) {
          existing.sales += 1;
          existing.revenue += parseFloat(sale.total_amount);
          existing.transactions += 1;
        } else {
          acc.push({
            date,
            sales: 1,
            revenue: parseFloat(sale.total_amount),
            transactions: 1
          });
        }
        
        return acc;
      }, [])
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10); // Last 10 days
  };

  const getTopProducts = () => {
    // Calculate product performance from sales data
    const productPerformance = {};
    
    salesData.forEach(sale => {
      if (sale.sale_items) {
        sale.sale_items.forEach(item => {
          const product = productsData.find(p => p.id === item.product_id);
          if (product) {
            if (!productPerformance[product.id]) {
              productPerformance[product.id] = {
                name: product.name,
                units: 0,
                revenue: 0
              };
            }
            productPerformance[product.id].units += item.quantity;
            productPerformance[product.id].revenue += item.total_price;
          }
        });
      }
    });
    
    return Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(product => ({
        ...product,
        growth: '+12%' // Placeholder growth calculation
      }));
  };

  const getReportSummary = () => {
    const filteredSales = getFilteredSalesData();
    const totalRevenue = filteredSales.reduce((sum, day) => sum + day.revenue, 0);
    const totalSales = filteredSales.reduce((sum, day) => sum + day.sales, 0);
    const avgTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    return {
      totalRevenue,
      totalSales,
      avgTransaction
    };
  };

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', description: 'Total sales, revenue, and transaction data' },
    { id: 'inventory', name: 'Inventory Report', description: 'Stock levels, movements, and valuations' },
    { id: 'products', name: 'Product Performance', description: 'Best-selling products and categories' },
    { id: 'customers', name: 'Customer Analytics', description: 'Customer behavior and purchase patterns' },
    { id: 'employees', name: 'Employee Performance', description: 'Staff sales and productivity metrics' },
    { id: 'financial', name: 'Financial Summary', description: 'Revenue, costs, and profit analysis' }
  ];

  const generateReport = () => {
    alert(`Generating ${selectedReport} report for ${dateRange}`);
  };

  const exportReport = (format) => {
    alert(`Exporting ${selectedReport} report as ${format.toUpperCase()}`);
    setShowExportModal(false);
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading report data...</p>
          </div>
        </div>
      );
    }

    const summary = getReportSummary();
    const filteredSales = getFilteredSalesData();
    const topProducts = getTopProducts();

    switch (selectedReport) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${summary.totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-green-600">+12.5% from last period</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSales}</p>
                <p className="text-sm text-green-600">+8.3% from last period</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Transaction</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${summary.avgTransaction.toFixed(2)}</p>
                <p className="text-sm text-red-600">-2.1% from last period</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Sales Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredSales.map((data, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{data.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{data.sales}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">${data.revenue.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{data.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Products</h3>
              <div className="space-y-4">
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                        <p className="text-sm text-gray-500">{product.units} units sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">${product.revenue.toFixed(2)}</p>
                        <p className={`text-sm ${product.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {product.growth} growth
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No product data available</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </h3>
              <p className="text-gray-500">
                Report data will be displayed here when the report system is fully implemented
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout 
      title="Reports"
      description="Generate and analyze business reports"
    >
      <div className="space-y-6">
        {/* Report Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Report Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedReport === report.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {report.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Compare With
              </label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="previous">Previous Period</option>
                <option value="lastyear">Last Year</option>
                <option value="none">No Comparison</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Report
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {renderReportContent()}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Export Report
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => exportReport('pdf')}
                className="w-full text-left px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">PDF</div>
                <div className="text-sm text-gray-500">Download as PDF document</div>
              </button>
              <button
                onClick={() => exportReport('excel')}
                className="w-full text-left px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">Excel</div>
                <div className="text-sm text-gray-500">Download as Excel spreadsheet</div>
              </button>
              <button
                onClick={() => exportReport('csv')}
                className="w-full text-left px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">CSV</div>
                <div className="text-sm text-gray-500">Download as CSV file</div>
              </button>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
