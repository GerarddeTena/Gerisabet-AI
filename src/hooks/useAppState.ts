import { useState, useEffect } from 'react'
import { getAppState, onChangeAppState, type AppState } from '../state/AppStateStore'

export function useAppState(): AppState {
  const [state, setState] = useState<AppState>(getAppState)

  useEffect(() => {
    const identity = (s: AppState) => s
    const unsubscribe = onChangeAppState(identity, setState)
    return unsubscribe
  }, [])

  return state
}

export function useAppStateSelector<T>(
  selector: (state: AppState) => T
): T {
  const [value, setValue] = useState<T>(() => selector(getAppState()))

  useEffect(() => {
    const unsubscribe = onChangeAppState(selector, setValue)
    return unsubscribe
  }, [selector])

  return value
}
