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

    console.log('Generating embedding for query:', query);

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

    console.log('Performing similarity search...');

    // Perform similarity search using cosine distance
    const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.7,
      match_count: 5
    });

    // If the RPC function doesn't exist, fall back to a direct query
    if (searchError && searchError.message.includes('function match_documents')) {
      console.log('Using fallback similarity search...');
      const { data: fallbackDocuments, error: fallbackError } = await supabase
        .from('documents')
        .select('title, category, content')
        .limit(5);

      if (fallbackError) {
        console.error('Fallback search error:', fallbackError);
        return new Response(
          JSON.stringify({ error: 'Database search failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For now, return the first 5 documents as context
      const context = fallbackDocuments?.map(doc => doc.content).join('\n\n') || '';
      
      if (!context) {
        return new Response(
          JSON.stringify({ 
            answer: "I'm sorry, but I don't have enough information in my database to answer your question about Massachusetts criminal law. Please try a different query or check back later as more legal documents are added.",
            sources: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Generating answer with GPT-4...');

      // Generate answer using the retrieved context
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
              content: 'You are an expert legal assistant for Massachusetts criminal law. Using ONLY the following legal text sections, please provide a clear and concise answer to the user\'s question. Do not use any outside knowledge. If the provided context does not contain enough information to answer the question, say so clearly.'
            },
            {
              role: 'user',
              content: `User's Question: ${query}\n\nRelevant Legal Texts:\n${context}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
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
          sources: fallbackDocuments?.map(doc => ({
            title: doc.title,
            category: doc.category
          })) || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Database search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const context = documents?.map((doc: any) => doc.content).join('\n\n') || '';
    
    if (!context) {
      return new Response(
        JSON.stringify({ 
          answer: "I'm sorry, but I don't have enough information in my database to answer your question about Massachusetts criminal law. Please try a different query or check back later as more legal documents are added.",
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating answer with GPT-4...');

    // Generate answer using the retrieved context
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
            content: 'You are an expert legal assistant for Massachusetts criminal law. Using ONLY the following legal text sections, please provide a clear and concise answer to the user\'s question. Do not use any outside knowledge. If the provided context does not contain enough information to answer the question, say so clearly.'
          },
          {
            role: 'user',
            content: `User's Question: ${query}\n\nRelevant Legal Texts:\n${context}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
        sources: documents?.map((doc: any) => ({
          title: doc.title,
          category: doc.category
        })) || []
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