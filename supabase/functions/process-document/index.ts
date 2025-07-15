import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const llamaCloudApiKey = Deno.env.get('LLAMA_CLOUD_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey || !llamaCloudApiKey) {
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

    // If no content exists, extract from PDF using LlamaCloud
    if (!textContent && document.file_path) {
      console.log('📑 Extracting text from PDF using LlamaCloud...');
      
      try {
        textContent = await extractPdfWithLlamaCloud(
          supabase, 
          document.file_path, 
          llamaCloudApiKey
        );
        
        console.log(`✅ Extracted ${textContent.length} characters using LlamaCloud`);

        // Store extracted content back to document
        await supabase
          .from('documents')
          .update({ content: textContent })
          .eq('id', documentId);

      } catch (llamaError) {
        console.error('❌ LlamaCloud extraction error:', llamaError);
        throw new Error(`PDF extraction failed: ${llamaError.message}`);
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

    // Enhanced legal document chunking
    console.log('🔪 Chunking with enhanced legal optimization...');
    const chunks = chunkLegalDocument(textContent, {
      document_id: documentId,
      title: document.title || document.document_title,
      category: document.category
    });
    console.log(`📊 Created ${chunks.length} chunks`);

    // Process chunks in batches
    const batchSize = 5;
    const processedChunks = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const embedding = await generateEmbedding(chunk.text, openaiApiKey);
        
        return {
          document_id: documentId,
          content: chunk.text,
          embedding: JSON.stringify(embedding),
          metadata: {
            ...chunk.metadata,
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

// Enhanced PDF extraction using LlamaCloud
async function extractPdfWithLlamaCloud(supabase, filePath, apiKey) {
  console.log('🦙 Starting LlamaCloud extraction...');
  
  // Download PDF from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download PDF: ${downloadError?.message}`);
  }

  // Convert to base64 for LlamaCloud
  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const base64 = btoa(String.fromCharCode(...uint8Array));

  // Upload to LlamaCloud for parsing
  const uploadResponse = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64_file: base64,
      parsing_instruction: `
        This is a legal document. Please extract text while:
        1. Preserving all section numbers, rule numbers, and legal citations
        2. Maintaining table structure with proper spacing and alignment
        3. Keeping footnotes and references intact
        4. Preserving paragraph structure and indentation
        5. Maintaining any numbered or lettered lists
        6. Converting complex tables to properly formatted markdown tables
      `,
      result_type: 'markdown',
      language: 'en'
    }),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`LlamaCloud upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  const jobId = uploadResult.id;

  console.log(`📤 Upload successful, job ID: ${jobId}`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const statusResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check parsing status');
    }

    const status = await statusResponse.json();
    console.log(`📊 Parsing status: ${status.status}`);

    if (status.status === 'SUCCESS') {
      console.log('✅ LlamaCloud parsing completed');
      return status.result.markdown || status.result.text || '';
    } else if (status.status === 'ERROR') {
      throw new Error(`LlamaCloud parsing failed: ${status.error || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('LlamaCloud parsing timed out');
}

// Enhanced legal document chunking
function chunkLegalDocument(text, metadata, maxChars = 3200) {
  const chunks = [];
  let chunkIndex = 0;

  // Legal document patterns
  const patterns = {
    // Major sections (Rules, Chapters, etc.)
    majorSection: /(?:^|\n)((?:RULE|CHAPTER|PART|ARTICLE|SECTION|§)\s*[\d\w\.\-]+[^\n]*)/gim,
    // Subsections (numbered/lettered)
    subSection: /(?:^|\n)(\(\s*[a-z0-9]+\s*\)[^\n]*)/gim,
    // Tables (markdown format from LlamaCloud)
    table: /(?:^|\n)(\|[^\n]*\|(?:\n\|[^\n]*\|)*)/gim,
    // Citations and references
    citation: /(?:\d+\s+[A-Z][^\d]*\d+|\[[^\]]+\]|\(\d{4}\))/g
  };

  // Split by major sections first
  const sections = text.split(patterns.majorSection);
  let currentSection = '';
  let sectionHeader = null;

  for (let i = 0; i < sections.length; i++) {
    const content = sections[i]?.trim();
    if (!content) continue;

    // Check if this is a header
    const isHeader = patterns.majorSection.test(content);
    
    if (isHeader) {
      sectionHeader = content;
      continue;
    }

    // Process content under this section
    const processedChunks = processSectionContent(
      content, 
      sectionHeader, 
      chunkIndex, 
      metadata.document_id,
      maxChars
    );
    
    chunks.push(...processedChunks);
    chunkIndex += processedChunks.length;
  }

  return chunks.map(chunk => ({
    text: chunk.content,
    metadata: {
      ...chunk.metadata,
      document_id: metadata.document_id,
      title: metadata.title,
      category: metadata.category
    }
  }));
}

function processSectionContent(content, sectionHeader, startIndex, documentId, maxChars) {
  const chunks = [];
  
  // Check for tables first - they should be kept intact
  const tableMatches = content.match(/\|[^\n]*\|(?:\n\|[^\n]*\|)*/g);
  
  if (tableMatches && tableMatches.length > 0) {
    // Handle content with tables
    let remainingContent = content;
    let chunkIndex = startIndex;
    
    tableMatches.forEach(table => {
      const parts = remainingContent.split(table);
      const beforeTable = parts[0]?.trim();
      
      // Process text before table
      if (beforeTable && beforeTable.length > 50) {
        const beforeChunks = splitTextIntoChunks(beforeTable, sectionHeader, chunkIndex, documentId, maxChars);
        chunks.push(...beforeChunks);
        chunkIndex += beforeChunks.length;
      }
      
      // Add table as its own chunk (may exceed maxChars for preservation)
      chunks.push({
        content: `${sectionHeader ? sectionHeader + '\n\n' : ''}${table}`,
        metadata: {
          type: 'legal_table',
          section_header: sectionHeader,
          chunk_index: chunkIndex
        }
      });
      chunkIndex++;
      
      remainingContent = parts[1] || '';
    });
    
    // Process remaining content after last table
    if (remainingContent?.trim() && remainingContent.trim().length > 50) {
      const remainingChunks = splitTextIntoChunks(remainingContent.trim(), sectionHeader, chunkIndex, documentId, maxChars);
      chunks.push(...remainingChunks);
    }
  } else {
    // No tables, process normally
    const contentChunks = splitTextIntoChunks(content, sectionHeader, startIndex, documentId, maxChars);
    chunks.push(...contentChunks);
  }
  
  return chunks;
}

function splitTextIntoChunks(text, sectionHeader, startIndex, documentId, maxChars) {
  const chunks = [];
  
  if (text.length <= maxChars) {
    return [{
      content: `${sectionHeader ? sectionHeader + '\n\n' : ''}${text}`,
      metadata: {
        type: 'legal_content',
        section_header: sectionHeader,
        chunk_index: startIndex
      }
    }];
  }

  // Split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  let currentChunk = sectionHeader ? sectionHeader + '\n\n' : '';
  let chunkIndex = startIndex;
  
  for (const paragraph of paragraphs) {
    const withParagraph = currentChunk + (currentChunk.endsWith('\n\n') ? '' : '\n\n') + paragraph;
    
    if (withParagraph.length > maxChars && currentChunk.length > (sectionHeader?.length || 0) + 2) {
      // Save current chunk and start new one
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          type: 'legal_content',
          section_header: sectionHeader,
          chunk_index: chunkIndex++
        }
      });
      
      // Start new chunk with section header
      currentChunk = sectionHeader ? sectionHeader + '\n\n' + paragraph : paragraph;
    } else {
      currentChunk = withParagraph;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim() && currentChunk.length > (sectionHeader?.length || 0) + 2) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        type: 'legal_content', 
        section_header: sectionHeader,
        chunk_index: chunkIndex
      }
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