import type { ToolDef, ToolUseContext, ToolResult, ToolPermissions, PermissionDecision, ToolPermissionContext, PendingPermission, PermissionMode } from './types/tool'
import type { ToolUseId } from './types/ids'
import { buildTool, findToolByName, getEmptyToolPermissionContext } from './types/tool'

export type { ToolDef, ToolUseContext, ToolResult, ToolPermissions, PermissionDecision, ToolPermissionContext, PendingPermission, PermissionMode }
export { buildTool, findToolByName, getEmptyToolPermissionContext }

const TOOL_REGISTRY: ToolDef[] = []

export function registerTool(tool: ToolDef): void {
  const existing = TOOL_REGISTRY.findIndex((t) => t.name === tool.name)
  if (existing >= 0) {
    TOOL_REGISTRY[existing] = tool
  } else {
    TOOL_REGISTRY.push(tool)
  }
}

export function getRegisteredTools(): ToolDef[] {
  return [...TOOL_REGISTRY]
}

export function getToolByName(name: string): ToolDef | undefined {
  return TOOL_REGISTRY.find(
    (t) => t.name === name || t.aliases?.includes(name)
  )
}

export async function checkToolPermission(
  tool: ToolDef,
  _input: Record<string, unknown>,
  context: ToolPermissionContext
): Promise<PermissionDecision> {
  if (context.permissionMode === 'bypass') {
    return { behavior: 'allow' }
  }

  if (context.deniedTools.has(tool.name)) {
    return { behavior: 'deny', reason: 'Tool is in deny list' }
  }

  if (tool.permissions?.alwaysDeny) {
    return { behavior: 'deny', reason: 'Tool always denied' }
  }

  if (tool.permissions?.alwaysAllow) {
    return { behavior: 'allow' }
  }

  if (context.allowedTools.has(tool.name)) {
    return { behavior: 'allow' }
  }

  if (context.permissionMode === 'auto') {
    return { behavior: 'allow' }
  }

  if (context.permissionMode === 'plan' && tool.permissions?.requiresConfirmation) {
    return { behavior: 'deny', reason: 'Plan mode: write operations blocked' }
  }

  if (tool.permissions?.requiresConfirmation) {
    return { behavior: 'ask' }
  }

  return { behavior: 'allow' }
}

export function createDefaultCanUseTool(
  _context: ToolPermissionContext,
  onAsk?: (pending: PendingPermission) => void
) {
  return async (
    toolName: string,
    input: Record<string, unknown>,
    permContext: ToolPermissionContext
  ): Promise<PermissionDecision> => {
    const tool = getToolByName(toolName)
    if (!tool) {
      return { behavior: 'deny', reason: `Unknown tool: ${toolName}` }
    }

    const decision = await checkToolPermission(tool, input, permContext)

    if (decision.behavior === 'ask' && onAsk) {
      return new Promise<PermissionDecision>((resolve) => {
        const id = `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`
        onAsk({
          toolName,
          input,
          toolUseId: id as ToolUseId,
          resolve: (decision: PermissionDecision) => resolve(decision),
        })
      })
    }

    return decision
  }
}
