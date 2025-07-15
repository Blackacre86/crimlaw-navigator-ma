import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Clock, Activity, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useMetricsDashboard } from '@/hooks/useMetricsDashboard';

export const MetricsDashboard = () => {
  const { metrics, loading, error, refreshMetrics } = useMetricsDashboard();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-32">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading metrics: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    return `${Math.floor(minutes / 60)}h ${(minutes % 60).toFixed(0)}m`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(cost);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.currentActiveJobs}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {metrics.queueLength} queued
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{metrics.processingRate}</div>
            <p className="text-xs text-muted-foreground">docs/hour</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatTime(metrics.avgProcessingTime)}
            </div>
            <p className="text-xs text-muted-foreground">per document</p>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {metrics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg Chunks/Doc</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.avgChunksPerDoc.toFixed(1)}
                </span>
              </div>
              <Progress value={Math.min(metrics.avgChunksPerDoc / 50 * 100, 100)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Embedding Time</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.avgEmbeddingTime.toFixed(2)}s/chunk
                </span>
              </div>
              <Progress value={Math.min(metrics.avgEmbeddingTime / 10 * 100, 100)} className="h-2" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">API Response Time</div>
              <div className="font-medium">{metrics.apiStatus.lastApiResponse}ms</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">API Errors (24h)</div>
              <div className="font-medium">{metrics.apiStatus.apiErrors}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Rate Limit</div>
              <div className="font-medium">{metrics.apiStatus.openaiRateLimit.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {metrics.todayStats.docsProcessed}
              </div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">
                {metrics.todayStats.chunksGenerated.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Chunks</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {metrics.todayStats.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Tokens</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {formatCost(metrics.todayStats.estimatedCost)}
              </div>
              <div className="text-sm text-muted-foreground">Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};