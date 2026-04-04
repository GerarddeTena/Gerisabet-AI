import type { Command } from '@/types'
import { findCommand } from '@/types'

export type { Command } from '@/types/command'
export { findCommand, parseCommandArgs, parseSlashCommand, isSlashCommand } from './types/command'
export { registerAllCommands } from './commands/index'

const commandRegistry: Command[] = []

export function registerCommand(command: Command): void {
  const existing = commandRegistry.findIndex((c) => c.name === command.name)
  if (existing >= 0) {
    commandRegistry[existing] = command
  } else {
    commandRegistry.push(command)
  }
}

export function registerCommands(commands: Command[]): void {
  for (const cmd of commands) {
    registerCommand(cmd)
  }
}

export function getCommands(): Command[] {
  return commandRegistry.filter((cmd) => {
    if (cmd.isEnabled && !cmd.isEnabled()) return false
    if (cmd.availability === 'gerisabet-only') {
      return true
    }
    return true
  })
}

export function getCommand(name: string): Command | undefined {
  return findCommand(name, getCommands())
}

export function clearCommandsCache(): void {
  commandRegistry.length = 0
}

export function formatCommandHelp(cmd: Command): string {
  const parts: string[] = [`/${cmd.name}`]
  if (cmd.argumentHint) parts.push(cmd.argumentHint)
  const usage = parts.join(' ')
  const aliases =
    cmd.aliases?.length
      ? ` (alias: ${cmd.aliases.map((a) => `/${a}`).join(', ')})`
      : ''
  return `${usage}${aliases}\n  ${cmd.description}`
}

export function getCommandsHelpText(): string {
  const cmds = getCommands().filter((c) => c.userInvocable !== false)
  if (cmds.length === 0) return 'No commands available.'
  return cmds.map(formatCommandHelp).join('\n\n')
}
