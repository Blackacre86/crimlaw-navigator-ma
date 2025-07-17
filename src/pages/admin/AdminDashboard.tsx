import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  FileText, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Database,
  Activity,
  BarChart3,
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { pythonAPI } from '@/lib/python-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Empowering administrators with comprehensive oversight of legal research platform
export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    totalSearches: 0,
    avgResponseTime: 0,
    systemHealth: 'checking'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for charts - would come from real analytics
  const searchTrends = [
    { name: 'Mon', searches: 24, users: 12 },
    { name: 'Tue', searches: 32, users: 18 },
    { name: 'Wed', searches: 45, users: 22 },
    { name: 'Thu', searches: 38, users: 19 },
    { name: 'Fri', searches: 52, users: 28 },
    { name: 'Sat', searches: 15, users: 8 },
    { name: 'Sun', searches: 18, users: 10 }
  ];

  const documentCategories = [
    { name: 'Criminal Statutes', count: 156, color: '#3b82f6' },
    { name: 'Case Law', count: 234, color: '#10b981' },
    { name: 'Procedures', count: 89, color: '#f59e0b' },
    { name: 'Jury Instructions', count: 67, color: '#ef4444' }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load system statistics
      const [usersResult, documentsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('documents').select('id', { count: 'exact' })
      ]);

      // Check Python backend health
      const backendHealthy = await pythonAPI.checkHealth();

      setSystemStats({
        totalUsers: usersResult.count || 0,
        totalDocuments: documentsResult.count || 0,
        totalSearches: 1247, // Mock data - would come from query_logs table
        avgResponseTime: 1.2, // Mock data
        systemHealth: backendHealthy ? 'healthy' : 'degraded'
      });

      // Load recent activity (mock for now)
      setRecentActivity([
        { id: 1, type: 'search', user: 'Officer Johnson', action: 'Searched for DUI penalties', time: '2 minutes ago' },
        { id: 2, type: 'upload', user: 'Admin Smith', action: 'Uploaded new case law document', time: '15 minutes ago' },
        { id: 3, type: 'user', user: 'Detective Brown', action: 'Joined the platform', time: '1 hour ago' },
        { id: 4, type: 'search', user: 'Sergeant Davis', action: 'Searched for Miranda rights', time: '2 hours ago' }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load some dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="destructive">Degraded</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search className="h-4 w-4 text-blue-500" />;
      case 'upload':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'user':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Administrator privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive oversight of the LexInnova legal research platform
          </p>
        </div>

        {/* System Health Alert */}
        {systemStats.systemHealth === 'degraded' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System performance is degraded. Python backend may be experiencing issues.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">Ready for search</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalSearches.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.avgResponseTime}s</div>
              <p className="text-xs text-muted-foreground">-0.3s improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Search Activity Trends
              </CardTitle>
              <CardDescription>
                Daily search volume and active users over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={searchTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="searches" fill="#3b82f6" name="Searches" />
                  <Bar dataKey="users" fill="#10b981" name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Document Categories
              </CardTitle>
              <CardDescription>
                Distribution of legal documents by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentCategories.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                    <Progress 
                      value={(category.count / 546) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current health and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Health</span>
                {getHealthBadge(systemStats.systemHealth)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Frontend Status</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Python Backend</span>
                {systemStats.systemHealth === 'healthy' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Issues
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4">
                <Settings className="h-4 w-4 mr-2" />
                System Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest user actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {activity.user}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="ghost" size="sm" className="w-full mt-4">
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and system management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Manage Documents</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Upload, organize, and delete legal documents
                  </div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">User Management</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    View users, manage permissions, and access logs
                  </div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">System Settings</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Configure search parameters and AI settings
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}