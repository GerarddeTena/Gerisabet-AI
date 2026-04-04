import { getAppState, recordTokenUsage } from './state/AppStateStore'
import { addTokenUsage } from './bootstrap/state'

export interface TokenUsageEntry {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  timestamp: number
}

const usageLog: TokenUsageEntry[] = []

export function trackTokenUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0
): void {
  const entry: TokenUsageEntry = {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    timestamp: Date.now(),
  }
  usageLog.push(entry)

  recordTokenUsage(inputTokens, outputTokens)
  addTokenUsage(model, {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  })
}

export function getTotalInputTokens(): number {
  return usageLog.reduce((acc, e) => acc + e.inputTokens, 0)
}

export function getTotalOutputTokens(): number {
  return usageLog.reduce((acc, e) => acc + e.outputTokens, 0)
}

export function getTotalTokens(): number {
  return getTotalInputTokens() + getTotalOutputTokens()
}

export function getTokensByModel(): Record<
  string,
  { input: number; output: number; requests: number }
> {
  const result: Record<
    string,
    { input: number; output: number; requests: number }
  > = {}

  for (const entry of usageLog) {
    if (!result[entry.model]) {
      result[entry.model] = { input: 0, output: 0, requests: 0 }
    }
    result[entry.model].input += entry.inputTokens
    result[entry.model].output += entry.outputTokens
    result[entry.model].requests++
  }

  return result
}

export function formatTokenSummary(): string {
  const totalIn = getTotalInputTokens()
  const totalOut = getTotalOutputTokens()
  const byModel = getTokensByModel()

  const modelLines = Object.entries(byModel)
    .map(
      ([model, usage]) =>
        `  ${model}: ${usage.input.toLocaleString()} in / ${usage.output.toLocaleString()} out (${usage.requests} req)`
    )
    .join('\n')

  return [
    `Total input tokens:  ${totalIn.toLocaleString()}`,
    `Total output tokens: ${totalOut.toLocaleString()}`,
    '',
    'Usage by model:',
    modelLines || '  (none)',
  ].join('\n')
}

export function resetTokenTracker(): void {
  usageLog.length = 0
}

export function getUsageLog(): TokenUsageEntry[] {
  return [...usageLog]
}

export function getSessionDurationMs(): number {
  const state = getAppState()
  return Date.now() - state.stats.sessionStartedAt
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}m ${remaining}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}
