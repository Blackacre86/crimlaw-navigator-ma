import { describe, it, expect } from 'vitest';
import { 
  chunkLegalDocument, 
  estimateTokenCount, 
  type DocumentMetadata 
} from '../chunking';

describe('chunking utilities', () => {
  const mockMetadata: DocumentMetadata = {
    document_id: 'test-doc-123',
    title: 'Test Legal Document',
    category: 'Criminal Law'
  };

  describe('estimateTokenCount', () => {
    it('should estimate tokens correctly using 4 chars per token', () => {
      expect(estimateTokenCount('hello')).toBe(2); // 5 chars = 2 tokens (rounded up)
      expect(estimateTokenCount('hello world')).toBe(3); // 11 chars = 3 tokens
      expect(estimateTokenCount('')).toBe(0);
    });
  });

  describe('chunkLegalDocument', () => {
    it('should handle simple text without headers', () => {
      const text = 'This is a simple legal document without any headers.';
      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        text: text,
        metadata: {
          h1_header: null,
          h2_header: null,
          chunk_index: 0,
          document_id: 'test-doc-123'
        }
      });
    });

    it('should split by H1 headers correctly', () => {
      const text = `
# Introduction
This is the introduction section.

# Main Content
This is the main content section.

# Conclusion
This is the conclusion section.
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0].metadata.h1_header).toBe('Introduction');
      expect(chunks[1].metadata.h1_header).toBe('Main Content');
      expect(chunks[2].metadata.h1_header).toBe('Conclusion');
    });

    it('should split by H2 headers within H1 sections', () => {
      const text = `
# Criminal Law
## Elements of Crime
The basic elements include mens rea and actus reus.

## Defenses
Available defenses include self-defense and necessity.

# Civil Law
## Contract Law
Contracts require offer, acceptance, and consideration.
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks).toHaveLength(3);
      
      expect(chunks[0].metadata.h1_header).toBe('Criminal Law');
      expect(chunks[0].metadata.h2_header).toBe('Elements of Crime');
      
      expect(chunks[1].metadata.h1_header).toBe('Criminal Law');
      expect(chunks[1].metadata.h2_header).toBe('Defenses');
      
      expect(chunks[2].metadata.h1_header).toBe('Civil Law');
      expect(chunks[2].metadata.h2_header).toBe('Contract Law');
    });

    it('should handle large content by splitting into paragraphs', () => {
      const longParagraph = 'A'.repeat(1500) + '.';
      const text = `
# Long Section
${longParagraph}

${longParagraph}

${longParagraph}
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(3200);
        expect(chunk.metadata.h1_header).toBe('Long Section');
      });
    });

    it('should handle very large content by splitting into sentences', () => {
      const longSentence = 'This is a very long sentence with many words. ' + 'Word '.repeat(200);
      const text = `
# Very Long Section
${longSentence}${longSentence}${longSentence}
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.metadata.h1_header).toBe('Very Long Section');
      });
    });

    it('should preserve chunk ordering with correct indices', () => {
      const text = `
# Section 1
Content 1

## Subsection 1A
Content 1A

## Subsection 1B
Content 1B

# Section 2
Content 2
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0].metadata.chunk_index).toBe(0);
      expect(chunks[1].metadata.chunk_index).toBe(1);
      expect(chunks[2].metadata.chunk_index).toBe(2);
      expect(chunks[3].metadata.chunk_index).toBe(3);
    });

    it('should handle empty content gracefully', () => {
      const chunks = chunkLegalDocument('', mockMetadata);
      expect(chunks).toHaveLength(0);
    });

    it('should handle content with only headers', () => {
      const text = `
# Header 1
## Header 2
### Header 3
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      expect(chunks).toHaveLength(0);
    });

    it('should respect custom max character limit', () => {
      const text = 'A'.repeat(2000);
      const chunks = chunkLegalDocument(text, mockMetadata, 1000);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1000);
      });
    });

    it('should handle real legal document structure', () => {
      const text = `
# Massachusetts Criminal Law

## Operating Under the Influence (OUI)

### Elements of OUI
To prove OUI in Massachusetts, the prosecution must establish:

1. The defendant operated a motor vehicle
2. The defendant was under the influence of alcohol or drugs
3. The operation occurred on a public way or place where the public has access

### Penalties
First offense penalties include:
- License suspension: 45-90 days
- Fines: $500-$5,000
- Possible jail time: up to 2.5 years

## Assault and Battery

### Simple Assault and Battery
The elements include:
- Intent to cause harmful or offensive contact
- Actual harmful or offensive contact occurred

### Aggravated Assault and Battery
Enhanced penalties apply when:
- Serious bodily injury results
- A dangerous weapon is used
- The victim is a protected person
      `.trim();

      const chunks = chunkLegalDocument(text, mockMetadata);
      
      expect(chunks.length).toBeGreaterThan(0);
      
      // Check that headers are preserved correctly
      const ouiChunk = chunks.find(c => c.metadata.h2_header?.includes('Operating Under'));
      expect(ouiChunk).toBeDefined();
      expect(ouiChunk?.metadata.h1_header).toBe('Massachusetts Criminal Law');
      
      const assaultChunk = chunks.find(c => c.metadata.h2_header?.includes('Assault and Battery'));
      expect(assaultChunk).toBeDefined();
      expect(assaultChunk?.metadata.h1_header).toBe('Massachusetts Criminal Law');
    });
  });
});