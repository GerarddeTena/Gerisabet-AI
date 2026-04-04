import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react'

interface QueuedMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
}

interface QueuedMessageContextValue {
  queue: QueuedMessage[]
  enqueue: (content: string, role?: 'user' | 'assistant') => void
  dequeue: () => QueuedMessage | null
  flush: () => QueuedMessage[]
  clearQueue: () => void
  hasMessages: boolean
}

const QueuedMessageContext =
  createContext<QueuedMessageContextValue | null>(null)

export function QueuedMessageProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const counterRef = useRef(0)

  const enqueue = useCallback(
    (content: string, role: 'user' | 'assistant' = 'user') => {
      const msg: QueuedMessage = {
        id: `qm-${++counterRef.current}`,
        content,
        role,
        timestamp: Date.now(),
      }
      setQueue((prev) => [...prev, msg])
    },
    []
  )

  const dequeue = useCallback((): QueuedMessage | null => {
    let result: QueuedMessage | null = null
    setQueue((prev) => {
      if (prev.length === 0) return prev
      result = prev[0]
      return prev.slice(1)
    })
    return result
  }, [])

  const flush = useCallback((): QueuedMessage[] => {
    let flushed: QueuedMessage[] = []
    setQueue((prev) => {
      flushed = prev
      return []
    })
    return flushed
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  return (
    <QueuedMessageContext.Provider
      value={{
        queue,
        enqueue,
        dequeue,
        flush,
        clearQueue,
        hasMessages: queue.length > 0,
      }}
    >
      {children}
    </QueuedMessageContext.Provider>
  )
}

export function useQueuedMessages(): QueuedMessageContextValue {
  const ctx = useContext(QueuedMessageContext)
  if (!ctx)
    throw new Error(
      'useQueuedMessages must be used within QueuedMessageProvider'
    )
  return ctx
}
