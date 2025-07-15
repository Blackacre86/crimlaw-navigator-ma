-- Create chunks table with specified schema
CREATE TABLE public.chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE public.chunks 
ADD CONSTRAINT chunks_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

-- Create indexes for optimal performance
CREATE INDEX idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX idx_chunks_chunk_index ON public.chunks(chunk_index);
CREATE INDEX idx_chunks_metadata ON public.chunks USING GIN(metadata);
CREATE INDEX idx_chunks_embedding ON public.chunks USING hnsw(embedding vector_cosine_ops);

-- Add chunked column to documents table
ALTER TABLE public.documents ADD COLUMN chunked BOOLEAN DEFAULT FALSE;

-- Enable RLS on chunks table
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chunks table
CREATE POLICY "Authenticated users can view chunks"
ON public.chunks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage chunks"
ON public.chunks
FOR ALL
TO service_role
USING (true);

-- Create match_chunks function
CREATE OR REPLACE FUNCTION public.match_chunks(
    query_embedding vector(1536),
    match_count int DEFAULT 20
)
RETURNS TABLE(
    id bigint,
    content text,
    metadata jsonb,
    similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        chunks.id,
        chunks.content,
        chunks.metadata,
        1 - (chunks.embedding <=> query_embedding) as similarity
    FROM public.chunks
    WHERE chunks.embedding IS NOT NULL
    ORDER BY chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;