-- Performance Indexes Migration - Optimize query performance across the legal research platform
-- This migration adds strategic indexes to improve vector search, document filtering, and processing job queries

BEGIN;

-- 1. Verify pgvector extension is enabled (should already be present)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Replace existing IVFFlat index with more efficient HNSW index on documents.embedding
-- HNSW provides better query performance for vector similarity searches
DROP INDEX IF EXISTS documents_embedding_idx;
CREATE INDEX documents_embedding_hnsw_idx ON public.documents 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- 3. Add B-Tree index on processing_jobs.document_id for foreign key lookups
-- This optimizes JOIN operations and document status queries
CREATE INDEX IF NOT EXISTS processing_jobs_document_id_idx 
ON public.processing_jobs (document_id) 
WHERE document_id IS NOT NULL;

-- 4. Add composite index on documents for common filtering patterns
-- Optimizes queries filtering by document source and ingestion status
CREATE INDEX IF NOT EXISTS documents_source_status_idx 
ON public.documents (document_source, ingestion_status) 
WHERE document_source IS NOT NULL AND ingestion_status IS NOT NULL;

-- 5. Add index on processing_jobs.status for dashboard queries
-- Optimizes queries filtering by processing status (queued, processing, completed, failed)
CREATE INDEX IF NOT EXISTS processing_jobs_status_idx 
ON public.processing_jobs (status);

-- 6. Add composite index on processing_jobs for time-based queries
-- Optimizes queries filtering by status and creation time for monitoring
CREATE INDEX IF NOT EXISTS processing_jobs_status_created_idx 
ON public.processing_jobs (status, created_at DESC);

-- 7. Add index on documents.content_hash for deduplication queries
-- Note: This already exists as a unique constraint, but adding comment for clarity
-- CREATE UNIQUE INDEX documents_content_hash_key ON public.documents (content_hash); -- Already exists

-- 8. Add index on documents.category for filtering by document type
-- Optimizes queries filtering legal documents by category
CREATE INDEX IF NOT EXISTS documents_category_idx 
ON public.documents (category);

-- 9. Add composite index for document search queries
-- Optimizes queries combining category and ingestion status
CREATE INDEX IF NOT EXISTS documents_category_status_idx 
ON public.documents (category, ingestion_status) 
WHERE ingestion_status IS NOT NULL;

-- 10. Add index on processing_jobs timing columns for analytics
-- Optimizes queries analyzing processing performance
CREATE INDEX IF NOT EXISTS processing_jobs_timing_idx 
ON public.processing_jobs (completed_at, total_ms) 
WHERE completed_at IS NOT NULL AND total_ms IS NOT NULL;

-- 11. Add index on documents.created_at for chronological queries
-- Optimizes queries sorting or filtering documents by creation date
CREATE INDEX IF NOT EXISTS documents_created_at_idx 
ON public.documents (created_at DESC);

COMMIT;