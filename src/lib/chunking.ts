/**
 * Semantic chunking utility for legal documents
 * Splits markdown content into meaningful chunks while preserving hierarchical context
 */

export interface DocumentMetadata {
  document_id: string;
  title?: string;
  category?: string;
}

export interface DocumentChunk {
  text: string;
  metadata: {
    h1_header: string | null;
    h2_header: string | null;
    chunk_index: number;
    document_id: string;
  };
}

interface HeaderSection {
  header: string | null;
  content: string;
}

/**
 * Estimates token count using simple approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text by headers of specified level
 */
function splitByHeaders(text: string, headerPattern: RegExp): HeaderSection[] {
  const lines = text.split('\n');
  const sections: HeaderSection[] = [];
  let currentHeader: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(headerPattern);
    
    if (headerMatch) {
      // Save previous section if it has content
      if (currentContent.length > 0 || currentHeader) {
        sections.push({
          header: currentHeader,
          content: currentContent.join('\n').trim()
        });
      }
      
      // Start new section
      currentHeader = headerMatch[1]?.trim() || line.replace(/^#+\s*/, '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentContent.length > 0 || currentHeader) {
    sections.push({
      header: currentHeader,
      content: currentContent.join('\n').trim()
    });
  }

  return sections.filter(section => section.content.length > 0);
}

/**
 * Splits text by paragraphs (double newlines)
 */
function splitByParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0);
}

/**
 * Splits text by sentences
 */
function splitBySentences(text: string): string[] {
  return text
    .split(/\.\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
    .map((sentence, index, array) => {
      // Add period back except for the last sentence if it doesn't end with punctuation
      if (index < array.length - 1 || !sentence.match(/[.!?]$/)) {
        return sentence + '.';
      }
      return sentence;
    });
}

/**
 * Creates a document chunk with proper metadata
 */
function createChunk(
  text: string,
  h1Header: string | null,
  h2Header: string | null,
  chunkIndex: number,
  documentId: string
): DocumentChunk {
  return {
    text: text.trim(),
    metadata: {
      h1_header: h1Header,
      h2_header: h2Header,
      chunk_index: chunkIndex,
      document_id: documentId
    }
  };
}

/**
 * Splits large text into smaller chunks respecting size limits
 */
function splitLargeText(
  text: string,
  h1Header: string | null,
  h2Header: string | null,
  startIndex: number,
  documentId: string,
  maxChars: number = 3200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  if (text.length <= maxChars) {
    return [createChunk(text, h1Header, h2Header, startIndex, documentId)];
  }

  // Try splitting by paragraphs first
  const paragraphs = splitByParagraphs(text);
  if (paragraphs.length > 1) {
    let currentChunk = '';
    let chunkIndex = startIndex;

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      
      if (potentialChunk.length > maxChars && currentChunk) {
        // Save current chunk and start new one
        chunks.push(createChunk(currentChunk, h1Header, h2Header, chunkIndex++, documentId));
        currentChunk = paragraph;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push(createChunk(currentChunk, h1Header, h2Header, chunkIndex, documentId));
    }

    return chunks;
  }

  // Fall back to sentence splitting
  const sentences = splitBySentences(text);
  if (sentences.length > 1) {
    let currentChunk = '';
    let chunkIndex = startIndex;

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > maxChars && currentChunk) {
        // Save current chunk and start new one
        chunks.push(createChunk(currentChunk, h1Header, h2Header, chunkIndex++, documentId));
        currentChunk = sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push(createChunk(currentChunk, h1Header, h2Header, chunkIndex, documentId));
    }

    return chunks;
  }

  // If we can't split further, return the text as is (even if oversized)
  return [createChunk(text, h1Header, h2Header, startIndex, documentId)];
}

/**
 * Main function to chunk legal documents semantically
 * 
 * @param markdownText - The markdown content to chunk
 * @param metadata - Document metadata including document_id
 * @param maxChars - Maximum characters per chunk (default: 3200)
 * @returns Array of document chunks with preserved hierarchical context
 */
export function chunkLegalDocument(
  markdownText: string,
  metadata: DocumentMetadata,
  maxChars: number = 3200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // First, split by H1 headers
  const h1Sections = splitByHeaders(markdownText, /^#\s+(.*)$/);

  for (const h1Section of h1Sections) {
    const h1Header = h1Section.header;
    
    // Then split each H1 section by H2 headers
    const h2Sections = splitByHeaders(h1Section.content, /^##\s+(.*)$/);

    for (const h2Section of h2Sections) {
      const h2Header = h2Section.header;
      const content = h2Section.content;

      if (!content.trim()) continue;

      // Check if content needs further splitting
      const sectionChunks = splitLargeText(
        content,
        h1Header,
        h2Header,
        chunkIndex,
        metadata.document_id,
        maxChars
      );

      chunks.push(...sectionChunks);
      chunkIndex += sectionChunks.length;
    }
  }

  return chunks;
}