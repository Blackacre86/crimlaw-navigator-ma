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

  const essentialStats = [
    {
      label: 'Active Jobs',
      value: stats.processing,
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      animate: stats.processing > 0
    },
    {
      label: 'Queue Length',
      value: stats.queued,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200'
    },
    {
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200'
    },
    {
      label: 'Avg Time',
      value: '15s', // This will be updated to use actual timing data
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200'
    }
  ];

  return (
    <>
      {essentialStats.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`h-5 w-5 ${item.color} ${item.animate ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}