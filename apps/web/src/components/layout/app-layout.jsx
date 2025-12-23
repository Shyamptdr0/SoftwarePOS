'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from './sidebar'
import { AppHeader } from './header'
import { Plus, Download } from 'lucide-react';

export function AppLayout({ children, title, description, actions }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if user data is stored in localStorage from login
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } else {
          // Fallback to mock data for development
          setUser({
            id: 1,
            name: 'Admin User',
            email: 'admin@shreempos.com',
            role: 'admin'
          });
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Fallback to default user
        setUser({
          id: 1,
          name: 'Admin User',
          email: 'admin@shreempos.com',
          role: 'admin'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar user={user} loading={loading} />
      <SidebarInset>
        <AppHeader title={title} user={user} loading={loading} />
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Page Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title || 'Dashboard'}</h1>
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </div>
          </div>
          
          {/* Page Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
