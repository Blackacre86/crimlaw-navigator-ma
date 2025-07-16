const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

export interface ProcessingOptions {
  useLlamaCloud?: boolean;
  documentId?: string;
}

export interface ProcessingResponse {
  document_id: string;
  status: string;
  message: string;
}

export interface SearchResponse {
  query: string;
  results: Array<{
    content: string;
    metadata: any;
    similarity: number;
  }>;
  count: number;
}

export class PythonDocumentProcessor {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || PYTHON_API_URL;
  }

  async processDocument(
    file: File,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = new URL(`${this.apiUrl}/process-document`);
    if (options.useLlamaCloud !== undefined) {
      url.searchParams.append('use_llama_cloud', String(options.useLlamaCloud));
    }
    if (options.documentId) {
      url.searchParams.append('document_id', options.documentId);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Processing failed: ${error}`);
    }

    return response.json();
  }

  async getDocumentStatus(documentId: string) {
    const response = await fetch(`${this.apiUrl}/document/${documentId}/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }

  async searchDocuments(
    query: string,
    maxResults: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResponse> {
    const response = await fetch(`${this.apiUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteDocument(documentId: string) {
    const response = await fetch(`${this.apiUrl}/document/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    return response.json();
  }

  async waitForProcessing(
    documentId: string,
    maxAttempts: number = 60,
    delayMs: number = 5000
  ): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getDocumentStatus(documentId);
      
      if (status.ingestion_status === 'completed') {
        return status;
      }
      
      if (status.ingestion_status === 'failed') {
        throw new Error(status.error_message || 'Processing failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Processing timeout');
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const pythonAPI = new PythonDocumentProcessor();