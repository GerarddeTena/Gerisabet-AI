import { useCallback } from 'react'
import type { GerisabetSettings } from '../types/settings'
import { setSetting } from '../utils/settings/settings'
import { useAppStateSelector } from './useAppState'

export function useSetting<K extends keyof GerisabetSettings>(
  key: K
): [GerisabetSettings[K], (value: GerisabetSettings[K]) => void] {
  const value = useAppStateSelector((s) => s.settings[key])

  const update = useCallback(
    (newValue: GerisabetSettings[K]) => {
      setSetting(key, newValue)
    },
    [key]
  )

  return [value, update]
}
