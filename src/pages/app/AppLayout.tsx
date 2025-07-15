import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  Search, 
  FileText, 
  History, 
  User, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export default function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

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
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                >
                  <Settings className="h-5 w-5" />
                  <span>Document Management</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Admin</Badge>
                </NavLink>
              </div>
            )}
            
            {isAdmin && sidebarCollapsed && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
                title="Admin Dashboard"
              >
                <Settings className="h-5 w-5" />
              </NavLink>
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
      <div className="flex-1 flex">
        {/* Center Panel - Main Workspace */}
        <div className={`${aiPanelCollapsed ? 'flex-1' : 'flex-1 mr-80'} transition-all duration-300`}>
          <main className="h-full overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Right Panel - AI Co-Pilot */}
        <div className={`${aiPanelCollapsed ? 'w-12' : 'w-80'} border-l border-border transition-all duration-300 fixed right-0 top-0 h-full z-10 bg-gradient-card`}>
          {aiPanelCollapsed ? (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiPanelCollapsed(false)}
                className="w-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* AI Panel Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-accent-blue" />
                    <span className="font-semibold">AI Co-Pilot</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiPanelCollapsed(true)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* AI Chat Area */}
              <div className="flex-1 p-4 overflow-auto">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Ready to assist</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      Perform a search to see AI-generated answers with verifiable citations. 
                      I can help you with follow-up questions and deeper analysis.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Input Area */}
              <div className="p-4 border-t border-border">
                <div className="text-xs text-muted-foreground text-center">
                  AI responses will appear here after searches
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}