import type { MessageId, ToolUseId } from './ids'

export type Role = 'user' | 'assistant' | 'system'

export type TextBlock = {
  type: 'text'
  text: string
}

export type ImageBlock = {
  type: 'image'
  data: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export type ToolUseBlock = {
  type: 'tool_use'
  id: ToolUseId
  name: string
  input: Record<string, unknown>
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: ToolUseId
  content: ContentBlock[]
  is_error?: boolean
}

export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock

export interface MessageMetadata {
  model?: string
  generation_ms?: number
  tokens?: number
  input_tokens?: number
  output_tokens?: number
  cache_read_tokens?: number
  cache_write_tokens?: number
}

export interface UserMessage {
  type: 'user'
  id: MessageId
  session_id?: string
  content: ContentBlock[]
  timestamp: string
  metadata?: MessageMetadata
}

export interface AssistantMessage {
  type: 'assistant'
  id: MessageId
  session_id?: string
  content: ContentBlock[]
  timestamp: string
  metadata?: MessageMetadata
}

export interface SystemMessage {
  type: 'system'
  id: MessageId
  content: string
  timestamp: string
}

export interface ToolUseMessage {
  type: 'tool_use'
  id: MessageId
  toolUseId: ToolUseId
  toolName: string
  input: Record<string, unknown>
  timestamp: string
}

export interface ToolResultMessage {
  type: 'tool_result'
  id: MessageId
  toolUseId: ToolUseId
  content: ContentBlock[]
  isError: boolean
  timestamp: string
}

export interface ErrorMessage {
  type: 'error'
  id: MessageId
  error: string
  timestamp: string
}

export interface TombstoneMessage {
  type: 'tombstone'
  id: MessageId
  reason: string
  timestamp: string
}

export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolUseMessage
  | ToolResultMessage
  | ErrorMessage
  | TombstoneMessage

export interface ChatMessage {
  id: string
  session_id?: string
  role: Role
  content: string
  timestamp?: string
  metadata?: MessageMetadata
}

export function isUserMessage(msg: Message): msg is UserMessage {
  return msg.type === 'user'
}

export function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.type === 'assistant'
}

export function isErrorMessage(msg: Message): msg is ErrorMessage {
  return msg.type === 'error'
}

export function isToolUseMessage(msg: Message): msg is ToolUseMessage {
  return msg.type === 'tool_use'
}

export function getTextContent(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

export function chatMessageToMessage(msg: ChatMessage): UserMessage | AssistantMessage {
  const base = {
    id: msg.id as MessageId,
    session_id: msg.session_id,
    timestamp: msg.timestamp ?? new Date().toISOString(),
    metadata: msg.metadata,
    content: [{ type: 'text' as const, text: msg.content }],
  }
  if (msg.role === 'user') {
    return { ...base, type: 'user' }
  }
  return { ...base, type: 'assistant' }
}
