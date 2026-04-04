import type { LocalCommand } from '../../types/command'
import { getAppState } from '../../state/AppStateStore'
import { formatTokenCount } from '../../utils/tokens'
import { getSessionId } from '../../bootstrap/state'

const statusCommand: LocalCommand = {
  name: 'status',
  type: 'local',
  description: 'Show session status and knowledge base info',
  async execute(_args, context) {
    const state = getAppState()
    const sessionId = getSessionId()

    const lines = [
      '## GERISABET Status',
      '',
      `**Session ID:** \`${sessionId}\``,
      `**Current Model:** ${context.model}`,
      `**Indexing:** ${state.isIndexing ? 'In progress' : 'Idle'}`,
      '',
    ]

    if (state.stats) {
      lines.push('**Token Usage:**')
      lines.push(`- Input: ${formatTokenCount(state.stats.totalTokensIn)}`)
      lines.push(`- Output: ${formatTokenCount(state.stats.totalTokensOut)}`)
      lines.push('')
    }

    return {
      type: 'markdown',
      content: lines.join('\n'),
    }
  },
}

export default statusCommand
