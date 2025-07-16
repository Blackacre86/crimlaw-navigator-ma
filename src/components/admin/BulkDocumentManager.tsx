import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentStats {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
}

export function BulkDocumentManager() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const { toast } = useToast();

  const checkDocumentStats = async () => {
    setLoading(true);
    try {
      // Get simple document counts
      const { data: allDocs } = await supabase
        .from('documents')
        .select('id, ingestion_status');

      const totalDocuments = allDocs?.length || 0;
      const completedDocuments = allDocs?.filter(doc => doc.ingestion_status === 'completed').length || 0;
      const failedDocuments = allDocs?.filter(doc => doc.ingestion_status === 'failed').length || 0;

      setStats({
        totalDocuments,
        completedDocuments,
        failedDocuments
      });

      toast({
        title: "Document Analysis Complete",
        description: `${totalDocuments} total documents, ${completedDocuments} completed, ${failedDocuments} failed.`
      });
    } catch (error) {
      console.error('Error checking document stats:', error);
      toast({
        title: "Error",
        description: "Failed to analyze documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupFailedJobs = async () => {
    setLoading(true);
    try {
      // Use the new simplified cleanup function
      const { error } = await supabase.rpc('cleanup_all_failed_jobs');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Cleanup Complete",
        description: "All failed jobs have been cleaned up.",
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

  const deleteAllFailedDocuments = async () => {
    if (!confirm('Are you sure you want to delete all failed documents? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete failed documents
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('ingestion_status', 'failed');

      if (error) {
        throw error;
      }

      toast({
        title: "Failed Documents Deleted",
        description: "All failed documents have been removed.",
      });

      setStats(null);
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete documents. Please try again.",
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
            <Upload className="h-5 w-5" />
            Simple Document Management
          </CardTitle>
          <CardDescription>
            Upload documents and forget about them - processing happens automatically in the background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={checkDocumentStats}
              disabled={loading}
              variant="outline"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Check Document Status
            </Button>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.totalDocuments}</div>
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.completedDocuments}</div>
                <div className="text-sm text-muted-foreground">Ready to Search</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">{stats.failedDocuments}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}

          {stats && stats.failedDocuments > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={cleanupFailedJobs}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Clean Up Failed Processing
              </Button>
              
              <Button
                onClick={deleteAllFailedDocuments}
                disabled={loading}
                variant="destructive"
                size="sm"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete All Failed Documents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}