import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Gavel, BookOpen, Loader2, AlertCircle, Upload } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import { SearchResultCard, SearchResult } from '@/components/SearchResultCard';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('shift-onboarding-complete');
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

  const recentSearches = [
    {
      id: 1,
      query: 'Massachusetts criminal sentencing guidelines for assault charges',
      timestamp: '2 hours ago',
      results: 12
    }, 
    {
      id: 2,
      query: 'Fourth Amendment search and seizure precedents in Massachusetts',
      timestamp: '1 day ago',
      results: 8
    }, 
    {
      id: 3,
      query: 'Drug possession penalties and diversion programs',
      timestamp: '2 days ago',
      results: 15
    }
  ];
  
  return (
    <div className="h-full">
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      {/* Header */}
      <div className="border-b border-border bg-gradient-hero text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">SHIFT - Law Enforcement Research</h1>
          <p className="text-white/80">
            Voice-enabled Massachusetts criminal law research for officers, detectives, and prosecutors
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
                Voice-Enabled Legal Research
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Ask questions with your voice or text. Get instant answers from Massachusetts criminal law.
              </p>
            </div>
            
            {/* Voice and Search Options */}
            <div className="space-y-4">
              <div className="text-center">
                <VoiceSearchButton onSearch={handleSearch} />
              </div>
              <div className="text-center text-sm text-muted-foreground">or search with text</div>
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
            <div className="text-center p-6 rounded-lg border border-primary/20 bg-secondary">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <Gavel className="h-4 w-4" />
                Case Law
              </div>
              <div className="text-muted-foreground">"Recent Supreme Judicial Court decisions on search warrants"</div>
            </div>
            <div className="text-center p-6 rounded-lg border border-primary/20 bg-secondary">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <BookOpen className="h-4 w-4" />
                Statutes
              </div>
              <div className="text-muted-foreground">"Massachusetts General Laws Chapter 265 assault provisions"</div>
            </div>
            <div className="text-center p-6 rounded-lg border border-primary/20 bg-secondary">
              <div className="font-medium text-foreground mb-2 flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                Natural Language
              </div>
              <div className="text-muted-foreground">"What are the penalties for first-time DUI in Massachusetts?"</div>
            </div>
          </div>
        </div>

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
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Legal Analysis
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
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">Legal Disclaimer</p>
                        <p>
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
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </DocumentUploadModal>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Legal Disclaimer */}
        <Card className="max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle className="text-sm">Important Legal Notice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              SHIFT provides access to Massachusetts criminal law research materials for informational purposes only. 
              The information provided does not constitute legal advice and should not be relied upon as such. 
              Always consult with qualified legal counsel for specific cases.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}