'use client';

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, User, LogOut, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AppHeader({ title, user, loading }) {
  const router = useRouter();

  // Get user initials for avatar fallback
  const getUserInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('currentStore');
        
        // Redirect to login page
        router.push('/auth/login');
      } else {
        console.error('Logout failed');
        // Still clear local data and redirect even if API fails
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('currentStore');
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local data and redirect even if there's an error
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('currentStore');
      router.push('/auth/login');
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4">
        {/* Sidebar trigger will be handled by SidebarProvider */}
      </div>
      
      {/* Separator */}
      <div className="h-6 w-px bg-border" />
      
      {/* Page Title */}
      <div className="flex items-center gap-2 px-4">
        <h1 className="font-semibold">{title || 'Dashboard'}</h1>
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Search */}
      <div className="relative mr-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm pl-8 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 px-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt={user?.name || 'User'} />
                <AvatarFallback>
                  {loading ? '...' : getUserInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {loading ? 'Loading...' : (user?.name || 'Admin User')}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {loading ? '...' : (user?.email || 'admin@techhub.com')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
