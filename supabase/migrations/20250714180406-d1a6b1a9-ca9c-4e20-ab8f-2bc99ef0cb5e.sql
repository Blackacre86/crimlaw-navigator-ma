-- Create processing_jobs table for monitoring document processing pipeline
CREATE TABLE public.processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  error_message TEXT,
  chunks_processed INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  processing_method TEXT, -- 'llamaparse', 'basic', 'ocr'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view processing status
CREATE POLICY "Authenticated users can view processing jobs" 
ON public.processing_jobs 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create policy for service role to manage jobs
CREATE POLICY "Service role can manage processing jobs" 
ON public.processing_jobs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_processing_jobs_updated_at
BEFORE UPDATE ON public.processing_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();