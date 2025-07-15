-- Add timing columns to processing_jobs table for enhanced analytics
ALTER TABLE processing_jobs
  ADD COLUMN upload_ms integer,
  ADD COLUMN parse_ms integer,
  ADD COLUMN chunk_ms integer,
  ADD COLUMN embed_ms integer,
  ADD COLUMN pginsert_ms integer,
  ADD COLUMN total_ms integer;