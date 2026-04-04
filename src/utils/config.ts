import type { GerisabetSettings } from '../types/settings'
import { DEFAULT_SETTINGS, validateSettings } from '../types/settings'
import { setAppState } from '../state/AppStateStore'
import { logError } from './log'

const STORAGE_KEY = 'gerisabet.config'

export interface GerisabetConfig {
  settings: GerisabetSettings
  version: string
}

const CONFIG_VERSION = '1.0'

export function loadConfig(): GerisabetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultConfig()
    const parsed = JSON.parse(raw) as Partial<GerisabetConfig>
    return {
      version: parsed.version ?? CONFIG_VERSION,
      settings: validateSettings(parsed.settings ?? {}),
    }
  } catch (err) {
    logError(err, 'loadConfig')
    return createDefaultConfig()
  }
}

export function saveConfig(config: GerisabetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (err) {
    logError(err, 'saveConfig')
  }
}

function createDefaultConfig(): GerisabetConfig {
  return {
    settings: { ...DEFAULT_SETTINGS },
    version: CONFIG_VERSION,
  }
}

export function updateConfigSettings(
  updates: Partial<GerisabetSettings>
): void {
  const current = loadConfig()
  const updated: GerisabetConfig = {
    ...current,
    settings: { ...current.settings, ...updates },
  }
  saveConfig(updated)
  setAppState((prev) => ({
    ...prev,
    settings: updated.settings,
  }))
}

export function resetConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
  setAppState((prev) => ({
    ...prev,
    settings: { ...DEFAULT_SETTINGS },
  }))
}

export function initConfig(): void {
  const config = loadConfig()
  setAppState((prev) => ({
    ...prev,
    settings: config.settings,
  }))
}
