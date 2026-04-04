import { memo, useCallback } from 'react'
import type { OrchestratorConfig, SubOrchestratorDef, SubOrchestratorRole } from '../types/orchestrator'
import { ROLE_LABELS } from '../types/orchestrator'

interface Props {
  config: OrchestratorConfig
  availableModels: string[]
  onChange: (config: OrchestratorConfig) => void
}

const ROLES: SubOrchestratorRole[] = ['code', 'factual', 'creative', 'default']

export const OrchestratorPanel = memo(({ config, availableModels, onChange }: Props) => {
  const chatModels = availableModels.filter(
    (m) => !m.includes('embed') && !m.includes('nomic')
  )

  const toggleReasoning = useCallback(() => {
    onChange({ ...config, enable_reasoning: !config.enable_reasoning })
  }, [config, onChange])

  const addSub = useCallback(() => {
    if (chatModels.length === 0) return
    const newSub: SubOrchestratorDef = {
      model: chatModels[0],
      role: 'default',
      enabled: true,
    }
    onChange({ ...config, sub_orchestrators: [...config.sub_orchestrators, newSub] })
  }, [config, onChange, chatModels])

  const removeSub = useCallback(
    (idx: number) => {
      onChange({
        ...config,
        sub_orchestrators: config.sub_orchestrators.filter((_, i) => i !== idx),
      })
    },
    [config, onChange]
  )

  const updateSub = useCallback(
    (idx: number, patch: Partial<SubOrchestratorDef>) => {
      onChange({
        ...config,
        sub_orchestrators: config.sub_orchestrators.map((s, i) =>
          i === idx ? { ...s, ...patch } : s
        ),
      })
    },
    [config, onChange]
  )

  return (
    <div className="orchestrator-panel g-card" style={{ fontSize: '0.875rem' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>⚙️ Orchestration</h4>

      {/* Reasoning toggle */}
      <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={config.enable_reasoning}
          onChange={toggleReasoning}
        />
        <span>Enable reasoning plan (shows thinking steps)</span>
      </label>

      {/* Sub-orchestrators */}
      <div className="sub-orchestrators">
        {config.sub_orchestrators.map((sub, idx) => (
          <div key={idx} className="sub-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <input
              type="checkbox"
              checked={sub.enabled}
              onChange={(e) => updateSub(idx, { enabled: e.target.checked })}
              aria-label={`Enable sub-orchestrator ${idx + 1}`}
            />
            <select
              value={sub.model}
              onChange={(e) => updateSub(idx, { model: e.target.value })}
              className="g-select"
              style={{ flex: 1 }}
            >
              {chatModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={sub.role}
              onChange={(e) => updateSub(idx, { role: e.target.value as SubOrchestratorRole })}
              className="g-select"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              className="g-btn"
              style={{ color: 'var(--color-error)' }}
              onClick={() => removeSub(idx)}
              aria-label={`Remove sub-orchestrator ${idx + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        className="g-btn g-btn-secondary"
        onClick={addSub}
        disabled={chatModels.length === 0}
        style={{ marginTop: '0.5rem' }}
      >
        + Add sub-orchestrator
      </button>

      {chatModels.length === 0 && (
        <p style={{ color: 'var(--color-muted)', marginTop: '0.4rem' }}>
          No Ollama models found. Run <code>ollama pull &lt;model&gt;</code>.
        </p>
      )}
    </div>
  )
})

OrchestratorPanel.displayName = 'OrchestratorPanel'
