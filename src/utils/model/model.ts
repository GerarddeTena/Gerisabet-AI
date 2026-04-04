const OLLAMA_BASE_URL = 'http://localhost:11434'

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) return []
    const data = await response.json() as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) ?? []
  } catch {
    return []
  }
}

export function formatModelName(name: string): string {
  return name
    .replace(/:latest$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getModelShortName(name: string): string {
  return name.replace(/:.*$/, '')
}

export function isEmbeddingModel(name: string): boolean {
  return name.includes('embed') || name.includes('nomic')
}

export function isChatModel(name: string): boolean {
  return !isEmbeddingModel(name)
}

export function getDefaultModel(): string {
  return localStorage.getItem('gerisabet.lastModel') ?? 'llama3'
}

export function saveLastModel(model: string): void {
  localStorage.setItem('gerisabet.lastModel', model)
}
