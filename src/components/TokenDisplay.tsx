import { memo } from 'react'
import { formatTokenCount } from '../utils/tokens'
import { useTokenSummary } from '../hooks/useTokenSummary'

const TokenDisplay = memo(() => {
  const { inputTokens, outputTokens, totalTokens } = useTokenSummary()

  if (totalTokens === 0) return null

  return (
    <div className="token-display" aria-label="Token usage">
      <span className="token-display-item">
        ↑ {formatTokenCount(inputTokens)}
      </span>
      <span className="token-display-separator">·</span>
      <span className="token-display-item">
        ↓ {formatTokenCount(outputTokens)}
      </span>
    </div>
  )
})

TokenDisplay.displayName = 'TokenDisplay'

export { TokenDisplay }
