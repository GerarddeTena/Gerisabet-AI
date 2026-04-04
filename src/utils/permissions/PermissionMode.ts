export type PermissionMode = 'prompt' | 'always' | 'deny' | 'bypass'

export const DEFAULT_PERMISSION_MODE: PermissionMode = 'prompt'

export function isPermissionGranted(mode: PermissionMode): boolean {
  return mode === 'always' || mode === 'bypass'
}

export function isPermissionDenied(mode: PermissionMode): boolean {
  return mode === 'deny'
}

export function isPermissionBypass(mode: PermissionMode): boolean {
  return mode === 'bypass'
}

export function permissionModeLabel(mode: PermissionMode): string {
  switch (mode) {
    case 'prompt':
      return 'Ask each time'
    case 'always':
      return 'Always allow'
    case 'deny':
      return 'Never allow'
    case 'bypass':
      return 'Auto-approve'
  }
}
