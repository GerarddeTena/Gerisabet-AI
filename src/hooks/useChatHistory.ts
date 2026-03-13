import { useCallback } from "react";
import { ChatMessage } from "@/types/interfaces";

export function useChatHistory() {
  const exportAsJSON = useCallback((chatHistory: ChatMessage[]) => {
    const dataStr = JSON.stringify(chatHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-history-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const getFormattedHistory = useCallback((chatHistory: ChatMessage[]): string => {
    if (chatHistory.length === 0) return "";
    return chatHistory
      .map(msg => `${msg.role === "user" ? "You" : "GerisabetAI"}: ${msg.text}`)
      .join("\n\n");
  }, []);

  const getLastNMessages = useCallback((chatHistory: ChatMessage[], n: number): ChatMessage[] => {
    return chatHistory.slice(-n);
  }, []);

  return {
    exportAsJSON,
    getFormattedHistory,
    getLastNMessages,
  };
}
