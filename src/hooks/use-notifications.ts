import { useState, useCallback } from 'react'
import { Notification } from '@/components/ui/notification-system'

const DEFAULT_DURATION = {
  success: 4000,
  info: 6000, 
  warning: 8000,
  error: 0 // Never auto-hide errors
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID()
    const duration = notification.duration ?? DEFAULT_DURATION[notification.type]
    
    const newNotification: Notification = {
      ...notification,
      id,
      autoHide: notification.autoHide ?? notification.type !== 'error',
      persistent: notification.persistent ?? notification.type === 'error'
    }

    setNotifications(prev => [newNotification, ...prev])

    // Auto-dismiss if not persistent and has duration
    if (newNotification.autoHide && duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }

    return {
      id,
      dismiss: () => dismissNotification(id),
      update: (updates: Partial<Notification>) => updateNotification(id, updates)
    }
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications([])
  }, [])

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
    )
  }, [])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addNotification({
        type: 'success',
        title: 'Copied!',
        message: 'Details copied to clipboard',
        autoHide: true,
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [addNotification])

  // Convenience methods for different notification types
  const success = useCallback((title: string, message?: string, options?: Partial<Notification>) => 
    addNotification({ type: 'success', title, message, ...options }), [addNotification])

  const error = useCallback((title: string, message?: string, options?: Partial<Notification>) => 
    addNotification({ type: 'error', title, message, ...options }), [addNotification])

  const warning = useCallback((title: string, message?: string, options?: Partial<Notification>) => 
    addNotification({ type: 'warning', title, message, ...options }), [addNotification])

  const info = useCallback((title: string, message?: string, options?: Partial<Notification>) => 
    addNotification({ type: 'info', title, message, ...options }), [addNotification])

  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAll,
    updateNotification,
    copyToClipboard,
    success,
    error,
    warning,
    info
  }
}