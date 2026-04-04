import type { ChatMessage, MessageMetadata, Role } from './message'

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: ChatMessage[]
}

export type SessionSummary = Omit<ChatSession, 'messages'> & {
  message_count: number
  last_message_preview?: string
}

export interface UseChatHistoryReturn {
  sessions: ChatSession[]
  activeSession: ChatSession | null
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  selectSession: (sessionId: string) => Promise<void>
  createSession: (title?: string) => Promise<ChatSession>
  deleteSession: (sessionId: string) => Promise<void>
  saveMessage: (
    role: Role,
    content: string,
    metadata?: MessageMetadata
  ) => Promise<ChatMessage | null>
  addOptimisticMessage: (role: Role, partialContent: string) => string
  finalizeMessage: (
    tempId: string,
    finalContent: string,
    metadata?: MessageMetadata
  ) => Promise<void>
  loadMoreMessages: () => Promise<void>
  hasMoreMessages: boolean
}

export function sessionToSummary(session: ChatSession): SessionSummary {
  const last = session.messages[session.messages.length - 1]
  return {
    id: session.id,
    title: session.title,
    created_at: session.created_at,
    updated_at: session.updated_at,
    message_count: session.messages.length,
    last_message_preview: last
      ? last.content.slice(0, 80)
      : undefined,
  }
}
