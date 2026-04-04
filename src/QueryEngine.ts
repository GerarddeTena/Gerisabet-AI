import type { ChatMessage, MessageMetadata } from './types/message'
import type { ToolDef } from './types/tool'
import type { Command } from './types/command'
import type { SessionId } from './types/ids'
import { queryGerisabet } from './query'
import { compactMessages, shouldCompact } from './services/compact/compact'

export interface QueryEngineConfig {
  sessionId: SessionId
  model: string
  tools?: ToolDef[]
  commands?: Command[]
  maxTurns?: number
  maxContextMessages?: number
  customSystemPrompt?: string
}

export interface SubmitOptions {
  uuid?: string
  abortController?: AbortController
}

export class QueryEngine {
  private config: QueryEngineConfig
  private messages: ChatMessage[]
  private abortController: AbortController | null
  private turnCount: number

  constructor(config: QueryEngineConfig) {
    this.config = config
    this.messages = []
    this.abortController = null
    this.turnCount = 0
  }

  get sessionId(): SessionId {
    return this.config.sessionId
  }

  get model(): string {
    return this.config.model
  }

  setModel(model: string): void {
    this.config.model = model
  }

  getMessages(): ChatMessage[] {
    return [...this.messages]
  }

  setMessages(messages: ChatMessage[]): void {
    this.messages = [...messages]
  }

  clearMessages(): void {
    this.messages = []
    this.turnCount = 0
  }

  abort(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  async *submitMessage(
    prompt: string,
    options?: SubmitOptions
  ): AsyncGenerator<{
    type: 'token' | 'done' | 'error'
    token?: string
    content?: string
    metadata?: MessageMetadata
    error?: string
  }> {
    if (this.config.maxTurns && this.turnCount >= this.config.maxTurns) {
      yield {
        type: 'error',
        error: `Maximum turns (${this.config.maxTurns}) reached`,
      }
      return
    }

    const abortController = options?.abortController ?? new AbortController()
    this.abortController = abortController

    const needsCompact = await shouldCompact(this.messages)
    const contextMessages = needsCompact
      ? (await compactMessages(this.messages, this.config.model)).compactedMessages
      : this.messages

    this.turnCount++

    for await (const event of queryGerisabet({
      question: prompt,
      model: this.config.model,
      history: contextMessages,
      tools: this.config.tools,
      commands: this.config.commands,
      signal: abortController.signal,
    })) {
      if (event.type === 'token') {
        yield { type: 'token', token: event.token }
      } else if (event.type === 'done') {
        yield { type: 'done', content: event.content, metadata: event.metadata }

        this.messages.push({
          id: `msg-${Date.now()}-u`,
          role: 'user',
          content: prompt,
          timestamp: new Date().toISOString(),
        })
        this.messages.push({
          id: `msg-${Date.now()}-a`,
          role: 'assistant',
          content: event.content,
          timestamp: new Date().toISOString(),
          metadata: event.metadata,
        })
      } else if (event.type === 'error') {
        yield { type: 'error', error: event.error }
      }
    }

    this.abortController = null
  }
}

let globalEngine: QueryEngine | null = null

export function getGlobalQueryEngine(): QueryEngine | null {
  return globalEngine
}

export function createGlobalQueryEngine(config: QueryEngineConfig): QueryEngine {
  globalEngine = new QueryEngine(config)
  return globalEngine
}
