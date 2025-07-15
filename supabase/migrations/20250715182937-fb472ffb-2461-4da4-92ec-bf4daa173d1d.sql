-- Create job_queue table for PostgreSQL-based asynchronous job processing
CREATE TABLE public.job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  job_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  claimed_by TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage job queue"
ON public.job_queue
FOR ALL
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can view job queue"
ON public.job_queue
FOR SELECT
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_job_queue_updated_at
BEFORE UPDATE ON public.job_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient job claiming
CREATE INDEX idx_job_queue_status_priority ON public.job_queue (status, priority DESC, created_at);
CREATE INDEX idx_job_queue_next_retry ON public.job_queue (next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- Add missing columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_hash TEXT UNIQUE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ingestion_status TEXT DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_source TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_title TEXT;

-- Add document_id foreign key to processing_jobs table
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Create job queue management functions
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_job_type TEXT,
  p_job_data JSONB,
  p_priority INTEGER DEFAULT 0,
  p_max_retries INTEGER DEFAULT 3
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO public.job_queue (job_type, job_data, priority, max_retries)
  VALUES (p_job_type, p_job_data, p_priority, p_max_retries)
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_next_job(
  p_worker_id TEXT,
  p_job_types TEXT[] DEFAULT NULL
) RETURNS TABLE(id UUID, job_type TEXT, job_data JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.job_queue
  SET 
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE job_queue.id = (
    SELECT q.id
    FROM public.job_queue q
    WHERE q.status = 'pending'
      AND (q.next_retry_at IS NULL OR q.next_retry_at <= now())
      AND (p_job_types IS NULL OR q.job_type = ANY(p_job_types))
    ORDER BY q.priority DESC, q.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING job_queue.id, job_queue.job_type, job_queue.job_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id UUID,
  p_result JSONB DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_found BOOLEAN;
BEGIN
  UPDATE public.job_queue
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now(),
    job_data = CASE 
      WHEN p_result IS NOT NULL THEN job_data || jsonb_build_object('result', p_result)
      ELSE job_data
    END
  WHERE id = p_job_id AND status = 'claimed'
  RETURNING TRUE INTO job_found;
  
  RETURN COALESCE(job_found, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_job(
  p_job_id UUID,
  p_error_message TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
  retry_delay INTEGER;
BEGIN
  -- Get current job state
  SELECT retry_count, max_retries INTO job_record
  FROM public.job_queue
  WHERE id = p_job_id AND status = 'claimed';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if we should retry
  IF job_record.retry_count < job_record.max_retries THEN
    -- Calculate exponential backoff delay (in minutes)
    retry_delay := POWER(2, job_record.retry_count) * 5;
    
    UPDATE public.job_queue
    SET 
      status = 'pending',
      retry_count = retry_count + 1,
      next_retry_at = now() + (retry_delay || ' minutes')::INTERVAL,
      error_message = p_error_message,
      claimed_by = NULL,
      claimed_at = NULL,
      updated_at = now()
    WHERE id = p_job_id;
  ELSE
    -- Max retries reached, mark as failed
    UPDATE public.job_queue
    SET 
      status = 'failed',
      error_message = p_error_message,
      completed_at = now(),
      updated_at = now()
    WHERE id = p_job_id;
  END IF;
  
  RETURN TRUE;
END;
$$;