import { createStore } from './Store'
import type { GerisabetSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'
import type { TaskHandle } from '../types/task'
import type { AgentDefinition } from '../types/agent'
import type { SessionId } from '../types/ids'
import type { OrchestratorConfig, ReasoningStep, SystemInfo, OllamaModelInfo } from '../types/orchestrator'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: number
  dismissed?: boolean
}

export interface Stats {
  totalTokensIn: number
  totalTokensOut: number
  requestCount: number
  sessionStartedAt: number
}

export interface AppState {
  settings: GerisabetSettings
  activeSessionId: SessionId | null
  tasks: TaskHandle[]
  agents: AgentDefinition[]
  notifications: Notification[]
  stats: Stats
  isIndexing: boolean
  indexingProgress: number
  availableModels: string[]
  ollamaModelInfos: OllamaModelInfo[]
  systemInfo: SystemInfo | null
  orchestratorConfig: OrchestratorConfig
  reasoningSteps: ReasoningStep[]
  isThinking: boolean
  pendingPermissions: PendingPermissionEntry[]
  overlayOpen: boolean
  modalStack: ModalEntry[]
  commandHistoryQuery: string
  isSlashMenuOpen: boolean
}

export interface PendingPermissionEntry {
  id: string
  toolName: string
  input: Record<string, unknown>
  resolve: (allow: boolean) => void
}

export interface ModalEntry {
  id: string
  type: string
  props?: Record<string, unknown>
}

const initialState: AppState = {
  settings: DEFAULT_SETTINGS,
  activeSessionId: null,
  tasks: [],
  agents: [],
  notifications: [],
  stats: {
    totalTokensIn: 0,
    totalTokensOut: 0,
    requestCount: 0,
    sessionStartedAt: Date.now(),
  },
  isIndexing: false,
  indexingProgress: 0,
  availableModels: ['qwen2.5-coder:3b', 'llama3.2:3b', 'mistral:7b'],
  ollamaModelInfos: [],
  systemInfo: null,
  orchestratorConfig: { sub_orchestrators: [], enable_reasoning: false },
  reasoningSteps: [],
  isThinking: false,
  pendingPermissions: [],
  overlayOpen: false,
  modalStack: [],
  commandHistoryQuery: '',
  isSlashMenuOpen: false,
}

export const appStore = createStore<AppState>(initialState)

export function getAppState(): AppState {
  return appStore.getState()
}

export function setAppState(updater: (prev: AppState) => AppState): void {
  appStore.setState(updater)
}

export function onChangeAppState<S>(
  selector: (state: AppState) => S,
  listener: (value: S) => void
): () => void {
  return appStore.subscribe(selector, listener)
}

export function updateSettings(
  updates: Partial<GerisabetSettings>
): void {
  setAppState((prev) => ({
    ...prev,
    settings: { ...prev.settings, ...updates },
  }))
}

export function addNotification(
  notification: Omit<Notification, 'id' | 'timestamp'>
): void {
  const entry: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  }
  setAppState((prev) => ({
    ...prev,
    notifications: [...prev.notifications.slice(-49), entry],
  }))
}

export function dismissNotification(id: string): void {
  setAppState((prev) => ({
    ...prev,
    notifications: prev.notifications.map((n) =>
      n.id === id ? { ...n, dismissed: true } : n
    ),
  }))
}

export function addTask(task: TaskHandle): void {
  setAppState((prev) => ({
    ...prev,
    tasks: [...prev.tasks, task],
  }))
}

export function updateTask(
  taskId: string,
  updates: Partial<TaskHandle>
): void {
  setAppState((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.taskId === taskId ? { ...t, ...updates } : t
    ),
  }))
}

export function recordTokenUsage(
  inputTokens: number,
  outputTokens: number
): void {
  setAppState((prev) => ({
    ...prev,
    stats: {
      ...prev.stats,
      totalTokensIn: prev.stats.totalTokensIn + inputTokens,
      totalTokensOut: prev.stats.totalTokensOut + outputTokens,
      requestCount: prev.stats.requestCount + 1,
    },
  }))
}
