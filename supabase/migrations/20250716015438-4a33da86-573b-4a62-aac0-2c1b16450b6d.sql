-- Phase 1: Fix Database Functions
-- Drop and recreate hybrid_search function with correct return type
DROP FUNCTION IF EXISTS public.hybrid_search(text, vector, integer, integer);

CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text, 
  query_embedding vector, 
  match_count integer DEFAULT 20, 
  rrf_k integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, 
  title text, 
  category text, 
  content text, 
  created_at timestamp with time zone, 
  rrf_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      d.id,
      d.title,
      d.category,
      d.content,
      d.created_at,
      ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS rank_ix
    FROM documents d
    WHERE d.embedding IS NOT NULL
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword_search AS (
    SELECT
      d.id,
      d.title,
      d.category,
      d.content,
      d.created_at,
      ROW_NUMBER() OVER (ORDER BY ts_rank(d.fts, plainto_tsquery('english', query_text)) DESC) AS rank_ix
    FROM documents d
    WHERE d.fts @@ plainto_tsquery('english', query_text)
    ORDER BY ts_rank(d.fts, plainto_tsquery('english', query_text)) DESC
    LIMIT match_count
  ),
  combined_results AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.title, k.title) AS title,
      COALESCE(v.category, k.category) AS category,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.created_at, k.created_at) AS created_at,
      COALESCE(1.0 / (rrf_k + v.rank_ix), 0.0) + COALESCE(1.0 / (rrf_k + k.rank_ix), 0.0) AS rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
  )
  SELECT
    cr.id,
    cr.title,
    cr.category,
    cr.content,
    cr.created_at,
    cr.rrf_score
  FROM combined_results cr
  ORDER BY cr.rrf_score DESC
  LIMIT match_count;
END;
$$;

-- Phase 3: Clean Up Corrupted Data
-- Reset all "completed" documents that have 0 chunks back to "pending"
UPDATE documents 
SET 
  ingestion_status = 'pending',
  chunked = false,
  processing_started_at = NULL,
  processing_completed_at = NULL,
  error_message = NULL
WHERE ingestion_status = 'completed' 
  AND (chunk_count = 0 OR chunk_count IS NULL);

-- Reset corresponding processing jobs
UPDATE processing_jobs 
SET 
  status = 'queued',
  completed_at = NULL,
  error_message = NULL
WHERE document_id IN (
  SELECT id FROM documents 
  WHERE ingestion_status = 'pending'
);

-- Clean up orphaned chunks
DELETE FROM chunks 
WHERE document_id NOT IN (SELECT id FROM documents);

-- Add function to reprocess all pending documents
CREATE OR REPLACE FUNCTION public.reprocess_all_documents()
RETURNS TABLE(processed_count integer, failed_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_record RECORD;
  processed_count integer := 0;
  failed_count integer := 0;
BEGIN
  -- Loop through all pending documents
  FOR doc_record IN 
    SELECT id, file_path FROM documents 
    WHERE ingestion_status = 'pending' 
    ORDER BY created_at
  LOOP
    BEGIN
      -- Call the document processing function
      PERFORM net.http_post(
        url := 'https://lzssqygnetvznmfubwmr.supabase.co/functions/v1/process-document',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6c3NxeWduZXR2em5tZnVid21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ1NTk1MCwiZXhwIjoyMDY4MDMxOTUwfQ.VQHxJf_MJcfqEQE3kBdJOGh0b-xPzrVHE-Oz3bexY1A"}'::jsonb,
        body := json_build_object('documentId', doc_record.id)::jsonb
      );
      
      processed_count := processed_count + 1;
      
      -- Add a small delay between processing
      PERFORM pg_sleep(2);
      
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      CONTINUE;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed_count, failed_count;
END;
$$;