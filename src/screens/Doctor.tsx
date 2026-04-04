import { memo, useState, useEffect } from 'react'
import { getAvailableModels } from '../utils/model/model'
import { useAppState } from '../hooks/useAppState'
import { SystemCompatibilityModal } from '../components/SystemCompatibilityModal'
import type { OllamaModelInfo } from '../types/orchestrator'
import { CheckIcon, CrossIcon } from '../assets/icons'

const Doctor = memo(() => {
  const [results, setResults] = useState<Array<{ label: string; ok: boolean; detail?: string }>>([])
  const [running, setRunning] = useState(false)
  const [showCompatModal, setShowCompatModal] = useState(false)
  const appState = useAppState()

  useEffect(() => {
    runChecks()
  }, [])

  async function runChecks() {
    setRunning(true)
    const checks: Array<{ label: string; ok: boolean; detail?: string }> = []

    const ollamaOk = await checkUrl('http://localhost:11434/api/tags')
    checks.push({ label: 'Ollama', ok: ollamaOk, detail: ollamaOk ? 'Running at :11434' : 'Not reachable — run `ollama serve`' })

    const qdrantOk = await checkUrl('http://127.0.0.1:6333/collections')
    checks.push({ label: 'Qdrant', ok: qdrantOk, detail: qdrantOk ? 'Running at :6333' : 'Not reachable — ensure Qdrant is started' })

    const models = await getAvailableModels()
    checks.push({ label: 'Ollama models', ok: models.length > 0, detail: models.length > 0 ? models.join(', ') : 'No models found' })

    const hasEmbed = models.some((m) => m.includes('nomic') || m.includes('embed'))
    checks.push({ label: 'Embedding model', ok: hasEmbed, detail: hasEmbed ? 'nomic-embed-text found' : 'Run: ollama pull nomic-embed-text' })

    const sysInfo = appState.systemInfo
    if (sysInfo) {
      checks.push({
        label: 'System RAM',
        ok: sysInfo.ram_available_gb >= 4,
        detail: `${sysInfo.ram_available_gb.toFixed(1)} GB free / ${sysInfo.ram_total_gb.toFixed(1)} GB total · ${sysInfo.cpu_brand}`,
      })
    }

    setResults(checks)
    setRunning(false)
  }

  const compatModels: OllamaModelInfo[] = appState.ollamaModelInfos

  return (
    <div className="page-stack">
      <section className="page-intro g-card">
        <h2>System Doctor</h2>
        <p>Checks that GERISABET dependencies are running and properly configured.</p>
      </section>

      <section className="g-card">
        <div className="doctor-results">
          {running && <p>Checking…</p>}
          {results.map((r) => (
            <div key={r.label} className={`doctor-row${r.ok ? '' : ' doctor-row--fail'}`}>
              <span className="doctor-icon">{r.ok ? <CheckIcon size="1.1em" /> : <CrossIcon size="1.1em" />}</span>
              <span className="doctor-label">{r.label}</span>
              {r.detail && <span className="doctor-detail">{r.detail}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="g-btn g-btn-secondary" onClick={runChecks} disabled={running}>
            {running ? 'Checking…' : 'Re-run checks'}
          </button>
          {appState.systemInfo && (
            <button
              className="g-btn g-btn-secondary"
              onClick={() => setShowCompatModal(true)}
            >
              🔬 Model Compatibility
            </button>
          )}
        </div>
      </section>

      {showCompatModal && appState.systemInfo && (
        <SystemCompatibilityModal
          systemInfo={appState.systemInfo}
          models={compatModels}
          onClose={() => setShowCompatModal(false)}
        />
      )}
    </div>
  )
})

Doctor.displayName = 'Doctor'

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    return res.ok
  } catch {
    return false
  }
}

export { Doctor }
