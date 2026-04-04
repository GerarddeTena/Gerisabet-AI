import type { ToolUseId } from './ids'
import type { ContentBlock } from './message'

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

export type PermissionMode = 'default' | 'plan' | 'auto' | 'bypass'

export interface PermissionDecision {
  behavior: PermissionBehavior
  reason?: string
}

export interface ToolPermissions {
  mode?: PermissionMode
  alwaysAllow?: boolean
  alwaysDeny?: boolean
  requiresConfirmation?: boolean
}

export interface ToolResult {
  content: ContentBlock[]
  isError?: boolean
  metadata?: Record<string, unknown>
}

export interface ToolUseContext {
  sessionId: string
  signal: AbortSignal
  canUseTool: CanUseToolFn
  agentId?: string
  options?: ToolOptions
}

export interface ToolOptions {
  permissionMode?: PermissionMode
  timeout?: number
  maxResultSizeChars?: number
}

export type CanUseToolFn = (
  toolName: string,
  input: Record<string, unknown>,
  context: ToolPermissionContext
) => Promise<PermissionDecision>

export interface ToolPermissionContext {
  allowedTools: Set<string>
  deniedTools: Set<string>
  permissionMode: PermissionMode
}

export interface ToolDef {
  name: string
  description: string
  inputSchema: JSONSchema
  call: (
    input: Record<string, unknown>,
    context: ToolUseContext
  ) => Promise<ToolResult>
  permissions?: ToolPermissions
  maxResultSizeChars?: number
  aliases?: string[]
  isEnabled?: () => boolean
}

export interface JSONSchema {
  type: 'object'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JSONSchemaProperty {
  type: string
  description?: string
  enum?: unknown[]
  default?: unknown
  items?: JSONSchemaProperty
}

export interface Tools {
  tools: ToolDef[]
}

export function buildTool(config: ToolDef): ToolDef {
  return {
    ...config,
    call: async (input, context) => {
      try {
        const result = await config.call(input, context)
        if (config.maxResultSizeChars) {
          for (const block of result.content) {
            if (block.type === 'text' && block.text.length > config.maxResultSizeChars) {
              block.text =
                block.text.slice(0, config.maxResultSizeChars) +
                `\n[Output truncated to ${config.maxResultSizeChars} characters]`
            }
          }
        }
        return result
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: err instanceof Error ? err.message : String(err),
            },
          ],
          isError: true,
        }
      }
    },
  }
}

export function findToolByName(name: string, tools: Tools): ToolDef | undefined {
  return tools.tools.find(
    (t) =>
      t.name === name || t.aliases?.includes(name)
  )
}

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return {
    allowedTools: new Set(),
    deniedTools: new Set(),
    permissionMode: 'default',
  }
}

export type PendingPermission = {
  toolUseId: ToolUseId
  toolName: string
  input: Record<string, unknown>
  resolve: (decision: PermissionDecision) => void
}
