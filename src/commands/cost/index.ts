import type { LocalCommand } from '@/types'
import { formatTokenSummary } from '@/token-tracker.ts'

const costCommand: LocalCommand = {
  name: 'cost',
  type: 'local',
  description: 'Show token usage for this session',
  aliases: ['tokens', 'usage'],
  async execute(_args, _context) {
    const summary = formatTokenSummary()
    return {
      type: 'markdown',
      content: `## Session Token Usage\n\n${summary}`,
    }
  },
}

export default costCommand
