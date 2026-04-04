import type { LocalCommand } from '@/types'
import { getCommandsHelpText } from '@/commands.ts'

const helpCommand: LocalCommand = {
  name: 'help',
  type: 'local',
  description: 'Show available slash commands',
  aliases: ['?', 'h'],
  async execute(_args, _context) {
    return {
      type: 'markdown',
      content: `## GERISABET Commands\n\n${getCommandsHelpText()}`,
    }
  },
}

export default helpCommand
