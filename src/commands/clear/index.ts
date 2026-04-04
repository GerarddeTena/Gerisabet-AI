import type { LocalCommand } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { clearSessionMemory } from '../../services/SessionMemory'
import { getSessionId } from '../../bootstrap/state'

const clearCommand: LocalCommand = {
  name: 'clear',
  type: 'local',
  description: 'Clear conversation history and start fresh',
  aliases: ['new'],
  async execute(_args, _context) {
    await invoke('clear_history')
    clearSessionMemory(getSessionId())
    return {
      type: 'text',
      content: 'Conversation history cleared.',
    }
  },
}

export default clearCommand
