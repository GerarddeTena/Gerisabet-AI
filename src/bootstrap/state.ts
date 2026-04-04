import { generateUUID } from '../utils/uuid'
import type { SessionId, AgentId } from '../types/ids'
import { asSessionId } from '../types/ids'

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

interface ModelUsage extends TokenUsage {
  requestCount: number
}

interface BootstrapState {
  sessionId: SessionId
  isInteractive: boolean
  modelUsage: Record<string, ModelUsage>
  totalInputTokens: number
  totalOutputTokens: number
  activeAgentId: AgentId | null
  startedAt: number
  firstTurnAt: number | null
  outputTokensAtTurnStart: number
}

const state: BootstrapState = {
  sessionId: asSessionId(generateUUID()),
  isInteractive: true,
  modelUsage: {},
  totalInputTokens: 0,
  totalOutputTokens: 0,
  activeAgentId: null,
  startedAt: Date.now(),
  firstTurnAt: null,
  outputTokensAtTurnStart: 0,
}

export function getSessionId(): SessionId {
  return state.sessionId
}

export function switchSession(newSessionId: SessionId): void {
  state.sessionId = newSessionId
  state.modelUsage = {}
  state.totalInputTokens = 0
  state.totalOutputTokens = 0
  state.firstTurnAt = null
  state.outputTokensAtTurnStart = 0
}

export function getIsNonInteractiveSession(): boolean {
  return !state.isInteractive
}

export function setIsInteractive(value: boolean): void {
  state.isInteractive = value
}

export function getActiveAgentId(): AgentId | null {
  return state.activeAgentId
}

export function setActiveAgentId(id: AgentId | null): void {
  state.activeAgentId = id
}

export function addTokenUsage(
  model: string,
  usage: TokenUsage
): void {
  const existing = state.modelUsage[model] ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    requestCount: 0,
  }

  state.modelUsage[model] = {
    inputTokens: existing.inputTokens + usage.inputTokens,
    outputTokens: existing.outputTokens + usage.outputTokens,
    cacheReadTokens: existing.cacheReadTokens + usage.cacheReadTokens,
    cacheWriteTokens: existing.cacheWriteTokens + usage.cacheWriteTokens,
    requestCount: existing.requestCount + 1,
  }

  state.totalInputTokens += usage.inputTokens
  state.totalOutputTokens += usage.outputTokens
}

export function getModelUsage(): Record<string, ModelUsage> {
  return { ...state.modelUsage }
}

export function getTotalInputTokens(): number {
  return state.totalInputTokens
}

export function getTotalOutputTokens(): number {
  return state.totalOutputTokens
}

export function getStartTime(): number {
  return state.startedAt
}

export function recordFirstTurn(): void {
  if (state.firstTurnAt === null) {
    state.firstTurnAt = Date.now()
  }
}

export function snapshotOutputTokensForTurn(): void {
  state.outputTokensAtTurnStart = state.totalOutputTokens
}

export function getCurrentTurnTokenBudget(): number {
  return state.totalOutputTokens - state.outputTokensAtTurnStart
}

export function resetState(): void {
  const newId = asSessionId(generateUUID())
  switchSession(newId)
  state.startedAt = Date.now()
}
