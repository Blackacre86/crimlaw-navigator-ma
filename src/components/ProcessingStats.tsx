import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ProcessingStatsProps {
  stats: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    queued: number;
    successRate: number;
  };
}

export default function ProcessingStats({ stats }: ProcessingStatsProps) {
  const statItems = [
    {
      label: 'Total Jobs',
      value: stats.total,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200'
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      animate: stats.processing > 0
    },
    {
      label: 'Queued',
      value: stats.queued,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200'
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Processing Statistics
          </div>
          {stats.total > 0 && (
            <Badge variant={stats.successRate >= 80 ? 'secondary' : 'destructive'}>
              {stats.successRate}% Success Rate
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`text-center p-3 border rounded-lg ${item.bgColor}`}
              >
                <Icon className={`h-6 w-6 mx-auto mb-1 ${item.color} ${item.animate ? 'animate-spin' : ''}`} />
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs font-medium">{item.label}</p>
              </div>
            );
          })}
        </div>
        
        {stats.total > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Today's Activity</span>
              <span className="font-medium">{stats.total} documents processed</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}