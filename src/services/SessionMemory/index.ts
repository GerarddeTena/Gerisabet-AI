import type { ChatMessage } from '@/types'
import type { SessionId } from '@/types'
import { logError } from '@utils/log.ts'

interface MemoryEntry {
  sessionId: SessionId
  messages: ChatMessage[]
  savedAt: number
}

const memoryStore = new Map<SessionId, MemoryEntry>()
const STORAGE_PREFIX = 'gerisabet.session.'

export function saveSessionMemory(
  sessionId: SessionId,
  messages: ChatMessage[]
): void {
  memoryStore.set(sessionId, { sessionId, messages, savedAt: Date.now() })

  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${sessionId}`,
      JSON.stringify(messages)
    )
  } catch (err) {
    logError(err, 'saveSessionMemory')
  }
}

export function loadSessionMemory(
  sessionId: SessionId
): ChatMessage[] | null {
  const inMemory = memoryStore.get(sessionId)
  if (inMemory) return inMemory.messages

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`)
    if (!raw) return null
    const messages = JSON.parse(raw) as ChatMessage[]
    memoryStore.set(sessionId, { sessionId, messages, savedAt: Date.now() })
    return messages
  } catch (err) {
    logError(err, 'loadSessionMemory')
    return null
  }
}

export function clearSessionMemory(sessionId: SessionId): void {
  memoryStore.delete(sessionId)
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
  } catch {
  }
}

export function listSavedSessionIds(): SessionId[] {
  const ids: SessionId[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      ids.push(key.slice(STORAGE_PREFIX.length) as SessionId)
    }
  }
  return ids
}
