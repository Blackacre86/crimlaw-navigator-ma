import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function SystemRepairPanel() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairStatus, setRepairStatus] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<{
    pendingDocs: number;
    completedWithNoChunks: number;
    totalChunks: number;
    searchFunctionStatus: 'working' | 'error' | 'unknown';
  } | null>(null);
  const { toast } = useToast();

  const checkSystemStatus = async () => {
    try {
      // Check document and chunk counts
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('ingestion_status', 'pending');

      const { data: completedWithNoChunks } = await supabase
        .from('documents')
        .select('id')
        .eq('ingestion_status', 'completed')
        .or('chunk_count.eq.0,chunk_count.is.null');

      const { data: chunks } = await supabase
        .from('chunks')
        .select('id');

      // Test hybrid search function
      let searchFunctionStatus: 'working' | 'error' | 'unknown' = 'unknown';
      try {
        await supabase.rpc('hybrid_search', {
          query_text: 'test',
          query_embedding: `[${Array(1536).fill(0).join(',')}]`,
          match_count: 1
        });
        searchFunctionStatus = 'working';
      } catch (error) {
        searchFunctionStatus = 'error';
      }

      setSystemStatus({
        pendingDocs: pendingDocs?.length || 0,
        completedWithNoChunks: completedWithNoChunks?.length || 0,
        totalChunks: chunks?.length || 0,
        searchFunctionStatus
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      toast({
        title: "Error",
        description: "Failed to check system status",
        variant: "destructive"
      });
    }
  };

  const startSystemRepair = async () => {
    setIsRepairing(true);
    setRepairProgress(0);
    setRepairStatus('Starting system repair...');

    try {
      // Step 1: Check system status
      setRepairStatus('Checking system status...');
      setRepairProgress(20);
      await checkSystemStatus();

      // Step 2: Run cleanup function
      setRepairStatus('Cleaning up failed processing jobs...');
      setRepairProgress(40);
      await supabase.rpc('cleanup_failed_processing_jobs');

      // Step 3: Start reprocessing documents
      setRepairStatus('Starting document reprocessing...');
      setRepairProgress(60);
      const { data: reprocessResult, error } = await supabase.rpc('reprocess_all_documents');
      
      if (error) {
        throw error;
      }

      setRepairProgress(80);
      setRepairStatus('Finalizing repair...');

      // Step 4: Final status check
      await checkSystemStatus();
      setRepairProgress(100);
      setRepairStatus('System repair completed!');

      toast({
        title: "System Repair Completed",
        description: `Processed ${reprocessResult?.[0]?.processed_count || 0} documents successfully`,
      });

    } catch (error) {
      console.error('System repair failed:', error);
      setRepairStatus('System repair failed');
      toast({
        title: "System Repair Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            System Repair Panel
          </CardTitle>
          <CardDescription>
            Diagnose and repair document processing and search issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={checkSystemStatus}
              variant="outline"
              disabled={isRepairing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check System Status
            </Button>
            <Button
              onClick={startSystemRepair}
              disabled={isRepairing}
              className="bg-primary hover:bg-primary/90"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start System Repair
            </Button>
          </div>

          {isRepairing && (
            <div className="space-y-2">
              <Progress value={repairProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{repairStatus}</p>
            </div>
          )}

          {systemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pending Docs</span>
                    <Badge variant={systemStatus.pendingDocs > 0 ? "destructive" : "secondary"}>
                      {systemStatus.pendingDocs}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Broken Docs</span>
                    <Badge variant={systemStatus.completedWithNoChunks > 0 ? "destructive" : "secondary"}>
                      {systemStatus.completedWithNoChunks}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Chunks</span>
                    <Badge variant="outline">
                      {systemStatus.totalChunks}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Search Function</span>
                    <div className="flex items-center gap-1">
                      {systemStatus.searchFunctionStatus === 'working' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={systemStatus.searchFunctionStatus === 'working' ? "secondary" : "destructive"}>
                        {systemStatus.searchFunctionStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>System Repair Process:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Fixes database function type mismatches</li>
                <li>Resets corrupted "completed" documents with 0 chunks to "pending"</li>
                <li>Cleans up orphaned processing jobs</li>
                <li>Reprocesses all pending documents</li>
                <li>Verifies search functionality</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}