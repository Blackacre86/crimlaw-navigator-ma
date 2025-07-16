import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const workerId = `queue-processor-${Date.now()}`;

    console.log('🔄 Starting queue processor...');

    // Claim next available job
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_next_job', {
        p_worker_id: workerId,
        p_job_types: ['document_processing']
      });

    if (claimError) {
      console.error('Error claiming job:', claimError);
      throw claimError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs available for processing');
      return new Response(JSON.stringify({
        message: 'No jobs available',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const job = jobs[0];
    console.log('📋 Processing job:', job.id, 'Type:', job.job_type);

    try {
      // Extract job data
      const jobData = job.job_data;
      const documentId = jobData.document_id;

      if (!documentId) {
        throw new Error('No document ID in job data');
      }

      console.log('📄 Processing document:', documentId);

      // Call the process-document function
      const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId }
      });

      if (processError) {
        throw new Error(`Document processing failed: ${processError.message}`);
      }

      console.log('✅ Document processed successfully:', processData);

      // Mark job as completed
      const { error: completeError } = await supabase
        .rpc('complete_job', {
          p_job_id: job.id,
          p_result: processData
        });

      if (completeError) {
        console.error('Error completing job:', completeError);
      }

      return new Response(JSON.stringify({
        message: 'Job processed successfully',
        job_id: job.id,
        document_id: documentId,
        result: processData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Job processing error:', error);

      // Mark job as failed
      const { error: failError } = await supabase
        .rpc('fail_job', {
          p_job_id: job.id,
          p_error_message: error.message
        });

      if (failError) {
        console.error('Error failing job:', failError);
      }

      throw error;
    }

  } catch (error) {
    console.error('❌ Queue processor error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});