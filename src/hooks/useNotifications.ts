import { useCallback } from 'react'
import { useNotifications as useNotificationsContext } from '../context/notifications'

export function useNotifications() {
  const { notifications, notify, dismiss, clearAll } = useNotificationsContext()

  const notifyInfo = useCallback(
    (message: string, _duration?: number) => notify(message, 'info'),
    [notify]
  )

  const notifySuccess = useCallback(
    (message: string, _duration?: number) => notify(message, 'success'),
    [notify]
  )

  const notifyError = useCallback(
    (message: string, _duration?: number) => notify(message, 'error'),
    [notify]
  )

  const notifyWarning = useCallback(
    (message: string, _duration?: number) => notify(message, 'warning'),
    [notify]
  )

  return {
    notifications,
    notify,
    notifyInfo,
    notifySuccess,
    notifyError,
    notifyWarning,
    dismiss,
    clearAll,
  }
}
