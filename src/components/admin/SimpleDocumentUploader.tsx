import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/use-notifications';

interface UploadedFile {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export function SimpleDocumentUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const { success, error, warning } = useNotifications();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.type !== 'application/pdf') {
        error(
          "Invalid file type",
          "Only PDF files are supported."
        );
        continue;
      }

      const fileId = crypto.randomUUID();
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        status: 'uploading',
        progress: 0
      };

      setFiles(prev => [...prev, uploadedFile]);

      try {
        updateFileStatus(fileId, 'uploading', 25);
        
        // Create form data for the upload
        const formData = new FormData();
        formData.append('file', file);
        
        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-handler', {
          body: formData
        });

        if (uploadError) throw uploadError;

        // Handle duplicate detection
        if (uploadData.duplicate) {
          updateFileStatus(fileId, 'completed', 100);
          success(
            "Document already exists",
            uploadData.message,
            {
              details: `Document ID: ${uploadData.existing_document_id}\nStatus: ${uploadData.processing_status}`,
              action: uploadData.is_processed ? undefined : {
                label: "Check Status",
                onClick: () => window.location.reload()
              }
            }
          );
          return;
        }

        updateFileStatus(fileId, 'processing', 75);
        updateFileStatus(fileId, 'completed', 100);

        success(
          "Upload successful",
          `${file.name} has been uploaded and is being processed in the background.`,
          {
            details: `Document ID: ${uploadData.document_id}\nProcessing Job ID: ${uploadData.processing_job_id}`
          }
        );

      } catch (err: any) {
        updateFileStatus(fileId, 'failed', 100, err.message);
        
        const errorMessage = err.message || 'Unknown error occurred';
        const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
        
        error(
          "Upload failed", 
          isNetworkError ? "Network error - please check your connection" : errorMessage,
          {
            details: `File: ${file.name}\nSize: ${(file.size / 1024 / 1024).toFixed(2)}MB\nError: ${errorMessage}`,
            action: {
              label: "Retry",
              onClick: () => onDrop([file])
            }
          }
        );
      }
    }
  }, [success, error]);

  const updateFileStatus = (id: string, status: UploadedFile['status'], progress: number, error?: string) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, status, progress, error } : file
    ));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    const variants = {
      uploading: 'secondary',
      processing: 'secondary', 
      completed: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Drop PDF files here or click to upload. Processing happens automatically in the background.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the PDF files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop PDF files here, or click to select</p>
                <p className="text-sm text-muted-foreground">Only PDF files are supported</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{file.name}</span>
                      {getStatusBadge(file.status)}
                    </div>
                    <Progress value={file.progress} className="h-2" />
                    {file.error && (
                      <p className="text-sm text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}