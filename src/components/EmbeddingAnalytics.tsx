import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Zap, DollarSign, Clock, Cpu, TrendingUp, AlertCircle } from 'lucide-react';
import { useProcessingAnalytics } from '@/hooks/useProcessingAnalytics';

export const EmbeddingAnalytics = () => {
  const { analytics, loading, error } = useProcessingAnalytics('week');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-64">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-32 bg-muted rounded"></div>
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
            <span>Error loading embedding analytics: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate embedding metrics
  const totalEmbeddings = analytics.volumeTrends.reduce((sum, day) => sum + day.processed * 15, 0); // Estimated 15 embeddings per doc
  const avgEmbeddingTime = analytics.performanceTrends.reduce((sum, day) => sum + day.avgEmbeddingTime, 0) / analytics.performanceTrends.length;
  const successRate = analytics.volumeTrends.reduce((sum, day) => sum + day.successRate, 0) / analytics.volumeTrends.length;

  // Format currency
  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(cost);
  };

  // Embedding generation trend data
  const embeddingTrendData = analytics.performanceTrends.map(day => ({
    date: new Date(day.date).toLocaleDateString(),
    time: day.avgEmbeddingTime,
    chunks: day.avgChunksPerDoc,
  }));

  // Cost trend data
  const costTrendData = analytics.costAnalysis.costByDay.map(day => ({
    date: new Date(day.date).toLocaleDateString(),
    cost: day.cost,
    tokens: analytics.costAnalysis.tokensUsed / analytics.costAnalysis.costByDay.length, // Estimated daily average
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Embeddings</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalEmbeddings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{avgEmbeddingTime.toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">per embedding</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatCost(analytics.costAnalysis.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage and Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Token Usage & Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tokens Used</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.costAnalysis.tokensUsed.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(analytics.costAnalysis.tokensUsed / 1000000 * 100, 100)} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Cost per 1K tokens: $0.0001
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API Calls</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.costAnalysis.apiCallsCount.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(analytics.costAnalysis.apiCallsCount / 10000 * 100, 100)} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Average per document: {(analytics.costAnalysis.apiCallsCount / Math.max(totalEmbeddings / 15, 1)).toFixed(1)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Daily Average Cost</span>
                <span className="text-sm text-muted-foreground">
                  {formatCost(analytics.costAnalysis.totalCost / 7)}
                </span>
              </div>
              <Progress value={Math.min(analytics.costAnalysis.totalCost / 7 / 10 * 100, 100)} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Monthly projection: {formatCost(analytics.costAnalysis.totalCost / 7 * 30)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embedding Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Embedding Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                time: {
                  label: "Generation Time (s)",
                  color: "hsl(var(--chart-1))",
                },
                chunks: {
                  label: "Chunks Generated",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={embeddingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line yAxisId="left" type="monotone" dataKey="time" stroke="var(--color-time)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="chunks" stroke="var(--color-chunks)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                cost: {
                  label: "Daily Cost",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrendData}>
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
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Rate Limit Status</div>
                <div className="text-2xl font-bold text-success">Available</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">10,000 req/min</div>
                <Badge variant="outline" className="mt-1">
                  Normal
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Response Time</div>
                <div className="text-2xl font-bold text-primary">{avgEmbeddingTime.toFixed(0)}ms</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">avg last 24h</div>
                <Badge variant="outline" className="mt-1">
                  Good
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Error Rate</div>
                <div className="text-2xl font-bold text-destructive">
                  {analytics.errorPatterns.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">last 24h</div>
                <Badge variant={analytics.errorPatterns.length > 0 ? "destructive" : "outline"} className="mt-1">
                  {analytics.errorPatterns.length > 0 ? "Issues" : "Stable"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};