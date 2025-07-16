import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProcessingJobs } from '@/hooks/useProcessingJobs';

export function ProcessingJobsManager() {
  const { jobs, loading, error, refreshJobs, stats } = useProcessingJobs();
  const { toast } = useToast();

  const handleRetryFailedJobs = async () => {
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    if (failedJobs.length === 0) {
      toast({
        title: "No failed jobs",
        description: "There are no failed jobs to retry.",
      });
      return;
    }

    try {
      // Use the cleanup function to reset failed jobs
      const { error } = await supabase.rpc('cleanup_all_failed_jobs');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Failed jobs cleaned up",
        description: `${failedJobs.length} failed jobs have been reset to pending status.`,
      });

      refreshJobs();
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCleanupCompletedJobs = async () => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      toast({
        title: "No completed jobs",
        description: "There are no completed jobs to clean up.",
      });
      return;
    }

    if (!confirm(`Delete ${completedJobs.length} completed jobs? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('processing_jobs')
        .delete()
        .eq('status', 'completed');

      if (error) throw error;

      toast({
        title: "Cleanup completed",
        description: `${completedJobs.length} completed jobs have been deleted.`,
      });

      refreshJobs();
    } catch (error: any) {
      toast({
        title: "Cleanup failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Processing Jobs Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load processing jobs: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Processing Jobs Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-sm text-muted-foreground">Processing</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.queued}</div>
            <div className="text-sm text-muted-foreground">Queued</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <Badge variant={stats.successRate >= 90 ? "default" : stats.successRate >= 70 ? "secondary" : "destructive"}>
              {stats.successRate.toFixed(1)}%
            </Badge>
          </div>
          <div className="mt-2 bg-background rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.successRate}%` }}
            />
          </div>
        </div>

        {/* Management Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={refreshJobs}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Jobs
          </Button>

          <Button
            onClick={handleRetryFailedJobs}
            variant="outline"
            disabled={loading || stats.failed === 0}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Failed Jobs ({stats.failed})
          </Button>

          <Button
            onClick={handleCleanupCompletedJobs}
            variant="outline"
            disabled={loading || stats.completed === 0}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Completed ({stats.completed})
          </Button>
        </div>

        {/* Status Information */}
        {stats.processing > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {stats.processing} job(s) currently processing. Please wait for completion before performing bulk operations.
            </AlertDescription>
          </Alert>
        )}

        {stats.failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.failed} job(s) failed and may need attention. Use "Retry Failed Jobs" to reset them to pending status.
            </AlertDescription>
          </Alert>
        )}

        {stats.total === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No processing jobs found. Jobs will appear here when documents are uploaded for processing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}