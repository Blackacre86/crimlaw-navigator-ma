import { supabase } from '@/integrations/supabase/client';

export async function processDocument(documentId: string): Promise<boolean> {
  try {
    console.log('🚀 Triggering enhanced document processing for:', documentId);
    
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { documentId }
    });
    
    if (error) {
      console.error('❌ Error processing document:', error);
      return false;
    }
    
    console.log('✅ Document processing triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

export async function processAllDocuments(): Promise<{ success: number; failed: number }> {
  console.log('🔄 Processing all pending documents with LlamaCloud...');
  
  // Get all documents that need processing
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, ingestion_status')
    .in('ingestion_status', ['pending', 'failed']);
    
  if (error) {
    console.error('❌ Error fetching documents:', error);
    return { success: 0, failed: 1 };
  }
  
  if (!documents || documents.length === 0) {
    console.log('ℹ️ No documents need processing');
    return { success: 0, failed: 0 };
  }
  
  console.log(`📄 Found ${documents.length} documents to process with enhanced legal chunking`);
  
  let success = 0;
  let failed = 0;
  
  // Process documents sequentially to avoid overwhelming the system
  for (const doc of documents) {
    console.log(`🔄 Processing: ${doc.title}`);
    const result = await processDocument(doc.id);
    
    if (result) {
      success++;
      console.log(`✅ Successfully processed: ${doc.title}`);
    } else {
      failed++;
      console.error(`❌ Failed to process: ${doc.title}`);
    }
    
    // Add small delay between documents
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return { success, failed };
}