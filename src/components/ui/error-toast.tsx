import * as React from "react"
import { Copy, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface ErrorToastProps {
  id: string
  title?: string
  message: string
  onDismiss: () => void
  onViewDetails?: () => void
  timestamp?: Date
  className?: string
}

export function ErrorToast({
  id,
  title = "Error",
  message,
  onDismiss,
  onViewDetails,
  timestamp = new Date(),
  className,
}: ErrorToastProps) {
  const handleCopy = async () => {
    try {
      const errorDetails = `Error: ${title}
Message: ${message}
Timestamp: ${timestamp.toISOString()}
ID: ${id}`
      
      await navigator.clipboard.writeText(errorDetails)
      toast({
        title: "Copied!",
        description: "Error details copied to clipboard",
        variant: "default",
      })
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const truncatedMessage = message.length > 150 ? `${message.slice(0, 150)}...` : message

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full flex-col space-y-3 overflow-hidden rounded-lg border border-destructive bg-destructive/5 p-4 shadow-lg transition-all",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
        "data-[state=open]:slide-in-from-top-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-destructive mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Message */}
      <div className="min-w-0">
        <p className="text-sm text-foreground break-words font-mono leading-relaxed">
          {truncatedMessage}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-3 text-xs"
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        {onViewDetails && message.length > 150 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="h-8 px-3 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Details
          </Button>
        )}
      </div>
    </div>
  )
}