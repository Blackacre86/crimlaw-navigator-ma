import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  RefreshCw,
  Database,
  Clock,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandling } from '@/hooks/use-error-handling';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { useProcessingJobs } from '@/hooks/useProcessingJobs';
import { SystemRepairPanel } from '@/components/admin/SystemRepairPanel';
import { useQuery } from '@tanstack/react-query';

interface BasicStats {
  totalDocuments: number;
  processingDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  queuedJobs: number;
}

export default function StreamlinedAdmin() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { showError, selectedError, setSelectedError } = useErrorHandling();
  const { jobs, loading: jobsLoading, refreshJobs, stats } = useProcessingJobs();

  // Simple stats query - only what we need
  const { data: basicStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['basic-admin-stats'],
    queryFn: async (): Promise<BasicStats> => {
      const [documentsRes, jobsRes] = await Promise.all([
        supabase.from('documents').select('id, ingestion_status'),
        supabase.from('processing_jobs').select('id, status')
      ]);

      const documents = documentsRes.data || [];
      const jobs = jobsRes.data || [];

      return {
        totalDocuments: documents.length,
        processingDocuments: documents.filter(d => d.ingestion_status === 'processing').length,
        completedDocuments: documents.filter(d => d.ingestion_status === 'completed').length,
        failedDocuments: documents.filter(d => d.ingestion_status === 'failed').length,
        queuedJobs: jobs.filter(j => j.status === 'queued').length,
      };
    },
    refetchInterval: 10000, // Reduced frequency
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus('');
      setProgress(0);
    } else {
      showError({
        title: "Invalid File Type",
        message: "Please select a PDF file. Only PDF documents are supported.",
        component: "Admin",
        action: "file_selection",
        metadata: { 
          selectedFileType: selectedFile?.type || 'unknown',
          fileName: selectedFile?.name || 'unknown'
        }
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setStatus('Uploading document...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(30);
      setStatus('Creating document record...');

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-handler', {
        body: formData
      });

      if (uploadError) {
        throw new Error(`Document upload failed: ${uploadError.message}`);
      }

      if (!uploadData || !uploadData.document_id) {
        throw new Error('No document ID returned from upload handler');
      }

      setProgress(50);
      setStatus('Document uploaded successfully. Starting processing...');

      const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId: uploadData.document_id }
      });

      if (processError) {
        throw new Error(`Document processing failed: ${processError.message}`);
      }

      setProgress(100);
      setStatus(`Document processed successfully! Created ${processData.chunksCreated || 0} chunks.`);
      
      toast({
        title: "Document uploaded",
        description: "Document is being processed in the background.",
      });

      setFile(null);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      
      setTimeout(() => {
        refreshJobs();
        refetchStats();
      }, 1000);

    } catch (error: any) {
      console.error('Error processing document:', error);
      setStatus('Error processing document. Please try again.');
      showError({
        title: "Document Processing Error",
        message: error.message || "An unexpected error occurred.",
        component: "Admin",
        action: "upload_process",
        metadata: { 
          fileName: file?.name,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setUploading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--gradient-background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Streamlined document management and system monitoring
            </p>
          </div>
          <Button variant="outline" onClick={() => { refreshJobs(); refetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Essential Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{basicStats?.totalDocuments || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{basicStats?.processingDocuments || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{basicStats?.completedDocuments || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{basicStats?.failedDocuments || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{basicStats?.queuedJobs || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="repair">Repair</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Upload PDF documents to process and add to the searchable database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-input">Select PDF Document</Label>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="w-full"
                  />
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                >
                  {uploading ? 'Processing...' : 'Process Document'}
                </Button>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {status}
                    </p>
                  </div>
                )}

                {status && !uploading && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{status}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Processing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {jobsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{job.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'failed' ? 'destructive' :
                              job.status === 'processing' ? 'secondary' : 'outline'
                            }
                          >
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                      {jobs.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No processing jobs found
                        </p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repair">
            <SystemRepairPanel />
          </TabsContent>
        </Tabs>

        {selectedError && (
          <ErrorDialog
            open={!!selectedError}
            onOpenChange={(open) => !open && setSelectedError(null)}
            error={selectedError}
          />
        )}
      </div>
    </div>
  );
}