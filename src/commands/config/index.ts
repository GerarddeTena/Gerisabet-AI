import type { LocalCommand } from '@/types'
import { getSettings, setSetting } from '@/utils/settings/settings.ts'
import type { GerisabetSettings } from '@/types'

const configCommand: LocalCommand = {
  name: 'config',
  type: 'local',
  description: 'View or update GERISABET settings',
  argumentHint: '[key] [value]',
  async execute(args, _context) {
    const settings = getSettings()

    if (args.positional.length === 0) {
      const entries = Object.entries(settings)
        .map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`)
        .join('\n')
      return {
        type: 'markdown',
        content: `## Current Settings\n\n${entries}`,
      }
    }

    if (args.positional.length === 1) {
      const key = args.positional[0] as keyof GerisabetSettings
      const value = settings[key]
      return {
        type: 'markdown',
        content: `**${key}**: ${JSON.stringify(value)}`,
      }
    }

    const key = args.positional[0] as keyof GerisabetSettings
    const rawValue = args.positional[1]

    let parsedValue: unknown = rawValue
    if (rawValue === 'true') parsedValue = true
    else if (rawValue === 'false') parsedValue = false
    else if (!isNaN(Number(rawValue))) parsedValue = Number(rawValue)

    setSetting(key, parsedValue as GerisabetSettings[typeof key])

    return {
      type: 'text',
      content: `Setting updated: ${key} = ${rawValue}`,
    }
  },
}

export default configCommand
