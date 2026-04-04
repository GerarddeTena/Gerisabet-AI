import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../utils/format'
import type { ChatSession } from '../types/session'

interface ResumeConversationProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => Promise<void>
  onNewConversation: () => Promise<ChatSession>
  onDelete: (sessionId: string) => Promise<void>
}

const ResumeConversation = memo(({
  sessions,
  activeSessionId,
  onSelect,
  onNewConversation,
  onDelete,
}: ResumeConversationProps) => {
  const navigate = useNavigate()

  const handleSelect = useCallback(async (sessionId: string) => {
    await onSelect(sessionId)
    navigate('/')
  }, [onSelect, navigate])

  const handleNewConversation = useCallback(async () => {
    await onNewConversation()
    navigate('/')
  }, [onNewConversation, navigate])

  const handleDelete = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    await onDelete(sessionId)
  }, [onDelete])

  return (
    <div className="page-stack">
      <section className="page-intro g-card">
        <h2>Conversations</h2>
        <p>Resume a previous conversation or start a new one.</p>
      </section>

      <section className="g-card">
        <button
          className="g-btn g-btn-primary"
          onClick={handleNewConversation}
          style={{ marginBottom: '1rem' }}
        >
          + New Conversation
        </button>

        {sessions.length === 0 && (
          <p className="empty-state" style={{ color: 'var(--color-muted)' }}>No previous conversations found.</p>
        )}

        <ul className="session-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <li
                key={session.id}
                className={`session-item${isActive ? ' session-item--active' : ''}`}
                onClick={() => handleSelect(session.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(session.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--color-accent, #7c6af7)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-surface-raised, var(--color-surface))' : 'transparent',
                }}
              >
                <div className="session-item-info">
                  <span className="session-item-name" style={{ fontWeight: isActive ? 600 : 400, display: 'block' }}>
                    {session.title || `Session ${session.id.slice(0, 8)}`}
                  </span>
                  <span className="session-item-meta" style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                    {formatRelativeTime(session.updated_at ?? session.created_at)}
                    {' · '}
                    {session.messages.length} {session.messages.length === 1 ? 'message' : 'messages'}
                  </span>
                </div>
                <button
                  className="session-item-delete g-btn"
                  onClick={(e) => handleDelete(e, session.id)}
                  aria-label="Delete session"
                  style={{ opacity: 0.6, flexShrink: 0 }}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
})

ResumeConversation.displayName = 'ResumeConversation'

export { ResumeConversation }
