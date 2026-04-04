/**
 * Model compatibility utilities — maps parameter count to RAM requirements
 * and produces a run verdict (comfortable / slow / cannot_run) based on
 * the available RAM reported by `scan_system_info`.
 */

export type CompatibilityVerdict = 'comfortable' | 'slow' | 'cannot_run' | 'unknown'

export interface ModelCompatibility {
  modelName: string
  estimatedParams: string
  minRamGb: number
  recommendedRamGb: number
  verdict: CompatibilityVerdict
  verdictLabel: string
}

/** Ordered tiers from smallest to largest. */
const RAM_TIERS = [
  { paramsLabel: '~1B–3B',   minRam:  2, recommendedRam:  4, keywords: ['1b', '1.5b', '2b', '3b'] },
  { paramsLabel: '~7B–8B',   minRam:  5, recommendedRam:  8, keywords: ['7b', '8b'] },
  { paramsLabel: '~13B–14B', minRam:  9, recommendedRam: 16, keywords: ['13b', '14b'] },
  { paramsLabel: '~32B–34B', minRam: 20, recommendedRam: 32, keywords: ['32b', '34b'] },
  { paramsLabel: '~70B–72B', minRam: 40, recommendedRam: 64, keywords: ['70b', '72b'] },
] as const

function detectTier(modelName: string) {
  const lower = modelName.toLowerCase()
  for (const tier of RAM_TIERS) {
    if (tier.keywords.some((k) => lower.includes(k))) return tier
  }
  return null
}

function verdictFor(availableRamGb: number, minRam: number, recommendedRam: number): CompatibilityVerdict {
  if (availableRamGb >= recommendedRam) return 'comfortable'
  if (availableRamGb >= minRam) return 'slow'
  return 'cannot_run'
}

const VERDICT_LABELS: Record<CompatibilityVerdict, string> = {
  comfortable: '✅ Comfortable',
  slow: '⚠️ Runs (slow)',
  cannot_run: '❌ Cannot run',
  unknown: '❓ Unknown size',
}

export function getModelCompatibility(
  modelName: string,
  availableRamGb: number
): ModelCompatibility {
  const tier = detectTier(modelName)
  if (!tier) {
    return {
      modelName,
      estimatedParams: 'Unknown',
      minRamGb: 0,
      recommendedRamGb: 0,
      verdict: 'unknown',
      verdictLabel: VERDICT_LABELS.unknown,
    }
  }

  const verdict = verdictFor(availableRamGb, tier.minRam, tier.recommendedRam)
  return {
    modelName,
    estimatedParams: tier.paramsLabel,
    minRamGb: tier.minRam,
    recommendedRamGb: tier.recommendedRam,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
  }
}

export function getCompatibilityColor(verdict: CompatibilityVerdict): string {
  switch (verdict) {
    case 'comfortable': return 'var(--color-success, #4caf50)'
    case 'slow':        return 'var(--color-warning, #ff9800)'
    case 'cannot_run':  return 'var(--color-error, #f44336)'
    default:            return 'var(--color-muted, #888)'
  }
}
