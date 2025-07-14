-- Create the missing match_documents RPC function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  content text,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.category,
    documents.content,
    documents.created_at,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.embedding IS NOT NULL
    AND 1 - (documents.embedding <=> query_embedding) > similarity_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add full-text search capabilities to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS documents_fts_idx ON public.documents USING gin(fts);

-- Create enhanced hybrid search function that combines vector and keyword search using Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  rrf_k int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  content text,
  created_at timestamp with time zone,
  rrf_score float
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