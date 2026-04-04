export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 9)
}
