import { supabase } from '@/integrations/supabase/client';

export async function processDocument(documentId: string): Promise<boolean> {
  try {
    console.log('🚀 Triggering document processing for:', documentId);
    
    // First check if document exists and is in correct state
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, ingestion_status, title')
      .eq('id', documentId)
      .single();
    
    if (fetchError || !document) {
      console.error('❌ Document not found:', fetchError);
      return false;
    }
    
    if (document.ingestion_status === 'completed') {
      console.log('✅ Document already processed:', document.title);
      return true;
    }
    
    console.log('🎯 Invoking process-document function for:', documentId);
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { documentId }
    });
    console.log('📊 Process-document response:', { data, error });
    
    if (error) {
      console.error('❌ Error processing document:', error);
      
      // Update document status to failed
      await supabase
        .from('documents')
        .update({
          ingestion_status: 'failed',
          error_message: error.message,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      return false;
    }
    
    console.log('✅ Document processing completed:', data);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

export async function processAllDocuments(): Promise<{ success: number; failed: number }> {
  console.log('🚀 EMERGENCY REBUILD: Processing all pending documents with OCR + Enhanced Chunking...');
  
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
  
  console.log(`📄 EMERGENCY REBUILD: Found ${documents.length} documents to process`);
  console.log('📋 Documents to process:', documents.map(d => d.title));
  
  let success = 0;
  let failed = 0;
  
  // Process documents sequentially to avoid overwhelming the system
  for (const doc of documents) {
    console.log(`🔄 [${success + failed + 1}/${documents.length}] Processing: ${doc.title}`);
    const result = await processDocument(doc.id);
    
    if (result) {
      success++;
      console.log(`✅ Successfully processed: ${doc.title}`);
    } else {
      failed++;
      console.error(`❌ Failed to process: ${doc.title}`);
    }
    
    // Add small delay between documents to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`🎯 EMERGENCY REBUILD COMPLETE: ${success} successful, ${failed} failed`);
  return { success, failed };
}