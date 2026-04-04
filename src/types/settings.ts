export type ThemePreference = 'system' | 'dark' | 'light'

export type EffortLevel = 'quick' | 'balanced' | 'thorough'

export interface GerisabetSettings {
  theme: ThemePreference
  prefersReducedMotion: boolean
  effort: EffortLevel
  defaultModel: string
  maxContextTokens: number
  autoCompact: boolean
  autoCompactThreshold: number
  showTokenUsage: boolean
  saveHistory: boolean
  historyMaxEntries: number
  skillsPath?: string
  libraryPath?: string
}

export const DEFAULT_SETTINGS: GerisabetSettings = {
  theme: 'system',
  prefersReducedMotion: false,
  effort: 'balanced',
  defaultModel: 'qwen2.5-coder:3b',
  maxContextTokens: 8192,
  autoCompact: true,
  autoCompactThreshold: 0.85,
  showTokenUsage: true,
  saveHistory: true,
  historyMaxEntries: 100,
}

export type SettingsKey = keyof GerisabetSettings

export function validateSettings(partial: Partial<GerisabetSettings>): GerisabetSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
  }
}
