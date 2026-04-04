import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import type { Notification } from '../state/AppStateStore'
import { addNotification, dismissNotification } from '../state/AppStateStore'

interface NotificationsContextValue {
  notifications: Notification[]
  notify: (message: string, type?: Notification['type'], duration?: number) => void
  dismiss: (id: string) => void
  clearAll: () => void
}

const NotificationsContext =
  createContext<NotificationsContextValue | null>(null)

export { NotificationsContext }

export function NotificationsProvider({
  children,
  externalNotifications,
}: {
  children: ReactNode
  externalNotifications?: Notification[]
}) {
  const [local, setLocal] = useState<Notification[]>([])

  const notifications = externalNotifications ?? local

  const notify = useCallback(
    (message: string, type: Notification['type'] = 'info') => {
      if (externalNotifications !== undefined) {
        addNotification({ message, type })
      } else {
        const entry: Notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          message,
          type,
          timestamp: Date.now(),
        }
        setLocal((prev) => [...prev.slice(-49), entry])
      }
    },
    [externalNotifications]
  )

  const dismiss = useCallback(
    (id: string) => {
      if (externalNotifications !== undefined) {
        dismissNotification(id)
      } else {
        setLocal((prev) =>
          prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
        )
      }
    },
    [externalNotifications]
  )

  const clearAll = useCallback(() => {
    if (externalNotifications !== undefined) {
      setLocal([])
    } else {
      setLocal([])
    }
  }, [externalNotifications])

  return (
    <NotificationsContext.Provider
      value={{ notifications, notify, dismiss, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx)
    throw new Error(
      'useNotifications must be used within NotificationsProvider'
    )
  return ctx
}
