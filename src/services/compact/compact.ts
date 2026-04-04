import type { ChatMessage } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { estimateHistoryTokens } from '@utils/messages.ts'
import { logError } from '@utils/log.ts'

export const MAX_CONTEXT_TOKENS = 8000
export const COMPACT_THRESHOLD = 0.8

export interface CompactResult {
  compacted: boolean
  summary?: string
  tokensReclaimed?: number
  originalMessages: ChatMessage[]
  compactedMessages: ChatMessage[]
}

export async function shouldCompact(
  messages: ChatMessage[],
  maxTokens = MAX_CONTEXT_TOKENS
): Promise<boolean> {
  const estimated = estimateHistoryTokens(messages)
  return estimated >= maxTokens * COMPACT_THRESHOLD
}

export async function compactMessages(
  messages: ChatMessage[],
  model: string
): Promise<CompactResult> {
  const originalMessages = [...messages]

  try {
    const summaryQuestion = buildSummaryPrompt(messages)
    const summary = await invoke<string>('ask_gerisabet', {
      question: summaryQuestion,
      model,
    })

    const compactedMessages: ChatMessage[] = [
      {
        id: `compact-${Date.now()}`,
        role: 'system' as const,
        content: `Previous conversation summary:\n\n${summary}`,
      },
    ]

    return {
      compacted: true,
      summary,
      tokensReclaimed:
        estimateHistoryTokens(originalMessages) -
        estimateHistoryTokens(compactedMessages),
      originalMessages,
      compactedMessages,
    }
  } catch (err) {
    logError(err, 'compactMessages')
    return {
      compacted: false,
      originalMessages,
      compactedMessages: originalMessages,
    }
  }
}

function buildSummaryPrompt(messages: ChatMessage[]): string {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map(
      (m) =>
        `${m.role === 'user' ? 'User' : 'GERISABET'}: ${m.content}`
    )
    .join('\n\n')

  return `Please provide a concise summary of the following conversation that preserves the key information, decisions, and context needed to continue the conversation. Keep the summary under 500 words.\n\nConversation:\n${transcript}`
}
