-- Phase 1: Emergency Data Cleanup

-- Step 1: Fix status inconsistencies (documents marked as processing but jobs are completed)
UPDATE documents 
SET 
  ingestion_status = 'completed',
  chunked = true,
  processing_completed_at = (
    SELECT completed_at 
    FROM processing_jobs 
    WHERE document_id = documents.id 
    AND status = 'completed'
  )
WHERE ingestion_status = 'processing' 
  AND EXISTS (
    SELECT 1 FROM processing_jobs 
    WHERE document_id = documents.id 
    AND status = 'completed'
  );

-- Step 2: Reset documents that are truly stuck (processing with no completed job)
UPDATE documents 
SET 
  ingestion_status = 'pending',
  chunked = false,
  processing_started_at = NULL,
  processing_completed_at = NULL,
  error_message = NULL
WHERE ingestion_status = 'processing' 
  AND NOT EXISTS (
    SELECT 1 FROM processing_jobs 
    WHERE document_id = documents.id 
    AND status = 'completed'
  );

-- Step 3: Remove duplicate documents (same title and content_hash)
WITH duplicate_docs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, content_hash 
      ORDER BY created_at DESC
    ) as rn
  FROM documents 
  WHERE content_hash IS NOT NULL
)
DELETE FROM documents 
WHERE id IN (
  SELECT id FROM duplicate_docs WHERE rn > 1
);

-- Step 4: Clean up orphaned processing jobs (no corresponding document)
DELETE FROM processing_jobs 
WHERE document_id NOT IN (SELECT id FROM documents);

-- Step 5: Clean up failed jobs older than 24 hours
DELETE FROM processing_jobs 
WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '24 hours';

-- Step 6: Add function for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_failed_processing_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete failed jobs older than 24 hours
  DELETE FROM processing_jobs 
  WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '24 hours';
  
  -- Reset stuck documents
  UPDATE documents 
  SET 
    ingestion_status = 'pending',
    chunked = false,
    processing_started_at = NULL,
    error_message = NULL
  WHERE ingestion_status = 'processing' 
    AND processing_started_at < NOW() - INTERVAL '30 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM processing_jobs 
      WHERE document_id = documents.id 
      AND status IN ('processing', 'completed')
    );
  
  -- Synchronize document status with job status
  UPDATE documents 
  SET 
    ingestion_status = 'completed',
    chunked = true,
    processing_completed_at = pj.completed_at
  FROM processing_jobs pj
  WHERE documents.id = pj.document_id
    AND pj.status = 'completed'
    AND documents.ingestion_status != 'completed';
    
  RAISE NOTICE 'Cleanup completed';
END;
$$;

-- Step 7: Add function to detect and prevent duplicates
CREATE OR REPLACE FUNCTION check_document_duplicate(
  p_content_hash TEXT,
  p_title TEXT
)
RETURNS TABLE(
  exists BOOLEAN,
  document_id UUID,
  document_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END as exists,
    d.id as document_id,
    d.title as document_title
  FROM documents d
  WHERE d.content_hash = p_content_hash
     OR (d.title = p_title AND d.content_hash IS NOT NULL)
  GROUP BY d.id, d.title
  LIMIT 1;
END;
$$;