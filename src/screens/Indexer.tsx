import { memo } from 'react'
import { DatabaseManager, SkillsManager } from '../components'
import { setAppState } from '../state/AppStateStore'

const Indexer = memo(() => {
  function handleIndexingChange(state: boolean) {
    setAppState((prev) => ({ ...prev, isIndexing: state }))
  }

  return (
    <div className="page-stack">
      <section className="page-intro g-card">
        <h2>Indexer</h2>
        <p>Manage both the document library and Markdown skills sources from a dedicated routed view.</p>
      </section>

      <DatabaseManager onIndexingChange={handleIndexingChange} />
      <SkillsManager onIndexingChange={handleIndexingChange} />
    </div>
  )
})

Indexer.displayName = 'Indexer'

export { Indexer }
