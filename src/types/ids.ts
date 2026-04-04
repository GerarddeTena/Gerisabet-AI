declare const __brand: unique symbol

type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type SessionId = Brand<string, 'SessionId'>
export type MessageId = Brand<string, 'MessageId'>
export type TaskId = Brand<string, 'TaskId'>
export type ToolUseId = Brand<string, 'ToolUseId'>
export type AgentId = Brand<string, 'AgentId'>
export type CommandId = Brand<string, 'CommandId'>

export function asSessionId(id: string): SessionId {
  return id as SessionId
}

export function asMessageId(id: string): MessageId {
  return id as MessageId
}

export function asTaskId(id: string): TaskId {
  return id as TaskId
}

export function asToolUseId(id: string): ToolUseId {
  return id as ToolUseId
}

export function asAgentId(id: string): AgentId {
  return id as AgentId
}

export function asCommandId(id: string): CommandId {
  return id as CommandId
}
