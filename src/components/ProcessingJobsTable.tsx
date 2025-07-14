import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type ProcessingJob = Tables<'processing_jobs'>;

interface ProcessingJobsTableProps {
  jobs: ProcessingJob[];
  onRefresh: () => void;
  loading?: boolean;
}

export default function ProcessingJobsTable({ jobs, onRefresh, loading = false }: ProcessingJobsTableProps) {
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: { variant: 'secondary' as const, icon: Clock, color: 'text-blue-600' },
      processing: { variant: 'default' as const, icon: RefreshCw, color: 'text-blue-600' },
      completed: { variant: 'secondary' as const, icon: CheckCircle, color: 'text-green-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getProgress = (job: ProcessingJob) => {
    if (job.status === 'completed') return 100;
    if (job.status === 'failed') return 0;
    if (job.total_chunks && job.chunks_processed) {
      return Math.round((job.chunks_processed / job.total_chunks) * 100);
    }
    return job.status === 'processing' ? 15 : 0;
  };

  const getProcessingTime = (job: ProcessingJob) => {
    const start = job.started_at ? new Date(job.started_at) : new Date(job.created_at);
    const end = job.completed_at ? new Date(job.completed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ${diffSeconds % 60}s`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m`;
  };

  const handleRetry = async (job: ProcessingJob) => {
    try {
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          fileName: job.document_name,
          originalName: job.original_name,
          retryJobId: job.id
        },
      });

      if (error) throw error;

      toast({
        title: "Retry initiated",
        description: `Processing for "${job.original_name}" has been restarted.`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error.message || "Failed to retry processing",
        variant: "destructive",
      });
    }
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Processing Jobs Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No processing jobs found. Upload a document to see processing status here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Processing Jobs Monitor
            <Badge variant="outline">{jobs.length} jobs</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{job.original_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(job.status)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2 min-w-[120px]">
                      <Progress value={getProgress(job)} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {job.chunks_processed && job.total_chunks ? (
                          `${job.chunks_processed}/${job.total_chunks} chunks`
                        ) : (
                          `${getProgress(job)}%`
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {job.processing_method || 'basic'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {getProcessingTime(job)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {job.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      {job.error_message && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Error Details",
                              description: job.error_message,
                              variant: "destructive",
                            });
                          }}
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}