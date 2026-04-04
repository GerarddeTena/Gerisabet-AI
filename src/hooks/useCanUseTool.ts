import { useCallback } from 'react'
import type { CanUseToolFn, PermissionDecision } from '../types/tool'

export function useCanUseTool(): CanUseToolFn {
  return useCallback(
    async (_toolName, _input, context): Promise<PermissionDecision> => {
      const mode = context.permissionMode

      if (mode === 'bypass' || mode === 'auto') {
        return { behavior: 'allow' }
      }

      return { behavior: 'allow' }
    },
    []
  )
}

export function getDefaultCanUseTool(): CanUseToolFn {
  return async (_toolName, _input, context): Promise<PermissionDecision> => {
    if (context.allowedTools.has(_toolName)) return { behavior: 'allow' }
    if (context.deniedTools.has(_toolName)) return { behavior: 'deny' }
    return { behavior: 'allow' }
  }
}
