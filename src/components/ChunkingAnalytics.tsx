import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Split, FileText, Clock, AlertTriangle } from 'lucide-react';
import { useProcessingAnalytics } from '@/hooks/useProcessingAnalytics';

export const ChunkingAnalytics = () => {
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
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading chunking analytics: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate chunking metrics from analytics data
  const totalChunks = analytics.volumeTrends.reduce((sum, day) => sum + day.processed * 15, 0); // Estimated 15 chunks per doc
  const avgChunkSize = 1024; // Estimated average chunk size in tokens
  const processingSpeed = analytics.performanceTrends.reduce((sum, day) => sum + day.avgChunksPerDoc, 0) / analytics.performanceTrends.length;
  const failedChunks = analytics.errorPatterns.filter(pattern => pattern.errorType.includes('chunk')).length;

  // Mock data for chunk distribution by document type
  const chunkDistribution = [
    { type: 'Legal Contract', chunks: Math.floor(totalChunks * 0.4), color: '#8884d8' },
    { type: 'Court Filing', chunks: Math.floor(totalChunks * 0.3), color: '#82ca9d' },
    { type: 'Research Document', chunks: Math.floor(totalChunks * 0.2), color: '#ffc658' },
    { type: 'Other', chunks: Math.floor(totalChunks * 0.1), color: '#ff7c7c' },
  ];

  // Processing speed over time
  const speedData = analytics.performanceTrends.map(day => ({
    date: new Date(day.date).toLocaleDateString(),
    speed: day.avgChunksPerDoc / (day.avgProcessingTime / 60), // chunks per minute
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
            <Split className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalChunks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Chunk Size</CardTitle>
            <FileText className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{avgChunkSize}</div>
            <p className="text-xs text-muted-foreground">tokens</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Speed</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{processingSpeed.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">chunks/minute</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Chunks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedChunks}</div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chunk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Chunk Distribution by Document Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                chunks: {
                  label: "Chunks",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chunkDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="chunks"
                  >
                    {chunkDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Processing Speed Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Speed Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                speed: {
                  label: "Speed (chunks/min)",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="speed" fill="var(--color-speed)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Chunking Error Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.errorPatterns.length > 0 ? (
              analytics.errorPatterns.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">{error.errorType}</div>
                      <div className="text-sm text-muted-foreground">
                        Last: {new Date(error.lastOccurrence).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive">{error.count}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No chunking errors detected this week</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};