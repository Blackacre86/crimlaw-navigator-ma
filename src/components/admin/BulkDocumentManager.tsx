import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CleanupStats {
  documentsToDelete: number;
  jobsToDelete: number;
  duplicatesToRemove: number;
  stuckDocuments: number;
}

export function BulkDocumentManager() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const { toast } = useToast();

  const checkCleanupNeeded = async () => {
    setLoading(true);
    try {
      // Check for failed documents
      const { data: failedDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('ingestion_status', 'failed');

      // Check for orphaned processing jobs
      const { data: orphanedJobs } = await supabase
        .from('processing_jobs')
        .select('id')
        .is('document_id', null);

      // Check for stuck processing documents
      const { data: stuckDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('ingestion_status', 'processing')
        .lt('processing_started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      // Check for duplicate documents by title
      const { data: allDocs } = await supabase
        .from('documents')
        .select('id, title, content_hash');

      const titleGroups: { [key: string]: any[] } = {};
      allDocs?.forEach(doc => {
        if (!titleGroups[doc.title]) titleGroups[doc.title] = [];
        titleGroups[doc.title].push(doc);
      });

      const duplicatesToRemove = Object.values(titleGroups)
        .filter(group => group.length > 1)
        .reduce((sum, group) => sum + (group.length - 1), 0);

      setStats({
        documentsToDelete: (failedDocs?.length || 0),
        jobsToDelete: (orphanedJobs?.length || 0),
        duplicatesToRemove,
        stuckDocuments: (stuckDocs?.length || 0)
      });

      toast({
        title: "Cleanup Analysis Complete",
        description: `Found ${(failedDocs?.length || 0) + duplicatesToRemove + (stuckDocs?.length || 0)} documents that need attention.`
      });
    } catch (error) {
      console.error('Error checking cleanup needs:', error);
      toast({
        title: "Error",
        description: "Failed to analyze cleanup requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async () => {
    setLoading(true);
    try {
      // Run the cleanup function
      const { error } = await supabase.rpc('cleanup_failed_processing_jobs');
      
      if (error) {
        throw error;
      }

      // Delete failed documents
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('ingestion_status', 'failed');

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: "Cleanup Complete",
        description: "Successfully cleaned up failed documents and jobs.",
      });

      // Reset stats
      setStats(null);
    } catch (error) {
      console.error('Error performing cleanup:', error);
      toast({
        title: "Cleanup Failed",
        description: "An error occurred during cleanup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAllDocuments = async () => {
    setLoading(true);
    try {
      // Reset all documents to pending status
      const { error } = await supabase
        .from('documents')
        .update({
          ingestion_status: 'pending',
          chunked: false,
          processing_started_at: null,
          processing_completed_at: null,
          error_message: null
        })
        .neq('ingestion_status', 'completed');

      if (error) {
        throw error;
      }

      toast({
        title: "Documents Reset",
        description: "All non-completed documents have been reset to pending status.",
      });

      setStats(null);
    } catch (error) {
      console.error('Error resetting documents:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const forceReprocessAll = async () => {
    setLoading(true);
    try {
      // Import the document processor utility
      const { processAllDocuments } = await import('@/utils/documentProcessor');
      const result = await processAllDocuments();

      toast({
        title: "Reprocessing Complete",
        description: `Successfully processed ${result.success} documents. ${result.failed} failed.`,
      });
    } catch (error) {
      console.error('Error reprocessing documents:', error);
      toast({
        title: "Reprocessing Failed",
        description: "Failed to reprocess documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Bulk Document Management
          </CardTitle>
          <CardDescription>
            Clean up failed documents, duplicates, and reset processing states
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={checkCleanupNeeded}
              disabled={loading}
              variant="outline"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Analyze Cleanup Needs
            </Button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">{stats.documentsToDelete}</div>
                <div className="text-sm text-muted-foreground">Failed Documents</div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">{stats.jobsToDelete}</div>
                <div className="text-sm text-muted-foreground">Orphaned Jobs</div>
              </div>
              <div className="text-center p-4 bg-info/10 rounded-lg">
                <div className="text-2xl font-bold text-info">{stats.duplicatesToRemove}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">{stats.stuckDocuments}</div>
                <div className="text-sm text-muted-foreground">Stuck Processing</div>
              </div>
            </div>
          )}

          {stats && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={performCleanup}
                disabled={loading}
                variant="destructive"
                size="sm"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Clean Up Failed Items
              </Button>
              
              <Button
                onClick={resetAllDocuments}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reset All to Pending
              </Button>
              
              <Button
                onClick={forceReprocessAll}
                disabled={loading}
                variant="default"
                size="sm"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Force Reprocess All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}