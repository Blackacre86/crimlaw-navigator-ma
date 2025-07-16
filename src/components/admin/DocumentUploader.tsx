import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, AlertCircle, CheckCircle, Clock, X, FileText, FileCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useErrorHandling } from '@/hooks/use-error-handling'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface UploadFile {
  file: File
  id: string
  hash?: string
  isDuplicate?: boolean
  progress: number
  status: 'pending' | 'hashing' | 'checking' | 'uploading' | 'processing' | 'completed' | 'error'
  jobId?: string
  error?: string
  documentId?: string
  existingDocument?: {
    id: string
    title: string
    created_at: string
  }
}

interface DocumentUploaderProps {
  onUploadComplete?: (results: UploadResult[]) => void
  maxFiles?: number
  batchMode?: boolean
}

interface UploadResult {
  file: File
  success: boolean
  documentId?: string
  jobId?: string
  error?: string
}

interface DuplicateCheckResponse {
  isDuplicate: boolean
  existingDocument?: {
    id: string
    title: string
    created_at: string
  }
}

export function DocumentUploader({ onUploadComplete, maxFiles = 10, batchMode = false }: DocumentUploaderProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { showError } = useErrorHandling()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isBatchMode, setIsBatchMode] = useState(batchMode)
  const [isProcessing, setIsProcessing] = useState(false)

  // Admin access control
  if (profile?.role !== 'admin') {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Admin access required</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Real-time job status updates
  useEffect(() => {
    const channel = supabase
      .channel('processing_jobs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'processing_jobs'
      }, (payload) => {
        const updatedJob = payload.new as any
        setFiles(prev => prev.map(file => 
          file.jobId === updatedJob.id 
            ? { 
                ...file, 
                status: updatedJob.status === 'completed' ? 'completed' : 
                        updatedJob.status === 'failed' ? 'error' : 'processing',
                progress: updatedJob.status === 'completed' ? 100 : 
                         updatedJob.status === 'failed' ? file.progress : 
                         Math.min(file.progress + 10, 90),
                error: updatedJob.status === 'failed' ? updatedJob.error_message : undefined
              }
            : file
        ))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Calculate SHA-256 hash
  const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Check for duplicates
  const checkDuplicate = async (hash: string): Promise<DuplicateCheckResponse> => {
    const { data, error } = await supabase.functions.invoke('check-document-hash', {
      body: { hash }
    })

    if (error) {
      throw new Error('Failed to check for duplicates')
    }

    return data
  }

  // Upload file to storage
  const uploadToStorage = async (file: File, hash: string): Promise<string> => {
    const fileName = `${hash}-${file.name}`
    const { error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    return fileName
  }

  // Create document and processing job
  const createDocumentAndJob = async (file: File, filePath: string, hash: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('filePath', filePath)
    formData.append('hash', hash)

    // First call upload-handler to create document record
    const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-handler', {
      body: formData
    })

    if (uploadError) {
      throw new Error('Failed to create document record')
    }

    // Then immediately call process-document to start processing
    const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
      body: { documentId: uploadData.document_id }
    })

    if (processError) {
      console.error('Process document error:', processError)
      // Don't throw error here - document is uploaded, processing can be retried
    }

    return {
      ...uploadData,
      processData
    }
  }

  // Process single file
  const processFile = async (uploadFile: UploadFile) => {
    const updateFile = (updates: Partial<UploadFile>) => {
      setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, ...updates } : f))
    }

    try {
      // Step 1: Calculate hash
      updateFile({ status: 'hashing', progress: 10 })
      const hash = await calculateHash(uploadFile.file)
      updateFile({ hash, progress: 20 })

      // Step 2: Check for duplicates
      updateFile({ status: 'checking', progress: 30 })
      const duplicateCheck = await checkDuplicate(hash)
      
      if (duplicateCheck.isDuplicate) {
        updateFile({ 
          isDuplicate: true, 
          existingDocument: duplicateCheck.existingDocument,
          status: 'error',
          error: 'Document already exists',
          progress: 100
        })
        toast({
          title: "Duplicate Document",
          description: `${uploadFile.file.name} already exists in the system`,
          variant: "destructive"
        })
        return
      }

      updateFile({ progress: 40 })

      // Step 3: Upload to storage
      updateFile({ status: 'uploading', progress: 50 })
      const filePath = await uploadToStorage(uploadFile.file, hash)
      updateFile({ progress: 70 })

      // Step 4: Create document and job
      updateFile({ progress: 80 })
      const result = await createDocumentAndJob(uploadFile.file, filePath, hash)
      
      updateFile({ 
        status: 'processing',
        progress: 90,
        jobId: result.jobId,
        documentId: result.documentId
      })

      toast({
        title: "Upload Successful",
        description: `${uploadFile.file.name} has been uploaded and is being processed`,
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFile({ 
        status: 'error', 
        error: errorMessage,
        progress: 100
      })
      
      showError({
        title: 'Upload Error',
        message: errorMessage,
        component: 'DocumentUploader',
        metadata: { fileName: uploadFile.file.name }
      })
    }
  }

  // Handle file drop/selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length).map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending' as const
    }))

    setFiles(prev => [...prev, ...newFiles])

    if (!isBatchMode) {
      newFiles.forEach(processFile)
    }
  }, [files.length, maxFiles, isBatchMode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: maxFiles - files.length,
    disabled: isProcessing
  })

  // Batch upload handler
  const handleBatchUpload = async () => {
    if (!isBatchMode) return
    
    setIsProcessing(true)
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (const file of pendingFiles) {
      await processFile(file)
    }
    
    setIsProcessing(false)
  }

  // Clear all files
  const clearAll = () => {
    setFiles([])
  }

  // Remove single file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get status icon
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'processing': return <Clock className="h-4 w-4 text-primary animate-pulse" />
      default: return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Get status badge
  const getStatusBadge = (file: UploadFile) => {
    if (file.isDuplicate) {
      return <Badge variant="destructive">Duplicate</Badge>
    }
    
    switch (file.status) {
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      case 'processing': return <Badge variant="outline">Processing</Badge>
      case 'uploading': return <Badge variant="outline">Uploading</Badge>
      case 'checking': return <Badge variant="outline">Checking</Badge>
      case 'hashing': return <Badge variant="outline">Hashing</Badge>
      default: return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              id="batch-mode"
              checked={isBatchMode}
              onCheckedChange={setIsBatchMode}
            />
            <Label htmlFor="batch-mode">Batch Mode</Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to select • PDF and TXT files only • Max {maxFiles} files
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Files ({files.length})</h3>
              <div className="flex gap-2">
                {isBatchMode && (
                  <Button
                    onClick={handleBatchUpload}
                    disabled={isProcessing || files.every(f => f.status !== 'pending')}
                    size="sm"
                  >
                    Upload All
                  </Button>
                )}
                <Button
                  onClick={clearAll}
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map((file) => (
                <Card key={file.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(file.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{file.file.name}</span>
                        {getStatusBadge(file)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        {formatFileSize(file.file.size)} • {file.file.type}
                      </div>
                      
                      {file.isDuplicate && file.existingDocument && (
                        <div className="text-sm text-destructive mb-2">
                          Already exists: {file.existingDocument.title}
                        </div>
                      )}
                      
                      {file.error && (
                        <div className="text-sm text-destructive mb-2">
                          {file.error}
                        </div>
                      )}
                      
                      {file.status !== 'pending' && file.status !== 'error' && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {file.progress}% complete
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}