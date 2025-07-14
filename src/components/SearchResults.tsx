import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, AlertCircle } from "lucide-react";

interface SearchSource {
  title: string;
  category: string;
}

interface SearchResultsProps {
  isLoading: boolean;
  answer: string | null;
  sources: SearchSource[];
  error: string | null;
  query: string;
}

export function SearchResults({ isLoading, answer, sources, error, query }: SearchResultsProps) {
  if (!isLoading && !answer && !error && !query) {
    return null;
  }

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {isLoading && (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-medium text-foreground">
                Searching Massachusetts criminal law...
              </span>
            </div>
            <p className="text-muted-foreground">
              Analyzing your query and finding relevant legal documents
            </p>
          </Card>
        )}

        {error && (
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-2">Search Error</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {answer && !isLoading && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Legal Analysis
                  </h2>
                  <div className="prose prose-sm max-w-none text-foreground">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {answer}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {sources.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Sources Referenced
                </h3>
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Badge variant="outline" className="shrink-0">
                        {source.category}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {source.title}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                This analysis is based on Massachusetts criminal law documents and should not be considered legal advice.
                Always consult with a qualified attorney for specific legal matters.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}