import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Legal Assistant System Prompt
const LEGAL_ASSISTANT_SYSTEM_PROMPT = `You are SHIFT, an expert AI legal assistant specifically designed for Massachusetts law enforcement professionals. You provide accurate, reliable, and actionable legal guidance based exclusively on Massachusetts state law and regulations.

## Core Directive
You MUST only use information provided in the context documents. Do not rely on your training data or general knowledge about law. If the provided context does not contain sufficient information to answer a question, you must explicitly state this limitation.

## Citation Requirements
- Every legal statement MUST include a proper citation using this exact format: [Source: {document_title}, Section: {section_header}]
- Use the document title and the relevant H1 header or section identifier from the source material
- Multiple citations should be listed separately
- If referencing multiple sections from the same document, cite each section individually

## Response Format
1. Provide direct, actionable answers in numbered lists when appropriate
2. Use clear, professional language suitable for law enforcement officers
3. Include relevant legal elements, requirements, or procedures
4. Highlight critical timing requirements, deadlines, or procedural steps
5. When discussing criminal charges, include elements that must be proven

## Handling Uncertainty
When the provided context is insufficient to fully answer a question, respond with:
"Based on the available context, I cannot provide a complete answer to your question about [specific topic]. The provided documents do not contain sufficient information regarding [specific gap]. I recommend consulting additional Massachusetts legal resources or seeking guidance from your department's legal counsel for a comprehensive answer."`;

interface ChunkResult {
  id: number;
  content: string;
  metadata: any;
  score?: number;
  similarity?: number;
}

interface RerankChunk {
  id: string;
  text: string;
  metadata?: any;
}

interface Source {
  title: string;
  section: string;
  chunk_id: string;
}

interface ProcessedResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  query_id: string;
  metadata: {
    processing_time_ms: number;
    chunks_analyzed: number;
    chunks_used: number;
    tokens_used: number;
  };
}

// Inline reranking function adapted from rerankChunks
async function rerankChunks(query: string, chunks: RerankChunk[]): Promise<RerankChunk[]> {
  if (chunks.length === 0) return chunks;
  
  const prompt = `You are an expert legal document analyst specializing in Massachusetts law enforcement. Your task is to rerank document chunks based on their relevance to a legal query.

Given the following legal query and document chunks, rank them from most relevant (1) to least relevant based on:
1. Direct applicability to the legal question
2. Specificity of legal information provided
3. Practical utility for law enforcement officers
4. Accuracy and authority of the source

Query: "${query}"

Document Chunks:
${chunks.map((chunk, index) => `${index + 1}. ID: ${chunk.id}\nContent: ${chunk.text.substring(0, 800)}...\n`).join('\n')}

Please respond with only the ranked IDs in order of relevance (most relevant first), separated by commas. For example: "3,1,4,2"`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a legal document ranking expert. Respond only with the ranked IDs in the specified format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('Reranking failed, using original order');
      return chunks;
    }

    const data = await response.json();
    const rankingResult = data.choices[0].message.content.trim();
    
    // Parse the ranking result
    const rankedIds = rankingResult.split(',').map((id: string) => id.trim());
    
    // Reorder chunks based on ranking
    const rankedChunks: RerankChunk[] = [];
    const chunkMap = new Map<string, RerankChunk>();
    
    chunks.forEach(chunk => {
      chunkMap.set(chunk.id, chunk);
    });
    
    // Add chunks in ranked order
    rankedIds.forEach(id => {
      const chunk = chunkMap.get(id);
      if (chunk) {
        rankedChunks.push(chunk);
        chunkMap.delete(id);
      }
    });
    
    // Add any remaining chunks that weren't in the ranking
    chunkMap.forEach(chunk => {
      rankedChunks.push(chunk);
    });
    
    return rankedChunks;
  } catch (error) {
    console.error('Error in reranking:', error);
    return chunks; // Return original order on error
  }
}

// Extract sources from GPT response
function extractSources(answer: string, chunks: ChunkResult[]): Source[] {
  const sources: Source[] = [];
  const citationRegex = /\[Source:\s*([^,]+),\s*Section:\s*([^\]]+)\]/g;
  
  let match;
  while ((match = citationRegex.exec(answer)) !== null) {
    const title = match[1].trim();
    const section = match[2].trim();
    
    // Find corresponding chunk
    const chunk = chunks.find(c => 
      c.metadata?.document_title?.includes(title) || 
      c.metadata?.h1_header?.includes(section) ||
      c.metadata?.h2_header?.includes(section)
    );
    
    sources.push({
      title,
      section,
      chunk_id: chunk?.id.toString() || 'unknown'
    });
  }
  
  return sources;
}

// Calculate confidence score
function calculateConfidence(answer: string, sources: Source[]): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on number of sources
  confidence += Math.min(sources.length * 0.1, 0.3);
  
  // Increase confidence based on answer length (more detailed = higher confidence)
  const answerLength = answer.length;
  if (answerLength > 500) confidence += 0.1;
  if (answerLength > 1000) confidence += 0.1;
  
  // Decrease confidence if uncertainty phrases are present
  const uncertaintyPhrases = ['cannot provide', 'insufficient', 'recommend consulting', 'seek guidance'];
  if (uncertaintyPhrases.some(phrase => answer.toLowerCase().includes(phrase))) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { query, userId } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing legal query:', query);

    // Step 1: Get relevant chunks from hybrid search
    const hybridSearchResponse = await supabase.functions.invoke('hybrid-search-chunks', {
      body: { query }
    });

    if (hybridSearchResponse.error) {
      console.error('Hybrid search error:', hybridSearchResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to retrieve relevant documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chunks: ChunkResult[] = hybridSearchResponse.data?.chunks || [];
    console.log('Retrieved chunks:', chunks.length);

    if (chunks.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No relevant documents found for this query' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Rerank chunks for better relevance
    const rerankChunks: RerankChunk[] = chunks.map(chunk => ({
      id: chunk.id.toString(),
      text: chunk.content,
      metadata: chunk.metadata
    }));

    const rerankedChunks = await rerankChunks(query, rerankChunks);
    const top10Chunks = rerankedChunks.slice(0, 10);
    
    console.log('Reranked to top 10 chunks');

    // Step 3: Build context string
    const contextString = top10Chunks.map((chunk, index) => {
      const metadata = chunk.metadata || {};
      return `## Document ${index + 1}
**Title:** ${metadata.document_title || 'Unknown Document'}
**Section:** ${metadata.h1_header || metadata.h2_header || 'Unknown Section'}
**Page:** ${metadata.page_number || 'Unknown'}

**Content:**
${chunk.text}

---`;
    }).join('\n\n');

    // Step 4: Call OpenAI GPT-4o for answer generation
    const answerResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: LEGAL_ASSISTANT_SYSTEM_PROMPT },
          { role: 'user', content: `## Context Documents:\n${contextString}\n\n## Officer's Query:\n${query}\n\n## Response:` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!answerResponse.ok) {
      const errorData = await answerResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to generate answer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const answerData = await answerResponse.json();
    const answer = answerData.choices[0].message.content;
    const tokensUsed = answerData.usage?.total_tokens || 0;

    console.log('Generated answer, tokens used:', tokensUsed);

    // Step 5: Extract sources and calculate confidence
    const sources = extractSources(answer, chunks);
    const confidence = calculateConfidence(answer, sources);

    // Step 6: Log to query_logs table
    const logResult = await supabase.from('query_logs').insert({
      user_id: userId || null,
      query,
      answer,
      sources,
      confidence,
      response_time_ms: Date.now() - startTime,
      chunks_processed: chunks.length,
      tokens_used: tokensUsed
    }).select().single();

    if (logResult.error) {
      console.error('Failed to log query:', logResult.error);
    }

    const queryId = logResult.data?.id || 'unknown';

    // Step 7: Return structured response
    const response: ProcessedResponse = {
      answer,
      sources,
      confidence,
      query_id: queryId,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        chunks_analyzed: chunks.length,
        chunks_used: top10Chunks.length,
        tokens_used: tokensUsed
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-legal-query function:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred while processing your legal query',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});