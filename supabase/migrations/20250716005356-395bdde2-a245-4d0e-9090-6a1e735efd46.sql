-- Clean up orphaned processing jobs and simplify the system
-- First, delete all orphaned processing jobs (those with NULL document_id)
DELETE FROM processing_jobs WHERE document_id IS NULL;

-- Create a simplified cleanup function that deletes ALL failed jobs immediately
CREATE OR REPLACE FUNCTION public.cleanup_all_failed_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete ALL failed processing jobs regardless of age
  DELETE FROM processing_jobs WHERE status = 'failed';
  
  -- Reset stuck documents to pending
  UPDATE documents 
  SET 
    ingestion_status = 'pending',
    chunked = false,
    processing_started_at = NULL,
    error_message = NULL
  WHERE ingestion_status = 'processing' 
    AND processing_started_at < NOW() - INTERVAL '30 minutes';
    
  RAISE NOTICE 'All failed jobs cleaned up';
END;
$$;

-- Add a constraint to prevent orphaned processing jobs in the future
ALTER TABLE processing_jobs 
ADD CONSTRAINT processing_jobs_document_id_not_null 
CHECK (document_id IS NOT NULL);