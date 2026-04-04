import { memo, useMemo } from 'react'
import type { ChatMessage } from '../../types/message'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { ErrorMessage } from './ErrorMessage'
import { GerisabetLoader } from '../GerisabetLoader'

const VIRTUALIZE_THRESHOLD = 100

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  streamingMessageId?: string | null
}

const MessageList = memo(({ messages, isLoading = false, streamingMessageId }: MessageListProps) => {
  const visible = useMemo(() => {
    if (messages.length > VIRTUALIZE_THRESHOLD) {
      return messages.slice(-VIRTUALIZE_THRESHOLD)
    }
    return messages
  }, [messages])

  const hiddenCount = messages.length - visible.length

  return (
    <>
      {hiddenCount > 0 && (
        <p className="hidden-messages-notice">
          Showing last {visible.length} of {messages.length} messages
        </p>
      )}
      <ul className="chat-list">
        {visible.map((msg) => {
          if (msg.role === 'user') {
            return <UserMessage key={msg.id} message={msg} />
          }
          if (msg.role === 'assistant') {
            return (
              <AssistantMessage
                key={msg.id}
                message={msg}
                isStreaming={msg.id === streamingMessageId}
              />
            )
          }
          if (msg.role === 'system') {
            return <ErrorMessage key={msg.id} message={{ ...msg, content: msg.content }} />
          }
          return null
        })}
        {isLoading && <GerisabetLoader />}
      </ul>
    </>
  )
})

MessageList.displayName = 'MessageList'

export { MessageList }
