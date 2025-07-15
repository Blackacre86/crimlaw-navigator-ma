import { useState, useEffect, useCallback } from 'react';

/**
 * Interface for saved documents in IndexedDB
 */
export interface SavedDocument {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

/**
 * Interface for saved queries in IndexedDB
 */
export interface SavedQuery {
  id: string;
  query: string;
  answer: string;
  sources: any[];
  confidence: number;
  timestamp: number;
  synced: boolean;
}

/**
 * Interface for the hook's return value
 */
export interface UseOfflineStorageReturn {
  // Documents
  initDB: () => Promise<void>;
  saveDocument: (doc: SavedDocument) => Promise<void>;
  getDocument: (id: string) => Promise<SavedDocument | undefined>;
  getAllDocuments: () => Promise<SavedDocument[]>;
  deleteDocument: (id: string) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  // Queries
  saveQuery: (query: SavedQuery) => Promise<void>;
  getQuery: (id: string) => Promise<SavedQuery | undefined>;
  getAllQueries: () => Promise<SavedQuery[]>;
  deleteQuery: (id: string) => Promise<void>;
  clearAllQueries: () => Promise<void>;
  syncQueries: () => Promise<void>;
  // State
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

/**
 * Custom React hook for IndexedDB operations
 * Provides offline storage capabilities for documents
 * 
 * @example
 * ```typescript
 * const { 
 *   saveDocument, 
 *   getDocument, 
 *   getAllDocuments, 
 *   deleteDocument,
 *   isLoading,
 *   error 
 * } = useOfflineStorage();
 * 
 * // Save a document
 * await saveDocument({
 *   id: 'doc-1',
 *   title: 'Miranda Rights',
 *   content: 'You have the right to remain silent...',
 *   timestamp: Date.now()
 * });
 * 
 * // Retrieve all documents
 * const documents = await getAllDocuments();
 * ```
 */
export function useOfflineStorage(): UseOfflineStorageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  const DB_NAME = 'shift_offline_db';
  const DB_VERSION = 2;
  const DOCUMENTS_STORE = 'saved_documents';
  const QUERIES_STORE = 'saved_queries';
  const MAX_QUERIES = 50;

  /**
   * Initialize IndexedDB database
   */
  const initDB = useCallback(async (): Promise<void> => {
    if (db) return; // Already initialized

    setIsLoading(true);
    setError(null);

    try {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        throw new Error('IndexedDB is not supported in this browser');
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      return new Promise<void>((resolve, reject) => {
        request.onerror = () => {
          const error = request.error?.message || 'Failed to open database';
          reject(new Error(error));
        };

        request.onsuccess = () => {
          const database = request.result;
          setDb(database);
          setIsInitialized(true);
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          
          // Create documents store if it doesn't exist
          if (!database.objectStoreNames.contains(DOCUMENTS_STORE)) {
            const store = database.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('title', 'title', { unique: false });
          }
          
          // Create queries store if it doesn't exist
          if (!database.objectStoreNames.contains(QUERIES_STORE)) {
            const store = database.createObjectStore(QUERIES_STORE, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('query', 'query', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize database';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Save a document to IndexedDB
   */
  const saveDocument = useCallback(async (doc: SavedDocument): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
      return new Promise<void>((resolve, reject) => {
        const request = store.put(doc);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = request.error?.message || 'Failed to save document';
          reject(new Error(error));
        };
        
        transaction.onerror = () => {
          const error = transaction.error?.message || 'Transaction failed';
          reject(new Error(error));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save document';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Get a document by ID from IndexedDB
   */
  const getDocument = useCallback(async (id: string): Promise<SavedDocument | undefined> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
      return new Promise<SavedDocument | undefined>((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          const error = request.error?.message || 'Failed to get document';
          reject(new Error(error));
        };
        
        transaction.onerror = () => {
          const error = transaction.error?.message || 'Transaction failed';
          reject(new Error(error));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get document';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Get all documents from IndexedDB, sorted by timestamp (newest first)
   */
  const getAllDocuments = useCallback(async (): Promise<SavedDocument[]> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const index = store.index('timestamp');
      
      return new Promise<SavedDocument[]>((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // Sort by timestamp descending
        const results: SavedDocument[] = [];
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = () => {
          const error = request.error?.message || 'Failed to get documents';
          reject(new Error(error));
        };
        
        transaction.onerror = () => {
          const error = transaction.error?.message || 'Transaction failed';
          reject(new Error(error));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get documents';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Delete a document by ID from IndexedDB
   */
  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = request.error?.message || 'Failed to delete document';
          reject(new Error(error));
        };
        
        transaction.onerror = () => {
          const error = transaction.error?.message || 'Transaction failed';
          reject(new Error(error));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Clear all documents from IndexedDB
   */
  const clearAllDocuments = useCallback(async (): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = request.error?.message || 'Failed to clear documents';
          reject(new Error(error));
        };
        
        transaction.onerror = () => {
          const error = transaction.error?.message || 'Transaction failed';
          reject(new Error(error));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear documents';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Initialize database on mount
  useEffect(() => {
    initDB().catch(err => {
      console.error('Failed to initialize IndexedDB:', err);
    });
  }, [initDB]);

  // Cleanup database connection on unmount
  useEffect(() => {
    return () => {
      if (db) {
        db.close();
      }
    };
  }, [db]);

  /**
   * Save a query to IndexedDB with FIFO management
   */
  const saveQuery = useCallback(async (query: SavedQuery): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    setIsLoading(true);
    setError(null);

    try {
      const transaction = db.transaction([QUERIES_STORE], 'readwrite');
      const store = transaction.objectStore(QUERIES_STORE);
      
      // Get current count
      const countRequest = store.count();
      const count = await new Promise<number>((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
      });
      
      // If at max capacity, remove oldest
      if (count >= MAX_QUERIES) {
        const index = store.index('timestamp');
        const oldestRequest = index.openCursor();
        oldestRequest.onsuccess = () => {
          const cursor = oldestRequest.result;
          if (cursor) {
            cursor.delete();
          }
        };
      }
      
      return new Promise<void>((resolve, reject) => {
        const request = store.put(query);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(request.error?.message || 'Failed to save query'));
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save query';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  /**
   * Get a query by ID from IndexedDB
   */
  const getQuery = useCallback(async (id: string): Promise<SavedQuery | undefined> => {
    if (!db) throw new Error('Database not initialized');

    const transaction = db.transaction([QUERIES_STORE], 'readonly');
    const store = transaction.objectStore(QUERIES_STORE);
    
    return new Promise<SavedQuery | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to get query'));
    });
  }, [db]);

  /**
   * Get all queries from IndexedDB
   */
  const getAllQueries = useCallback(async (): Promise<SavedQuery[]> => {
    if (!db) throw new Error('Database not initialized');

    const transaction = db.transaction([QUERIES_STORE], 'readonly');
    const store = transaction.objectStore(QUERIES_STORE);
    const index = store.index('timestamp');
    
    return new Promise<SavedQuery[]>((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results: SavedQuery[] = [];
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to get queries'));
    });
  }, [db]);

  /**
   * Delete a query by ID from IndexedDB
   */
  const deleteQuery = useCallback(async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const transaction = db.transaction([QUERIES_STORE], 'readwrite');
    const store = transaction.objectStore(QUERIES_STORE);
    
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to delete query'));
    });
  }, [db]);

  /**
   * Clear all queries from IndexedDB
   */
  const clearAllQueries = useCallback(async (): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const transaction = db.transaction([QUERIES_STORE], 'readwrite');
    const store = transaction.objectStore(QUERIES_STORE);
    
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to clear queries'));
    });
  }, [db]);

  /**
   * Sync unsynced queries (placeholder for future implementation)
   */
  const syncQueries = useCallback(async (): Promise<void> => {
    // This would sync with the server when online
    // For now, just mark all queries as synced
    if (!db) throw new Error('Database not initialized');

    const queries = await getAllQueries();
    const unsyncedQueries = queries.filter(q => !q.synced);
    
    for (const query of unsyncedQueries) {
      await saveQuery({ ...query, synced: true });
    }
  }, [db, getAllQueries, saveQuery]);

  return {
    // Documents
    initDB,
    saveDocument,
    getDocument,
    getAllDocuments,
    deleteDocument,
    clearAllDocuments,
    // Queries
    saveQuery,
    getQuery,
    getAllQueries,
    deleteQuery,
    clearAllQueries,
    syncQueries,
    // State
    isLoading,
    error,
    isInitialized,
  };
}