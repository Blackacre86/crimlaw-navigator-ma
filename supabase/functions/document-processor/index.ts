import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from "../_shared/cors.ts";

interface JobData {
  id: string
  job_type: string
  job_data: {
    document_id: string
    file_path: string
    original_name: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Health check endpoint
  if (req.method === 'GET') {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'document-processor-queue',
      version: '2.0.0',
      queue_enabled: true
    };
    
    return new Response(JSON.stringify(healthCheck), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔍 Document processor started at:', new Date().toISOString())

    // Claim next job from the queue
    const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_next_job', {
      p_worker_id: 'document-processor',
      p_job_types: ['document_processing']
    })

    if (claimError) {
      console.error('❌ Error claiming job:', claimError)
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // No jobs available
    if (!claimedJobs || claimedJobs.length === 0) {
      console.log('ℹ️ No jobs available for processing')
      return new Response(JSON.stringify({ message: 'No jobs available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const job = claimedJobs[0] as JobData
    console.log('📄 Processing job:', job.id, 'for document:', job.job_data.document_id)

    try {
      // Update processing job status to 'parsing'
      const { error: updateError } = await supabase
        .from('processing_jobs')
        .update({ status: 'parsing' })
        .eq('document_id', job.job_data.document_id)

      if (updateError) {
        throw new Error(`Failed to update job status: ${updateError.message}`)
      }

      // Download document from storage
      console.log('📥 Downloading document from:', job.job_data.file_path)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(job.job_data.file_path)

      if (downloadError) {
        throw new Error(`Failed to download document: ${downloadError.message}`)
      }

      // Extract text content (basic implementation - can be enhanced with PDF parsing)
      let extractedText = ''
      try {
        const arrayBuffer = await fileData.arrayBuffer()
        const textDecoder = new TextDecoder('utf-8')
        extractedText = textDecoder.decode(arrayBuffer)
        
        // Basic text cleanup
        extractedText = extractedText.replace(/\0/g, '').trim()
        
        if (!extractedText) {
          throw new Error('No text content could be extracted from the document')
        }
      } catch (parseError) {
        throw new Error(`Failed to parse document content: ${parseError.message}`)
      }

      // Update job status to 'chunking'
      const { error: chunkingError } = await supabase
        .from('processing_jobs')
        .update({ status: 'chunking' })
        .eq('document_id', job.job_data.document_id)

      if (chunkingError) {
        throw new Error(`Failed to update job status to chunking: ${chunkingError.message}`)
      }

      // Store parsed content in documents table
      const { error: storeError } = await supabase
        .from('documents')
        .update({ 
          parsed_content: extractedText,
          ingestion_status: 'completed'
        })
        .eq('id', job.job_data.document_id)

      if (storeError) {
        throw new Error(`Failed to store parsed content: ${storeError.message}`)
      }

      // Mark job as completed
      const { error: completeError } = await supabase.rpc('complete_job', {
        p_job_id: job.id,
        p_result: {
          document_id: job.job_data.document_id,
          content_length: extractedText.length,
          processing_method: 'text_extraction'
        }
      })

      if (completeError) {
        throw new Error(`Failed to complete job: ${completeError.message}`)
      }

      // Update processing job status to 'completed'
      const { error: finalUpdateError } = await supabase
        .from('processing_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_method: 'text_extraction'
        })
        .eq('document_id', job.job_data.document_id)

      if (finalUpdateError) {
        console.error('⚠️ Warning: Failed to update final job status:', finalUpdateError)
      }

      console.log('✅ Successfully processed document:', job.job_data.document_id)
      
      return new Response(JSON.stringify({ 
        success: true, 
        job_id: job.id,
        document_id: job.job_data.document_id,
        content_length: extractedText.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (processingError) {
      console.error('❌ Processing error:', processingError.message)
      
      // Mark job as failed with error message
      const { error: failError } = await supabase.rpc('fail_job', {
        p_job_id: job.id,
        p_error_message: processingError.message
      })

      if (failError) {
        console.error('❌ Failed to mark job as failed:', failError)
      }

      // Update processing job status to 'failed'
      const { error: failUpdateError } = await supabase
        .from('processing_jobs')
        .update({ 
          status: 'failed',
          error_message: processingError.message,
          completed_at: new Date().toISOString()
        })
        .eq('document_id', job.job_data.document_id)

      if (failUpdateError) {
        console.error('⚠️ Warning: Failed to update job status to failed:', failUpdateError)
      }

      return new Response(JSON.stringify({ 
        error: processingError.message,
        job_id: job.id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
