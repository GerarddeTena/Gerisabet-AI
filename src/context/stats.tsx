import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import type { Stats } from '../state/AppStateStore'

interface StatsContextValue {
  stats: Stats
  updateStats: (updates: Partial<Stats>) => void
  resetStats: () => void
}

const DEFAULT_STATS: Stats = {
  totalTokensIn: 0,
  totalTokensOut: 0,
  requestCount: 0,
  sessionStartedAt: Date.now(),
}

const StatsContext = createContext<StatsContextValue | null>(null)

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)

  const updateStats = useCallback((updates: Partial<Stats>) => {
    setStats((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetStats = useCallback(() => {
    setStats({ ...DEFAULT_STATS, sessionStartedAt: Date.now() })
  }, [])

  return (
    <StatsContext.Provider value={{ stats, updateStats, resetStats }}>
      {children}
    </StatsContext.Provider>
  )
}

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext)
  if (!ctx) throw new Error('useStats must be used within StatsProvider')
  return ctx
}
