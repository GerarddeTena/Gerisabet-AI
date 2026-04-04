export type {
  TaskType,
  TaskStatus,
  TaskContext,
  TaskStateBase,
  TaskHandle,
} from './types/task'

export {
  isTerminalTaskStatus,
  generateTaskId,
  createTaskHandle,
} from './types/task'

import type { TaskHandle } from './types/task'
import { isTerminalTaskStatus } from './types/task'

const ACTIVE_TASKS = new Map<string, TaskHandle>()

export function registerTask(task: TaskHandle): void {
  ACTIVE_TASKS.set(task.taskId, task)
}

export function unregisterTask(taskId: string): void {
  ACTIVE_TASKS.delete(taskId)
}

export function getActiveTasks(): TaskHandle[] {
  return [...ACTIVE_TASKS.values()].filter(
    (t) => !isTerminalTaskStatus(t.status)
  )
}

export function getAllTasks(): TaskHandle[] {
  return [...ACTIVE_TASKS.values()]
}

export function getTaskById(taskId: string): TaskHandle | undefined {
  return ACTIVE_TASKS.get(taskId)
}

export function updateTaskStatus(
  taskId: string,
  status: TaskHandle['status']
): void {
  const task = ACTIVE_TASKS.get(taskId)
  if (!task) return
  ACTIVE_TASKS.set(taskId, {
    ...task,
    status,
    updatedAt: Date.now(),
  })
}
