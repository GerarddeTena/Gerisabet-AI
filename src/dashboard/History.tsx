import { memo } from "react";
import { ChatMessage } from "./Displayer";

interface ChatHistoryProps {
  chatHistory: ChatMessage[];
}

const ChatHistory = memo(({ chatHistory }: ChatHistoryProps) => {
  return (
    <ul>
      {chatHistory.map(({ text }) => <li>{text}</li>)}
    </ul>
  )
});

export default ChatHistory;
