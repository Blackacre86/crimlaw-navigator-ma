-- Phase 1: Emergency Database Schema Fixes

-- 1.1 Fix foreign key relationships with CASCADE DELETE
-- First, clean up any orphaned records that would prevent foreign key creation
DELETE FROM processing_jobs WHERE document_id IS NULL;
DELETE FROM chunks WHERE document_id NOT IN (SELECT id FROM documents);
DELETE FROM processing_jobs WHERE document_id NOT IN (SELECT id FROM documents);

-- Add proper foreign key constraints with CASCADE DELETE
ALTER TABLE chunks 
DROP CONSTRAINT IF EXISTS chunks_document_id_fkey,
ADD CONSTRAINT chunks_document_id_fkey 
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- Make document_id NOT NULL and add foreign key for processing_jobs
ALTER TABLE processing_jobs 
ALTER COLUMN document_id SET NOT NULL,
ADD CONSTRAINT processing_jobs_document_id_fkey 
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- 1.2 Add security and audit features for law enforcement
-- Add soft delete capability
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update ingestion_status to include cancelled
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_ingestion_status_check,
ADD CONSTRAINT documents_ingestion_status_check 
  CHECK (ingestion_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS document_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID,
  action TEXT NOT NULL, -- 'deleted', 'cancelled', 'retried', 'uploaded'
  performed_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "Authenticated users can view audit logs" 
ON document_audit_log FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage audit logs" 
ON document_audit_log FOR ALL 
USING (auth.role() = 'service_role');

-- 1.3 Add performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(ingestion_status);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON document_audit_log(action);

-- 1.4 Add status sync trigger between documents and processing_jobs
CREATE OR REPLACE FUNCTION sync_document_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When processing_jobs status changes, sync with documents
  IF TG_TABLE_NAME = 'processing_jobs' THEN
    UPDATE documents 
    SET ingestion_status = NEW.status
    WHERE id = NEW.document_id;
    RETURN NEW;
  END IF;
  
  -- When documents status changes, sync with processing_jobs
  IF TG_TABLE_NAME = 'documents' THEN
    UPDATE processing_jobs 
    SET status = NEW.ingestion_status
    WHERE document_id = NEW.id;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for status synchronization
DROP TRIGGER IF EXISTS sync_processing_job_status ON processing_jobs;
CREATE TRIGGER sync_processing_job_status
  AFTER UPDATE OF status ON processing_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_document_status();

DROP TRIGGER IF EXISTS sync_document_ingestion_status ON documents;
CREATE TRIGGER sync_document_ingestion_status
  AFTER UPDATE OF ingestion_status ON documents
  FOR EACH ROW
  WHEN (OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status)
  EXECUTE FUNCTION sync_document_status();

-- 1.5 Add function to detect stuck processing jobs (>30 minutes)
CREATE OR REPLACE FUNCTION auto_fail_stuck_jobs()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Mark jobs stuck in processing for >30 minutes as failed
  UPDATE processing_jobs 
  SET 
    status = 'failed',
    error_message = 'Processing timeout - exceeded 30 minutes',
    completed_at = now(),
    updated_at = now()
  WHERE 
    status = 'processing' 
    AND started_at < now() - INTERVAL '30 minutes';
    
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log the auto-fail action
  INSERT INTO document_audit_log (action, metadata, performed_by)
  VALUES ('auto_failed_stuck_jobs', jsonb_build_object('count', affected_count), NULL);
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;