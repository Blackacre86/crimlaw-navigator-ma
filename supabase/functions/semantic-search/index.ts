import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing query:', query);

    // Generate embedding for the user's query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.text();
      console.error('OpenAI embedding error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log('Performing hybrid search...');

    // Try hybrid search first (combines vector + keyword search with RRF)
    let documents: any[] = [];
    
    try {
      const { data: hybridResults, error: hybridError } = await supabase.rpc('hybrid_search', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_count: 20
      });

      if (hybridError) {
        console.warn('Hybrid search failed, falling back to vector search:', hybridError);
        throw hybridError;
      }

      documents = hybridResults || [];
      console.log(`Hybrid search returned ${documents.length} results`);

    } catch (error) {
      // Fallback to pure vector search
      console.log('Using fallback vector search...');
      
      const { data: vectorResults, error: vectorError } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.7,
        match_count: 5
      });

      if (vectorError) {
        console.warn('Vector search failed, using basic fallback:', vectorError);
        
        // Last resort: return random documents
        const { data: fallbackDocuments, error: fallbackError } = await supabase
          .from('documents')
          .select('title, category, content')
          .limit(5);

        if (fallbackError) {
          console.error('All search methods failed:', fallbackError);
          return new Response(
            JSON.stringify({ error: 'Database search failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        documents = fallbackDocuments || [];
      } else {
        documents = vectorResults || [];
      }
    }

    // If we have many results, apply cross-encoder re-ranking
    if (documents.length > 5) {
      documents = await reRankWithCrossEncoder(query, documents, openAIApiKey);
    }

    // Take top 5 for context
    const contextDocuments = documents.slice(0, 5);
    const context = contextDocuments.map((doc: any) => doc.content).join('\n\n');
    
    if (!context) {
      return new Response(
        JSON.stringify({ 
          answer: "I'm sorry, but I don't have enough information in my database to answer your question about Massachusetts criminal law. Please try a different query or check back later as more legal documents are added.",
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating answer with GPT-4o...');

    // Generate answer using the retrieved context with enhanced prompting
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert legal assistant specializing in Massachusetts criminal law. Your responses must be:

1. PRECISION-FOCUSED: Base answers ONLY on the provided legal text sections
2. VERIFIABLE: Cite specific sections or quotes when making legal statements
3. STRUCTURED: Present information clearly with proper legal hierarchy understanding
4. CAUTIOUS: If the context doesn't contain enough information, state this clearly

Do not use any outside legal knowledge. Only reference the provided Massachusetts legal documents.`
          },
          {
            role: 'user',
            content: `Query: ${query}

Relevant Massachusetts Legal Documents:
${context}

Please provide a comprehensive answer based only on these legal texts. If you quote or reference specific provisions, indicate which document section they come from.`
          }
        ],
        temperature: 0.1, // Lower temperature for more precise legal responses
        max_tokens: 1200,
      }),
    });

    if (!chatResponse.ok) {
      const errorData = await chatResponse.text();
      console.error('OpenAI chat error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate answer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatData = await chatResponse.json();
    const answer = chatData.choices[0].message.content;

    return new Response(
      JSON.stringify({
        answer,
        sources: contextDocuments.map((doc: any) => ({
          title: doc.title,
          category: doc.category,
          relevance_score: doc.rrf_score || doc.similarity || 0
        })),
        search_method: documents.length > 5 ? 'hybrid_with_reranking' : 'hybrid'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in semantic-search function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple cross-encoder re-ranking using GPT-4o for relevance scoring
async function reRankWithCrossEncoder(query: string, documents: any[], apiKey: string): Promise<any[]> {
  try {
    console.log(`Re-ranking ${documents.length} documents...`);
    
    // Score each document for relevance to the query
    const scoredDocuments = await Promise.all(
      documents.map(async (doc, index) => {
        try {
          const scoringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini', // Use mini for faster scoring
              messages: [
                {
                  role: 'system',
                  content: 'You are a legal document relevance scorer. Rate how relevant a legal document excerpt is to a user query on a scale of 0-100. Only respond with a number.'
                },
                {
                  role: 'user',
                  content: `Query: "${query}"\n\nDocument: "${doc.content.substring(0, 500)}..."\n\nRelevance score (0-100):`
                }
              ],
              temperature: 0,
              max_tokens: 10,
            }),
          });

          if (scoringResponse.ok) {
            const scoringData = await scoringResponse.json();
            const scoreText = scoringData.choices[0].message.content.trim();
            const score = parseInt(scoreText) || 0;
            return { ...doc, cross_encoder_score: score };
          } else {
            return { ...doc, cross_encoder_score: 50 }; // Default score if scoring fails
          }
        } catch (error) {
          console.warn(`Failed to score document ${index}:`, error);
          return { ...doc, cross_encoder_score: 50 };
        }
      })
    );

    // Sort by cross-encoder score
    return scoredDocuments.sort((a, b) => b.cross_encoder_score - a.cross_encoder_score);
    
  } catch (error) {
    console.warn('Cross-encoder re-ranking failed:', error);
    return documents; // Return original order if re-ranking fails
  }
}