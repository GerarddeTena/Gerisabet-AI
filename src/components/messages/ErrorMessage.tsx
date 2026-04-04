import { memo } from 'react'
import type { ChatMessage } from '../../types/message'

interface ErrorMessageProps {
  message: ChatMessage
}

const ErrorMessage = memo(({ message }: ErrorMessageProps) => (
  <li className="message error-msg">
    <strong>Error:</strong>
    <span className="error-message-content">{message.content}</span>
  </li>
))

ErrorMessage.displayName = 'ErrorMessage'

export { ErrorMessage }
