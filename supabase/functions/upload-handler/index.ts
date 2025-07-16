import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to calculate SHA256 hash
async function calculateSHA256(file: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', file);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper function to clean up resources on error
async function cleanupOnError(filePath: string, documentId?: string, processingJobId?: string) {
  try {
    // Remove file from storage
    if (filePath) {
      await supabase.storage.from('documents').remove([filePath]);
    }
    
    // Remove processing job record
    if (processingJobId) {
      await supabase.from('processing_jobs').delete().eq('id', processingJobId);
    }
    
    // Remove document record
    if (documentId) {
      await supabase.from('documents').delete().eq('id', documentId);
    }
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type (PDF only for now)
    if (!file.type.includes('pdf')) {
      return new Response(JSON.stringify({ error: 'Only PDF files are supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert file to Uint8Array and calculate SHA256 hash
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    const contentHash = await calculateSHA256(fileBytes);

    console.log(`Processing file: ${file.name}, hash: ${contentHash}`);

    // Use the new duplicate detection function
    const { data: duplicateCheck, error: checkError } = await supabase
      .rpc('check_document_duplicate', {
        p_content_hash: contentHash,
        p_title: file.name
      });

    if (checkError) {
      console.error('Error checking duplicate document:', checkError);
      return new Response(JSON.stringify({ error: 'Duplicate check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].doc_exists) {
      const existing = duplicateCheck[0];
      console.log(`Duplicate document detected: ${existing.document_title} (ID: ${existing.document_id})`);
      
      // Check the processing status of the existing document
      const { data: docStatus, error: statusError } = await supabase
        .from('documents')
        .select('ingestion_status, processing_completed_at, chunked')
        .eq('id', existing.document_id)
        .single();

      const isProcessed = docStatus && (docStatus.ingestion_status === 'completed' || docStatus.chunked);
      
      return new Response(JSON.stringify({ 
        success: true,
        duplicate: true,
        message: isProcessed 
          ? `Document "${existing.document_title}" is already uploaded and processed.`
          : `Document "${existing.document_title}" is already uploaded and being processed.`,
        existing_document_id: existing.document_id,
        existing_document_title: existing.document_title,
        processing_status: docStatus?.ingestion_status || 'unknown',
        is_processed: isProcessed
      }), {
        status: 200, // Success status instead of conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `uploads/${fileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBytes, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Extract basic text content from PDF (placeholder content for processing)
    let basicContent = `Document: ${file.name}\nUploaded: ${new Date().toISOString()}\nFile size: ${file.size} bytes\nContent type: ${file.type}`;
    
    // For PDFs, we'll add a placeholder that indicates it needs processing
    if (file.type.includes('pdf')) {
      basicContent += `\n\n[PDF Content - Requires Processing]\nThis document contains PDF content that needs to be extracted and processed. File path: ${filePath}`;
    }

    // Create document record
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        title: file.name,
        category: 'Legal Document', // Default category
        content: basicContent, // Basic content for immediate processing
        file_path: uploadData.path,
        content_hash: contentHash,
        ingestion_status: 'pending',
        document_source: 'upload',
        document_title: file.name
      })
      .select()
      .single();

    if (documentError) {
      console.error('Error creating document record:', documentError);
      await cleanupOnError(filePath);
      return new Response(JSON.stringify({ error: 'Failed to create document record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Document record created:', documentData.id);

    // Create processing job record
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        document_name: file.name,
        original_name: file.name,
        status: 'pending',
        document_id: documentData.id,
        processing_method: 'llamaparse'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating processing job:', jobError);
      await cleanupOnError(filePath, documentData.id);
      return new Response(JSON.stringify({ error: 'Failed to create processing job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing job created:', jobData.id);

    // Enqueue job in PostgreSQL queue
    const { data: queueData, error: queueError } = await supabase
      .rpc('enqueue_job', {
        p_job_type: 'document_processing',
        p_job_data: {
          processing_job_id: jobData.id,
          document_id: documentData.id,
          file_path: uploadData.path,
          original_name: file.name,
          content_hash: contentHash
        },
        p_priority: 1,
        p_max_retries: 3
      });

    if (queueError) {
      console.error('Error enqueueing job:', queueError);
      await cleanupOnError(filePath, documentData.id, jobData.id);
      return new Response(JSON.stringify({ error: 'Failed to enqueue processing job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Job enqueued successfully:', queueData);

    // Return 202 Accepted with job details
    return new Response(JSON.stringify({
      message: 'Document uploaded and queued for processing',
      job_id: queueData,
      processing_job_id: jobData.id,
      document_id: documentData.id,
      file_path: uploadData.path,
      content_hash: contentHash
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in upload-handler:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});