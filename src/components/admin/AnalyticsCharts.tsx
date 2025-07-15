import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface AnalyticsChartsProps {
  queryVolume: Array<{date: string; queries: number}>;
  topTopics: Array<{topic: string; count: number}>;
  responseTimes: Array<{date: string; avgTime: number}>;
  userGrowth: Array<{date: string; newUsers: number; activeUsers: number}>;
}

export function AnalyticsCharts({ queryVolume, topTopics, responseTimes, userGrowth }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Query Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Query Volume Trend</CardTitle>
          <CardDescription>Queries over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              queries: {
                label: "Queries",
                color: "hsl(var(--primary))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={queryVolume}>
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="queries" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Topics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Searched Topics</CardTitle>
          <CardDescription>Most frequent search terms</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Count",
                color: "hsl(var(--accent-blue))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTopics} layout="horizontal">
                <XAxis type="number" />
                <YAxis type="category" dataKey="topic" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--accent-blue))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Response Time Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trends</CardTitle>
          <CardDescription>Average response times over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              avgTime: {
                label: "Avg Time (ms)",
                color: "hsl(var(--accent-green))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseTimes}>
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="avgTime" 
                  stroke="hsl(var(--accent-green))" 
                  fill="hsl(var(--accent-green) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Active users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              activeUsers: {
                label: "Active Users",
                color: "hsl(var(--accent-purple))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="hsl(var(--accent-purple))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}