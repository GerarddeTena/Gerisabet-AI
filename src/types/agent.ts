import type { AgentId } from './ids'

export type AgentRole = 'main' | 'subagent' | 'coordinator'

export interface AgentDefinition {
  id: AgentId
  name: string
  role: AgentRole
  model?: string
  systemPrompt?: string
  color?: string
  description?: string
  allowedTools?: string[]
}

export interface AgentState {
  agents: AgentDefinition[]
  activeAgentId: AgentId | null
}

export function createMainAgent(model: string): AgentDefinition {
  return {
    id: 'main' as AgentId,
    name: 'GERISABET',
    role: 'main',
    model,
  }
}
