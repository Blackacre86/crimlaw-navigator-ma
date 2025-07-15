import { useState } from "react"
import { Search, Trash2, Copy, ExternalLink, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useErrorHandling } from "@/hooks/use-error-handling"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { toast } from "@/hooks/use-toast"

export function ErrorHistoryPanel() {
  const { errorHistory, clearHistory, selectedError, setSelectedError } = useErrorHandling()
  const [searchTerm, setSearchTerm] = useState("")
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  const filteredErrors = errorHistory.filter(error =>
    error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (error.component && error.component.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCopyError = async (error: any) => {
    try {
      const errorDetails = `Error: ${error.title}
Message: ${error.message}
Timestamp: ${error.timestamp}
Component: ${error.component || 'Unknown'}
ID: ${error.id}`
      
      await navigator.clipboard.writeText(errorDetails)
      toast({
        title: "Copied!",
        description: "Error details copied to clipboard",
      })
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleViewDetails = (error: any) => {
    setSelectedError(error)
    setShowErrorDialog(true)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Error History</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {errorHistory.length} total
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                disabled={errorHistory.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Error List */}
          <ScrollArea className="h-96 w-full">
            {filteredErrors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {errorHistory.length === 0 ? "No errors recorded" : "No errors match your search"}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredErrors.map((error) => (
                  <div
                    key={error.id}
                    className={`border rounded-lg p-3 space-y-2 ${
                      error.dismissed ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-destructive">
                          {error.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(error.timestamp).toLocaleString()}
                          </div>
                          {error.component && (
                            <Badge variant="secondary" className="text-xs">
                              {error.component}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyError(error)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(error)}
                          className="h-7 w-7 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-xs font-mono text-muted-foreground break-words">
                      {error.message.length > 150 
                        ? `${error.message.slice(0, 150)}...` 
                        : error.message
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        error={selectedError}
      />
    </>
  )
}