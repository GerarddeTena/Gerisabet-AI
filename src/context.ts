import { invoke } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'

export interface SystemContext {
  appVersion?: string
  platform?: string
  appDataPath?: string
}

export interface UserContext {
  gerisabetMd?: string
  currentDate: string
  customInstructions?: string
}

let systemContextCache: SystemContext | null = null
let userContextCache: UserContext | null = null

export async function getSystemContext(): Promise<SystemContext> {
  if (systemContextCache) return systemContextCache

  const context: SystemContext = {
    appVersion: '1.0.0',
    platform: navigator.platform,
  }

  try {
    context.appDataPath = await appDataDir()
  } catch {
  }

  systemContextCache = context
  return context
}

export async function getUserContext(): Promise<UserContext> {
  if (userContextCache) return userContextCache

  const context: UserContext = {
    currentDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }

  try {
    const content = await invoke<string | null>('load_gerisabet_md')
    if (content) {
      context.gerisabetMd = content
    }
  } catch {
  }

  userContextCache = context
  return context
}

export function clearContextCaches(): void {
  systemContextCache = null
  userContextCache = null
}

export function setCustomInstructions(instructions: string): void {
  clearContextCaches()
  if (userContextCache === null) {
    userContextCache = {
      currentDate: new Date().toLocaleDateString(),
      customInstructions: instructions,
    }
  } else {
    userContextCache.customInstructions = instructions
  }
}

export async function buildSystemPrompt(
  userContext: UserContext,
  _systemContext: SystemContext,
  customPrompt?: string
): Promise<string> {
  const parts: string[] = []

  parts.push(`You are GERISABET, an AI assistant with access to a local knowledge base.`)

  if (userContext.currentDate) {
    parts.push(`Today is ${userContext.currentDate}.`)
  }

  if (userContext.gerisabetMd) {
    parts.push(`\n## Custom Instructions\n${userContext.gerisabetMd}`)
  }

  if (customPrompt) {
    parts.push(`\n## Additional Context\n${customPrompt}`)
  }

  return parts.join('\n')
}
