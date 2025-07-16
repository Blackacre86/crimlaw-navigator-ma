import React, { createContext, useContext } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationSystem } from '@/components/ui/notification-system'
import type { Notification } from '@/components/ui/notification-system'

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => { id: string; dismiss: () => void; update: (updates: Partial<Notification>) => void }
  dismissNotification: (id: string) => void
  dismissAll: () => void
  success: (title: string, message?: string, options?: Partial<Notification>) => void
  error: (title: string, message?: string, options?: Partial<Notification>) => void
  warning: (title: string, message?: string, options?: Partial<Notification>) => void
  info: (title: string, message?: string, options?: Partial<Notification>) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notificationManager = useNotifications()

  return (
    <NotificationContext.Provider value={notificationManager}>
      {children}
      <NotificationSystem
        notifications={notificationManager.notifications}
        onDismiss={notificationManager.dismissNotification}
        onDismissAll={notificationManager.dismissAll}
        onCopy={notificationManager.copyToClipboard}
      />
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

// Export convenience hook that works like the old useToast but with better UX
export function useToast() {
  const { success, error, warning, info } = useNotificationContext()
  
  return {
    toast: ({ title, description, variant, ...options }: {
      title?: string
      description?: string
      variant?: 'default' | 'destructive' | 'success'
      [key: string]: any
    }) => {
      const message = description
      
      switch (variant) {
        case 'destructive':
          return error(title || 'Error', message, options)
        case 'success':
          return success(title || 'Success', message, options)
        default:
          return info(title || 'Info', message, options)
      }
    },
    success,
    error, 
    warning,
    info
  }
}