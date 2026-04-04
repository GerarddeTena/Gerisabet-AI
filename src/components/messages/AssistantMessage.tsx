import { memo } from 'react'
import MarkdownRenderer from '../MarkdownRenderer'
import type { ChatMessage } from '../../types/message'

interface AssistantMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

const AssistantMessage = memo(({ message, isStreaming = false }: AssistantMessageProps) => (
  <li className="message ai-msg">
    <strong>GerisabetAI:</strong>
    <MarkdownRenderer content={message.content} />
    {isStreaming && <span className="streaming-indicator" aria-label="Generating..." />}
  </li>
))

AssistantMessage.displayName = 'AssistantMessage'

export { AssistantMessage }
