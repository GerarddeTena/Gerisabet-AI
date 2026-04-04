import { memo } from 'react'
import type { ChatMessage } from '../../types/message'

interface UserMessageProps {
  message: ChatMessage
}

const UserMessage = memo(({ message }: UserMessageProps) => (
  <li className="message user-msg">
    <strong>You:</strong>
    <span className="user-message-content">{message.content}</span>
  </li>
))

UserMessage.displayName = 'UserMessage'

export { UserMessage }
