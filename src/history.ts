const MAX_HISTORY_ITEMS = 100

export interface HistoryEntry {
  display: string
  timestamp: number
}

const sessionHistory: HistoryEntry[] = []
let historyIndex = -1

export function addToHistory(command: string): void {
  if (!command.trim()) return

  const last = sessionHistory[sessionHistory.length - 1]
  if (last?.display === command) return

  sessionHistory.push({
    display: command,
    timestamp: Date.now(),
  })

  if (sessionHistory.length > MAX_HISTORY_ITEMS) {
    sessionHistory.shift()
  }

  historyIndex = sessionHistory.length
}

export function getHistory(): HistoryEntry[] {
  return [...sessionHistory].reverse()
}

export function navigateHistoryUp(current: string): string {
  if (sessionHistory.length === 0) return current

  if (historyIndex === sessionHistory.length && current !== '') {
    historyIndex = sessionHistory.length
  }

  if (historyIndex > 0) {
    historyIndex--
  }

  return sessionHistory[historyIndex]?.display ?? current
}

export function navigateHistoryDown(_current: string): string {
  if (historyIndex < sessionHistory.length - 1) {
    historyIndex++
    return sessionHistory[historyIndex]?.display ?? ''
  }

  historyIndex = sessionHistory.length
  return ''
}
export function resetHistoryNavigation(): void {
  historyIndex = sessionHistory.length
}

export function clearHistory(): void {
  sessionHistory.length = 0
  historyIndex = 0
}

export function getHistoryCount(): number {
  return sessionHistory.length
}

export function searchHistory(query: string): HistoryEntry[] {
  const lower = query.toLowerCase()
  return [...sessionHistory]
    .reverse()
    .filter((entry) => entry.display.toLowerCase().includes(lower))
    .slice(0, 20)
}
