import { invoke } from '@tauri-apps/api/core'
import { logError } from './log'

export async function loadGerisabetMd(directoryPath?: string): Promise<string | null> {
  try {
    const content = await invoke<string | null>('load_gerisabet_md', {
      directoryPath: directoryPath ?? null,
    })
    return content
  } catch (err) {
    logError(err, 'loadGerisabetMd')
    return null
  }
}

export function parseGerisabetMd(content: string): {
  instructions: string
  sections: Record<string, string>
} {
  const sections: Record<string, string> = {}
  const lines = content.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/)
    if (match) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim()
      }
      currentSection = match[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim()
  }

  return {
    instructions: content,
    sections,
  }
}
