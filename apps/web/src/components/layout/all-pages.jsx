'use client';

import DashboardPage from '@/app/dashboard/page';
import POSPage from '@/app/pos/page';
import InventoryPage from '@/app/inventory/page';
import ProductsPage from '@/app/products/page';
import ReportsPage from '@/app/reports/page';
import SettingsPage from '@/app/settings/page';

export default function AllPages({ activePage, setActivePage }) {
  switch (activePage) {
    case "Dashboard":
      return <DashboardPage />;
    case "POS Terminal":
      return <POSPage />;
    case "Products":
      return <ProductsPage />;
    case "Inventory":
      return <InventoryPage />;
    case "Reports":
      return <ReportsPage />;
    case "Settings":
      return <SettingsPage />;
    default:
      return (
        <div className="p-4">
          <h2 className="text-xl font-semibold">Page Not Found</h2>
        </div>
      );
  }
}
