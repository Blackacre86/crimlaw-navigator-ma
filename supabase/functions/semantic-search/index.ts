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

    // Step 1: RAG-Fusion Query Expansion
    console.log('Generating query variations for RAG-Fusion...');
    const queryVariations = await generateQueryVariations(query, openAIApiKey);
    const allQueries = [query, ...queryVariations];
    console.log('Generated queries:', allQueries);

    // Step 2: Generate embeddings for all query variations
    const embeddingResponses = await Promise.all(
      allQueries.map(async (q) => {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: q,
          }),
        });

        if (!response.ok) {
          console.warn(`Failed to generate embedding for query: ${q}`);
          return null;
        }

        const data = await response.json();
        return { query: q, embedding: data.data[0].embedding };
      })
    );

    const validEmbeddings = embeddingResponses.filter(Boolean);
    
    if (validEmbeddings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate embeddings for queries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Performing RAG-Fusion search with multiple queries...');

    // Step 3: Execute searches for all query variations in parallel
    const searchPromises = validEmbeddings.map(async ({ query: q, embedding }) => {
      try {
        // Try hybrid search first
        const { data: hybridResults, error: hybridError } = await supabase.rpc('hybrid_search', {
          query_text: q,
          query_embedding: embedding,
          match_count: 15 // Smaller per-query limit since we're fusing multiple results
        });

        if (hybridError) {
          console.warn(`Hybrid search failed for query "${q}", falling back to vector search`);
          
          // Fallback to vector search
          const { data: vectorResults, error: vectorError } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            similarity_threshold: 0.7,
            match_count: 10
          });

          if (vectorError) {
            console.warn(`Vector search also failed for query "${q}"`);
            return [];
          }

          return vectorResults || [];
        }

        return hybridResults || [];
      } catch (error) {
        console.warn(`Search failed for query "${q}":`, error);
        return [];
      }
    });

    const allSearchResults = await Promise.all(searchPromises);

    // Step 4: RAG-Fusion - Combine results using Reciprocal Rank Fusion (RRF)
    console.log('Fusing search results with RRF...');
    const documents = fuseSearchResults(allSearchResults, 50); // k=50 for RRF
    
    console.log(`RAG-Fusion returned ${documents.length} unique results`);

    // Fallback if no results from any query
    if (documents.length === 0) {
      console.log('No results from any search variation, using basic fallback...');
      
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

      documents.push(...(fallbackDocuments || []));
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
        search_method: 'rag_fusion' + (documents.length > 5 ? '_with_reranking' : ''),
        query_variations: queryVariations
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

// Generate query variations for RAG-Fusion
async function generateQueryVariations(originalQuery: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert legal research assistant specializing in Massachusetts Criminal Law. Your task is to rewrite a user's query to improve search recall and precision.

Generate 3 diverse, alternative search queries that a legal expert might use. Frame the queries from different perspectives, such as a defense attorney, a prosecutor, and a legal scholar. Include specific legal terms of art, statutory language (e.g., M.G.L. citations), and relevant legal concepts where appropriate.

Return only the 3 alternative queries, one per line, without numbering or explanation.`
          },
          {
            role: 'user',
            content: `Given the user's query: "${originalQuery}"\n\nGenerate 3 alternative search queries:`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to generate query variations');
      return [];
    }

    const data = await response.json();
    const variations = data.choices[0].message.content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .slice(0, 3); // Ensure we only get 3 variations

    return variations;
  } catch (error) {
    console.warn('Error generating query variations:', error);
    return [];
  }
}

// Fuse multiple search result lists using Reciprocal Rank Fusion (RRF)
function fuseSearchResults(searchResults: any[][], k: number = 50): any[] {
  const documentScores = new Map<string, { document: any; score: number }>();

  // Apply RRF scoring across all result lists
  searchResults.forEach((results) => {
    results.forEach((doc, index) => {
      const docId = doc.id;
      const rank = index + 1;
      const rrfScore = 1.0 / (k + rank);

      if (documentScores.has(docId)) {
        documentScores.get(docId)!.score += rrfScore;
      } else {
        documentScores.set(docId, { document: doc, score: rrfScore });
      }
    });
  });

  // Sort by fused score and return documents
  return Array.from(documentScores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ document, score }) => ({ ...document, rrf_score: score }));
}

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