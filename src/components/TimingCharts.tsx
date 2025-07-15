import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';
import { useMetricsDashboard } from '@/hooks/useMetricsDashboard';

interface TimingData {
  document: string;
  upload_ms?: number;
  parse_ms?: number;
  chunk_ms?: number;
  embed_ms?: number;
  pginsert_ms?: number;
  total_ms?: number;
}

export function TimingCharts() {
  const { metrics, loading, error } = useMetricsDashboard();
  
  // Mock data for now - will be replaced with actual data from useMetricsDashboard
  const mockTimingData: TimingData[] = [
    {
      document: "Doc 1",
      upload_ms: 1200,
      parse_ms: 3400,
      chunk_ms: 2100,
      embed_ms: 8500,
      pginsert_ms: 400,
      total_ms: 15600
    },
    {
      document: "Doc 2", 
      upload_ms: 800,
      parse_ms: 2800,
      chunk_ms: 1800,
      embed_ms: 7200,
      pginsert_ms: 350,
      total_ms: 12950
    },
    {
      document: "Doc 3",
      upload_ms: 1500,
      parse_ms: 4200,
      chunk_ms: 2400,
      embed_ms: 9800,
      pginsert_ms: 600,
      total_ms: 18500
    },
    {
      document: "Doc 4",
      upload_ms: 900,
      parse_ms: 3100,
      chunk_ms: 1900,
      embed_ms: 6800,
      pginsert_ms: 300,
      total_ms: 13000
    },
    {
      document: "Doc 5",
      upload_ms: 1100,
      parse_ms: 3600,
      chunk_ms: 2200,
      embed_ms: 8100,
      pginsert_ms: 450,
      total_ms: 15450
    }
  ];

  const formatTooltip = (value: number, name: string) => {
    const formatted = value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
    const labels: Record<string, string> = {
      upload_ms: 'Upload',
      parse_ms: 'Parse',
      chunk_ms: 'Chunk',
      embed_ms: 'Embed',
      pginsert_ms: 'DB Insert',
      total_ms: 'Total'
    };
    return [formatted, labels[name] || name];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processing Time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading timing data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processing Time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-destructive">Error loading timing data: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Processing Time Analytics
          <TrendingUp className="h-4 w-4 ml-auto text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockTimingData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="document" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                tickFormatter={(value) => value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`}
              />
              <Tooltip
                formatter={formatTooltip}
                labelClassName="text-foreground"
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="upload_ms" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                name="Upload"
              />
              <Line 
                type="monotone" 
                dataKey="parse_ms" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
                name="Parse"
              />
              <Line 
                type="monotone" 
                dataKey="chunk_ms" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                name="Chunk"
              />
              <Line 
                type="monotone" 
                dataKey="embed_ms" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                name="Embed"
              />
              <Line 
                type="monotone" 
                dataKey="pginsert_ms" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name="DB Insert"
              />
              <Line 
                type="monotone" 
                dataKey="total_ms" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Avg Upload</div>
            <div className="font-semibold">1.1s</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Avg Embedding</div>
            <div className="font-semibold">8.1s</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Avg Total</div>
            <div className="font-semibold">15.1s</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}