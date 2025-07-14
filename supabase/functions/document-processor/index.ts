import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Step 2: Add debug logging to confirm function invocation
  console.log(`[${new Date().toISOString()}] document-processor function invoked.`);

  try {
    console.log('🚀 Document processor request received');
    
    const { fileName, originalName } = await req.json();
    
    if (!fileName || !originalName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: fileName and originalName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Document processing request: ${originalName} (internal: ${fileName})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Start background processing using EdgeRuntime.waitUntil
    EdgeRuntime.waitUntil(
      processDocumentInBackground(fileName, originalName, supabase)
    );

    // Return immediate response
    console.log('✅ Document processing started in background');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document processing started in background',
        fileName,
        originalName,
        status: 'queued'
      }),
      { 
        status: 202, // Accepted - processing in background
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Document processor request error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Background processing function
async function processDocumentInBackground(
  fileName: string, 
  originalName: string, 
  supabase: any
) {
  const startTime = Date.now();
  let currentStep = 'initialization';
  let jobId: string | null = null;

  try {
    console.log(`🔄 Background processing started for: ${originalName}`);
    
    // Create processing job record
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        document_name: fileName,
        original_name: originalName,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to create processing job:', jobError);
      return;
    }

    jobId = jobData.id;
    console.log(`📝 Created processing job: ${jobId}`);

    // Get environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const llamaParseApiKey = Deno.env.get('LLAMA_CLOUD_API_KEY');
    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Download the file from storage
    currentStep = 'file_download';
    console.log('📥 Downloading file from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileSizeKB = arrayBuffer.byteLength / 1024;
    console.log(`📊 File downloaded: ${fileSizeKB.toFixed(1)} KB`);

    // Text extraction with fallback chain
    currentStep = 'text_extraction';
    let text = '';
    let extractionMethod = 'none';

    // Try LlamaParse first if API key is available
    if (llamaParseApiKey) {
      try {
        console.log('🔄 Attempting LlamaParse extraction...');
        text = await extractWithLlamaParse(arrayBuffer, llamaParseApiKey, originalName);
        extractionMethod = 'llamaparse';
        console.log(`✅ LlamaParse extracted ${text.length} characters`);
      } catch (error) {
        console.warn('❌ LlamaParse failed:', error.message);
        console.log('🔄 Falling back to basic extraction...');
        text = await extractPdfBasic(arrayBuffer);
        extractionMethod = 'basic';
      }
    } else {
      console.log('⚠️ LlamaParse API key not found, using basic extraction...');
      text = await extractPdfBasic(arrayBuffer);
      extractionMethod = 'basic';
    }

    // Check if we might need OCR (scanned document detection)
    const textToSizeRatio = text.length / fileSizeKB;
    console.log(`📈 Text extraction stats: ${text.length} chars, ratio: ${textToSizeRatio.toFixed(2)} chars/KB`);
    
    if (text.length < 500 && fileSizeKB > 100) {
      console.log('🔍 Potential scanned document detected (low text/size ratio). Attempting OCR...');
      
      if (ocrSpaceApiKey) {
        try {
          console.log('🔄 Starting OCR extraction...');
          const ocrText = await extractWithOCR(arrayBuffer, ocrSpaceApiKey, originalName);
          if (ocrText && ocrText.length > text.length) {
            console.log(`✅ OCR extracted ${ocrText.length} characters (better than ${extractionMethod})`);
            text = ocrText;
            extractionMethod = 'ocr';
          } else {
            console.log(`⚠️ OCR result (${ocrText?.length || 0} chars) not better than ${extractionMethod}`);
          }
        } catch (error) {
          console.warn('❌ OCR extraction failed:', error.message);
        }
      } else {
        console.warn('⚠️ OCR_SPACE_API_KEY not found, skipping OCR fallback');
      }
    }

    if (!text || text.length < 100) {
      throw new Error(`Could not extract meaningful text from PDF. Extracted only ${text?.length || 0} characters using ${extractionMethod}.`);
    }

    console.log(`✅ Final extraction result: ${text.length} characters using ${extractionMethod}`);

    // Use structure-aware chunking with RecursiveCharacterTextSplitter approach
    currentStep = 'chunking';
    console.log('📝 Creating text chunks...');
    const chunks = structureAwareChunking(text, 1024, 200);
    console.log(`✅ Created ${chunks.length} text chunks`);

    if (chunks.length === 0) {
      throw new Error('No valid chunks created from extracted text');
    }

    // Update processing job record with chunks info
    await supabase
      .from('processing_jobs')
      .update({
        total_chunks: chunks.length,
        processing_method: extractionMethod
      })
      .eq('id', jobId);

    // Generate embeddings for each chunk and insert into database
    currentStep = 'embedding_generation';
    let processedChunks = 0;
    const batchSize = 3; // Reduced batch size for better stability
    const totalBatches = Math.ceil(chunks.length / batchSize);

    console.log(`🔄 Processing ${chunks.length} chunks in ${totalBatches} batches...`);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const currentBatch = Math.floor(i / batchSize) + 1;
      const batch = chunks.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${currentBatch}/${totalBatches} (chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)})`);
      
      try {
        await Promise.all(
          batch.map(async (chunk, batchIndex) => {
            const chunkIndex = i + batchIndex + 1;
            
            try {
              // Generate embedding for this chunk with timeout
              const embeddingController = new AbortController();
              const embeddingTimeout = setTimeout(() => embeddingController.abort(), 30000); // 30 second timeout
              
              const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'text-embedding-3-small',
                  input: chunk.content,
                  encoding_format: 'float',
                }),
                signal: embeddingController.signal,
              });

              clearTimeout(embeddingTimeout);

              if (!embeddingResponse.ok) {
                const errorText = await embeddingResponse.text();
                throw new Error(`OpenAI API error ${embeddingResponse.status}: ${errorText}`);
              }

              const embeddingData = await embeddingResponse.json();
              if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
                throw new Error('Invalid embedding response from OpenAI');
              }
              
              const embedding = embeddingData.data[0].embedding;

              // Insert chunk into database with retry logic
              let insertSuccess = false;
              let insertAttempts = 0;
              const maxInsertAttempts = 3;
              
              while (!insertSuccess && insertAttempts < maxInsertAttempts) {
                try {
                  const { error: insertError } = await supabase
                    .from('documents')
                    .insert({
                      title: chunk.title,
                      content: chunk.content,
                      category: determineCategory(originalName, chunk.metadata),
                      embedding: JSON.stringify(embedding),
                    });

                  if (insertError) {
                    throw insertError;
                  }
                  
                  insertSuccess = true;
                  processedChunks++;
                  console.log(`✅ Processed chunk ${chunkIndex}/${chunks.length}`);
                } catch (insertError) {
                  insertAttempts++;
                  console.warn(`⚠️ Insert attempt ${insertAttempts} failed for chunk ${chunkIndex}:`, insertError.message);
                  
                  if (insertAttempts >= maxInsertAttempts) {
                    throw new Error(`Failed to insert chunk ${chunkIndex} after ${maxInsertAttempts} attempts: ${insertError.message}`);
                  }
                  
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000 * insertAttempts));
                }
              }
              
            } catch (error) {
              console.error(`❌ Error processing chunk ${chunkIndex}:`, error.message);
              throw new Error(`Chunk ${chunkIndex} processing failed: ${error.message}`);
            }
          })
        );

        // Progress update and job status update
        const progress = Math.round((processedChunks / chunks.length) * 100);
        console.log(`📊 Progress: ${processedChunks}/${chunks.length} chunks (${progress}%)`);
        
        // Update job progress
        if (jobId) {
          await supabase
            .from('processing_jobs')
            .update({ chunks_processed: processedChunks })
            .eq('id', jobId);
        }
        
        // Delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          console.log('⏳ Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (batchError) {
        console.error(`❌ Batch ${currentBatch} failed:`, batchError.message);
        throw new Error(`Processing failed at batch ${currentBatch}: ${batchError.message}`);
      }
    }

    // Clean up - delete the uploaded file from storage
    currentStep = 'cleanup';
    console.log('🧹 Cleaning up uploaded file...');
    try {
      await supabase.storage.from('documents').remove([fileName]);
      console.log('✅ File cleanup completed');
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup failed (non-critical):', cleanupError.message);
    }

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 Successfully processed ${processedChunks} chunks from ${originalName} in ${processingTime.toFixed(1)}s`);

    // Mark job as completed
    if (jobId) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          chunks_processed: processedChunks,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    console.log(`✅ Processing job ${jobId} completed successfully`);

  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    console.error(`💥 Background processing error at step '${currentStep}':`, error.message);
    console.error('📊 Processing stats:', {
      step: currentStep,
      timeElapsed: `${processingTime.toFixed(1)}s`,
      error: error.message
    });
    
    // Mark job as failed
    if (jobId) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
    
    console.error(`❌ Processing job ${jobId} failed: ${error.message}`);
  }
}

async function extractWithLlamaParse(arrayBuffer: ArrayBuffer, apiKey: string, fileName: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  formData.append('file', blob, fileName);
  formData.append('result_type', 'markdown');
  formData.append('verbose', 'true');

  const response = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`LlamaParse API error: ${response.statusText}`);
  }

  const result = await response.json();
  const jobId = result.id;

  // Poll for completion (reduced timeout for better stability)
  let attempts = 0;
  const maxAttempts = 12; // 2 minutes max (12 * 10s)
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const statusResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`LlamaParse status check failed: ${statusResponse.statusText}`);
    }

    const statusResult = await statusResponse.json();
    
    if (statusResult.status === 'SUCCESS') {
      return statusResult.result.markdown || statusResult.result.text || '';
    } else if (statusResult.status === 'ERROR') {
      throw new Error(`LlamaParse processing failed: ${statusResult.error}`);
    }
    
    attempts++;
  }

  throw new Error('LlamaParse processing timed out');
}

async function extractPdfBasic(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder();
  let text = decoder.decode(arrayBuffer);
  
  // Remove PDF headers, metadata, and clean up the text
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
  text = text.replace(/\s+/g, ' ');
  text = text.trim();

  if (!text || text.length < 100) {
    // Try fallback extraction
    return await extractPdfTextFallback(arrayBuffer);
  }

  return text;
}

// OCR extraction using OCR.Space API
async function extractWithOCR(arrayBuffer: ArrayBuffer, apiKey: string, fileName: string): Promise<string> {
  console.log('Starting OCR extraction with OCR.Space...');
  
  try {
    // Convert ArrayBuffer to Blob
    const fileBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    
    // Prepare form data for OCR.Space API
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'PDF');
    formData.append('detectOrientation', 'true');
    formData.append('isTable', 'true'); // Better for legal documents with structured content

    console.log('Sending request to OCR.Space API...');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API request failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${result.ErrorMessage || 'Unknown error'}`);
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No OCR results returned');
    }

    // Extract text from all pages
    let extractedText = '';
    for (const parsedResult of result.ParsedResults) {
      if (parsedResult.ParsedText) {
        extractedText += parsedResult.ParsedText + '\n\n';
      }
    }

    console.log(`OCR extraction completed: ${extractedText.length} characters`);
    return extractedText.trim();

  } catch (error) {
    console.error('OCR extraction error:', error);
    throw error;
  }
}

async function extractPdfTextFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfString = decoder.decode(uint8Array);
    
    // Basic regex to extract text between parentheses (common in PDFs)
    const textMatches = pdfString.match(/\([^)]+\)/g);
    if (textMatches) {
      text = textMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .filter(str => str.length > 3 && /[a-zA-Z]/.test(str)) // Filter meaningful text
        .join(' ');
    }

    return text;
  } catch (error) {
    console.error('PDF fallback extraction failed:', error);
    return '';
  }
}

interface ChunkWithMetadata {
  content: string;
  title: string;
  metadata: Record<string, any>;
}

function structureAwareChunking(text: string, chunkSize: number, overlap: number): ChunkWithMetadata[] {
  const chunks: ChunkWithMetadata[] = [];
  
  // Hierarchy of separators for legal documents
  const separators = [
    '\n\n## ',      // Main sections
    '\n\n### ',     // Subsections
    '\n\n#### ',    // Sub-subsections
    '\n\n',         // Paragraphs
    '\n',           // Lines
    '. ',           // Sentences
    ' ',            // Words
  ];

  const textChunks = recursiveTextSplit(text, separators, chunkSize, overlap);
  
  // Extract metadata and create structured chunks
  let currentSection = 'Document';
  let chunkCounter = 1;

  for (const chunk of textChunks) {
    if (chunk.trim().length < 50) continue; // Skip very small chunks
    
    // Try to extract section headers for better titles
    const lines = chunk.split('\n');
    const firstLine = lines[0].trim();
    
    // Check if first line looks like a header
    if (firstLine.match(/^#{1,4}\s+/) || firstLine.match(/^[A-Z][^.]*:?\s*$/)) {
      currentSection = firstLine.replace(/^#{1,4}\s+/, '').trim();
    }

    const title = `${currentSection} - Part ${chunkCounter}`;
    
    chunks.push({
      content: chunk.trim(),
      title: title,
      metadata: {
        section: currentSection,
        chunk_index: chunkCounter,
        word_count: chunk.split(/\s+/).length,
      }
    });
    
    chunkCounter++;
  }

  return chunks;
}

function recursiveTextSplit(text: string, separators: string[], chunkSize: number, overlap: number): string[] {
  if (separators.length === 0) {
    return [text];
  }

  const [separator, ...restSeparators] = separators;
  const splits = text.split(separator);
  
  if (splits.length === 1) {
    // No split found, try next separator
    return recursiveTextSplit(text, restSeparators, chunkSize, overlap);
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < splits.length; i++) {
    const split = i === 0 ? splits[i] : separator + splits[i];
    
    if (currentChunk.length + split.length <= chunkSize) {
      currentChunk += split;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        
        // Handle overlap
        if (overlap > 0 && currentChunk.length > overlap) {
          currentChunk = currentChunk.slice(-overlap) + split;
        } else {
          currentChunk = split;
        }
      } else {
        // Split is too large, recursively split it
        const subChunks = recursiveTextSplit(split, restSeparators, chunkSize, overlap);
        chunks.push(...subChunks);
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

function determineCategory(fileName: string, metadata: Record<string, any>): string {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('statute') || lowerFileName.includes('mgl')) {
    return 'statute';
  } else if (lowerFileName.includes('case') || lowerFileName.includes('decision')) {
    return 'case_law';
  } else if (lowerFileName.includes('rule') || lowerFileName.includes('procedure')) {
    return 'procedural_rule';
  } else if (lowerFileName.includes('regulation') || lowerFileName.includes('cmr')) {
    return 'regulation';
  } else if (metadata.section && metadata.section.includes('Rule')) {
    return 'procedural_rule';
  } else {
    return 'general';
  }
}