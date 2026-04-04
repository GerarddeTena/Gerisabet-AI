import type { LocalCommand } from '@/types'

const skillsCommand: LocalCommand = {
  name: 'skills',
  type: 'local',
  description: 'List indexed skills and their types',
  aliases: ['skill'],
  async execute(_args, _context) {
    return {
      type: 'markdown',
      content: `## Skills\n\nSkills are Markdown files stored in your skills directory.\nGo to the **Index** tab to manage your skills library.\n\n**Skill types:**\n- \`rules/\` — Always injected into every conversation\n- Any other folder — Injected when semantically relevant`,
    }
  },
}

export default skillsCommand
