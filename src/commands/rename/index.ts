import type { LocalCommand } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { logError } from '@/utils/log.ts'

const renameCommand: LocalCommand = {
  name: 'rename',
  type: 'local',
  description: 'Rename the current conversation session',
  argumentHint: '<new-name>',
  async execute(args, context) {
    const newName = args.positional.join(' ').trim()

    if (!newName) {
      return {
        type: 'text',
        content: 'Usage: /rename <new-name>',
      }
    }

    try {
      await invoke('rename_session', {
        sessionId: context.sessionId,
        name: newName,
      })

      return {
        type: 'text',
        content: `Session renamed to: "${newName}"`,
      }
    } catch (err) {
      logError(err, 'renameCommand')
      return {
        type: 'text',
        content: `Rename failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
}

export default renameCommand
