-- Reset all stuck documents to pending and clean up processing jobs
UPDATE documents 
SET 
  ingestion_status = 'pending',
  chunked = false,
  processing_started_at = NULL,
  error_message = NULL,
  updated_at = now()
WHERE ingestion_status = 'processing' 
  AND processing_started_at < NOW() - INTERVAL '30 minutes';

-- Update processing jobs to failed for stuck jobs
UPDATE processing_jobs 
SET 
  status = 'failed',
  error_message = 'Process timed out - reset to pending',
  completed_at = now(),
  updated_at = now()
WHERE status = 'processing' 
  AND started_at < NOW() - INTERVAL '30 minutes';