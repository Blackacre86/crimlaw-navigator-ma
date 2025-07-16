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
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Check if OCR API key is configured
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }
    
    // Convert to base64 for OCR.space API
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log(`📊 PDF size: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    
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
      throw new Error(`OCR API error: ${ocrResponse.status} - ${await ocrResponse.text()}`);
    }

    const ocrResult = await ocrResponse.json();
    
    if (ocrResult.OCRExitCode !== 1) {
      throw new Error(`OCR failed: ${ocrResult.ErrorMessage || 'Unknown OCR error'}`);
    }

    const textContent = ocrResult.ParsedResults?.[0]?.ParsedText;
    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }
    
    console.log(`✅ Extracted ${textContent.length} characters via OCR`);

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
    const chunks = chunkLegalText(textContent);
    console.log(`📊 Created ${chunks.length} chunks`);

    // Process chunks in small batches
    const processedChunks = [];
    const batchSize = 5;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const embedding = await generateEmbedding(chunk.content, openaiApiKey);
        
        return {
          document_id: documentId,
          content: chunk.content,
          embedding: JSON.stringify(embedding),
          metadata: {
            ...chunk.metadata,
            chunk_index: chunkIndex,
            document_title: document.title || document.filename
          },
          chunk_index: chunkIndex
        };
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Insert all chunks
    const { error: insertError } = await supabase
      .from('chunks')
      .insert(processedChunks);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

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

    console.log('✅ Document processed successfully');

    return new Response(JSON.stringify({
      success: true,
      documentId,
      chunksCreated: processedChunks.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Processing error:', error);

    // Update status to failed
    try {
      const { documentId } = await req.json().catch(() => ({}));
      if (documentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from('documents')
            .update({ 
              ingestion_status: 'failed',
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);
        }
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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
  return data.data[0].embedding;
}