import type { LocalCommand } from '../../types/command'

const compactCommand: LocalCommand = {
  name: 'compact',
  type: 'local',
  description: 'Compact conversation history to free up context space',
  async execute(_args, _context) {
    return {
      type: 'text',
      content: 'Context compaction will run automatically when needed.',
    }
  },
}

export default compactCommand
