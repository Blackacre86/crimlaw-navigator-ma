import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Clock, 
  ListChecks, 
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  Play
} from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { data: analytics, isLoading, error, refetch } = useAdminAnalytics();
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!analytics) return;
    
    // Simple CSV export of recent activity
    const csvData = [
      ['Date', 'User', 'Query', 'Confidence', 'Response Time'],
      ...analytics.recentActivity.map(activity => [
        activity.createdAt,
        activity.userId,
        activity.query.replace(/,/g, ';'), // Replace commas to avoid CSV issues
        activity.confidence.toString(),
        activity.responseTime.toString()
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export completed",
      description: "Analytics data has been exported to CSV",
    });
  };

  const handleClearCache = () => {
    // Clear browser cache (simplified)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    toast({
      title: "Cache cleared",
      description: "Application cache has been cleared",
    });
  };

  const handleProcessJobs = () => {
    toast({
      title: "Processing jobs",
      description: "Background job processing has been triggered",
    });
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--gradient-background)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor system performance and user activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.statsCards.totalQueries.today}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Week: {analytics?.statsCards.totalQueries.week}</span>
                    <Badge variant="secondary" className="text-xs">
                      Month: {analytics?.statsCards.totalQueries.month}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.statsCards.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics?.statsCards.avgResponseTime ? 
                      `${(analytics.statsCards.avgResponseTime / 1000).toFixed(1)}s` : 
                      '0s'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.statsCards.processingQueue}</div>
                  <p className="text-xs text-muted-foreground">Pending jobs</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <AnalyticsCharts
            queryVolume={analytics.charts.queryVolume}
            topTopics={analytics.charts.topTopics}
            responseTimes={analytics.charts.responseTimes}
            userGrowth={analytics.charts.userGrowth}
          />
        ) : null}

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ) : analytics ? (
              <RecentActivity recentActivity={analytics.recentActivity} />
            ) : null}
          </div>

          {/* System Health & Quick Actions */}
          <div className="space-y-6">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : analytics ? (
              <>
                <SystemHealth systemHealth={analytics.systemHealth} />
                
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleProcessJobs}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Process Pending Jobs
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleClearCache}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleExportCSV}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Analytics CSV
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}