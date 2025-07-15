-- Phase 3: Re-process real documents with embeddings
-- Clear existing chunks for the 2 real documents so we can regenerate with embeddings
DELETE FROM chunks WHERE document_id IN (
  '6d9ad916-7971-498e-a229-f133b732c3e0',
  '27d71983-2295-40b2-81b9-a863b2e6b9ff'
);

-- Reset document embedding status
UPDATE documents 
SET 
  embedding = NULL,
  ingestion_status = 'pending'
WHERE id IN (
  '6d9ad916-7971-498e-a229-f133b732c3e0',
  '27d71983-2295-40b2-81b9-a863b2e6b9ff'
);