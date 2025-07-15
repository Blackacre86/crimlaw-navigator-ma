-- Phase 1: Reset documents and update schema

-- Reset all documents that claim to be chunked but have no chunks
UPDATE documents 
SET 
  chunked = false,
  ingestion_status = 'pending',
  content = NULL
WHERE chunked = true 
  AND NOT EXISTS (
    SELECT 1 FROM chunks WHERE chunks.document_id = documents.id
  );

-- Clean up any orphaned chunks
DELETE FROM chunks WHERE document_id NOT IN (SELECT id FROM documents);

-- Add cascade delete constraint if missing
ALTER TABLE chunks
DROP CONSTRAINT IF EXISTS chunks_document_id_fkey,
ADD CONSTRAINT chunks_document_id_fkey 
  FOREIGN KEY (document_id) 
  REFERENCES documents(id) 
  ON DELETE CASCADE;

-- Add new tracking columns
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;