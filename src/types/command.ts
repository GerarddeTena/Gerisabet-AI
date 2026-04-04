import type { ContentBlock } from './message'

export type CommandType = 'prompt' | 'local' | 'local-jsx'

export interface CommandBase {
  name: string
  description: string
  aliases?: string[]
  argumentHint?: string
  whenToUse?: string
  availability?: 'always' | 'gerisabet-only'
  isEnabled?: () => boolean
  userInvocable?: boolean
}

export interface PromptCommand extends CommandBase {
  type: 'prompt'
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  context?: 'inline' | 'fork'
  getPromptForCommand: (
    args: ParsedCommandArgs,
    context: CommandContext
  ) => Promise<ContentBlock[]>
}

export interface LocalCommandResult {
  type: 'text' | 'markdown'
  content: string
}

export interface LocalCommandContext {
  sessionId: string
  model: string
}

export interface LocalJSXCommandContext extends LocalCommandContext {
  onClose: () => void
}

export interface LocalCommand extends CommandBase {
  type: 'local'
  execute: (
    args: ParsedCommandArgs,
    context: LocalCommandContext
  ) => Promise<LocalCommandResult>
}

export interface LocalJSXCommand extends CommandBase {
  type: 'local-jsx'
  render: (
    args: ParsedCommandArgs,
    context: LocalJSXCommandContext
  ) => React.ReactElement
}

export type Command = PromptCommand | LocalCommand | LocalJSXCommand

export interface ParsedCommandArgs {
  positional: string[]
  flags: Record<string, unknown>
  raw: string
}

export interface CommandContext {
  sessionId: string
  model: string
  isIndexing: boolean
}

export function parseCommandArgs(raw: string): ParsedCommandArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  const positional: string[] = []
  const flags: Record<string, unknown> = {}

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.startsWith('--')) {
      const key = part.slice(2)
      const next = parts[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(part)
    }
  }

  return { positional, flags, raw }
}

export function findCommand(name: string, commands: Command[]): Command | undefined {
  const lower = name.toLowerCase()
  return commands.find(
    (cmd) =>
      cmd.name.toLowerCase() === lower ||
      cmd.aliases?.some((a) => a.toLowerCase() === lower)
  )
}

export function isSlashCommand(input: string): boolean {
  return input.startsWith('/')
}

export function parseSlashCommand(
  input: string
): { name: string; args: string } | null {
  if (!isSlashCommand(input)) return null
  const [namePart, ...rest] = input.slice(1).split(' ')
  return { name: namePart, args: rest.join(' ') }
}
