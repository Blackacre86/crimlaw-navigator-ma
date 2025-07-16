import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdfParse from 'https://esm.sh/pdf-parse@1.1.1';

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

    // Extract text using simple pdf-parse
    console.log('📑 Extracting text from PDF...');
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`📊 PDF size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text;
    
    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content extracted from PDF');
    }
    
    console.log(`✅ Extracted ${textContent.length} characters from ${pdfData.numpages} pages`);

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

function chunkLegalText(text, maxSize = 1500) {
  const chunks = [];
  
  // Split by common legal document patterns
  const sections = text.split(/(?=(?:^|\n)(?:Rule|RULE|Section|SECTION|Chapter|CHAPTER|Article|ARTICLE|Part|PART|§)\s*\d+)/);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    if (section.length <= maxSize) {
      chunks.push({
        content: section.trim(),
        metadata: { type: 'legal_section' }
      });
    } else {
      // Split large sections by paragraphs
      const paragraphs = section.split(/\n\s*\n/);
      let currentChunk = '';
      
      for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxSize && currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: { type: 'legal_paragraph' }
          });
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: { type: 'legal_paragraph' }
        });
      }
    }
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
      input: text.slice(0, 8191) // Stay within token limit
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}