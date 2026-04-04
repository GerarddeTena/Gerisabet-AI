import type { GerisabetSettings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'
import { updateConfigSettings, loadConfig } from '../config'
import { logError } from '../log'

export function getSettings(): GerisabetSettings {
  try {
    const config = loadConfig()
    return config.settings
  } catch (err) {
    logError(err, 'getSettings')
    return { ...DEFAULT_SETTINGS }
  }
}

export function getSetting<K extends keyof GerisabetSettings>(
  key: K
): GerisabetSettings[K] {
  return getSettings()[key]
}

export function setSetting<K extends keyof GerisabetSettings>(
  key: K,
  value: GerisabetSettings[K]
): void {
  updateConfigSettings({ [key]: value } as Partial<GerisabetSettings>)
}

export function updateSettings(updates: Partial<GerisabetSettings>): void {
  updateConfigSettings(updates)
}

export function resetSettings(): void {
  updateConfigSettings({ ...DEFAULT_SETTINGS })
}
