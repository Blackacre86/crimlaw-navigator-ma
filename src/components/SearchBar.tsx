import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('Search error:', error);
        onSearch(query, false, null, [], 'Failed to perform search. Please try again.');
        toast({
          title: "Search Error",
          description: "There was an error performing your search. Please try again.",
          variant: "destructive",
        });
        return;
      }

      onSearch(query, false, data.answer, data.sources || [], null);
      
    } catch (error) {
      console.error('Search error:', error);
      onSearch(query, false, null, [], 'An unexpected error occurred. Please try again.');
      toast({
        title: "Search Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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
              variant="professional" 
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