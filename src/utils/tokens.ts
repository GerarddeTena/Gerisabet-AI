const CHARS_PER_TOKEN = 4

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function estimateTokensForMessages(
  messages: Array<{ content: string }>
): number {
  return messages.reduce(
    (acc, m) => acc + estimateTokens(m.content) + 4,
    0
  )
}

export function isWithinTokenBudget(
  text: string,
  budget: number
): boolean {
  return estimateTokens(text) <= budget
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1_000_000).toFixed(2)}M`
}

export function getContextWindowUsagePercent(
  used: number,
  total: number
): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}
