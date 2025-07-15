import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QueryRequest {
  query: string;
  userId?: string;
}

interface QueryResponse {
  answer: string;
  sources: any[];
  confidence: number;
  query_id: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { query, userId }: QueryRequest = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return getDefaultNoResponse();
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let classification = 'NO';
    let classificationError = null;

    try {
      // Use GPT-4o-mini for cost-effective binary classification
      const classificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a query classifier. You must respond with only YES or NO, nothing else.'
            },
            {
              role: 'user',
              content: `Is this query asking about Massachusetts criminal law, procedure, or law enforcement? Answer only YES or NO.\n\nQuery: ${query}`
            }
          ],
          max_tokens: 5,
          temperature: 0,
        }),
      });

      if (classificationResponse.ok) {
        const classificationData = await classificationResponse.json();
        const rawClassification = classificationData.choices[0]?.message?.content?.trim().toUpperCase();
        
        // Strict parsing - only accept exact YES, default to NO for safety
        if (rawClassification === 'YES') {
          classification = 'YES';
        } else {
          classification = 'NO';
        }
      } else {
        console.error('Classification API error:', classificationResponse.status);
        classificationError = `Classification API error: ${classificationResponse.status}`;
      }
    } catch (error) {
      console.error('Classification error:', error);
      classificationError = error.message;
    }

    const routerResponseTime = Date.now() - startTime;

    // Log the query with classification for analytics
    try {
      await supabase.from('query_logs').insert({
        query,
        answer: classification === 'YES' ? 'ROUTED_TO_LEGAL_QUERY' : 'REJECTED_NON_LEGAL',
        user_id: userId || null,
        confidence: classification === 'YES' ? null : 1,
        sources: [],
        response_time_ms: routerResponseTime,
        chunks_processed: 0,
        tokens_used: classification === 'YES' ? null : 0,
      });
    } catch (logError) {
      console.error('Failed to log query:', logError);
    }

    // Route based on classification
    if (classification === 'YES') {
      try {
        // Call the process-legal-query function
        const { data: legalResponse, error: legalError } = await supabase.functions.invoke('process-legal-query', {
          body: { query, userId }
        });

        if (legalError) {
          console.error('Legal query processing error:', legalError);
          return getDefaultNoResponse();
        }

        return new Response(
          JSON.stringify(legalResponse),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('Error calling process-legal-query:', error);
        return getDefaultNoResponse();
      }
    } else {
      // Return standardized denial response
      const noResponse: QueryResponse = {
        answer: "I can only answer questions about Massachusetts criminal law and procedure. Please rephrase your question or ask about specific laws, procedures, or legal concepts.",
        sources: [],
        confidence: 1,
        query_id: null
      };

      return new Response(
        JSON.stringify(noResponse),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Query router error:', error);
    return getDefaultNoResponse();
  }
});

function getDefaultNoResponse(): Response {
  const noResponse: QueryResponse = {
    answer: "I can only answer questions about Massachusetts criminal law and procedure. Please rephrase your question or ask about specific laws, procedures, or legal concepts.",
    sources: [],
    confidence: 1,
    query_id: null
  };

  return new Response(
    JSON.stringify(noResponse),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}