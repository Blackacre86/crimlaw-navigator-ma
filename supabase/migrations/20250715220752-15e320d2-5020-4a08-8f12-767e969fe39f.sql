-- Phase 1: Clean up dummy data while preserving real legal documents
-- Delete all dummy documents that are clogging the system
DELETE FROM chunks WHERE document_id IN (
  SELECT id FROM documents 
  WHERE file_path IS NULL 
  OR title LIKE '%Document - Part%'
  OR title LIKE '%test%'
  OR title LIKE '%example%'
);

DELETE FROM processing_jobs WHERE document_id IN (
  SELECT id FROM documents 
  WHERE file_path IS NULL 
  OR title LIKE '%Document - Part%'
  OR title LIKE '%test%'
  OR title LIKE '%example%'
);

DELETE FROM documents 
WHERE file_path IS NULL 
OR title LIKE '%Document - Part%'
OR title LIKE '%test%'
OR title LIKE '%example%';

-- Log the cleanup action
INSERT INTO document_audit_log (action, metadata, performed_by)
VALUES ('cleanup_dummy_data', jsonb_build_object('cleaned_documents', 'removed dummy data'), NULL);