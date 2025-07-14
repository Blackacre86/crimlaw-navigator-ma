import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";

interface SearchHistoryItem {
  id: number;
  query: string;
  timestamp: string;
}

interface SearchHistoryProps {
  onSelectSearch: (query: string) => void;
}

export function SearchHistory({ onSelectSearch }: SearchHistoryProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 10)); // Show last 10 searches
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('searchHistory');
    setSearchHistory([]);
  };

  const removeItem = (id: number) => {
    const updatedHistory = searchHistory.filter(item => item.id !== id);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Searches</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {searchHistory.slice(0, isExpanded ? 10 : 3).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
            onClick={() => onSelectSearch(item.query)}
          >
            <div className="flex-1">
              <p className="text-sm text-foreground truncate">{item.query}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}