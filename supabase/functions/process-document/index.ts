import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkData {
  content: string;
  metadata?: Record<string, any>;
  chunk_index: number;
}

serve(async (req) => {
  console.log('🚀 Process-document function started at:', new Date().toISOString());

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check for GET requests
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy', 
      service: 'process-document',
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('🔑 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openaiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { documentId } = await req.json();
    console.log('📄 Processing document ID:', documentId);

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update document status to processing
    console.log('🔄 Updating document status to processing...');
    const { error: statusUpdateError } = await supabase
      .from('documents')
      .update({ ingestion_status: 'processing' })
      .eq('id', documentId);

    if (statusUpdateError) {
      console.error('❌ Failed to update document status:', statusUpdateError);
      throw new Error(`Failed to update document status: ${statusUpdateError.message}`);
    }

    // Fetch document from database
    console.log('📥 Fetching document from database...');
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error('❌ Failed to fetch document:', fetchError);
      throw new Error(`Document not found: ${fetchError?.message || 'Document does not exist'}`);
    }

    console.log('📋 Document found:', { 
      id: document.id, 
      title: document.title,
      contentLength: document.content?.length || 0,
      hasContent: !!document.content
    });

    // Use existing content if available, otherwise throw error
    if (!document.content) {
      throw new Error('Document has no content to process');
    }

    const content = document.content;
    console.log('📝 Content to process:', content.length, 'characters');

    // Chunk the content into smaller pieces
    console.log('🔪 Starting content chunking...');
    const chunks = chunkText(content);
    console.log('📊 Created', chunks.length, 'chunks');

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    const processedChunks: any[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)...`);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        try {
          // Generate embedding for this chunk
          console.log(`🧠 Generating embedding for chunk ${chunkIndex + 1}...`);
          const embedding = await generateEmbedding(chunk.content, openaiApiKey);
          
          return {
            document_id: documentId,
            content: chunk.content,
            embedding: JSON.stringify(embedding),
            metadata: {
              title: document.title,
              chunk_index: chunkIndex,
              word_count: chunk.content.split(' ').length,
              char_count: chunk.content.length
            },
            chunk_index: chunkIndex
          };
        } catch (error) {
          console.error(`❌ Failed to process chunk ${chunkIndex + 1}:`, error);
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);
      
      // Add a small delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Store all chunks in database
    console.log('💾 Storing', processedChunks.length, 'chunks in database...');
    const { error: insertError } = await supabase
      .from('chunks')
      .insert(processedChunks);

    if (insertError) {
      console.error('❌ Failed to insert chunks:', insertError);
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    // Update document status to completed and mark as chunked
    console.log('✅ Updating document status to completed...');
    const { error: finalUpdateError } = await supabase
      .from('documents')
      .update({ 
        ingestion_status: 'completed',
        chunked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (finalUpdateError) {
      console.error('❌ Failed to update final document status:', finalUpdateError);
      throw new Error(`Failed to update document status: ${finalUpdateError.message}`);
    }

    console.log('🎉 Successfully processed document:', documentId);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      chunksCreated: processedChunks.length,
      message: 'Document processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error processing document:', error);

    // Try to update document status to failed if we have a documentId
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
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);
        }
      }
    } catch (updateError) {
      console.error('⚠️ Failed to update document status to failed:', updateError);
    }

    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Function to chunk text using legal document chunking strategy
function chunkText(text: string, maxChunkSize = 3200, overlap = 200): ChunkData[] {
  console.log('🔧 Using legal-optimized chunking strategy');
  
  // Legal document chunking that preserves structure
  const chunks: ChunkData[] = [];
  
  // First try to split by sections/headers (legal structure preservation)
  const sectionPattern = /(?:\n\s*(?:SECTION|RULE|CHAPTER|PART|§)\s*[\d\w\.]+[^\n]*\n)/gi;
  const sections = text.split(sectionPattern);
  
  let chunkIndex = 0;
  
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    let section = sections[sectionIndex].trim();
    
    if (!section) continue;
    
    // If section is small enough, make it one chunk
    if (section.length <= maxChunkSize) {
      chunks.push({
        content: section,
        chunk_index: chunkIndex++,
        metadata: {
          section_index: sectionIndex,
          word_count: section.split(' ').length,
          char_count: section.length,
          chunk_type: 'legal_section'
        }
      });
    } else {
      // Split large sections by paragraphs, preserving legal context
      const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        
        if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            chunk_index: chunkIndex++,
            metadata: {
              section_index: sectionIndex,
              word_count: currentChunk.trim().split(' ').length,
              char_count: currentChunk.trim().length,
              chunk_type: 'legal_paragraph_group'
            }
          });
          
          // Start new chunk with some overlap
          const sentences = currentChunk.trim().split(/[.!?]+/).filter(s => s.trim().length > 0);
          const overlapSentences = sentences.slice(-2); // Keep last 2 sentences for context
          currentChunk = overlapSentences.join('. ') + (overlapSentences.length > 0 ? '. ' : '') + trimmedParagraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
        }
      }
      
      // Add final chunk from this section
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          chunk_index: chunkIndex++,
          metadata: {
            section_index: sectionIndex,
            word_count: currentChunk.trim().split(' ').length,
            char_count: currentChunk.trim().length,
            chunk_type: 'legal_paragraph_group'
          }
        });
      }
    }
  }
  
  console.log(`📊 Legal chunking created ${chunks.length} chunks with preserved structure`);
  return chunks;
}

// Function to generate embeddings using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', response.status, errorData);
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid response from OpenAI embeddings API');
  }

  return data.data[0].embedding;
}