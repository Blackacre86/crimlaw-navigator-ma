import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchHistory } from "@/components/SearchHistory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [searchState, setSearchState] = useState({
    query: "",
    isLoading: false,
    answer: null as string | null,
    sources: [] as any[],
    error: null as string | null,
  });
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<number>(0);
  const [categoryStats, setCategoryStats] = useState<number>(0);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Get total document count
      const { count: totalDocs } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      // Get category breakdown
      const { data: categories } = await supabase
        .from('documents')
        .select('category')
        .neq('category', null);
      
      if (totalDocs) {
        setDocumentCount(totalDocs);
      }
      
      if (categories) {
        const categoryCount = [...new Set(categories.map(doc => doc.category))].length;
        setCategoryStats(categoryCount);
      }
      
      // Get recent searches from localStorage or set to 0 for now
      const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setRecentSearches(searchHistory.length);
      
      // Get recent documents
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('title, category, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (recentDocs) {
        setRecentDocuments(recentDocs);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Listen for category search events
    const handleCategorySearch = (event: CustomEvent) => {
      const { query } = event.detail;
      // Trigger search with category query
      setSearchState(prev => ({ ...prev, query }));
    };

    window.addEventListener('categorySearch', handleCategorySearch as EventListener);
    return () => {
      window.removeEventListener('categorySearch', handleCategorySearch as EventListener);
    };
  }, []);

  const handleSearch = (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => {
    setSearchState({ query, isLoading, answer, sources, error });
    
    // Store search in localStorage for recent searches tracking
    if (query.trim()) {
      const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const newSearch = {
        query,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      const updatedHistory = [newSearch, ...searchHistory.slice(0, 49)]; // Keep last 50 searches
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
      setRecentSearches(updatedHistory.length);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Search */}
      <section className="py-12 px-4 bg-gradient-to-br from-primary/5 to-primary-light/5">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Research Massachusetts Criminal Law
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access comprehensive legal documents, jury instructions, and procedural rules
            </p>
          </div>
          
          <SearchBar onSearch={handleSearch} />
          <div className="mt-6 max-w-2xl mx-auto">
            <SearchHistory onSelectSearch={(query) => setSearchState(prev => ({ ...prev, query }))} />
          </div>
        </div>
      </section>

      {/* Search Results */}
      <SearchResults 
        isLoading={searchState.isLoading}
        answer={searchState.answer}
        sources={searchState.sources}
        error={searchState.error}
        query={searchState.query}
      />

      {/* Quick Stats */}
      <section className="py-8 px-4 border-b border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {documentCount !== null ? documentCount : '...'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {recentSearches}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Recent Searches</p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {categoryStats}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Categories</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <CategoryFilter />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Recent Activity</h2>
            <Button variant="outline">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {doc.category}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="secondary" size="sm">View Document</Button>
                </Card>
              ))
            ) : (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">
                  <p>No recent documents found</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}