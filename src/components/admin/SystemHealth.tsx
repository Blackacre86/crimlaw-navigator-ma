import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Database, Zap, HardDrive, AlertCircle } from 'lucide-react';

interface SystemHealthProps {
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    openaiApi: 'healthy' | 'warning' | 'error';
    storage: { used: number; total: number };
    errorRate: number;
  };
}

export function SystemHealth({ systemHealth }: SystemHealthProps) {
  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="text-success border-success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-warning border-warning">Warning</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-destructive border-destructive">Error</Badge>;
    }
  };

  const storageUsagePercent = (systemHealth.storage.used / systemHealth.storage.total) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Status */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Database</p>
              <p className="text-sm text-muted-foreground">PostgreSQL Connection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(systemHealth.database)}
            {getStatusBadge(systemHealth.database)}
          </div>
        </div>

        {/* OpenAI API Status */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">OpenAI API</p>
              <p className="text-sm text-muted-foreground">AI Service Status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(systemHealth.openaiApi)}
            {getStatusBadge(systemHealth.openaiApi)}
          </div>
        </div>

        {/* Storage Usage */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Storage</p>
              <p className="text-sm text-muted-foreground">
                {systemHealth.storage.used} / {systemHealth.storage.total} documents
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{storageUsagePercent.toFixed(1)}%</p>
            <div className="w-16 h-2 bg-secondary rounded-full mt-1">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Error Rate</p>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{systemHealth.errorRate.toFixed(1)}%</p>
            {systemHealth.errorRate > 10 && (
              <p className="text-xs text-destructive">High error rate</p>
            )}
            {systemHealth.errorRate > 5 && systemHealth.errorRate <= 10 && (
              <p className="text-xs text-warning">Elevated errors</p>
            )}
            {systemHealth.errorRate <= 5 && (
              <p className="text-xs text-success">Normal</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}