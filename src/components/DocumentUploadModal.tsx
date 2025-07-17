import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X,
  CloudUpload,
  Sparkles
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { pythonAPI } from '@/lib/python-api';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DocumentUploadModalProps {
  children: React.ReactNode;
  onUploadComplete?: () => void;
}

interface UploadingDocument {
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  documentId?: string;
  progress: number;
  error?: string;
}

export function DocumentUploadModal({ children, onUploadComplete }: DocumentUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [useLlamaCloud, setUseLlamaCloud] = useState(true);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDocument[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Empowering officers with streamlined document processing for faster legal research
    const newDocs: UploadingDocument[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadingDocs(prev => [...prev, ...newDocs]);

    // Process each file
    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      
      try {
        // Update progress - uploading
        setUploadingDocs(prev => prev.map((d, idx) => 
          d.file.name === doc.file.name 
            ? { ...d, progress: 25 }
            : d
        ));

        // Upload to Python backend
        const result = await pythonAPI.processDocument(doc.file, { 
          useLlamaCloud 
        });

        // Update status - processing
        setUploadingDocs(prev => prev.map(d => 
          d.file.name === doc.file.name 
            ? { ...d, status: 'processing', documentId: result.document_id, progress: 50 }
            : d
        ));

        // Poll for completion
        const finalStatus = await pythonAPI.waitForProcessing(result.document_id);
        
        // Update status - completed
        setUploadingDocs(prev => prev.map(d => 
          d.file.name === doc.file.name 
            ? { ...d, status: 'completed', progress: 100 }
            : d
        ));

        toast({
          title: "Document Processed Successfully",
          description: `${doc.file.name} is now available for search`,
        });

      } catch (error) {
        console.error('Upload error:', error);
        
        setUploadingDocs(prev => prev.map(d => 
          d.file.name === doc.file.name 
            ? { ...d, status: 'failed', error: error.message, progress: 0 }
            : d
        ));

        toast({
          title: "Upload Failed",
          description: `Failed to process ${doc.file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }

    // Call completion callback if provided
    if (onUploadComplete) {
      onUploadComplete();
    }
  }, [useLlamaCloud, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeDocument = (fileName: string) => {
    setUploadingDocs(prev => prev.filter(d => d.file.name !== fileName));
  };

  const clearCompleted = () => {
    setUploadingDocs(prev => prev.filter(d => d.status !== 'completed'));
  };

  const getStatusIcon = (status: UploadingDocument['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: UploadingDocument['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-primary';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-destructive';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-6 w-6 text-primary" />
            Upload Legal Documents
          </DialogTitle>
          <DialogDescription>
            Upload PDF, Word, or text documents to make them searchable in your legal research platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Processing Options */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="llama-cloud"
                  checked={useLlamaCloud}
                  onCheckedChange={setUseLlamaCloud}
                />
                <Label htmlFor="llama-cloud" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-blue" />
                  Enhanced Processing with LlamaCloud
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {useLlamaCloud 
                  ? "AI-powered parsing with table preservation and superior accuracy for complex legal documents."
                  : "Standard text extraction - faster but may miss complex formatting like tables."
                }
              </p>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              
              {isDragActive ? (
                <div>
                  <p className="text-lg font-medium text-primary">Drop your documents here</p>
                  <p className="text-sm text-muted-foreground">Release to start processing</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drag & drop legal documents here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse files
                  </p>
                  <Button variant="outline" size="sm">
                    Choose Files
                  </Button>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Supports PDF, Word, and text files up to 10MB each
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadingDocs.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Processing Documents</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearCompleted}
                    disabled={!uploadingDocs.some(d => d.status === 'completed')}
                  >
                    Clear Completed
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {uploadingDocs.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(doc.status)}
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {doc.file.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {doc.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(doc.file.name)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <Progress 
                        value={doc.progress} 
                        className="h-2"
                      />
                      
                      {doc.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {doc.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal Disclaimer */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Privacy Notice:</strong> Uploaded documents are processed securely and used only for your legal research. 
              Ensure you have proper authorization before uploading confidential materials.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}