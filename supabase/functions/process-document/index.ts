import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processingJobId = null;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { documentId } = await req.json();

    console.log('📄 Processing document:', documentId);

    // Create processing job record for tracking
    const { data: processingJob, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        document_id: documentId,
        document_name: documentId,
        original_name: documentId,
        status: 'processing',
        started_at: new Date().toISOString(),
        processing_method: 'ocr_space_enhanced'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create processing job:', jobError);
    } else {
      processingJobId = processingJob.id;
      console.log('Created processing job:', processingJobId);
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ 
        ingestion_status: 'processing',
        error_message: null,
        processing_started_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Fetch document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      throw new Error('Document not found');
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }

    // Extract text using OCR.space API (Deno-compatible)
    console.log('🔍 Extracting text from PDF using OCR...');
    const ocrStartTime = Date.now();
    const arrayBuffer = await fileData.arrayBuffer();
    
    // File size validation (max 10MB)
    const fileSizeBytes = arrayBuffer.byteLength;
    const fileSizeMB = fileSizeBytes / 1024 / 1024;
    console.log(`📊 PDF size: ${fileSizeMB.toFixed(2)}MB`);
    
    if (fileSizeMB > 10) {
      await logError(supabase, processingJobId, 'FILE_TOO_LARGE', `File size ${fileSizeMB.toFixed(2)}MB exceeds 10MB limit`);
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB. Maximum allowed size is 10MB.`);
    }
    
    // Check if OCR API key is configured
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }
    
    // Convert to base64 for OCR.space API using efficient chunked approach
    console.log('📝 Converting PDF to base64...');
    const fileBase64 = await arrayBufferToBase64(arrayBuffer);
    
    // Call OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'apikey': ocrApiKey,
        'base64Image': `data:application/pdf;base64,${fileBase64}`,
        'filetype': 'PDF',
        'OCREngine': '2',
        'isCreateSearchablePdf': 'false',
        'isSearchablePdfHideTextLayer': 'false'
      }),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      await logError(supabase, processingJobId, 'OCR_API_ERROR', `OCR API error: ${ocrResponse.status} - ${errorText}`);
      throw new Error(`OCR API error: ${ocrResponse.status} - ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    const ocrTime = Date.now() - ocrStartTime;
    
    if (ocrResult.OCRExitCode !== 1) {
      await logError(supabase, processingJobId, 'OCR_PROCESSING_FAILED', ocrResult.ErrorMessage || 'Unknown OCR error');
      throw new Error(`OCR failed: ${ocrResult.ErrorMessage || 'Unknown OCR error'}`);
    }

    const textContent = ocrResult.ParsedResults?.[0]?.ParsedText;
    if (!textContent || textContent.trim().length === 0) {
      await logError(supabase, processingJobId, 'NO_TEXT_EXTRACTED', 'PDF appears to be empty or contains no extractable text');
      throw new Error('No text extracted from PDF');
    }
    
    console.log(`✅ Extracted ${textContent.length} characters via OCR in ${ocrTime}ms`);

    // Log performance metrics
    await logMetric(supabase, processingJobId, 'ocr_processing_time_ms', ocrTime);

    // Store extracted content
    await supabase
      .from('documents')
      .update({ content: textContent })
      .eq('id', documentId);

    // Delete existing chunks
    await supabase
      .from('chunks')
      .delete()
      .eq('document_id', documentId);

    // Chunk the text with legal optimization
    console.log('🔪 Chunking text...');
    const chunkStartTime = Date.now();
    const chunks = chunkLegalText(textContent);
    const chunkTime = Date.now() - chunkStartTime;
    console.log(`📊 Created ${chunks.length} chunks in ${chunkTime}ms`);

    // Update processing job with chunk info
    if (processingJobId) {
      await supabase
        .from('processing_jobs')
        .update({ 
          total_chunks: chunks.length,
          chunks_processed: 0,
          chunk_ms: chunkTime
        })
        .eq('id', processingJobId);
    }

    // Process chunks in small batches
    const processedChunks = [];
    const batchSize = 5;
    const embedStartTime = Date.now();
    let totalTokens = 0;
    let totalCost = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const { embedding, tokensUsed, cost } = await generateEmbedding(chunk.content, openaiApiKey);
        totalTokens += tokensUsed;
        totalCost += cost;
        
        return {
          document_id: documentId,
          content: chunk.content,
          embedding: JSON.stringify(embedding),
          metadata: {
            ...chunk.metadata,
            chunk_index: chunkIndex,
            document_title: document.title || document.filename,
            tokens_used: tokensUsed
          },
          chunk_index: chunkIndex
        };
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);

      // Update progress
      if (processingJobId) {
        await supabase
          .from('processing_jobs')
          .update({ chunks_processed: i + batch.length })
          .eq('id', processingJobId);
      }
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const embedTime = Date.now() - embedStartTime;
    console.log(`🎯 Generated ${chunks.length} embeddings in ${embedTime}ms, used ${totalTokens} tokens, cost: $${totalCost.toFixed(4)}`);

    // Log embedding metrics
    await logMetric(supabase, processingJobId, 'embedding_processing_time_ms', embedTime);
    await logMetric(supabase, processingJobId, 'total_tokens_used', totalTokens);
    await logMetric(supabase, processingJobId, 'estimated_cost_usd', totalCost);

    // Insert all chunks
    const insertStartTime = Date.now();
    const { error: insertError } = await supabase
      .from('chunks')
      .insert(processedChunks);

    if (insertError) {
      await logError(supabase, processingJobId, 'CHUNK_INSERT_FAILED', `Failed to insert chunks: ${insertError.message}`);
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    const insertTime = Date.now() - insertStartTime;
    const totalTime = Date.now() - startTime;

    // Update document status to completed
    await supabase
      .from('documents')
      .update({ 
        ingestion_status: 'completed',
        chunked: true,
        chunk_count: processedChunks.length,
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Update processing job to completed
    if (processingJobId) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          chunks_processed: processedChunks.length,
          total_chunks: processedChunks.length,
          embed_ms: embedTime,
          pginsert_ms: insertTime,
          total_ms: totalTime,
          token_count: totalTokens,
          cost_estimate: totalCost,
          chunk_size_avg: Math.round(textContent.length / chunks.length)
        })
        .eq('id', processingJobId);
    }

    console.log(`✅ Document processed successfully in ${totalTime}ms`);

    // Log final metrics
    await logMetric(supabase, processingJobId, 'total_processing_time_ms', totalTime);
    await logMetric(supabase, processingJobId, 'database_insert_time_ms', insertTime);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      chunksCreated: processedChunks.length,
      processingTime: totalTime,
      tokensUsed: totalTokens,
      estimatedCost: totalCost
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Processing error:', error);

    // Categorize error type
    const errorType = categorizeError(error.message);
    await logError(supabase, processingJobId, errorType, error.message);

    // Update status to failed
    try {
      const { documentId } = await req.json().catch(() => ({}));
      if (documentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Update document
          await supabase
            .from('documents')
            .update({ 
              ingestion_status: 'failed',
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

          // Update processing job
          if (processingJobId) {
            await supabase
              .from('processing_jobs')
              .update({
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString(),
                total_ms: totalTime
              })
              .eq('id', processingJobId);
          }
        }
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }

    return new Response(JSON.stringify({
      error: error.message,
      errorType,
      processingTime: totalTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Efficient base64 conversion for large files that avoids stack overflow
async function arrayBufferToBase64(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const chunkSize = 8192; // Process in 8KB chunks to avoid stack overflow
  let base64String = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    const chunkString = String.fromCharCode(...chunk);
    base64String += btoa(chunkString);
  }
  
  return base64String;
}

function chunkLegalText(text, maxSize = 1000) {
  const chunks = [];
  
  // Simple paragraph-based chunking with strict token limits
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;
    
    // If adding this paragraph would exceed maxSize, finalize current chunk
    if (currentChunk.length + trimmedPara.length + 2 > maxSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { type: 'paragraph', index: chunks.length }
      });
      currentChunk = '';
    }
    
    // If single paragraph is too large, split it by sentences
    if (trimmedPara.length > maxSize) {
      const sentences = trimmedPara.split(/[.!?]+\s+/);
      let sentenceChunk = '';
      
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length + 2 > maxSize && sentenceChunk) {
          chunks.push({
            content: sentenceChunk.trim(),
            metadata: { type: 'sentence', index: chunks.length }
          });
          sentenceChunk = sentence;
        } else {
          sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
        }
      }
      
      if (sentenceChunk) {
        if (currentChunk && currentChunk.length + sentenceChunk.length + 2 <= maxSize) {
          currentChunk += '\n\n' + sentenceChunk;
        } else {
          if (currentChunk) {
            chunks.push({
              content: currentChunk.trim(),
              metadata: { type: 'paragraph', index: chunks.length }
            });
          }
          currentChunk = sentenceChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
  }
  
  // Add final chunk
  if (currentChunk) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { type: 'paragraph', index: chunks.length }
    });
  }
  
  // Ensure no chunk exceeds token limit for embeddings (roughly 6000 characters = 1500 tokens)
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.content.length > 6000) {
      // Force split very large chunks
      const words = chunk.content.split(' ');
      let wordChunk = '';
      
      for (const word of words) {
        if (wordChunk.length + word.length + 1 > 6000 && wordChunk) {
          finalChunks.push({
            content: wordChunk.trim(),
            metadata: { type: 'forced_split', index: finalChunks.length }
          });
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? ' ' : '') + word;
        }
      }
      
      if (wordChunk) {
        finalChunks.push({
          content: wordChunk.trim(),
          metadata: { type: 'forced_split', index: finalChunks.length }
        });
      }
    } else {
      finalChunks.push({
        ...chunk,
        metadata: { ...chunk.metadata, index: finalChunks.length }
      });
    }
  }
  
  return finalChunks;
}

async function generateEmbedding(text, apiKey) {
  // Ensure text is within safe token limits (roughly 7000 chars = 1750 tokens, well under 8192 limit)
  const safeText = text.slice(0, 7000);
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: safeText
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Calculate tokens and cost
  const tokensUsed = data.usage.total_tokens;
  const cost = tokensUsed * 0.00002; // text-embedding-3-small is $0.00002 per 1k tokens
  
  return {
    embedding: data.data[0].embedding,
    tokensUsed,
    cost
  };
}

// Error categorization function
function categorizeError(errorMessage) {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('file too large') || message.includes('size')) {
    return 'FILE_SIZE_ERROR';
  }
  if (message.includes('ocr') || message.includes('parse')) {
    return 'OCR_ERROR';
  }
  if (message.includes('openai') || message.includes('embedding')) {
    return 'EMBEDDING_ERROR';
  }
  if (message.includes('database') || message.includes('insert')) {
    return 'DATABASE_ERROR';
  }
  if (message.includes('download') || message.includes('storage')) {
    return 'STORAGE_ERROR';
  }
  if (message.includes('timeout') || message.includes('time')) {
    return 'TIMEOUT_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

// Error logging function
async function logError(supabase, processingJobId, errorType, errorMessage) {
  if (!supabase || !processingJobId) return;
  
  try {
    await supabase
      .from('processing_metrics')
      .insert({
        processing_job_id: processingJobId,
        metric_type: 'error',
        metric_value: 1,
        metadata: {
          error_type: errorType,
          error_message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

// Metric logging function
async function logMetric(supabase, processingJobId, metricType, value) {
  if (!supabase || !processingJobId) return;
  
  try {
    await supabase
      .from('processing_metrics')
      .insert({
        processing_job_id: processingJobId,
        metric_type: metricType,
        metric_value: value,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
  } catch (e) {
    console.error('Failed to log metric:', e);
  }
}