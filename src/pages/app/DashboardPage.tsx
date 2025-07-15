import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, FileText, TrendingUp, Sparkles, History as HistoryIcon, Loader2, Scale, BookOpen, Gavel } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { OnboardingWelcome } from '@/components/OnboardingWelcome';

export default function DashboardPage() {
  const [searchState, setSearchState] = useState({
    query: '',
    isLoading: false,
    answer: null as string | null,
    sources: [] as any[],
    error: null as string | null,
  });

  const handleSearch = (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => {
    setSearchState({ query, isLoading, answer, sources, error });
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
    <div className="h-full bg-gradient-subtle">
      <OnboardingWelcome />
      
      {/* Header */}
      <div className="border-b border-border bg-gradient-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Legal Research</h1>
          <p className="text-muted-foreground">
            Search Massachusetts criminal law with AI-powered insights and verifiable citations
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Search Section */}
        <div className="max-w-4xl mx-auto space-y-6">
          <SearchBar onSearch={handleSearch} />
          
          {/* Search Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="font-medium text-foreground mb-2">Natural Language</div>
              <div className="text-muted-foreground">"What are the penalties for first-time DUI in Massachusetts?"</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="font-medium text-foreground mb-2">Case Law</div>
              <div className="text-muted-foreground">"Recent Supreme Judicial Court decisions on search warrants"</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="font-medium text-foreground mb-2">Statutes</div>
              <div className="text-muted-foreground">"Massachusetts General Laws Chapter 265 assault provisions"</div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <SearchResults 
          isLoading={searchState.isLoading}
          answer={searchState.answer}
          sources={searchState.sources}
          error={searchState.error}
          query={searchState.query}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                +73 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Searches Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2s</div>
              <p className="text-xs text-muted-foreground">
                -0.3s improvement
              </p>
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
              {recentSearches.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
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
                </div>
              ))}
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
    </div>
  );
}