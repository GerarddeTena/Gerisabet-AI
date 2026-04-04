type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev =
  typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__TAURI_DEBUG__ === true

function log(level: LogLevel, ...args: unknown[]): void {
  if (level === 'debug' && !isDev) return

  const prefix = `[GERISABET:${level.toUpperCase()}]`

  switch (level) {
    case 'debug':
      console.debug(prefix, ...args)
      break
    case 'info':
      console.info(prefix, ...args)
      break
    case 'warn':
      console.warn(prefix, ...args)
      break
    case 'error':
      console.error(prefix, ...args)
      break
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
}

export function logError(error: unknown, context?: string): void {
  const msg = error instanceof Error ? error.message : String(error)
  logger.error(context ? `[${context}] ${msg}` : msg, error)
}
