import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, FileText, TrendingUp, Sparkles, History as HistoryIcon } from 'lucide-react';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 2000);
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
    <div className="h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Legal Research Dashboard</h1>
          <p className="text-muted-foreground">
            Search through Massachusetts criminal law documents with AI-powered insights
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Search Section */}
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ask anything about Massachusetts criminal law..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg h-14 text-foreground placeholder:text-muted-foreground"
                disabled={isSearching}
              />
            </div>
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSearching || !searchQuery.trim()}
                className="px-8"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Search with AI
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Search Tips */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="font-medium text-foreground mb-1">Natural Language</div>
              <div>"What are the penalties for first-time DUI in Massachusetts?"</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground mb-1">Case Law</div>
              <div>"Recent Massachusetts Supreme Court decisions on search warrants"</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground mb-1">Statutes</div>
              <div>"Massachusetts General Laws Chapter 265 assault provisions"</div>
            </div>
          </div>
        </div>

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