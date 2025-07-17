import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Scale, 
  Search, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react';

export default function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="h-screen flex" style={{ background: 'var(--gradient-background)' }}>
      {/* Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-primary" />
            {!sidebarCollapsed && <span className="text-xl font-bold text-sidebar-foreground">LexInnova</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Search className="h-5 w-5" />
              {!sidebarCollapsed && <span>Legal Research</span>}
            </NavLink>

            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <User className="h-5 w-5" />
              {!sidebarCollapsed && <span>Profile</span>}
            </NavLink>

            {isAdmin && !sidebarCollapsed && (
              <div className="mt-4 pt-4 border-t border-sidebar-border">
                <div className="px-3 pb-2">
                  <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
                    Admin
                  </span>
                </div>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Analytics</span>
                </NavLink>
                <NavLink
                  to="/admin/documents"
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                >
                  <FileText className="h-5 w-5" />
                  <span>Documents</span>
                </NavLink>
              </div>
            )}
            
            {isAdmin && sidebarCollapsed && (
              <div className="space-y-2">
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                  title="Analytics Dashboard"
                >
                  <BarChart3 className="h-5 w-5" />
                </NavLink>
                <NavLink
                  to="/admin/documents"
                  className={({ isActive }) =>
                    `flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                  title="Document Management"
                >
                  <FileText className="h-5 w-5" />
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* User Info & Controls */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
            </Button>
            
            {!sidebarCollapsed && (
              <>
                <div className="text-xs text-sidebar-foreground/70 px-2">
                  Signed in as {user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <main className="h-full overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}