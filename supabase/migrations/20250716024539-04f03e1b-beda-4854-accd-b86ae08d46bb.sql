-- EMERGENCY SYSTEM HALT: Reset all stuck documents and clear corrupted jobs

-- Step 1: Reset all stuck documents to pending
UPDATE documents 
SET 
  ingestion_status = 'pending',
  chunked = false,
  processing_started_at = NULL,
  processing_completed_at = NULL,
  error_message = NULL,
  chunk_count = 0
WHERE ingestion_status = 'processing';

-- Step 2: Delete all stuck processing jobs
DELETE FROM processing_jobs WHERE status IN ('processing', 'queued');

-- Step 3: Clear any orphaned chunks
DELETE FROM chunks;

-- Step 4: Add logging for emergency reset
INSERT INTO processing_metrics (processing_job_id, metric_type, metric_value, metadata)
SELECT 
  gen_random_uuid(),
  'system_reset',
  1,
  jsonb_build_object(
    'reset_time', now(),
    'reason', 'emergency_system_halt',
    'documents_reset', (SELECT COUNT(*) FROM documents WHERE ingestion_status = 'pending')
  );