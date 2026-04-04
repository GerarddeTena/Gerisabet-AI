import type { ChatMessage } from '@/types'

const STARTER_PROMPTS = [
  'What can GERISABET help me with?',
  'Search my documents for...',
  'Summarize the main topics in my library',
  'What skills are available?',
  'Show me the status of the knowledge base',
]

export function getStarterPrompts(): string[] {
  return STARTER_PROMPTS
}

export function getSuggestionsForContext(
  messages: ChatMessage[]
): string[] {
  if (messages.length === 0) {
    return STARTER_PROMPTS.slice(0, 3)
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')

  if (!lastAssistant) return []

  const content = lastAssistant.content.toLowerCase()

  if (content.includes('document') || content.includes('library')) {
    return ['Tell me more', 'Search for related topics', 'Show the source']
  }

  if (content.includes('skill') || content.includes('rules')) {
    return ['List all skills', 'Show skill details', 'How are skills used?']
  }

  return []
}

export function shouldShowSuggestions(messages: ChatMessage[]): boolean {
  return messages.length < 3
}
