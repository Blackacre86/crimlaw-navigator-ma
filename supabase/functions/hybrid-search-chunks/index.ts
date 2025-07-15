import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChunkResult {
  id: number;
  content: string;
  metadata: any;
  similarity?: number;
  score?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing hybrid search for query:', query);

    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to generate embedding' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Execute parallel searches
    const [vectorResults, textResults] = await Promise.all([
      // Vector search using match_chunks function
      supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_count: 20
      }),
      // Text search using full-text search
      supabase
        .from('chunks')
        .select('id, content, metadata')
        .textSearch('content', query, { type: 'websearch' })
        .limit(20)
    ]);

    console.log('Vector search results:', vectorResults.data?.length || 0);
    console.log('Text search results:', textResults.data?.length || 0);

    if (vectorResults.error) {
      console.error('Vector search error:', vectorResults.error);
      return new Response(JSON.stringify({ error: 'Vector search failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (textResults.error) {
      console.error('Text search error:', textResults.error);
      return new Response(JSON.stringify({ error: 'Text search failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Implement Reciprocal Rank Fusion (RRF)
    const combinedResults = new Map<number, ChunkResult>();
    const k = 60; // RRF constant

    // Process vector search results
    if (vectorResults.data) {
      vectorResults.data.forEach((chunk: any, index: number) => {
        const score = 1 / (k + index + 1);
        combinedResults.set(chunk.id, {
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: chunk.similarity,
          score: score
        });
      });
    }

    // Process text search results and combine scores
    if (textResults.data) {
      textResults.data.forEach((chunk: any, index: number) => {
        const score = 1 / (k + index + 1);
        const existing = combinedResults.get(chunk.id);
        
        if (existing) {
          // Sum scores if chunk appears in both results
          existing.score! += score;
        } else {
          combinedResults.set(chunk.id, {
            id: chunk.id,
            content: chunk.content,
            metadata: chunk.metadata,
            score: score
          });
        }
      });
    }

    // Sort by combined score and return top 20
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);

    console.log('Final combined results:', finalResults.length);

    return new Response(JSON.stringify({ 
      chunks: finalResults.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
        score: chunk.score,
        similarity: chunk.similarity
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in hybrid-search-chunks function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});