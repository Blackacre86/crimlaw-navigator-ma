import * as React from "react"
import { Copy, Clock, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

export interface ErrorDetails {
  id: string
  title: string
  message: string
  timestamp: Date
  component?: string
  action?: string
  metadata?: Record<string, any>
}

interface ErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: ErrorDetails | null
}

export function ErrorDialog({ open, onOpenChange, error }: ErrorDialogProps) {
  const handleCopyAll = async () => {
    if (!error) return

    try {
      const errorReport = `
ERROR REPORT
============
Title: ${error.title}
Component: ${error.component || 'Unknown'}
Action: ${error.action || 'Unknown'}
Timestamp: ${error.timestamp.toISOString()}
ID: ${error.id}

Message:
${error.message}

Metadata:
${error.metadata ? JSON.stringify(error.metadata, null, 2) : 'None'}
`.trim()

      await navigator.clipboard.writeText(errorReport)
      toast({
        title: "Copied!",
        description: "Complete error report copied to clipboard",
        variant: "default",
      })
    } catch (err) {
      console.error("Failed to copy error report:", err)
    }
  }

  const handleCopyMessage = async () => {
    if (!error) return

    try {
      await navigator.clipboard.writeText(error.message)
      toast({
        title: "Copied!",
        description: "Error message copied to clipboard",
        variant: "default",
      })
    } catch (err) {
      console.error("Failed to copy message:", err)
    }
  }

  if (!error) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle className="text-destructive">{error.title}</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {error.timestamp.toLocaleString()}
            </div>
            <Badge variant="outline" className="text-xs">
              ID: {error.id}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 min-h-0">
          {/* Metadata */}
          {(error.component || error.action) && (
            <div className="flex gap-2">
              {error.component && (
                <Badge variant="secondary">Component: {error.component}</Badge>
              )}
              {error.action && (
                <Badge variant="secondary">Action: {error.action}</Badge>
              )}
            </div>
          )}

          {/* Error Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Error Message</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMessage}
                className="h-7 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-40 w-full rounded-md border p-3">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                {error.message}
              </pre>
            </ScrollArea>
          </div>

          {/* Metadata */}
          {error.metadata && Object.keys(error.metadata).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Additional Information</h4>
              <ScrollArea className="h-32 w-full rounded-md border p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCopyAll}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Full Report
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}