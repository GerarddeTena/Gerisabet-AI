import { memo, useMemo } from 'react'
import type { OllamaModelInfo, SystemInfo } from '../types/orchestrator'
import { getModelCompatibility, getCompatibilityColor } from '../utils/modelCompatibility'

interface Props {
  systemInfo: SystemInfo
  models: OllamaModelInfo[]
  onClose: () => void
}

export const SystemCompatibilityModal = memo(({ systemInfo, models, onClose }: Props) => {
  const chatModels = useMemo(
    () => models.filter((m) => !m.name.includes('embed') && !m.name.includes('nomic')),
    [models]
  )

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Model Compatibility"
    >
      <div
        className="modal-box g-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, width: '90vw' }}
      >
        <div className="modal-header">
          <h3>Model Compatibility</h3>
          <button className="modal-close g-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* System specs */}
        <div className="system-specs" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          <span>💻 {systemInfo.os_name}</span>
          <span style={{ margin: '0 0.5rem' }}>·</span>
          <span>🧠 {systemInfo.cpu_brand} ({systemInfo.cpu_cores} cores)</span>
          <span style={{ margin: '0 0.5rem' }}>·</span>
          <span>🗂 RAM: {systemInfo.ram_available_gb.toFixed(1)} GB free / {systemInfo.ram_total_gb.toFixed(1)} GB total</span>
        </div>

        {chatModels.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>No Ollama chat models found. Run <code>ollama pull &lt;model&gt;</code> to add one.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.4rem 0.6rem' }}>Model</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Size</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>RAM req.</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {chatModels.map((model) => {
                const compat = getModelCompatibility(model.name, systemInfo.ram_available_gb)
                const diskGb = model.size_bytes > 0
                  ? `${(model.size_bytes / 1_073_741_824).toFixed(1)} GB`
                  : '?'
                return (
                  <tr key={model.name} style={{ borderBottom: '1px solid var(--color-border-subtle, #2a2a2a)' }}>
                    <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {model.name}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--color-muted)' }}>{diskGb}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--color-muted)' }}>
                      {compat.minRamGb > 0 ? `≥ ${compat.minRamGb} GB` : '?'}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: getCompatibilityColor(compat.verdict) }}>
                      {compat.verdictLabel}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Verdicts are based on available RAM at launch. Close other apps to free memory.
        </p>
      </div>
    </div>
  )
})

SystemCompatibilityModal.displayName = 'SystemCompatibilityModal'
