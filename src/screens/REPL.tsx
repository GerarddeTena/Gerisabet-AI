import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { ChatMessage } from '../types/message'
import type { Command } from '../types/command'
import { parseCommandArgs } from '../types/command'
import type { OrchestratorConfig, ReasoningStep } from '../types/orchestrator'
import { getCommand } from '../commands'
import { addToHistory, navigateHistoryUp, navigateHistoryDown, resetHistoryNavigation } from '../history'
import { trackTokenUsage } from '../token-tracker'
import { getSessionId } from '../bootstrap/state'
import { useSlashCommands } from '../hooks/useSlashCommands'
import { useAppState } from '../hooks/useAppState'
import { setAppState } from '../state/AppStateStore'
import { InputForAi, InputSelectModel } from '../form/Input'
import { DisplayResponses } from '../dashboard'
import { Typeahead } from '../components/Typeahead'
import { StatusBar } from '../components/StatusBar'
import { TokenDisplay } from '../components/TokenDisplay'
import { ReasoningDisplay } from '../components/ReasoningDisplay'
import { OrchestratorPanel } from '../components/OrchestratorPanel'
import { HourglassIcon, BoltIcon } from '../assets/icons'

const CHAT_INPUT_MAX_HEIGHT = 192

interface REPLProps {
  chatHistory: ChatMessage[]
  onChatHistoryChange: (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void
  disabled?: boolean
}

const REPL = memo(({ chatHistory, onChatHistoryChange, disabled = false }: REPLProps) => {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectModel, setSelectModel] = useState(
    localStorage.getItem('gerisabet.lastModel') ?? 'qwen2.5-coder:3b'
  )
  const [typeaheadIndex, setTypeaheadIndex] = useState(0)
  const [commandResult, setCommandResult] = useState<{ type: string; content: string } | null>(null)
  const [showOrchestratorPanel, setShowOrchestratorPanel] = useState(false)
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([])
  const [isThinking, setIsThinking] = useState(false)

  const isMountedRef = useRef(true)
  const responsesRef = useRef<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const unlistenTokenRef = useRef<(() => void) | null>(null)
  const unlistenDoneRef = useRef<(() => void) | null>(null)
  const unlistenThinkingRef = useRef<(() => void) | null>(null)

  const appState = useAppState()
  const { isSlash, suggestions, matchedCommand } = useSlashCommands(question)

  const orchestratorConfig: OrchestratorConfig = appState.orchestratorConfig

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const el = responsesRef.current
    if (!el) return
    requestAnimationFrame(() => {
      try {
        ;(el as HTMLElement).scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } catch {
        el.scrollTop = el.scrollHeight
      }
    })
  }, [chatHistory, isLoading])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, CHAT_INPUT_MAX_HEIGHT)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY =
      textarea.scrollHeight > CHAT_INPUT_MAX_HEIGHT ? 'auto' : 'hidden'
  }, [])

  useLayoutEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight, question])

  const handleQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuestion(e.target.value)
      setTypeaheadIndex(0)
    },
    []
  )

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectModel(e.target.value)
    localStorage.setItem('gerisabet.lastModel', e.target.value)
  }, [])

  const handleTypeaheadSelect = useCallback((cmd: Command) => {
    setQuestion(`/${cmd.name} `)
    textareaRef.current?.focus()
  }, [])

  const executeSlashCommand = useCallback(
    async (input: string): Promise<boolean> => {
      const trimmed = input.trim()
      if (!trimmed.startsWith('/')) return false

      const [namePart, ...rest] = trimmed.slice(1).split(' ')
      const cmd = getCommand(namePart)
      if (!cmd) return false

      if (cmd.type === 'local') {
        const args = parseCommandArgs(rest.join(' '))
        const result = await cmd.execute(args, {
          sessionId: getSessionId(),
          model: selectModel,
        })
        setCommandResult(result)
        return true
      }

      return false
    },
    [selectModel]
  )

  const handleQuestionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isSlash && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setTypeaheadIndex((i) => Math.min(i + 1, suggestions.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setTypeaheadIndex((i) => Math.max(i - 1, 0))
          return
        }
        if (e.key === 'Tab' && suggestions[typeaheadIndex]) {
          e.preventDefault()
          setQuestion(`/${suggestions[typeaheadIndex].name} `)
          return
        }
      }

      if (!isSlash) {
        if (e.key === 'ArrowUp' && !e.shiftKey) {
          const prev = navigateHistoryUp(question)
          if (prev !== question) {
            e.preventDefault()
            setQuestion(prev)
          }
          return
        }
        if (e.key === 'ArrowDown' && !e.shiftKey) {
          const next = navigateHistoryDown(question)
          e.preventDefault()
          setQuestion(next)
          return
        }
      }

      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
      e.preventDefault()
      if (isLoading || disabled) return
      e.currentTarget.form?.requestSubmit()
    },
    [isSlash, suggestions, typeaheadIndex, isLoading, disabled]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = question.trim()
      if (!trimmed) return

      setCommandResult(null)
      setQuestion('')
      resetHistoryNavigation()
      addToHistory(trimmed)

      const wasSlash = await executeSlashCommand(trimmed)
      if (wasSlash) return

      unlistenTokenRef.current?.()
      unlistenDoneRef.current?.()

      setIsLoading(true)

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        role: 'user',
        content: trimmed,
      }

      const newHistory = [...chatHistory, userMsg]
      onChatHistoryChange(newHistory)

      const aiId = `${Date.now() + 1}`
      onChatHistoryChange([
        ...newHistory,
        { id: aiId, role: 'assistant' as const, content: '' },
      ])

      const cleanup = () => {
        unlistenTokenRef.current?.()
        unlistenDoneRef.current?.()
        unlistenThinkingRef.current?.()
        unlistenTokenRef.current = null
        unlistenDoneRef.current = null
        unlistenThinkingRef.current = null
      }

      // Reset reasoning state for this new request
      setReasoningSteps([])
      setIsThinking(
        orchestratorConfig.enable_reasoning || orchestratorConfig.sub_orchestrators.some((s) => s.enabled)
      )

      unlistenThinkingRef.current = await listen<ReasoningStep>('ai_thinking', (event) => {
        const step = event.payload
        setReasoningSteps((prev) => [...prev, step])
        if (step.step === 'synthesizing') {
          setIsThinking(false)
        }
      })

      unlistenTokenRef.current = await listen<string>('ai_token', (event) => {
        onChatHistoryChange((prev) =>
          prev.map((msg) =>
            msg.id === aiId
              ? { ...msg, content: msg.content + event.payload }
              : msg
          )
        )
      })

      unlistenDoneRef.current = await listen<string>('ai_done', async (event) => {
        const fullContent = event.payload
        if (fullContent) {
          trackTokenUsage(selectModel, trimmed.length, fullContent.length)
          setAppState((prev) => ({
            ...prev,
            stats: {
              ...prev.stats,
              totalTokensIn: prev.stats.totalTokensIn + Math.ceil(trimmed.length / 4),
              totalTokensOut: prev.stats.totalTokensOut + Math.ceil(fullContent.length / 4),
              requestCount: prev.stats.requestCount + 1,
            },
          }))
        }
        if (isMountedRef.current) {
          setIsLoading(false)
          setIsThinking(false)
        }
        cleanup()
      })

      try {
        const hasOrchestration =
          orchestratorConfig.enable_reasoning ||
          orchestratorConfig.sub_orchestrators.some((s) => s.enabled)

        await invoke('ask_gerisabet', {
          question: trimmed,
          model: selectModel,
          orchestrators: hasOrchestration ? orchestratorConfig : null,
        })
      } catch {
        onChatHistoryChange((prev) =>
          prev.map((msg) =>
            msg.id === aiId
              ? { ...msg, content: '(Error) Failed to get response' }
              : msg
          )
        )
        if (isMountedRef.current) setIsLoading(false)
        cleanup()
      }
    },
    [question, selectModel, chatHistory, onChatHistoryChange, executeSlashCommand]
  )

  return (
    <>
      <div className="model-bar">
        <label htmlFor="model-select">Model:</label>
        <InputSelectModel model={selectModel} changeEvent={handleModelChange} />
        <button
          type="button"
          className={`g-btn${orchestratorConfig.enable_reasoning || orchestratorConfig.sub_orchestrators.length > 0 ? ' g-btn-active' : ''}`}
          onClick={() => setShowOrchestratorPanel((v) => !v)}
          aria-label="Toggle orchestrator panel"
          title="Configure sub-orchestrators and reasoning"
          style={{ marginLeft: '0.5rem' }}
        >
          ⚙️
        </button>
        <TokenDisplay />
      </div>

      {showOrchestratorPanel && (
        <OrchestratorPanel
          config={orchestratorConfig}
          availableModels={appState.availableModels}
          onChange={(cfg) => setAppState((prev) => ({ ...prev, orchestratorConfig: cfg }))}
        />
      )}

      <ReasoningDisplay steps={reasoningSteps} isThinking={isThinking} />

      <DisplayResponses
        ref={responsesRef}
        history={chatHistory}
        isLoading={isLoading}
      />

      {commandResult && (
        <div className="command-result">
          <div className="command-result-content">
            {commandResult.content}
          </div>
          <button
            className="command-result-close g-btn"
            onClick={() => setCommandResult(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="chat-form-area">
        {isSlash && suggestions.length > 0 && !matchedCommand && (
          <Typeahead
            suggestions={suggestions}
            onSelect={handleTypeaheadSelect}
            activeIndex={typeaheadIndex}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <InputForAi
              msg={question}
              changeEvent={handleQuestionChange}
              keyDownEvent={handleQuestionKeyDown}
              textareaRef={textareaRef}
              disabled={isLoading || disabled}
            />
            <button
              type="submit"
              disabled={isLoading || disabled}
              aria-label="Ask question"
              className="chat-submit-button g-btn g-btn-primary"
            >
              {disabled ? <><HourglassIcon size="0.9em" /> Indexing…</> : isLoading ? <><BoltIcon size="0.9em" /> Generating…</> : 'Ask'}
            </button>
          </div>
        </form>

        <StatusBar
          model={selectModel}
          isIndexing={appState.isIndexing || disabled}
          isGenerating={isLoading}
        />
      </div>
    </>
  )
})

REPL.displayName = 'REPL'

export { REPL }
