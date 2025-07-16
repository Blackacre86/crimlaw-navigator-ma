import * as React from "react"
import { useState, useEffect } from "react"
import { X, Check, AlertTriangle, Info, Copy, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
  autoHide?: boolean
  duration?: number
  details?: string
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
  onCopy?: (text: string) => void
}

const NotificationItem = ({ notification, onDismiss, onCopy }: NotificationItemProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const typeStyles = {
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
    error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
  }

  const iconStyles = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400", 
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-blue-600 dark:text-blue-400"
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <Check className="h-4 w-4" />
      case 'error':
        return <X className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
    }
  }

  const handleCopyDetails = () => {
    const text = `${notification.title}\n${notification.message || ''}\n${notification.details || ''}`
    onCopy?.(text)
  }

  const truncatedMessage = notification.message && notification.message.length > 80 
    ? `${notification.message.slice(0, 80)}...` 
    : notification.message

  return (
    <div
      className={cn(
        "relative w-80 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out",
        typeStyles[notification.type],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("mt-0.5", iconStyles[notification.type])}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
            {notification.message && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isExpanded ? notification.message : truncatedMessage}
                </p>
                {notification.message.length > 80 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(notification.id)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Actions */}
      {(notification.action || notification.details) && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
          {notification.details && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDetails}
              className="h-7 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Details
            </Button>
          )}
          {notification.action && (
            <Button
              variant="outline"
              size="sm"
              onClick={notification.action.onClick}
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {notification.action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface NotificationSystemProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onCopy?: (text: string) => void
  maxVisible?: number
}

export const NotificationSystem = ({ 
  notifications, 
  onDismiss, 
  onDismissAll, 
  onCopy,
  maxVisible = 4 
}: NotificationSystemProps) => {
  const visibleNotifications = notifications.slice(0, maxVisible)
  const hiddenCount = Math.max(0, notifications.length - maxVisible)

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {/* Hidden notifications counter */}
      {hiddenCount > 0 && (
        <div className="w-80 rounded-lg border bg-muted p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {hiddenCount} more notification{hiddenCount !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissAll}
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Visible notifications */}
      {visibleNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onCopy={onCopy}
        />
      ))}

      {/* Clear all button for multiple notifications */}
      {notifications.length > 1 && hiddenCount === 0 && (
        <div className="w-80 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismissAll}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All ({notifications.length})
          </Button>
        </div>
      )}
    </div>
  )
}