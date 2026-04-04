import { memo } from 'react'

interface StatusBarProps {
  model: string
  isIndexing?: boolean
  isGenerating?: boolean
}

const StatusBar = memo(({ model, isIndexing = false, isGenerating = false }: StatusBarProps) => (
  <div className="status-bar" aria-label="Status">
    <span className="status-model">{model}</span>
    {isIndexing && <span className="status-badge status-badge--indexing">Indexing…</span>}
    {isGenerating && <span className="status-badge status-badge--generating">Generating…</span>}
  </div>
))

StatusBar.displayName = 'StatusBar'

export { StatusBar }
