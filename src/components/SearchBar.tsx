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
      // Try Python backend first
      const results = await pythonAPI.searchDocuments(query.trim(), 10, 0.7);
      
      // Transform Python backend results to match expected format
      const transformedSources = results.results.map(result => ({
        content: result.content,
        metadata: result.metadata,
        similarity: result.similarity
      }));

      // Generate answer using the results (simplified for now)
      const answer = results.count > 0 
        ? `Found ${results.count} relevant documents. Here are the most relevant excerpts from Massachusetts criminal law.`
        : "No relevant documents found for your query.";

      onSearch(query, false, answer, transformedSources, null);
      
    } catch (pythonError) {
      console.warn('Python backend search failed, falling back to Supabase:', pythonError);
      
      // Fallback to Supabase edge function
      try {
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: { query: query.trim() }
        });

        if (error) {
          throw error;
        }

        onSearch(query, false, data.answer, data.sources || [], null);
        
      } catch (supabaseError) {
        console.error('Both search methods failed:', supabaseError);
        onSearch(query, false, null, [], 'Search failed. Please try again.');
        toast({
          title: "Search Error",
          description: "Search services are unavailable. Please try again later.",
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