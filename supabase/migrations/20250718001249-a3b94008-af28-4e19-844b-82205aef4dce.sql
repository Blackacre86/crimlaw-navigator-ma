-- Fix hybrid_search function to match expected return structure
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
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(d.fts, plainto_tsquery('english', query_text)) DESC) AS rank_ix
        FROM documents d
        WHERE d.fts @@ plainto_tsquery('english', query_text)
        ORDER BY ts_rank_cd(d.fts, plainto_tsquery('english', query_text)) DESC
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

-- Update match_chunks function for better compatibility
DROP FUNCTION IF EXISTS public.match_chunks(vector, integer);

CREATE OR REPLACE FUNCTION public.match_chunks(
    query_embedding vector, 
    match_count integer DEFAULT 20
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
        c.id,
        c.content,
        c.metadata,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM chunks c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;