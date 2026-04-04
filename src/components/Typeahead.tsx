import { memo } from 'react'
import type { Command } from '../types/command'

interface TypeaheadProps {
  suggestions: Command[]
  onSelect: (command: Command) => void
  activeIndex?: number
}

const Typeahead = memo(({ suggestions, onSelect, activeIndex = 0 }: TypeaheadProps) => {
  if (suggestions.length === 0) return null

  return (
    <ul className="typeahead-list" role="listbox" aria-label="Command suggestions">
      {suggestions.map((cmd, idx) => (
        <li
          key={cmd.name}
          role="option"
          aria-selected={idx === activeIndex}
          className={`typeahead-item${idx === activeIndex ? ' typeahead-item--active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(cmd)
          }}
        >
          <span className="typeahead-name">/{cmd.name}</span>
          <span className="typeahead-description">{cmd.description}</span>
        </li>
      ))}
    </ul>
  )
})

Typeahead.displayName = 'Typeahead'

export { Typeahead }
