import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast, errorToast } from '@/hooks/use-toast';
import { useErrorHandling } from '@/hooks/use-error-handling';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { ErrorHistoryPanel } from '@/components/ErrorHistoryPanel';
import ProcessingJobsTable from '@/components/ProcessingJobsTable';
import ProcessingStats from '@/components/ProcessingStats';
import { useProcessingJobs } from '@/hooks/useProcessingJobs';

export default function Admin() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { showError, selectedError, setSelectedError } = useErrorHandling();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { jobs, loading: jobsLoading, refreshJobs, stats } = useProcessingJobs();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus('');
      setProgress(0);
    } else {
      showError({
        title: "Invalid File Type",
        message: "Please select a PDF file. Only PDF documents are supported for processing.",
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
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        showError({
          title: "Document Upload Failed",
          message: `Failed to upload document to storage: ${uploadError.message}`,
          component: "Admin",
          action: "document_upload",
          metadata: { 
            fileName: file.name,
            fileSize: file.size,
            errorCode: uploadError.message,
            storageError: uploadError
          }
        });
        throw uploadError;
      }

      setProgress(50);
      setStatus('Document processing started in background. Check the processing status below.');

      // Call document processor edge function
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          fileName,
          originalName: file.name,
        },
      });

      if (error) {
        showError({
          title: "Document Processing Failed",
          message: `Failed to start document processing: ${error.message}`,
          component: "Admin",
          action: "document_processing",
          metadata: { 
            fileName: file.name,
            uploadedFileName: fileName,
            processingError: error
          }
        });
        throw error;
      }

      setProgress(100);
      setStatus(`Processing started! Status: ${data.status}. Monitor progress below.`);
      
      toast({
        title: "Document processing started",
        description: "The document is being processed in the background. You can monitor progress below.",
      });

      // Reset form
      setFile(null);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      
      // Refresh jobs list to show the new job
      setTimeout(refreshJobs, 1000);

    } catch (error: any) {
      console.error('Error processing document:', error);
      setStatus('Error processing document. Please try again.');
      showError({
        title: "Document Processing Error",
        message: error.message || "An unexpected error occurred while processing the document. Please try again or contact support if the issue persists.",
        component: "Admin",
        action: "upload_process",
        metadata: { 
          fileName: file?.name,
          errorType: error.constructor?.name || 'Unknown',
          errorStack: error.stack,
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Management
          </h1>
          <p className="text-muted-foreground">
            Upload and process legal documents for the vector database
          </p>
        </div>

        <Card className="mb-6">
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
              <div className="relative">
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
                />
              </div>
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

        {/* Processing Statistics */}
        <div className="mb-6">
          <ProcessingStats stats={stats} />
        </div>

        {/* Processing Jobs Monitor */}
        <div className="mb-6">
          <ProcessingJobsTable 
            jobs={jobs} 
            onRefresh={refreshJobs}
            loading={jobsLoading}
          />
        </div>

        {/* Error History Panel */}
        <div className="mb-6">
          <ErrorHistoryPanel />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enhanced RAG Pipeline Status</CardTitle>
            <CardDescription>
              Phase 2 advanced reasoning & feature integration - RAG-Fusion and OCR
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">RAG-Fusion</p>
                <p className="text-xs text-green-600">Query Expansion</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Hybrid Search</p>
                <p className="text-xs text-green-600">RRF Enabled</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">OCR Ready</p>
                <p className="text-xs text-green-600">Scanned PDFs</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Cross-Encoder</p>
                <p className="text-xs text-green-600">Re-ranking</p>
              </div>
            </div>
          </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Test
              </CardTitle>
              <CardDescription>
                Test Edge Function connectivity and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  try {
                    setStatus('Testing Edge Function connectivity...');
                    const { data, error } = await supabase.functions.invoke('test-function', {
                      body: { test: true, timestamp: new Date().toISOString() }
                    });
                    
                    if (error) {
                      setStatus(`❌ Test failed: ${error.message}`);
                      showError({
                        title: "Edge Function Test Failed",
                        message: `The test function call failed: ${error.message}. Please check the Edge Function configuration and connectivity.`,
                        component: "Admin",
                        action: "test_edge_function",
                        metadata: { 
                          functionName: 'test-function',
                          errorDetails: error
                        }
                      });
                    } else {
                      setStatus(`✅ Test successful! Function responded at ${data.timestamp}`);
                      toast({
                        title: "Test successful",
                        description: "Edge Functions are working correctly",
                      });
                    }
                  } catch (error: any) {
                    setStatus(`❌ Test error: ${error.message}`);
                    showError({
                      title: "Test Connection Error",
                      message: `An unexpected error occurred while testing Edge Functions: ${error.message}. This may indicate a network connectivity issue or service interruption.`,
                      component: "Admin",
                      action: "test_connection",
                      metadata: { 
                        errorType: error.constructor?.name || 'Unknown',
                        errorStack: error.stack,
                        timestamp: new Date().toISOString()
                      }
                    });
                  }
                }}
                variant="outline"
              >
                Test Edge Functions
              </Button>
            </CardContent>
          </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Advanced Processing Configuration
            </CardTitle>
            <CardDescription>
              Configure advanced features for enhanced document processing and search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                LlamaParse (Enhanced PDF Processing)
              </h4>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-3">
                  LlamaParse provides superior extraction of complex layouts, tables, footnotes, and structured legal documents.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://cloud.llamaindex.ai" target="_blank" rel="noopener noreferrer">
                      Get Free API Key
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://supabase.com/dashboard/project/lzssqygnetvznmfubwmr/settings/functions" target="_blank" rel="noopener noreferrer">
                      Add to Supabase Secrets
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Secret name: <code className="bg-blue-100 px-1 rounded">LLAMA_CLOUD_API_KEY</code>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                OCR.Space (Scanned Document Processing)
              </h4>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-3">
                  Automatically processes scanned PDFs when text extraction yields minimal content. Perfect for older legal documents and evidence files.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer">
                      Get Free OCR API Key
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://supabase.com/dashboard/project/lzssqygnetvznmfubwmr/settings/functions" target="_blank" rel="noopener noreferrer">
                      Add to Supabase Secrets
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Secret name: <code className="bg-green-100 px-1 rounded">OCR_SPACE_API_KEY</code>
                </p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h5 className="font-medium text-purple-900 mb-2">
                ✨ New: RAG-Fusion Search Technology
              </h5>
              <p className="text-sm text-purple-800 mb-3">
                The search system now uses RAG-Fusion with intelligent query expansion. Each search automatically:
              </p>
              <ul className="text-sm space-y-1 text-purple-700">
                <li>• Generates 3 alternative legal query variations using GPT-4o</li>
                <li>• Executes parallel searches for original + expanded queries</li>
                <li>• Fuses results using Reciprocal Rank Fusion (RRF) algorithm</li>
                <li>• Bridges terminology gaps between novice and expert users</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Enhanced Upload</h3>
                <p className="text-sm text-muted-foreground">
                  LlamaParse + structure-aware extraction
                </p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Smart Chunking</h3>
                <p className="text-sm text-muted-foreground">
                  Preserve legal document hierarchy
                </p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Hybrid Index</h3>
                <p className="text-sm text-muted-foreground">
                  Vector + keyword search with re-ranking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        error={selectedError}
      />
    </div>
  );
}