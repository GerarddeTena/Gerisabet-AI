import { useState, useCallback } from "react";
import { Form } from "./form";
import { Title, Drawer } from "@/components";
import { ChatMessage } from "./types/interfaces";

export default function App() {
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleClearHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  const handleExportHistory = useCallback(() => {
    // Callback after export - can be used for logging or UI feedback
  }, []);

  return (
    <div className="app-layout">
      <Title />
      <Drawer
        isIndexing={isIndexing}
        onIndexingChange={setIsIndexing}
        chatHistory={chatHistory}
        onClearHistory={handleClearHistory}
        onExportHistory={handleExportHistory}
      />
      <Form
        disabled={isIndexing}
        chatHistory={chatHistory}
        onChatHistoryChange={setChatHistory}
      />
    </div>
  );
}
