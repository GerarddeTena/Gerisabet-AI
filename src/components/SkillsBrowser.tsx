import { memo, useState, useEffect, useCallback } from 'react'
import { loadSkillsDir } from '../services/skills/loadSkillsDir'
import type { SkillEntry } from '../services/skills/loadSkillsDir'
import { useAppState } from '../hooks/useAppState'

interface SkillGroup {
  type: string
  skills: SkillEntry[]
}

const SkillsBrowser = memo(() => {
  const appState = useAppState()
  const skillsPath = appState.settings.skillsPath

  const [groups, setGroups] = useState<SkillGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  const load = useCallback(async (path: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const dir = await loadSkillsDir(path)
      const byType = new Map<string, SkillEntry[]>()

      for (const skill of dir.skills) {
        const list = byType.get(skill.skillType) ?? []
        list.push(skill)
        byType.set(skill.skillType, list)
      }

      // rules always first
      const sorted: SkillGroup[] = []
      if (byType.has('rules')) {
        sorted.push({ type: 'rules', skills: byType.get('rules')! })
        byType.delete('rules')
      }
      for (const [type, skills] of byType) {
        sorted.push({ type, skills })
      }

      setGroups(sorted)
    } catch (err) {
      setError(`Failed to load skills: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (skillsPath) load(skillsPath)
    else setGroups([])
  }, [skillsPath, load])

  const toggleSkill = useCallback((key: string) => {
    setExpandedSkill((prev) => (prev === key ? null : key))
  }, [])

  if (!skillsPath) {
    return (
      <div className="skills-browser-empty">
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
          No skills directory configured. Set one in the <strong>Skills</strong> section above and index it.
        </p>
      </div>
    )
  }

  return (
    <div className="skills-browser">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0 }}>📂 Indexed Skills</h4>
        <button
          className="g-btn g-btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
          onClick={() => load(skillsPath)}
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : '↺ Refresh'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}

      {!isLoading && groups.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
          No skills found. Index your skills directory first.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.type} className="skill-group" style={{ marginBottom: '0.75rem' }}>
          <div
            className="skill-group-header"
            style={{
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: group.type === 'rules' ? 'var(--color-accent, #7c6af7)' : 'var(--color-muted)',
              marginBottom: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {group.type === 'rules' ? '⚡' : '📄'} {group.type}
            <span style={{ fontWeight: 400, opacity: 0.7 }}>({group.skills.length})</span>
          </div>

          {group.skills.map((skill) => {
            const key = `${skill.skillType}/${skill.name}`
            const isExpanded = expandedSkill === key
            return (
              <div key={key} className="skill-item" style={{ marginBottom: '0.25rem' }}>
                <button
                  className="skill-item-toggle g-btn"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.3rem 0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-surface-raised, var(--color-surface))',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                  }}
                  onClick={() => toggleSkill(key)}
                  aria-expanded={isExpanded}
                >
                  <span>{skill.name}</span>
                  <span style={{ opacity: 0.5 }}>{isExpanded ? '▾' : '▸'}</span>
                </button>

                {isExpanded && skill.content && (
                  <pre
                    style={{
                      margin: '0.25rem 0 0',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      overflowX: 'auto',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'var(--color-text)',
                    }}
                  >
                    {skill.content}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
})

SkillsBrowser.displayName = 'SkillsBrowser'

export { SkillsBrowser }
