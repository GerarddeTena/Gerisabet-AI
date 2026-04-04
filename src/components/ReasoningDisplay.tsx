import { memo, useState } from 'react'
import type { ReasoningStep } from '../types/orchestrator'
import { ROLE_LABELS } from '../types/orchestrator'

interface Props {
  steps: ReasoningStep[]
  isThinking: boolean
}

export const ReasoningDisplay = memo(({ steps, isThinking }: Props) => {
  const [collapsed, setCollapsed] = useState(false)

  if (steps.length === 0 && !isThinking) return null

  return (
    <div className="reasoning-display" aria-label="Reasoning steps">
      <button
        className="reasoning-toggle g-btn"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="reasoning-icon">{isThinking ? '🤔' : '💡'}</span>
        <span className="reasoning-title">
          {isThinking ? 'Thinking…' : `Reasoning (${steps.length} step${steps.length !== 1 ? 's' : ''})`}
        </span>
        <span className="reasoning-chevron">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="reasoning-steps">
          {steps.map((step, i) => (
            <ReasoningStepRow key={i} step={step} />
          ))}
          {isThinking && <div className="reasoning-spinner">⏳ Processing…</div>}
        </div>
      )}
    </div>
  )
})

ReasoningDisplay.displayName = 'ReasoningDisplay'

const ReasoningStepRow = memo(({ step }: { step: ReasoningStep }) => {
  switch (step.step) {
    case 'planning':
      return (
        <div className="reasoning-step reasoning-step--planning">
          <span className="step-badge">📋 Planning</span>
          <p className="step-content">{step.content}</p>
        </div>
      )

    case 'delegating':
      return (
        <div className="reasoning-step reasoning-step--delegating">
          <span className="step-badge">
            🔀 Delegating to <code>{step.model}</code>
            <em style={{ marginLeft: '0.4em', opacity: 0.7 }}>
              ({ROLE_LABELS[step.role as keyof typeof ROLE_LABELS] ?? step.role})
            </em>
          </span>
          <p className="step-content step-content--muted">{step.task.slice(0, 200)}{step.task.length > 200 ? '…' : ''}</p>
        </div>
      )

    case 'reviewing':
      return (
        <div className="reasoning-step reasoning-step--reviewing">
          <span className="step-badge">🔍 Reviewing sub-results</span>
          <p className="step-content step-content--muted">{step.content.slice(0, 300)}{step.content.length > 300 ? '…' : ''}</p>
        </div>
      )

    case 'synthesizing':
      return (
        <div className="reasoning-step reasoning-step--synthesizing">
          <span className="step-badge">✨ Synthesizing final answer</span>
        </div>
      )
  }
})

ReasoningStepRow.displayName = 'ReasoningStepRow'
