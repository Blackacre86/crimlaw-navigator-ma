import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BookOpen, AlertCircle, CheckCircle, FileText } from "lucide-react";

interface SearchSource {
  title: string;
  category: string;
  content?: string;
  similarity?: number;
  created_at?: string;
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

  if (!query && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Searching legal database...</p>
                <p className="text-sm text-muted-foreground/70">Analyzing your query with AI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!answer && !sources?.length) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-6">
      {/* AI Answer */}
      {answer && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              AI Legal Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Documents */}
      {sources && sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Source Documents ({sources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources.map((source, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-2">{source.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{source.category}</Badge>
                        {source.similarity && (
                          <Badge variant="outline">
                            {Math.round(source.similarity * 100)}% relevant
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {source.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {source.content.substring(0, 200)}...
                    </p>
                  )}
                  
                  {source.created_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(source.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Disclaimer */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          This analysis is based on Massachusetts criminal law documents and should not be considered legal advice.
          Always consult with a qualified attorney for specific legal matters.
        </p>
      </div>
    </div>
  );
}