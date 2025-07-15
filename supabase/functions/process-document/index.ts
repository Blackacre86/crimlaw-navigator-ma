import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfParse from 'https://esm.sh/pdf-parse@1.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Process-document function started');

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

    let textContent = document.content;

    // If no content exists, extract from PDF
    if (!textContent && document.file_path) {
      console.log('📑 Extracting text from PDF...');
      
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
      }

      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text using pdf-parse
      try {
        const pdfData = await pdfParse.default(buffer);
        textContent = pdfData.text;
        
        console.log(`✅ Extracted ${textContent.length} characters from ${pdfData.numpages} pages`);

        // Store extracted content back to document
        await supabase
          .from('documents')
          .update({ content: textContent })
          .eq('id', documentId);

      } catch (pdfError) {
        console.error('❌ PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content to process');
    }

    // Delete any existing chunks for this document (clean slate)
    await supabase
      .from('chunks')
      .delete()
      .eq('document_id', documentId);

    // Legal document chunking
    console.log('🔪 Chunking with legal optimization...');
    const chunks = chunkLegalText(textContent);
    console.log(`📊 Created ${chunks.length} chunks`);

    // Process chunks in batches
    const batchSize = 5;
    const processedChunks = [];

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
            title: document.title || document.document_title
          },
          chunk_index: chunkIndex
        };
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);
      
      // Rate limit protection
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Insert all chunks
    const { error: insertError } = await supabase
      .from('chunks')
      .insert(processedChunks);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Update document status
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

    console.log('✅ Successfully processed document');

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
              processing_completed_at: new Date().toISOString()
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

function chunkLegalText(text, maxSize = 2500, overlap = 200) {
  const chunks = [];
  
  // First, try to split by major sections
  const sectionRegex = /(?:^|\n)(?:RULE|SECTION|CHAPTER|PART|ARTICLE|§)\s*[\d\w\.\-]+[^\n]*/gim;
  const sections = text.split(sectionRegex);
  
  let currentChunk = '';
  let chunkMetadata = { type: 'legal_section' };
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;
    
    // If section fits in one chunk
    if (trimmedSection.length <= maxSize) {
      if (currentChunk && (currentChunk.length + trimmedSection.length > maxSize)) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: chunkMetadata
        });
        currentChunk = trimmedSection;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedSection;
      }
    } else {
      // Section too large, split by paragraphs
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: chunkMetadata
        });
        currentChunk = '';
      }
      
      // Split large section by paragraphs
      const paragraphs = trimmedSection.split(/\n\s*\n/);
      
      for (const para of paragraphs) {
        if (para.trim().length === 0) continue;
        
        if (currentChunk.length + para.length > maxSize && currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: { type: 'legal_paragraph' }
          });
          
          // Add overlap from previous chunk
          const sentences = currentChunk.split(/[.!?]+/);
          const overlapText = sentences.slice(-2).join('. ');
          currentChunk = overlapText + (overlapText ? '. ' : '') + para.trim();
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para.trim();
        }
      }
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: chunkMetadata
    });
  }
  
  return chunks;
}

async function generateEmbedding(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191), // Ensure within token limit
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}