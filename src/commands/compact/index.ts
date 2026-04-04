import type { LocalCommand } from '@/types'
import { compactMessages, shouldCompact } from '@/services/compact/compact.ts';

const compactCommand: LocalCommand = {
  name: 'compact',
  type: 'local',
  description: 'Compact conversation history to free up context space',
  async execute(_args, context) {
    const history = context.chatHistory ?? []

    if (history.length === 0) {
      return { type: 'text', content: 'No conversation history to compact.' }
    }

    const needsCompact = await shouldCompact(history)
    if (!needsCompact) {
      return { type: 'text', content: 'Context is within limits — no compaction needed.' }
    }

    const result = await compactMessages(history, context.model)
    if (!result.compacted) {
      return { type: 'text', content: 'Compaction failed. Try again later.' }
    }

    const reclaimed = result.tokensReclaimed ?? 0
    return {
      type: 'markdown',
      content: `## Context Compacted\n\nFreed ~${reclaimed.toLocaleString()} tokens.\nConversation summarised and history trimmed.`,
    }
  },
}

export default compactCommand
