import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { processAllDocuments } from '@/utils/documentProcessor';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface RebuildStatus {
  phase: string;
  message: string;
  progress: number;
  isComplete: boolean;
  success?: number;
  failed?: number;
}

export function EmergencySystemRebuild() {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [status, setStatus] = useState<RebuildStatus>({
    phase: 'Ready',
    message: 'System ready for emergency rebuild',
    progress: 0,
    isComplete: false
  });

  const updateStatus = (phase: string, message: string, progress: number, isComplete = false) => {
    setStatus({ phase, message, progress, isComplete });
  };

  const executeEmergencyRebuild = async () => {
    setIsRebuilding(true);
    try {
      // Phase 1: System already halted via migration
      updateStatus('Phase 1', 'System halt completed - documents reset to pending', 20);
      
      // Phase 2: Verify system state
      updateStatus('Phase 2', 'Verifying processing pipeline...', 40);
      
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('id, title')
        .eq('ingestion_status', 'pending');
      
      console.log('🔍 Found pending documents:', pendingDocs?.length || 0);
      
      // Phase 3: Process all documents
      updateStatus('Phase 3', `Processing ${pendingDocs?.length || 0} documents through OCR pipeline...`, 60);
      
      const result = await processAllDocuments();
      
      // Phase 4: Validation
      updateStatus('Phase 4', 'Validating system functionality...', 80);
      
      const { data: chunks } = await supabase
        .from('chunks')
        .select('id')
        .limit(1);
      
      const { data: completedDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('ingestion_status', 'completed');
      
      // Phase 5: Complete
      updateStatus(
        'Complete', 
        `Rebuild complete: ${result.success} successful, ${result.failed} failed. ${chunks?.length || 0} chunks, ${completedDocs?.length || 0} documents ready.`, 
        100, 
        true
      );
      
      setStatus(prev => ({ ...prev, success: result.success, failed: result.failed }));
      
    } catch (error) {
      console.error('❌ Emergency rebuild failed:', error);
      updateStatus('Failed', `Rebuild failed: ${error.message}`, 100, true);
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Emergency System Rebuild
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-destructive bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>CRITICAL:</strong> Documents have been stuck in processing since 5:14pm. 
            This will forcibly reset and reprocess all documents through the proper OCR pipeline.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">System Status</h4>
              <p className="text-sm text-muted-foreground">Current rebuild phase</p>
            </div>
            <Badge variant={status.isComplete ? (status.failed === 0 ? 'default' : 'destructive') : 'secondary'}>
              {status.phase}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{status.message}</span>
              <span>{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
          </div>

          {status.isComplete && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{status.success || 0}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{status.failed || 0}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={executeEmergencyRebuild}
            disabled={isRebuilding}
            variant="destructive"
            className="flex-1"
          >
            {isRebuilding ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Rebuilding System...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Execute Emergency Rebuild
              </>
            )}
          </Button>

          {status.isComplete && status.success > 0 && (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/app'}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Test Search
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>Phase 1:</strong> System halt completed ✓</div>
          <div><strong>Phase 2:</strong> Activate proper OCR pipeline</div>
          <div><strong>Phase 3:</strong> Batch reprocess all documents</div>
          <div><strong>Phase 4:</strong> System validation</div>
          <div><strong>Phase 5:</strong> Prevent future failures</div>
        </div>
      </CardContent>
    </Card>
  );
}