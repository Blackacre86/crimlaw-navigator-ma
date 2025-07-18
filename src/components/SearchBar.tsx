import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pythonAPI } from "@/lib/python-api";

interface SearchBarProps {
  onSearch: (query: string, isLoading: boolean, answer: string | null, sources: any[], error: string | null) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Please enter a search query",
        description: "Enter a question about Massachusetts criminal law to search.",
      });
      return;
    }

    setIsLoading(true);
    onSearch(query, true, null, [], null);

    try {
      console.log('🔍 Starting search for:', query.trim());
      
      // Primary search: Use Supabase semantic-search function
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('❌ Semantic search error:', error);
        throw new Error(`Semantic search failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from semantic search');
      }

      console.log('✅ Search successful:', data);
      onSearch(query, false, data.answer || 'No answer generated', data.sources || [], null);
      
    } catch (searchError) {
      console.error('❌ Primary search failed:', searchError);
      
      // Fallback: Try Python backend
      try {
        console.log('🔄 Trying Python backend fallback...');
        const results = await pythonAPI.searchDocuments(query.trim(), 10, 0.7);
        
        const transformedSources = results.results.map(result => ({
          content: result.content,
          metadata: result.metadata,
          similarity: result.similarity
        }));

        const answer = results.count > 0 
          ? `Found ${results.count} relevant documents from Massachusetts criminal law.`
          : "No relevant documents found for your query.";

        console.log('✅ Python backend fallback successful');
        onSearch(query, false, answer, transformedSources, null);
        
      } catch (fallbackError) {
        console.error('❌ All search methods failed:', { searchError, fallbackError });
        
        // Final fallback: Show helpful error message
        const errorMessage = searchError.message.includes('semantic search') 
          ? 'Search service is temporarily unavailable. Please try again in a moment.'
          : 'Unable to process your search. Please check your connection and try again.';
          
        onSearch(query, false, null, [], errorMessage);
        toast({
          title: "Search Temporarily Unavailable",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Massachusetts criminal law documents, statutes, and procedures..."
            className="pl-12 pr-20 h-14 text-lg border-2 border-border focus:border-primary transition-colors shadow-sm"
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <Button 
              type="submit" 
              size="sm" 
              className="h-10"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-2">
        Search across Model Jury Instructions, Rules of Criminal Procedure, and MA General Laws
      </p>
    </div>
  );
}