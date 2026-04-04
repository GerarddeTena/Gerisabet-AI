import type { ChatMessage } from '@/types'
import type { ContentBlock, TextBlock } from '@/types'

export function getLastUserMessage(
  messages: ChatMessage[]
): ChatMessage | undefined {
  return [...messages].reverse().find((m) => m.role === 'user')
}

export function getLastAssistantMessage(
  messages: ChatMessage[]
): ChatMessage | undefined {
  return [...messages].reverse().find((m) => m.role === 'assistant')
}

export function truncateMessages(
  messages: ChatMessage[],
  maxCount: number
): ChatMessage[] {
  if (messages.length <= maxCount) return messages
  return messages.slice(messages.length - maxCount)
}

export function messagesToString(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'GERISABET'}: ${m.content}`)
    .join('\n')
}

export function estimateMessageTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

export function estimateHistoryTokens(messages: ChatMessage[]): number {
  return messages.reduce(
    (acc, m) => acc + estimateMessageTokens(m.content),
    0
  )
}

export function formatRole(role: ChatMessage['role']): string {
  switch (role) {
    case 'user':
      return 'User'
    case 'assistant':
      return 'GERISABET'
    case 'system':
      return 'System'
    default:
      return role
  }
}

export function createTextContent(text: string): TextBlock {
  return { type: 'text', text }
}

export function extractTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
