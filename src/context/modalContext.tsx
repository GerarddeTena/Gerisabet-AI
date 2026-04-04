import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ModalConfig {
  id: string
  type: string
  props?: Record<string, unknown>
  onClose?: () => void
}

interface ModalContextValue {
  stack: ModalConfig[]
  push: (config: Omit<ModalConfig, 'id'>) => string
  pop: () => void
  close: (id: string) => void
  isOpen: boolean
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalConfig[]>([])

  const push = useCallback((config: Omit<ModalConfig, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setStack((prev) => [...prev, { ...config, id }])
    return id
  }, [])

  const pop = useCallback(() => {
    setStack((prev) => {
      const last = prev[prev.length - 1]
      last?.onClose?.()
      return prev.slice(0, -1)
    })
  }, [])

  const close = useCallback((id: string) => {
    setStack((prev) => {
      const modal = prev.find((m) => m.id === id)
      modal?.onClose?.()
      return prev.filter((m) => m.id !== id)
    })
  }, [])

  return (
    <ModalContext.Provider
      value={{ stack, push, pop, close, isOpen: stack.length > 0 }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
