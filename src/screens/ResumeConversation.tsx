import { memo, useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { formatRelativeTime } from '../utils/format'
import type { SessionId } from '../types/ids'
import { logError } from '../utils/log'

interface SessionSummary {
  id: SessionId
  name?: string
  createdAt: number
  messageCount: number
}

interface ResumeConversationProps {
  onSelect: (sessionId: SessionId) => void
  onNewConversation: () => void
}

const ResumeConversation = memo(({ onSelect, onNewConversation }: ResumeConversationProps) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const result = await invoke<SessionSummary[]>('list_sessions')
      setSessions(result ?? [])
    } catch (err) {
      logError(err, 'ResumeConversation.loadSessions')
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = useCallback(async (e: React.MouseEvent, id: SessionId) => {
    e.stopPropagation()
    try {
      await invoke('delete_session', { sessionId: id })
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      logError(err, 'ResumeConversation.handleDelete')
    }
  }, [])

  return (
    <div className="page-stack">
      <section className="page-intro g-card">
        <h2>Conversations</h2>
        <p>Resume a previous conversation or start a new one.</p>
      </section>

      <section className="g-card">
        <button
          className="g-btn g-btn-primary"
          onClick={onNewConversation}
          style={{ marginBottom: '1rem' }}
        >
          + New Conversation
        </button>

        {isLoading && <p>Loading sessions…</p>}

        {!isLoading && sessions.length === 0 && (
          <p className="empty-state">No previous conversations found.</p>
        )}

        <ul className="session-list">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="session-item"
              onClick={() => onSelect(session.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
            >
              <div className="session-item-info">
                <span className="session-item-name">
                  {session.name ?? `Session ${session.id.slice(0, 8)}`}
                </span>
                <span className="session-item-meta">
                  {formatRelativeTime(session.createdAt)} · {session.messageCount} messages
                </span>
              </div>
              <button
                className="session-item-delete g-btn"
                onClick={(e) => handleDelete(e, session.id)}
                aria-label="Delete session"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
})

ResumeConversation.displayName = 'ResumeConversation'

export { ResumeConversation }
