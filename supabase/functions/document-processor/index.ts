import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, originalName } = await req.json();
    
    if (!fileName || !originalName) {
      throw new Error('Missing required parameters: fileName and originalName');
    }

    console.log(`Processing document: ${originalName}`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const llamaParseApiKey = Deno.env.get('LLAMA_CLOUD_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    console.log('File downloaded, processing PDF...');

    let text = '';
    const arrayBuffer = await fileData.arrayBuffer();

    // Try LlamaParse first if API key is available
    if (llamaParseApiKey) {
      try {
        console.log('Using LlamaParse for PDF extraction...');
        text = await extractWithLlamaParse(arrayBuffer, llamaParseApiKey, originalName);
        console.log(`LlamaParse extracted ${text.length} characters`);
      } catch (error) {
        console.warn('LlamaParse failed, falling back to basic extraction:', error);
        text = await extractPdfBasic(arrayBuffer);
      }
    } else {
      console.log('LlamaParse API key not found, using basic extraction...');
      text = await extractPdfBasic(arrayBuffer);
    }

    // Check if we might need OCR (scanned document detection)
    const fileSizeKB = arrayBuffer.byteLength / 1024;
    if (text.length < 500 && fileSizeKB > 100) {
      console.log('Potential scanned document detected (low text/size ratio). Attempting OCR...');
      
      const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
      if (ocrSpaceApiKey) {
        try {
          const ocrText = await extractWithOCR(arrayBuffer, ocrSpaceApiKey, originalName);
          if (ocrText && ocrText.length > text.length) {
            console.log(`OCR extracted ${ocrText.length} characters, using OCR result`);
            text = ocrText;
          }
        } catch (error) {
          console.warn('OCR extraction failed:', error);
        }
      } else {
        console.warn('OCR_SPACE_API_KEY not found, skipping OCR fallback');
      }
    }

    if (!text || text.length < 100) {
      throw new Error('Could not extract meaningful text from PDF');
    }

    console.log(`Extracted text length: ${text.length} characters`);

    // Use structure-aware chunking with RecursiveCharacterTextSplitter approach
    const chunks = structureAwareChunking(text, 1024, 200);
    console.log(`Created ${chunks.length} text chunks`);

    // Generate embeddings for each chunk and insert into database
    let processedChunks = 0;
    const batchSize = 5; // Process 5 chunks at a time to avoid rate limits

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (chunk, batchIndex) => {
          try {
            // Generate embedding for this chunk
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
            });

            if (!embeddingResponse.ok) {
              throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
            }

            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;

            // Insert chunk into database with metadata
            const chunkIndex = i + batchIndex + 1;
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                title: chunk.title,
                content: chunk.content,
                category: determineCategory(originalName, chunk.metadata),
                embedding: JSON.stringify(embedding),
              });

            if (insertError) {
              console.error(`Error inserting chunk ${chunkIndex}:`, insertError);
              throw insertError;
            }

            processedChunks++;
            console.log(`Processed chunk ${chunkIndex}/${chunks.length}`);
          } catch (error) {
            console.error(`Error processing chunk ${i + batchIndex + 1}:`, error);
            throw error;
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Clean up - delete the uploaded file from storage
    await supabase.storage.from('documents').remove([fileName]);

    console.log(`Successfully processed ${processedChunks} chunks from ${originalName}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated: processedChunks,
        originalName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in document-processor function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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

  const [separator, ...remainingSeparators] = separators;
  const splits = text.split(separator);
  
  if (splits.length === 1) {
    // Separator not found, try next separator
    return recursiveTextSplit(text, remainingSeparators, chunkSize, overlap);
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    const potentialChunk = currentChunk + (currentChunk ? separator : '') + split;

    if (potentialChunk.length <= chunkSize) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        
        // Handle overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + separator + split;
      } else {
        // Single split is too large, recursively split it
        const subChunks = recursiveTextSplit(split, remainingSeparators, chunkSize, overlap);
        chunks.push(...subChunks);
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function determineCategory(fileName: string, metadata: Record<string, any>): string {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('jury') || lowerFileName.includes('instruction')) {
    return 'Model Jury Instructions';
  } else if (lowerFileName.includes('criminal') && lowerFileName.includes('procedure')) {
    return 'Rules of Criminal Procedure';
  } else if (lowerFileName.includes('general') && lowerFileName.includes('law')) {
    return 'MA General Laws';
  }
  
  // Try to determine from content
  const section = metadata.section?.toLowerCase() || '';
  if (section.includes('rule') || section.includes('procedure')) {
    return 'Rules of Criminal Procedure';
  } else if (section.includes('chapter') || section.includes('section')) {
    return 'MA General Laws';
  }
  
  return 'Legal Document';
}