import React, { useState, useEffect, useRef } from 'react';
import { Search, Copy, Save, ChevronDown, ChevronUp, AlertCircle, Shield, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { supabase } from '@/integrations/supabase/client';

// TypeScript Interfaces
export interface SearchSource {
  id: string;
  title: string;
  section?: string;
  chunk_id?: string;
  relevance_score?: number;
}

export interface LegalSearchResult {
  answer: string;
  sources: SearchSource[];
  confidence: number;
  response_time_ms: number;
  tokens_used: number;
  chunks_processed: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  category: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  result?: LegalSearchResult;
}

// Hardcoded search suggestions for common legal queries
const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { id: '1', text: 'What are the requirements for traffic stops in Massachusetts?', category: 'Traffic' },
  { id: '2', text: 'Miranda rights procedures for arrests', category: 'Arrest' },
  { id: '3', text: 'Search and seizure laws in MA', category: 'Search' },
  { id: '4', text: 'DUI arrest procedures and requirements', category: 'DUI' },
  { id: '5', text: 'Domestic violence response protocols', category: 'DV' },
  { id: '6', text: 'Use of force guidelines and regulations', category: 'Force' },
  { id: '7', text: 'Evidence collection procedures', category: 'Evidence' },
  { id: '8', text: 'Juvenile arrest procedures in Massachusetts', category: 'Juvenile' },
];

const LegalSearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LegalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const { toast } = useToast();
  const { saveDocument, isInitialized } = useOfflineStorage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('legal-search-history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = (newHistory: SearchHistoryItem[]) => {
    const limitedHistory = newHistory.slice(0, 10); // Keep only last 10 searches
    setSearchHistory(limitedHistory);
    localStorage.setItem('legal-search-history', JSON.stringify(limitedHistory));
  };

  // Handle search submission
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('process-legal-query', {
        body: { 
          query: searchQuery.trim(),
          user_id: (await supabase.auth.getUser()).data.user?.id 
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data || !data.answer) {
        throw new Error('No results found for your query.');
      }

      const searchResult: LegalSearchResult = {
        answer: data.answer,
        sources: data.sources || [],
        confidence: data.confidence || 0,
        response_time_ms: data.response_time_ms || 0,
        tokens_used: data.tokens_used || 0,
        chunks_processed: data.chunks_processed || 0,
      };

      setResult(searchResult);

      // Add to search history
      const newHistoryItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query: searchQuery.trim(),
        timestamp: Date.now(),
        result: searchResult,
      };

      const updatedHistory = [newHistoryItem, ...searchHistory];
      saveSearchHistory(updatedHistory);

      toast({
        title: "Search Complete",
        description: `Found ${searchResult.sources.length} relevant sources`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  };

  // Handle history item click
  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setQuery(historyItem.query);
    setShowHistory(false);
    if (historyItem.result) {
      setResult(historyItem.result);
    }
  };

  // Copy answer to clipboard
  const copyAnswer = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result.answer);
      toast({
        title: "Copied",
        description: "Answer copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Save answer for offline access
  const saveForOffline = async () => {
    if (!result || !isInitialized) return;
    
    try {
      await saveDocument({
        id: Date.now().toString(),
        title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        content: `Query: ${query}\n\nAnswer: ${result.answer}\n\nSources:\n${result.sources.map(s => `- ${s.title}`).join('\n')}`,
        timestamp: Date.now(),
      });
      
      toast({
        title: "Saved Offline",
        description: "Answer saved for offline access",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save for offline access",
        variant: "destructive",
      });
    }
  };

  // Get confidence badge variant
  const getConfidenceBadge = (confidence: number) => {
    if (confidence > 0.8) {
      return { variant: "default" as const, text: "High Confidence", icon: CheckCircle };
    } else if (confidence > 0.5) {
      return { variant: "secondary" as const, text: "Medium Confidence", icon: AlertCircle };
    } else {
      return { variant: "destructive" as const, text: "Low Confidence", icon: AlertCircle };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Massachusetts Legal Search</h1>
        </div>
        <p className="text-muted-foreground">Search legal documents and procedures for law enforcement</p>
      </div>

      {/* Search Input Section */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search MA Law..."
              className="pl-10 pr-4 py-3 text-lg border-2 border-border focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              disabled={isLoading}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          
          <Button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            size="lg"
            className="px-6"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && !isLoading && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-2 max-h-96 overflow-y-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Common Searches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{suggestion.text}</span>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search History */}
        {showHistory && searchHistory.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-2 max-h-96 overflow-y-auto">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Searches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {searchHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{item.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
          disabled={isLoading}
        >
          Suggestions
          {showSuggestions ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
        
        {searchHistory.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            disabled={isLoading}
          >
            <Clock className="mr-2 h-4 w-4" />
            History
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="text-lg font-medium">Analyzing legal documents...</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      {result && !isLoading && (
        <div className="space-y-4">
          {/* Answer Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Answer</CardTitle>
                <div className="flex items-center gap-2">
                  {(() => {
                    const confidenceBadge = getConfidenceBadge(result.confidence);
                    const Icon = confidenceBadge.icon;
                    return (
                      <Badge variant={confidenceBadge.variant} className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {confidenceBadge.text}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {result.answer}
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAnswer}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Answer
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveForOffline}
                  className="flex items-center gap-2"
                  disabled={!isInitialized}
                >
                  <Save className="h-4 w-4" />
                  Save Offline
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sources Section */}
          {result.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Citations ({result.sources.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {result.sources.map((source, index) => (
                    <AccordionItem key={source.id || index} value={`source-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="font-medium">{source.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {source.section && (
                            <p><strong>Section:</strong> {source.section}</p>
                          )}
                          {source.chunk_id && (
                            <p><strong>Reference ID:</strong> {source.chunk_id}</p>
                          )}
                          {source.relevance_score && (
                            <p><strong>Relevance:</strong> {Math.round(source.relevance_score * 100)}%</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Query Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium text-foreground">{result.response_time_ms}ms</div>
                  <div className="text-muted-foreground">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">{result.chunks_processed}</div>
                  <div className="text-muted-foreground">Documents Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">{result.tokens_used}</div>
                  <div className="text-muted-foreground">Tokens Used</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">{Math.round(result.confidence * 100)}%</div>
                  <div className="text-muted-foreground">Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LegalSearchInterface;