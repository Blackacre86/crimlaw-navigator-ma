import { useState, useCallback } from "react"
import { toast } from "@/hooks/use-toast"
import { ErrorDetails } from "@/components/ui/error-dialog"

interface ErrorHistoryItem extends ErrorDetails {
  dismissed: boolean
}

interface UseErrorHandlingReturn {
  showError: (error: Partial<ErrorDetails>) => void
  errorHistory: ErrorHistoryItem[]
  clearHistory: () => void
  selectedError: ErrorDetails | null
  setSelectedError: (error: ErrorDetails | null) => void
  dismissError: (id: string) => void
}

const ERROR_STORAGE_KEY = "legal-app-error-history"
const MAX_HISTORY_SIZE = 50

export function useErrorHandling(): UseErrorHandlingReturn {
  const [errorHistory, setErrorHistory] = useState<ErrorHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null)

  const saveToStorage = useCallback((history: ErrorHistoryItem[]) => {
    try {
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(history))
    } catch (err) {
      console.warn("Failed to save error history:", err)
    }
  }, [])

  const showError = useCallback((errorData: Partial<ErrorDetails>) => {
    const error: ErrorDetails = {
      id: crypto.randomUUID(),
      title: errorData.title || "An error occurred",
      message: errorData.message || "Unknown error",
      timestamp: errorData.timestamp || new Date(),
      component: errorData.component,
      action: errorData.action,
      metadata: errorData.metadata,
    }

    // Add to history
    const newHistoryItem: ErrorHistoryItem = {
      ...error,
      dismissed: false,
    }

    setErrorHistory(prev => {
      const updated = [newHistoryItem, ...prev].slice(0, MAX_HISTORY_SIZE)
      saveToStorage(updated)
      return updated
    })

    // Show persistent toast with simplified description
    const errorMessage = error.message.length > 100 
      ? `${error.message.slice(0, 100)}...` 
      : error.message

    const { dismiss } = toast({
      title: error.title,
      description: errorMessage,
      variant: "destructive",
      // Make it persistent by not setting duration
    })

    return error.id
  }, [saveToStorage])

  const dismissError = useCallback((id: string) => {
    setErrorHistory(prev => {
      const updated = prev.map(error =>
        error.id === id ? { ...error, dismissed: true } : error
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  const clearHistory = useCallback(() => {
    setErrorHistory([])
    try {
      localStorage.removeItem(ERROR_STORAGE_KEY)
    } catch (err) {
      console.warn("Failed to clear error history:", err)
    }
  }, [])

  return {
    showError,
    errorHistory,
    clearHistory,
    selectedError,
    setSelectedError,
    dismissError,
  }
}