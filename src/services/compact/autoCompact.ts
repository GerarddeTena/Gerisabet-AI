import type { ChatMessage } from '@/types'
import { shouldCompact, compactMessages } from './compact'

let isAutoCompacting = false

export async function runAutoCompact(
  messages: ChatMessage[],
  model: string,
  onCompacted?: (messages: ChatMessage[]) => void
): Promise<ChatMessage[]> {
  if (isAutoCompacting) return messages

  const needsCompact = await shouldCompact(messages)
  if (!needsCompact) return messages

  isAutoCompacting = true

  try {
    const result = await compactMessages(messages, model)

    if (result.compacted && onCompacted) {
      onCompacted(result.compactedMessages)
    }

    return result.compacted ? result.compactedMessages : messages
  } finally {
    isAutoCompacting = false
  }
}

export function isAutoCompactRunning(): boolean {
  return isAutoCompacting
}
