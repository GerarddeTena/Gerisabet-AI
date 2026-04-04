import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'

interface OverlayContextValue {
  isOpen: boolean
  content: ReactNode | null
  open: (content: ReactNode) => void
  close: () => void
  toggle: (content: ReactNode) => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<ReactNode | null>(null)

  const open = useCallback((node: ReactNode) => {
    setContent(node)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setContent(null)
  }, [])

  const toggle = useCallback(
    (node: ReactNode) => {
      if (isOpen) {
        close()
      } else {
        open(node)
      }
    },
    [isOpen, open, close]
  )

  return (
    <OverlayContext.Provider value={{ isOpen, content, open, close, toggle }}>
      {children}
    </OverlayContext.Provider>
  )
}

export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider')
  return ctx
}
