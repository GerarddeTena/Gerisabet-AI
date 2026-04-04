import type { LocalCommand } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { logError } from '@utils/log.ts'

const exportCommand: LocalCommand = {
  name: 'export',
  type: 'local',
  description: 'Export conversation history to a file',
  argumentHint: '[--format markdown|text]',
  async execute(args, context) {
    const format = (args.flags['format'] as string) ?? 'markdown'

    try {
      const history = await invoke<Array<{ role: string; content: string; timestamp: number }>>('load_chat_history', {
        sessionId: context.sessionId,
      })

      if (!history || history.length === 0) {
        return {
          type: 'text',
          content: 'No conversation to export.',
        }
      }

      const content = format === 'markdown'
        ? formatAsMarkdown(history)
        : formatAsText(history)

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gerisabet-conversation-${Date.now()}.${format === 'markdown' ? 'md' : 'txt'}`
      a.click()
      URL.revokeObjectURL(url)

      return {
        type: 'text',
        content: 'Conversation exported.',
      }
    } catch (err) {
      logError(err, 'exportCommand')
      return {
        type: 'text',
        content: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
}

function formatAsMarkdown(
  messages: Array<{ role: string; content: string; timestamp: number }>
): string {
  const parts = ['# GERISABET Conversation Export', '']
  for (const msg of messages) {
    const role = msg.role === 'user' ? '**User**' : '**GERISABET**'
    parts.push(`## ${role}`)
    parts.push(msg.content)
    parts.push('')
  }
  return parts.join('\n')
}

function formatAsText(
  messages: Array<{ role: string; content: string; timestamp: number }>
): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'GERISABET'}: ${m.content}`)
    .join('\n\n')
}

export default exportCommand
