import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, CheckCircle, AlertTriangle, FileText, Zap, Database, RefreshCw } from 'lucide-react';
import { useProcessingAnalytics } from '@/hooks/useProcessingAnalytics';
import { cn } from '@/lib/utils';

export const ProcessingPipeline = () => {
  const { analytics, loading, error, refreshAnalytics } = useProcessingAnalytics('week');

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
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading pipeline data: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'queued':
        return <Clock className="h-5 w-5" />;
      case 'processing':
        return <Zap className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'queued':
        return 'text-muted-foreground';
      case 'processing':
        return 'text-primary';
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'queued':
        return 'secondary' as const;
      case 'processing':
        return 'default' as const;
      case 'completed':
        return 'outline' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    return `${Math.floor(minutes / 60)}h ${(minutes % 60).toFixed(0)}m`;
  };

  const totalDocuments = analytics.pipelineStages.reduce((sum, stage) => sum + stage.count, 0);
  const throughputTrend = analytics.volumeTrends.slice(-7).reduce((sum, day) => sum + day.processed, 0) / 7;

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Document Processing Pipeline
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalytics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Pipeline Flow */}
            <div className="flex items-center justify-between mb-6">
              {analytics.pipelineStages.map((stage, index) => (
                <React.Fragment key={stage.stage}>
                  <div className="flex flex-col items-center space-y-2">
                    <div className={cn(
                      "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors",
                      getStageColor(stage.stage),
                      stage.bottleneck ? "border-destructive bg-destructive/10" : "border-current bg-background"
                    )}>
                      {getStageIcon(stage.stage)}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{stage.stage}</div>
                      <Badge variant={getBadgeVariant(stage.stage)} className="mt-1">
                        {stage.count}
                      </Badge>
                    </div>
                  </div>
                  {index < analytics.pipelineStages.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Stage Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.pipelineStages.map((stage) => (
                <Card key={stage.stage} className={cn(
                  "relative",
                  stage.bottleneck && "border-destructive"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{stage.stage}</h4>
                      {stage.bottleneck && (
                        <Badge variant="destructive" className="text-xs">
                          Bottleneck
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Documents:</span>
                        <span className="font-medium">{stage.count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Time:</span>
                        <span className="font-medium">{formatTime(stage.avgTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>% of Total:</span>
                        <span className="font-medium">
                          {totalDocuments > 0 ? ((stage.count / totalDocuments) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Throughput Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Throughput Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{throughputTrend.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">avg docs/day</div>
              </div>
              <Progress value={Math.min(throughputTrend / 100 * 100, 100)} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">
                Target: 100 docs/day
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {analytics.volumeTrends.slice(-1)[0]?.successRate.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">success rate</div>
              </div>
              <Progress value={analytics.volumeTrends.slice(-1)[0]?.successRate || 0} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">
                Target: 95%
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">
                  {analytics.pipelineStages.reduce((sum, stage) => sum + stage.avgTime, 0).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">avg total time (min)</div>
              </div>
              <Progress value={Math.min(analytics.pipelineStages.reduce((sum, stage) => sum + stage.avgTime, 0) / 60 * 100, 100)} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">
                Target: &lt;60 min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bottleneck Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.pipelineStages.filter(stage => stage.bottleneck).length > 0 ? (
              analytics.pipelineStages
                .filter(stage => stage.bottleneck)
                .map((stage, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <div className="font-medium">{stage.stage} Stage</div>
                        <div className="text-sm text-muted-foreground">
                          {stage.count} documents taking {formatTime(stage.avgTime)} on average
                        </div>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      Bottleneck
                    </Badge>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p>No bottlenecks detected in the pipeline</p>
                <p className="text-sm">All stages are processing within normal parameters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};