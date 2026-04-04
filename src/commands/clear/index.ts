import type { LocalCommand } from '@/types'
import { invoke } from '@tauri-apps/api/core'

const clearCommand: LocalCommand = {
  name: 'clear',
  type: 'local',
  description: 'Clear conversation history and start fresh',
  aliases: ['new'],
  async execute(_args, _context) {
    await invoke('clear_history')
    return {
      type: 'text',
      content: 'Conversation history cleared.',
    }
  },
}

export default clearCommand
