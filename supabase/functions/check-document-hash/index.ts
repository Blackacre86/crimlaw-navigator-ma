import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  console.log('Check document hash function called')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { hash } = await req.json()

    if (!hash) {
      return new Response(
        JSON.stringify({ error: 'Hash is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Checking for duplicate document with hash:', hash)

    // Check if document with this hash already exists
    const { data: existingDocument, error } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .eq('content_hash', hash)
      .maybeSingle()

    if (error) {
      console.error('Error checking for duplicate:', error)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const isDuplicate = !!existingDocument
    
    console.log('Duplicate check result:', { isDuplicate, existingDocument })

    return new Response(
      JSON.stringify({
        isDuplicate,
        existingDocument: existingDocument || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in check-document-hash:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})