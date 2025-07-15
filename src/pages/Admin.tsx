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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Settings, BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandling } from '@/hooks/use-error-handling';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { ErrorHistoryPanel } from '@/components/ErrorHistoryPanel';
import ProcessingJobsTable from '@/components/ProcessingJobsTable';
import ProcessingStats from '@/components/ProcessingStats';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { ChunkingAnalytics } from '@/components/ChunkingAnalytics';
import { EmbeddingAnalytics } from '@/components/EmbeddingAnalytics';
import { ProcessingPipeline } from '@/components/ProcessingPipeline';
import { HistoricalCharts } from '@/components/HistoricalCharts';
import { TimingCharts } from '@/components/TimingCharts';
import { useProcessingJobs } from '@/hooks/useProcessingJobs';

export default function Admin() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
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
      // Create FormData for upload-handler
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(30);
      setStatus('Creating document record...');

      // Use upload-handler to create document and get documentId
      console.log('🚀 Calling upload-handler edge function...', { fileName: file.name });
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-handler', {
        body: formData
      });

      console.log('📡 Upload handler response:', { data: uploadData, error: uploadError });

      if (uploadError) {
        const errorMessage = uploadError.message || 'Unknown error occurred';
        const errorDetails = {
          fileName: file.name,
          errorMessage: errorMessage,
          functionError: uploadError
        };
        
        console.error('❌ Document upload failed:', errorDetails);
        
        showError({
          title: "Document Upload Failed",
          message: `Failed to upload document: ${errorMessage}. Please check that the file is a valid PDF.`,
          component: "Admin",
          action: "document_upload",
          metadata: errorDetails
        });
        throw new Error(`Document upload failed: ${errorMessage}`);
      }

      if (!uploadData || !uploadData.document_id) {
        const noDataError = {
          fileName: file.name,
          issue: 'No document ID returned from upload handler',
          response: uploadData
        };
        
        console.error('❌ No document ID returned from upload handler:', noDataError);
        
        showError({
          title: "Document Upload Failed",
          message: "Failed to create document record. The upload may have failed silently.",
          component: "Admin", 
          action: "document_upload",
          metadata: noDataError
        });
        throw new Error('No document ID returned from upload handler');
      }

      setProgress(50);
      setStatus('Document uploaded successfully. Starting processing...');

      // Now call process-document with the documentId
      console.log('🚀 Calling process-document edge function...', { documentId: uploadData.document_id });
      
      const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          documentId: uploadData.document_id
        }
      });

      console.log('📡 Process document response:', { data: processData, error: processError });

      if (processError) {
        const errorMessage = processError.message || 'Unknown error occurred';
        const errorDetails = {
          fileName: file.name,
          documentId: uploadData.document_id,
          errorMessage: errorMessage,
          functionError: processError
        };
        
        console.error('❌ Document processing failed:', errorDetails);
        
        showError({
          title: "Document Processing Failed",
          message: `Failed to process document: ${errorMessage}. Please check that the OpenAI API key is configured correctly.`,
          component: "Admin",
          action: "document_processing",
          metadata: errorDetails
        });
        throw new Error(`Document processing failed: ${errorMessage}`);
      }

      if (!processData) {
        const noDataError = {
          fileName: file.name,
          documentId: uploadData.document_id,
          issue: 'No response data from process-document function'
        };
        
        console.error('❌ No data returned from process-document function:', noDataError);
        
        showError({
          title: "Document Processing Failed",
          message: "No response received from document processor. The function may have failed silently.",
          component: "Admin", 
          action: "document_processing",
          metadata: noDataError
        });
        throw new Error('No response data from document processor');
      }

      setProgress(100);
      setStatus(`Document processed successfully! Created ${processData.chunksCreated || 0} chunks. Check the processing status below.`);
      
      toast({
        title: "Document processing started",
        description: "The document is being processed in the background. You can monitor progress below.",
      });

      // Reset form
      setFile(null);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      
      // Switch to monitor tab to show progress
      setActiveTab('monitor');
      
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
    <div className="min-h-screen p-6" style={{ background: 'var(--gradient-background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Management
          </h1>
          <p className="text-muted-foreground">
            Upload and process legal documents for the vector database
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
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
                  <div className="relative">
                    <Input
                      id="file-input"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer file:text-sm"
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
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProcessingStats stats={stats} />
              </div>
              
              <ScrollArea className="h-[60vh] rounded-md border">
                <ProcessingJobsTable 
                  jobs={jobs} 
                  onRefresh={refreshJobs}
                  loading={jobsLoading}
                />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <div className="space-y-6">
              <MetricsDashboard />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChunkingAnalytics />
                <EmbeddingAnalytics />
              </div>
              
              <ProcessingPipeline />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoricalCharts />
                <TimingCharts />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            <ErrorHistoryPanel />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="pipeline-status">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Enhanced RAG Pipeline Status
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Phase 2 advanced reasoning & feature integration - RAG-Fusion and OCR
                      </p>
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
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="system-tests">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      System Tests
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Test Edge Function connectivity and configuration
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="w-full"
                        >
                          Test Edge Functions
                        </Button>
                        
                        <Button 
                          onClick={async () => {
                            try {
                              setStatus('Testing process-document function...');
                              console.log('🧪 Testing process-document function...');
                              
                              const { data, error } = await supabase.functions.invoke('process-document', {
                                body: {}
                              });
                              
                              console.log('🧪 Test response:', { data, error });
                              
                              if (error) {
                                setStatus(`❌ Process-document test failed: ${error.message}`);
                                console.error('❌ Process-document test failed:', error);
                              } else if (data) {
                                setStatus(`✅ Process-document responding! Status: ${data.status || 'healthy'}`);
                                console.log('✅ Process-document test successful:', data);
                                toast({
                                  title: "Process-document test successful",
                                  description: "The function is accessible and responding correctly",
                                });
                              } else {
                                setStatus(`❌ Process-document returned no data`);
                              }
                            } catch (error: any) {
                              console.error('❌ Test error:', error);
                              setStatus(`❌ Test error: ${error.message}`);
                            }
                          }}
                          variant="outline"  
                          className="w-full"
                        >
                          Test Process Document
                        </Button>
                      </div>
                      
                      {status && (
                        <Alert>
                          <AlertDescription>{status}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="processing-config">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Processing Configuration
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Configure processing methods and optimization settings
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="processing-method">Processing Method</Label>
                          <select 
                            id="processing-method"
                            className="w-full p-2 border rounded-md bg-background"
                            defaultValue="llamaparse"
                          >
                            <option value="llamaparse">LlamaParse (Recommended)</option>
                            <option value="basic">Basic PDF Extraction</option>
                            <option value="ocr">OCR.Space (Scanned PDFs)</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="chunk-size">Chunk Size</Label>
                          <select 
                            id="chunk-size"
                            className="w-full p-2 border rounded-md bg-background"
                            defaultValue="1000"
                          >
                            <option value="500">500 characters</option>
                            <option value="1000">1000 characters</option>
                            <option value="1500">1500 characters</option>
                            <option value="2000">2000 characters</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="overlap">Chunk Overlap</Label>
                          <select 
                            id="overlap"
                            className="w-full p-2 border rounded-md bg-background"
                            defaultValue="200"
                          >
                            <option value="100">100 characters</option>
                            <option value="200">200 characters</option>
                            <option value="300">300 characters</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="embedding-model">Embedding Model</Label>
                          <select 
                            id="embedding-model"
                            className="w-full p-2 border rounded-md bg-background"
                            defaultValue="text-embedding-3-small"
                          >
                            <option value="text-embedding-3-small">text-embedding-3-small</option>
                            <option value="text-embedding-3-large">text-embedding-3-large</option>
                            <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
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