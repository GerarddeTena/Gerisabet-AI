import { onChangeAppState, setAppState } from './AppStateStore'
import type { AppState } from './AppStateStore'

type SideEffect = (state: AppState) => void

const sideEffects: SideEffect[] = []

export function registerStateEffect(effect: SideEffect): void {
  sideEffects.push(effect)
}

export function initStateChangeHandlers(): () => void {
  return onChangeAppState(
    (state) => state,
    (state) => {
      for (const effect of sideEffects) {
        effect(state)
      }
    }
  )
}

export function persistSettings(): void {
  registerStateEffect((state) => {
    try {
      localStorage.setItem(
        'gerisabet.settings',
        JSON.stringify(state.settings)
      )
    } catch {
    }
  })
}

export function loadPersistedSettings(): void {
  try {
    const raw = localStorage.getItem('gerisabet.settings')
    if (!raw) return
    const parsed = JSON.parse(raw)
    setAppState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...parsed },
    }))
  } catch {
  }
}
