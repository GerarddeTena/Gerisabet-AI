import { memo, useCallback } from "react";
import { ChatMessage } from "@/types/interfaces";
import { useChatHistory } from "@/hooks/useChatHistory";

interface DrawerChatHistoryProps {
  chatHistory: ChatMessage[];
  onClearHistory: () => void;
  onExportHistory: () => void;
}

const DrawerChatHistory = memo(({
  chatHistory,
  onClearHistory,
  onExportHistory,
}: DrawerChatHistoryProps) => {
  const { exportAsJSON } = useChatHistory();

  const handleExport = useCallback(() => {
    exportAsJSON(chatHistory);
    onExportHistory();
  }, [chatHistory, onExportHistory, exportAsJSON]);

  const handleClear = useCallback(() => {
    if (chatHistory.length === 0) return;
    if (window.confirm("Are you sure you want to clear the chat history? This cannot be undone.")) {
      onClearHistory();
    }
  }, [chatHistory.length, onClearHistory]);

  return (
    <div className="drawer-section">
      <h3>Chat History</h3>
      <p>{chatHistory.length} message{chatHistory.length !== 1 ? "s" : ""} in this session.</p>

      <div className="drawer-button-group">
        <button
          onClick={handleExport}
          disabled={chatHistory.length === 0}
          className="drawer-action-button success"
        >
          📥 Export as JSON
        </button>
        <button
          onClick={handleClear}
          disabled={chatHistory.length === 0}
          className="drawer-action-button danger"
        >
          🗑️ Clear History
        </button>
      </div>

      {chatHistory.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h4 style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
            marginTop: 0,
          }}>
            Recent Messages ({Math.min(chatHistory.length, 5)} of {chatHistory.length})
          </h4>
          <ul className="chat-history-list">
            {chatHistory.slice(-5).map((msg) => (
              <li key={msg.id} className="chat-history-item">
                <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
                {msg.text.substring(0, 150)}
                {msg.text.length > 150 ? "..." : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {chatHistory.length === 0 && (
        <div className="drawer-empty">
          <p>No chat messages yet. Start asking questions to begin a conversation!</p>
        </div>
      )}
    </div>
  );
});

DrawerChatHistory.displayName = "DrawerChatHistory";

export default DrawerChatHistory;
