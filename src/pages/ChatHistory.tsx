import { memo } from "react";
import DrawerChatHistory from "@/components/DrawerChatHistory";
import { ChatMessage } from "@/types/interfaces";

interface ChatHistoryPageProps {
  chatHistory: ChatMessage[];
  onClearHistory: () => void;
  onExportHistory: () => void;
}

const ChatHistoryPage = memo(({
  chatHistory,
  onClearHistory,
  onExportHistory,
}: ChatHistoryPageProps) => {
  return (
	<div className="page-stack">
	  <section className="page-intro">
		<h2>History</h2>
		<p>Review, export, or clear the current chat session without changing the existing chat behavior.</p>
	  </section>

	  <DrawerChatHistory
		chatHistory={chatHistory}
		onClearHistory={onClearHistory}
		onExportHistory={onExportHistory}
	  />
	</div>
  );
});

ChatHistoryPage.displayName = "ChatHistoryPage";

export default ChatHistoryPage;


