import { useMemo } from 'react'
import { getCommands } from '../commands'
import type { Command } from '../types/command'
import { parseSlashCommand } from '../types/command'

export interface SlashCommandMatch {
  command: Command
  args: string
}

export function useSlashCommands(input: string) {
  const commands = useMemo(() => getCommands().filter((c) => c.userInvocable !== false), [])

  const isSlash = input.startsWith('/')

  const suggestions = useMemo(() => {
    if (!isSlash) return []

    const query = input.slice(1).toLowerCase()
    if (!query) return commands

    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(query) ||
        cmd.aliases?.some((a) => a.toLowerCase().startsWith(query))
    )
  }, [input, isSlash, commands])

  const matchedCommand = useMemo((): SlashCommandMatch | null => {
    if (!isSlash) return null
    const parsed = parseSlashCommand(input)
    if (!parsed) return null

    const cmd = commands.find(
      (c) =>
        c.name.toLowerCase() === parsed.name.toLowerCase() ||
        c.aliases?.some((a) => a.toLowerCase() === parsed.name.toLowerCase())
    )

    if (!cmd) return null
    return { command: cmd, args: parsed.args }
  }, [input, isSlash, commands])

  return {
    isSlash,
    suggestions,
    matchedCommand,
    commands,
  }
}
