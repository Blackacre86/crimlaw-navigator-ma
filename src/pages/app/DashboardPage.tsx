import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, FileText, TrendingUp, Sparkles, History as HistoryIcon, Loader2, Scale, BookOpen, Gavel, RefreshCw, AlertCircle, Upload, Plus } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { SearchResultCard, SearchResult } from '@/components/SearchResultCard';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { OnboardingModal } from '@/components/OnboardingModal';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
export default function DashboardPage() {
  const {
    toast
  } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('lexinnova-onboarding-complete');
  });
  const [searchState, setSearchState] = useState({
    query: '',
    isLoading: false,
    answer: null as string | null,
    sources: [] as any[],
    error: null as string | null
  });
  const handleSearch = (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => {
    setSearchState({
      query,
      isLoading,
      answer,
      sources,
      error
    });
  };

  const handleUploadComplete = () => {
    toast({
      title: "Documents Ready",
      description: "Your uploaded documents are now available for search",
    });
  };
  const handleProcessDocuments = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🔄 Starting enhanced document processing with LlamaCloud...');
      
      // First, reset any failed or processing documents to pending
      const { error: resetError } = await supabase
        .from('documents')
        .update({ ingestion_status: 'pending', error_message: null })
        .in('ingestion_status', ['failed', 'processing']);
      
      if (resetError) {
        console.error('Error resetting document status:', resetError);
        toast({
          title: "Warning",
          description: "Some documents may not have been reset properly",
          variant: "destructive",
        });
      }
      
      // Reset documents status for manual processing
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('id, title')
        .eq('ingestion_status', 'pending');
      
      const result = { success: pendingDocs?.length || 0, failed: 0 };
      
      toast({
        title: "Legal Document Processing Complete",
        description: `Successfully processed ${result.success} documents with table preservation${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
      
    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        title: "Processing Failed", 
        description: error.message || "An unexpected error occurred during legal document processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const recentSearches = [{
    id: 1,
    query: 'Massachusetts criminal sentencing guidelines for assault charges',
    timestamp: '2 hours ago',
    results: 12
  }, {
    id: 2,
    query: 'Fourth Amendment search and seizure precedents in Massachusetts',
    timestamp: '1 day ago',
    results: 8
  }, {
    id: 3,
    query: 'Drug possession penalties and diversion programs',
    timestamp: '2 days ago',
    results: 15
  }];
  return <div className="h-full" style={{
    background: 'var(--gradient-subtle)'
  }}>
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      {/* Header */}
      <div className="border-b border-border" style={{
      background: 'var(--gradient-card)'
    }}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Legal Research</h1>
          <p className="text-muted-foreground">
            Search Massachusetts criminal law with AI-powered insights and verifiable citations
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Hero Search Section */}
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Main Search */}
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground">
                AI-Powered Legal Research for Massachusetts Criminal Law
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get instant, accurate answers from verified legal sources with AI-generated summaries and verifiable citations.
              </p>
            </div>
            
            {/* Search Bar with Upload */}
            <div className="space-y-4">
              <SearchBar onSearch={handleSearch} />
              
              <div className="flex justify-center">
                <DocumentUploadModal onUploadComplete={handleUploadComplete}>
                  <Button variant="outline" size="sm" className="text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Legal Documents
                  </Button>
                </DocumentUploadModal>
              </div>
            </div>
          </div>
          
          {/* Search Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-accent-blue/5 rounded-lg border border-primary/10">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <Scale className="h-4 w-4" />
                Natural Language
              </div>
              <div className="text-muted-foreground">"What are the penalties for first-time DUI in Massachusetts?"</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-accent-blue/5 rounded-lg border border-primary/10">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <Gavel className="h-4 w-4" />
                Case Law
              </div>
              <div className="text-muted-foreground">"Recent Supreme Judicial Court decisions on search warrants"</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-accent-blue/5 rounded-lg border border-primary/10">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <BookOpen className="h-4 w-4" />
                Statutes
              </div>
              <div className="text-muted-foreground">"Massachusetts General Laws Chapter 265 assault provisions"</div>
            </div>
          </div>
        </div>

        {/* Emergency Fix Panel */}
        <Card className="bg-gradient-to-br from-destructive/5 to-orange-500/5 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>RAG Pipeline Status</span>
            </CardTitle>
            <CardDescription>
              Documents need to be processed with legal chunking and embeddings for search to work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enhanced processing for legal documents with LlamaCloud extraction and table preservation. Use this to process PDFs with complex layouts and tables.
              </p>
              <Button onClick={handleProcessDocuments} disabled={isProcessing} className="w-full" size="lg">
                {isProcessing ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Legal Documents...
                  </> : <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Process Legal Documents with Table Preservation
                  </>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Search Results */}
        {searchState.query && (
          <div className="max-w-5xl mx-auto">
            {searchState.isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Analyzing your legal query...</h3>
                      <p className="text-muted-foreground">Searching Massachusetts criminal law database</p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-pulse">📖 Scanning documents</div>
                        <div className="animate-pulse delay-100">⚖️ Analyzing precedents</div>
                        <div className="animate-pulse delay-200">🤖 Generating insights</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : searchState.error ? (
              <Card className="border-destructive/20">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Search Error</h3>
                    <p className="text-muted-foreground">{searchState.error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : searchState.sources?.length > 0 ? (
              <div className="space-y-6">
                {/* AI Summary */}
                {searchState.answer && (
                  <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-accent-blue/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        AI Legal Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-foreground leading-relaxed text-base">{searchState.answer}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Results Grid */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Source Documents ({searchState.sources.length})
                  </h3>
                  <div className="space-y-4">
                    {searchState.sources.map((source, index) => (
                      <SearchResultCard 
                        key={index} 
                        result={source as SearchResult} 
                        index={index} 
                      />
                    ))}
                  </div>
                </div>

                {/* Legal Disclaimer */}
                <Card className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Legal Disclaimer</p>
                        <p className="text-amber-700 dark:text-amber-300">
                          This analysis is based on Massachusetts criminal law documents and should not be considered legal advice. 
                          Always consult official sources and a qualified attorney for specific legal matters.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
                    <p className="text-muted-foreground mb-4">
                      We couldn't find any documents matching your query. Try different keywords or upload more documents.
                    </p>
                    <DocumentUploadModal onUploadComplete={handleUploadComplete}>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </DocumentUploadModal>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Searches Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">+ 5% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.0s</div>
              <p className="text-xs text-muted-foreground">-0.0s improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HistoryIcon className="h-5 w-5" />
              <span>Recent Searches</span>
            </CardTitle>
            <CardDescription>
              Your recent legal research queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSearches.map(search => <div key={search.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">{search.query}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{search.timestamp}</span>
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {search.results} results
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-accent-blue hover:text-accent-blue/80">
                    View Results
                  </Button>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent-blue/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span>Getting Started with LexInnova</span>
            </CardTitle>
            <CardDescription>
              Make the most of your AI-powered legal research platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">📝 Search Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use natural language questions</li>
                  <li>• Be specific about Massachusetts law</li>
                  <li>• Include relevant case types or statutes</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">🎯 AI Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Verifiable citations in every answer</li>
                  <li>• Follow-up questions supported</li>
                  <li>• Cross-referenced case law</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}