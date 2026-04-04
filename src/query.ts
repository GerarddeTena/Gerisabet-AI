import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { ChatMessage, MessageMetadata } from './types/message'
import type { ToolDef } from './types/tool'
import type { Command } from './types/command'
import { recordTokenUsage } from './state/AppStateStore'

export interface QueryParams {
  question: string
  model: string
  history: ChatMessage[]
  tools?: ToolDef[]
  commands?: Command[]
  signal?: AbortSignal
  maxContextMessages?: number
  onToken?: (token: string) => void
  onDone?: (fullResponse: string, metadata?: MessageMetadata) => void
  onError?: (error: string) => void
}

export interface QueryResult {
  content: string
  metadata?: MessageMetadata
  aborted: boolean
}

export type QueryEvent =
  | { type: 'token'; token: string }
  | { type: 'done'; content: string; metadata?: MessageMetadata }
  | { type: 'error'; error: string }

export async function* queryGerisabet(
  params: QueryParams
): AsyncGenerator<QueryEvent> {
  const {
    question,
    model,
    signal,
    onToken,
    onDone,
    onError,
  } = params

  if (signal?.aborted) {
    yield { type: 'error', error: 'Aborted before start' }
    return
  }

  let fullContent = ''
  let unlistenToken: (() => void) | null = null
  let unlistenDone: (() => void) | null = null

  const tokens: string[] = []
  let tokenResolve: ((value: string | null) => void) | null = null

  const enqueueToken = (token: string) => {
    tokens.push(token)
    if (tokenResolve) {
      const resolve = tokenResolve
      tokenResolve = null
      resolve(tokens.shift()!)
    }
  }

  const nextToken = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (tokens.length > 0) {
        resolve(tokens.shift()!)
      } else {
        tokenResolve = resolve
      }
    })

  let isDone = false
  let doneResolve: (() => void) | null = null

  const waitDone = new Promise<void>((resolve) => {
    doneResolve = resolve
  })

  try {
    unlistenToken = await listen<string>('ai_token', (event) => {
      if (signal?.aborted) return
      const token = event.payload
      fullContent += token
      onToken?.(token)
      enqueueToken(token)
    })

    unlistenDone = await listen<string>('ai_done', async () => {
      isDone = true
      if (tokenResolve) {
        const resolve = tokenResolve
        tokenResolve = null
        resolve(null)
      }
      doneResolve?.()
    })

    if (signal) {
      signal.addEventListener('abort', () => {
        isDone = true
        if (tokenResolve) {
          const resolve = tokenResolve
          tokenResolve = null
          resolve(null)
        }
        doneResolve?.()
      })
    }

    invoke('ask_gerisabet', { question, model }).catch((err: unknown) => {
      isDone = true
      const errorMsg = err instanceof Error ? err.message : String(err)
      onError?.(errorMsg)
      tokens.push('\x00' + errorMsg)
      if (tokenResolve) {
        const resolve = tokenResolve
        tokenResolve = null
        resolve('\x00' + errorMsg)
      }
      doneResolve?.()
    })

    while (!isDone || tokens.length > 0) {
      const token = await nextToken()
      if (token === null) break

      if (token.startsWith('\x00')) {
        const error = token.slice(1)
        yield { type: 'error', error }
        return
      }

      yield { type: 'token', token }

      if (isDone && tokens.length === 0) break
    }

    await waitDone

    const metadata: MessageMetadata = {
      model,
    }

    recordTokenUsage(0, 0)
    onDone?.(fullContent, metadata)

    yield { type: 'done', content: fullContent, metadata }
  } finally {
    unlistenToken?.()
    unlistenDone?.()
  }
}

export async function runQuery(
  params: QueryParams
): Promise<QueryResult> {
  let content = ''
  let metadata: MessageMetadata | undefined
  let aborted = false

  for await (const event of queryGerisabet(params)) {
    if (event.type === 'token') {
      content += event.token
    } else if (event.type === 'done') {
      content = event.content
      metadata = event.metadata
    } else if (event.type === 'error') {
      if (params.signal?.aborted) {
        aborted = true
      }
      break
    }
  }

  return { content, metadata, aborted }
}
