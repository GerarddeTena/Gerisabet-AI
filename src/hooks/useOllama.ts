import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { OllamaModelInfo } from '../types/orchestrator'
import { setAppState } from '../state/AppStateStore'

/**
 * Fetches available Ollama models via the Tauri `get_available_models` command
 * and stores them in AppStateStore.availableModels.
 * Call once at app bootstrap inside a component tree.
 */
export function useOllama() {
  useEffect(() => {
    invoke<OllamaModelInfo[]>('get_available_models')
      .then((models) => {
        const names = models.map((m) => m.name)
        setAppState((prev) => ({
          ...prev,
          availableModels: names.length > 0 ? names : prev.availableModels,
          ollamaModelInfos: models,
        }))
      })
      .catch(() => {
        // Ollama not running — keep hardcoded defaults
      })
  }, [])
}
