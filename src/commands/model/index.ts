import type { LocalCommand } from '@/types'
import { getAvailableModels, formatModelName, saveLastModel } from '@utils/model/model.ts'
import { setAppState } from '@/state/AppStateStore.ts'

const modelCommand: LocalCommand = {
  name: 'model',
  type: 'local',
  description: 'View or switch the current AI model',
  argumentHint: '[model-name]',
  async execute(args, context) {
    if (args.positional.length === 0) {
      const models = await getAvailableModels()
      const current = context.model

      const list = models
        .map((m) => (m === current ? `**${formatModelName(m)}** (current)` : formatModelName(m)))
        .join('\n- ')

      return {
        type: 'markdown',
        content: `## Available Models\n\n- ${list || 'No models found. Is Ollama running?'}\n\nCurrent: **${formatModelName(current)}**`,
      }
    }

    const newModel = args.positional[0]
    saveLastModel(newModel)
    setAppState((prev) => ({ ...prev, currentModel: newModel }))

    return {
      type: 'text',
      content: `Switched to model: ${newModel}`,
    }
  },
}

export default modelCommand
