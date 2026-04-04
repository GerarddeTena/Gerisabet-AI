import { useState, useCallback, useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import Layout from "@/layout/Layout";
import ChatHistoryPage from "@/pages/ChatHistory";
import { Indexer, Doctor, ResumeConversation } from "./screens";
import { REPL } from "./screens/REPL";
import { ChatMessage as LegacyMessage } from "./types/interfaces";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAppState } from "./hooks/useAppState";

export default function App() {
    const {
        sessions,
        messages,
        isLoading,
        saveMessage,
        finalizeMessage,
        deleteSession,
        createSession,
        selectSession,
        activeSession,
    } = useChatHistory();

    const { isIndexing } = useAppState();

    const [localHistory, setLocalHistory] = useState<LegacyMessage[]>([]);

    const aiTempIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (isLoading) return;

        const hydrated: LegacyMessage[] = messages.map((msg) => ({
            ...msg,
            role: msg.role === "user" ? "user" : "assistant",
        }));

        setLocalHistory(hydrated);
    }, [isLoading]);

    const handleChatHistoryChange = useCallback(
        (
            updater:
                | LegacyMessage[]
                | ((prev: LegacyMessage[]) => LegacyMessage[])
        ) => {
            setLocalHistory((prev) => {
                const next =
                    typeof updater === "function" ? updater(prev) : updater;

                if (
                    next.length === prev.length + 2 &&
                    next.at(-2)?.role === "user" &&
                    next.at(-1)?.role === "assistant" &&
                    next.at(-1)?.content === ""
                ) {
                    const userText = next.at(-2)!.content;
                    saveMessage("user", userText);
                }

                return next;
            });
        },
        [saveMessage]
    );

    useEffect(() => {
        let unlisten: (() => void) | undefined;

        listen<string>("ai_done", async (event) => {
            const fullContent = event.payload;
            if (!fullContent) return;

            await finalizeMessage(
                aiTempIdRef.current ?? `temp-${Date.now()}`,
                fullContent
            );

            aiTempIdRef.current = null;
        }).then((fn) => {
            unlisten = fn;
        });

        return () => { unlisten?.(); };
    }, [finalizeMessage]);

    const handleClearHistory = useCallback(async () => {
        if (activeSession) {
            await deleteSession(activeSession.id);
        }
        await createSession();
        setLocalHistory([]);
    }, [activeSession, deleteSession, createSession]);

    const handleExportHistory = useCallback(() => {
        const blob = new Blob([JSON.stringify(messages, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gerisabet-chat-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [messages]);

    if (isLoading) {
        return (
            <div className="app-loading">
                Cargando historial…
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route
                    index
                    element={
                        <REPL
                            disabled={isIndexing}
                            chatHistory={localHistory}
                            onChatHistoryChange={handleChatHistoryChange}
                        />
                    }
                />
                <Route
                    path="history"
                    element={
                        <ChatHistoryPage
                            chatHistory={localHistory}
                            onClearHistory={handleClearHistory}
                            onExportHistory={handleExportHistory}
                        />
                    }
                />
                <Route
                    path="indexer"
                    element={<Indexer />}
                />
                <Route
                    path="doctor"
                    element={<Doctor />}
                />
                <Route
                    path="resume"
                    element={
                        <ResumeConversation
                            sessions={sessions}
                            activeSessionId={activeSession?.id ?? null}
                            onSelect={selectSession}
                            onNewConversation={createSession}
                            onDelete={deleteSession}
                        />
                    }
                />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

