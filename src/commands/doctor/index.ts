import type { LocalCommand } from '@/types'

const doctorCommand: LocalCommand = {
  name: 'doctor',
  type: 'local',
  description: 'Check GERISABET system health (Ollama, Qdrant, models)',
  async execute(_args, _context) {
    const checks: string[] = ['## GERISABET Doctor', '']

    const ollamaOk = await checkOllama()
    checks.push(`**Ollama:** ${ollamaOk ? 'Running' : 'Not reachable at http://localhost:11434'}`)

    const qdrantOk = await checkQdrant()
    checks.push(`**Qdrant:** ${qdrantOk ? 'Running' : 'Not reachable at http://127.0.0.1:6334'}`)

    const models = await getOllamaModels()
    if (models.length > 0) {
      checks.push(`**Available Models:** ${models.join(', ')}`)
    } else {
      checks.push(`**Available Models:** None found (run \`ollama pull llama3\`)`)
    }

    const embedOk = models.some((m) => m.includes('nomic') || m.includes('embed'))
    checks.push(`**Embedding Model:** ${embedOk ? 'Found' : 'nomic-embed-text not found (required for indexing)'}`)

    return {
      type: 'markdown',
      content: checks.join('\n'),
    }
  },
}

async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    return res.ok
  } catch {
    return false
  }
}

async function checkQdrant(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:6334/collections')
    return res.ok
  } catch {
    return false
  }
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    if (!res.ok) return []
    const data = await res.json() as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) ?? []
  } catch {
    return []
  }
}

export default doctorCommand
