import { useMemo } from 'react'
import { formatTokenSummary, getTotalInputTokens, getTotalOutputTokens } from '../token-tracker'
import { formatTokenCount } from '../utils/tokens'
import { useAppStateSelector } from './useAppState'

export interface TokenSummary {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  formattedInput: string
  formattedOutput: string
  formattedTotal: string
  summaryText: string
}

export function useTokenSummary(): TokenSummary {
  const stats = useAppStateSelector((s) => s.stats)

  return useMemo(
    () => {
      const input = stats?.totalTokensIn ?? getTotalInputTokens()
      const output = stats?.totalTokensOut ?? getTotalOutputTokens()
      const total = input + output

      return {
        inputTokens: input,
        outputTokens: output,
        totalTokens: total,
        formattedInput: formatTokenCount(input),
        formattedOutput: formatTokenCount(output),
        formattedTotal: formatTokenCount(total),
        summaryText: formatTokenSummary(),
      }
    },
    [stats]
  )
}
