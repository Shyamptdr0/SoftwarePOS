'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from './app-layout';
import AllPages from './all-pages';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Archive,
  FileText,
  Settings,
  Bell,
  Search,
  User,
  LogOut,
  HelpCircle
} from 'lucide-react';

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard },
  { title: "POS Terminal", icon: ShoppingCart },
  { title: "Products", icon: Package },
  { title: "Inventory", icon: Archive },
  { title: "Reports", icon: FileText },
  { title: "Settings", icon: Settings }
];

export default function SidebarPage({ role = "admin", menuItems: customMenuItems, contentComponent: CustomContent }) {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token && role === "admin") {
      router.push("/admin/login");
    }
  }, [router, role]);

  const itemsToUse = customMenuItems || menuItems;
  const ContentComponent = CustomContent || AllPages;

  return (
    <AppLayout 
      title={activePage}
      description={`Manage your ${activePage.toLowerCase()} here`}
    >
      <ContentComponent activePage={activePage} setActivePage={setActivePage} />
    </AppLayout>
  );
}
