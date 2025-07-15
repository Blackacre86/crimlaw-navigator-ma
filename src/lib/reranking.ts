/**
 * Reranking utility for search results using GPT-4o-mini
 * Optimized for legal document relevance scoring
 */

/**
 * Interface for chunks to be reranked
 */
export interface RerankChunk {
  id: string;
  text: string;
  metadata?: any;
}

/**
 * Interface for GPT-4o-mini JSON response
 */
interface RerankResponse {
  ranked_ids: string[];
}

/**
 * Re-ranks search result chunks using GPT-4o-mini based on relevance to a legal query.
 * Falls back to original order on any error to ensure reliability.
 * 
 * @param query - The legal search query to rank against
 * @param chunks - Array of chunks with id, text, and optional metadata
 * @param openAIKey - OpenAI API key for GPT-4o-mini access
 * @returns Promise<RerankChunk[]> - Reranked chunks array or original order on failure
 * 
 * @example
 * ```typescript
 * const rerankedChunks = await rerankChunks(
 *   "Miranda rights during traffic stops",
 *   searchResults,
 *   process.env.OPENAI_API_KEY
 * );
 * ```
 */
export async function rerankChunks(
  query: string,
  chunks: RerankChunk[],
  openAIKey: string
): Promise<RerankChunk[]> {
  // Return original order for empty arrays or missing key
  if (!chunks.length || !openAIKey.trim()) {
    return chunks;
  }

  try {
    // Prepare chunks for reranking with truncated text for efficiency
    const chunksForRanking = chunks.map(chunk => ({
      id: chunk.id,
      text: chunk.text.substring(0, 1000) // Truncate for API efficiency
    }));

    // Construct specialized legal reranking prompt
    const prompt = `You are a legal research assistant specializing in Massachusetts criminal law and law enforcement procedures. 

Your task is to rank the following document chunks by their relevance to this legal query: "${query}"

Consider these factors when ranking:
1. Direct relevance to the legal query
2. Practical application for law enforcement
3. Massachusetts-specific legal precedents and statutes
4. Procedural guidance and requirements
5. Case law citations and legal authority

Document chunks to rank:
${chunksForRanking.map((chunk, index) => `${index + 1}. ID: ${chunk.id}\nContent: ${chunk.text}\n`).join('\n')}

Rank these chunks from most relevant to least relevant for the given query.

Respond with a JSON object containing only the ranked IDs in order of relevance:
{"ranked_ids": ["id1", "id2", "id3", ...]}`;

    // Make API call to GPT-4o-mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a legal research assistant that ranks document chunks by relevance to legal queries. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI API request failed, using original order');
      return chunks;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('Empty response from OpenAI, using original order');
      return chunks;
    }

    // Parse JSON response
    const parsedResponse: RerankResponse = JSON.parse(content);
    
    if (!parsedResponse.ranked_ids || !Array.isArray(parsedResponse.ranked_ids)) {
      console.warn('Invalid response format from OpenAI, using original order');
      return chunks;
    }

    // Create a map for efficient chunk lookup
    const chunkMap = new Map<string, RerankChunk>();
    chunks.forEach(chunk => chunkMap.set(chunk.id, chunk));

    // Reorder chunks based on GPT-4o-mini ranking
    const rerankedChunks: RerankChunk[] = [];
    const usedIds = new Set<string>();

    // Add chunks in the order specified by GPT-4o-mini
    for (const id of parsedResponse.ranked_ids) {
      const chunk = chunkMap.get(id);
      if (chunk && !usedIds.has(id)) {
        rerankedChunks.push(chunk);
        usedIds.add(id);
      }
    }

    // Add any remaining chunks that weren't included in the ranking
    for (const chunk of chunks) {
      if (!usedIds.has(chunk.id)) {
        rerankedChunks.push(chunk);
      }
    }

    return rerankedChunks;

  } catch (error) {
    console.error('Error in rerankChunks:', error);
    // Always return original order on any error
    return chunks;
  }
}