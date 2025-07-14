import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus('');
      setProgress(0);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
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
        throw uploadError;
      }

      setProgress(50);
      setStatus('Processing document and generating embeddings...');

      // Call document processor edge function
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: {
          fileName,
          originalName: file.name,
        },
      });

      if (error) {
        throw error;
      }

      setProgress(100);
      setStatus(`Processing complete! ${data.chunksCreated} chunks added to database.`);
      
      toast({
        title: "Document processed successfully",
        description: `${data.chunksCreated} text chunks have been added to the database.`,
      });

      // Reset form
      setFile(null);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';

    } catch (error: any) {
      console.error('Error processing document:', error);
      setStatus('Error processing document. Please try again.');
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing the document.",
        variant: "destructive",
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
              <Input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={uploading}
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enhanced RAG Pipeline Status</CardTitle>
            <CardDescription>
              Phase 1 foundation upgrades - Production-grade legal document processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Vector Search</p>
                <p className="text-xs text-green-600">Active</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Hybrid Search</p>
                <p className="text-xs text-green-600">RRF Enabled</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Cross-Encoder</p>
                <p className="text-xs text-green-600">Re-ranking</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">Structure-Aware</p>
                <p className="text-xs text-green-600">Chunking</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enhanced PDF Processing</CardTitle>
            <CardDescription>
              Advanced text extraction with LlamaParse integration and intelligent fallbacks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">Current Features:</h4>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>• <strong>LlamaParse Integration:</strong> Superior extraction of complex layouts, tables, footnotes</li>
                <li>• <strong>Structure-Aware Chunking:</strong> Preserves document hierarchy (sections, subsections)</li>
                <li>• <strong>Hybrid Search:</strong> Combines semantic + keyword search with Reciprocal Rank Fusion</li>
                <li>• <strong>Cross-Encoder Re-ranking:</strong> GPT-4o powered relevance scoring for precision</li>
                <li>• <strong>Legal Category Detection:</strong> Automatically categorizes by document type</li>
                <li>• <strong>Robust Fallbacks:</strong> Multiple extraction methods ensure reliable processing</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-amber-800">Optional Enhancement:</h4>
              <p className="text-sm text-amber-700 mb-3">
                For maximum PDF parsing accuracy, add a LlamaParse API key. Free tier includes 10,000 credits.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://cloud.llamaindex.ai" target="_blank" rel="noopener noreferrer">
                    Get Free LlamaParse Key
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://supabase.com/dashboard/project/lzssqygnetvznmfubwmr/settings/functions" target="_blank" rel="noopener noreferrer">
                    Add to Supabase Secrets
                  </a>
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Secret name: <code className="bg-amber-100 px-1 rounded">LLAMA_CLOUD_API_KEY</code>
              </p>
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
    </div>
  );
}