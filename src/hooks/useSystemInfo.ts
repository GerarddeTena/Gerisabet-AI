import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { SystemInfo } from '../types/orchestrator'
import { setAppState } from '../state/AppStateStore'

/**
 * Fetches host hardware info via `scan_system_info` Tauri command
 * and stores the result in AppStateStore.systemInfo.
 * Call once at app bootstrap inside a component tree.
 */
export function useSystemInfo() {
  useEffect(() => {
    invoke<SystemInfo>('scan_system_info')
      .then((info) => {
        setAppState((prev) => ({ ...prev, systemInfo: info }))
      })
      .catch(() => {
        // sysinfo always succeeds; only fails if IPC crashes
      })
  }, [])
}
