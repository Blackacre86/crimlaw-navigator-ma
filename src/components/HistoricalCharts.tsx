import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Calendar, BarChart3, AlertCircle, Clock } from 'lucide-react';
import { useProcessingAnalytics } from '@/hooks/useProcessingAnalytics';

export const HistoricalCharts = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const { analytics, loading, error } = useProcessingAnalytics(timeRange);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="h-64">
          <CardContent className="p-4">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading historical data: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };

  const calculateTrend = (data: any[], key: string) => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1][key];
    const previous = data[data.length - 2][key];
    return ((current - previous) / previous) * 100;
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  // Calculate peak hours
  const peakHours = analytics.volumeTrends.reduce((peak, day) => {
    return day.processed > peak.processed ? day : peak;
  }, analytics.volumeTrends[0] || { processed: 0, date: '' });

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Analytics
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={timeRange === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('day')}
            >
              24h
            </Button>
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              30d
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-primary">
                  {analytics.volumeTrends.reduce((sum, day) => sum + day.processed, 0)}
                </div>
                {getTrendIcon(
                  analytics.volumeTrends.slice(-1)[0]?.processed || 0,
                  analytics.volumeTrends.slice(-2)[0]?.processed || 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Total Processed</div>
              <Badge variant="outline" className="mt-1">
                {formatPercentage(calculateTrend(analytics.volumeTrends, 'processed'))}
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-secondary">
                  {analytics.volumeTrends.reduce((sum, day) => sum + day.successRate, 0) / analytics.volumeTrends.length || 0}%
                </div>
                {getTrendIcon(
                  analytics.volumeTrends.slice(-1)[0]?.successRate || 0,
                  analytics.volumeTrends.slice(-2)[0]?.successRate || 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Avg Success Rate</div>
              <Badge variant="outline" className="mt-1">
                {formatPercentage(calculateTrend(analytics.volumeTrends, 'successRate'))}
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-accent">
                  {formatCost(analytics.costAnalysis.totalCost)}
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <Badge variant="outline" className="mt-1">
                {formatCost(analytics.costAnalysis.totalCost / Math.max(analytics.costAnalysis.costByDay.length, 1))} avg/day
              </Badge>
            </div>
          </div>

          {/* Peak Hours Insight */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <span className="font-medium">Peak Processing Day:</span> {new Date(peakHours.date).toLocaleDateString()} 
              <span className="text-muted-foreground"> ({peakHours.processed} documents)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="volume">Volume Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  processed: {
                    label: "Processed",
                    color: "hsl(var(--chart-1))",
                  },
                  failed: {
                    label: "Failed",
                    color: "hsl(var(--chart-2))",
                  },
                  successRate: {
                    label: "Success Rate (%)",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.volumeTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="left" dataKey="processed" fill="var(--color-processed)" />
                    <Bar yAxisId="left" dataKey="failed" fill="var(--color-failed)" />
                    <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="var(--color-successRate)" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  avgProcessingTime: {
                    label: "Avg Processing Time (min)",
                    color: "hsl(var(--chart-1))",
                  },
                  avgChunksPerDoc: {
                    label: "Avg Chunks/Doc",
                    color: "hsl(var(--chart-2))",
                  },
                  avgEmbeddingTime: {
                    label: "Avg Embedding Time (s)",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="avgProcessingTime" stroke="var(--color-avgProcessingTime)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="avgChunksPerDoc" stroke="var(--color-avgChunksPerDoc)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="avgEmbeddingTime" stroke="var(--color-avgEmbeddingTime)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cost: {
                    label: "Daily Cost",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.costAnalysis.costByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Error Patterns Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.errorPatterns.length > 0 ? (
              analytics.errorPatterns.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">{error.errorType}</div>
                      <div className="text-sm text-muted-foreground">
                        Last occurrence: {new Date(error.lastOccurrence).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive">{error.count} occurrences</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No error patterns detected in the selected time range</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};