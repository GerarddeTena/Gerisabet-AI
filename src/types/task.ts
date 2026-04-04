import type { TaskId } from './ids'

export type TaskType =
  | 'query'
  | 'indexing-library'
  | 'indexing-skills'
  | 'search'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TaskContext {
  sessionId: string
  signal: AbortSignal
}

export interface TaskStateBase<T = unknown> {
  id: TaskId
  type: TaskType
  status: TaskStatus
  createdAt: number
  updatedAt: number
  context: TaskContext
  state: T
  error?: string
}

export interface TaskHandle {
  taskId: TaskId
  type: TaskType
  status: TaskStatus
  createdAt: number
  updatedAt: number
  label?: string
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export function generateTaskId(): TaskId {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2)}` as TaskId
}

export function createTaskHandle(
  type: TaskType,
  label?: string
): TaskHandle {
  const now = Date.now()
  return {
    taskId: generateTaskId(),
    type,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    label,
  }
}
