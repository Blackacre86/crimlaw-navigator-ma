import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Test function invoked successfully');
    
    const body = await req.json().catch(() => ({}));
    const timestamp = new Date().toISOString();
    
    console.log('📝 Request body:', body);
    console.log('⏰ Timestamp:', timestamp);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function working correctly',
        timestamp,
        requestBody: body,
        environment: {
          supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
          serviceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          openaiKey: !!Deno.env.get('OPENAI_API_KEY'),
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Test function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});