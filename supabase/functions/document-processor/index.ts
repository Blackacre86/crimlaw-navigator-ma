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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    console.log('File downloaded, processing PDF...');

    // Extract text from PDF using simple text extraction
    // Note: This is a simplified implementation. In production, you'd want a more robust PDF parser
    const arrayBuffer = await fileData.arrayBuffer();
    const decoder = new TextDecoder();
    let text = decoder.decode(arrayBuffer);
    
    // Simple PDF text extraction (basic approach)
    // Remove PDF headers, metadata, and clean up the text
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    if (!text || text.length < 100) {
      // If simple extraction fails, try a different approach
      // This is a fallback for when the PDF contains mostly text
      const pdfText = await extractPdfTextFallback(arrayBuffer);
      if (pdfText && pdfText.length > 100) {
        text = pdfText;
      } else {
        throw new Error('Could not extract meaningful text from PDF');
      }
    }

    console.log(`Extracted text length: ${text.length} characters`);

    // Split text into chunks of approximately 800-1000 characters
    const chunks = splitTextIntoChunks(text, 800, 200); // 800 chars with 200 char overlap
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
                input: chunk,
                encoding_format: 'float',
              }),
            });

            if (!embeddingResponse.ok) {
              throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
            }

            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;

            // Insert chunk into database
            const chunkIndex = i + batchIndex + 1;
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                title: `${originalName} - Chunk ${chunkIndex}`,
                content: chunk,
                category: 'Legal Document',
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

function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // If we're not at the end, try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end - 100);
      const nextNewline = text.indexOf('\n', end - 100);
      
      if (nextPeriod > end - 100 && nextPeriod < end + 50) {
        end = nextPeriod + 1;
      } else if (nextNewline > end - 100 && nextNewline < end + 50) {
        end = nextNewline + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) { // Only include chunks with meaningful content
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

async function extractPdfTextFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // This is a very basic fallback implementation
    // In a production environment, you'd want to use a proper PDF parsing library
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    // Look for text objects in the PDF
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