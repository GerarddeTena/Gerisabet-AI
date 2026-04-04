import {invoke} from "@tauri-apps/api/core";
import {useCallback, useEffect, useRef, useState} from "react";
import {ChatMessage, ChatSession, MessageMetadata, Role, UseChatHistoryReturn} from "@/types/interfaces.ts";

const PAGE_SIZE = 30;
const DEFAULT_SESSION_TITLE = "Nueva conversación";

export function useChatHistory(): UseChatHistoryReturn {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const optimisticMap = useRef<Map<string, string>>(new Map());
    const currentPage = useRef(0);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);

    const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
    const messages = activeSession?.messages ?? [];

    useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            setIsLoading(true);
            setError(null);

            try {
                const loadedSessions = await invoke<ChatSession[]>("load_chat_history", {
                    limit: PAGE_SIZE,
                });

                const savedActiveId = await invoke<string | null>("get_active_session");

                if (cancelled) return;

                setSessions(loadedSessions);

                if (
                    savedActiveId &&
                    loadedSessions.some((s) => s.id === savedActiveId)
                ) {
                    setActiveSessionId(savedActiveId);
                    setHasMoreMessages(
                        (loadedSessions.find((s) => s.id === savedActiveId)?.messages
                            .length ?? 0) === PAGE_SIZE
                    );
                } else if (loadedSessions.length > 0) {
                    setActiveSessionId(loadedSessions[0].id);
                } else {
                    const newSession = await invoke<ChatSession>("create_session", {
                        title: DEFAULT_SESSION_TITLE,
                    });
                    if (!cancelled) {
                        setSessions([newSession]);
                        setActiveSessionId(newSession.id);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(`Error cargando historial: ${err}`);
                    console.error("[useChatHistory] Error en hidratación:", err);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        hydrate();
        return () => {
            cancelled = true;
        };
    }, []);




    const selectSession = useCallback(
        async (sessionId: string) => {
            if (sessionId === activeSessionId) return;

            setActiveSessionId(sessionId);
            currentPage.current = 0;


            try {
                await invoke("set_active_session", {sessionId});
            } catch (err) {
                console.error("[useChatHistory] Error guardando sesión activa:", err);
            }
        },
        [activeSessionId]
    );

    const createSession = useCallback(
        async (title: string = DEFAULT_SESSION_TITLE): Promise<ChatSession> => {
            const newSession = await invoke<ChatSession>("create_session", {title});
            setSessions((prev) => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
            currentPage.current = 0;
            setHasMoreMessages(false);
            return newSession;
        },
        []
    );

    const deleteSession = useCallback(
        async (sessionId: string) => {
            await invoke("delete_session", {sessionId});

            setSessions((prev) => {
                const updated = prev.filter((s) => s.id !== sessionId);

                if (sessionId === activeSessionId && updated.length > 0) {
                    setActiveSessionId(updated[0].id);
                } else if (updated.length === 0) {
                    setActiveSessionId(null);
                }

                return updated;
            });
        },
        [activeSessionId]
    );




    const saveMessage = useCallback(
        async (
            role: Role,
            content: string,
            metadata?: MessageMetadata
        ): Promise<ChatMessage | null> => {
            if (!activeSessionId) {
                console.warn("[useChatHistory] saveMessage: no hay sesión activa");
                return null;
            }

            try {
                const saved = await invoke<ChatMessage>("save_message", {
                    sessionId: activeSessionId,
                    role,
                    content,
                    metadata: metadata ?? null,
                });

                setSessions((prev) =>
                    prev.map((s) =>
                        s.id === activeSessionId
                            ? {
                                ...s,
                                messages: [...s.messages, saved],
                                updated_at: saved.timestamp ?? new Date().toISOString(),
                            }
                            : s
                    )
                );

                return saved;
            } catch (err) {
                console.error("[useChatHistory] Error guardando mensaje:", err);
                setError(`Error guardando mensaje: ${err}`);
                return null;
            }
        },
        [activeSessionId]
    );

    
    const addOptimisticMessage = useCallback(
        (role: Role, partialContent: string): string => {
            const tempId = `temp-${Date.now()}-${Math.random()}`;
            const optimistic: ChatMessage = {
                id: tempId,
                session_id: activeSessionId ?? "",
                role,
                content: partialContent,
                timestamp: new Date().toISOString(),
            };

            setSessions((prev) =>
                prev.map((s) =>
                    s.id === activeSessionId
                        ? {...s, messages: [...s.messages, optimistic]}
                        : s
                )
            );

            return tempId;
        },
        [activeSessionId]
    );

    
    const finalizeMessage = useCallback(
        async (
            tempId: string,
            finalContent: string,
            metadata?: MessageMetadata
        ) => {
            if (!activeSessionId) return;

            try {
                const saved = await invoke<ChatMessage>("save_message", {
                    sessionId: activeSessionId,
                    role: "assistant" as Role,
                    content: finalContent,
                    metadata: metadata ?? null,
                });

                setSessions((prev) =>
                    prev.map((s) => {
                        if (s.id !== activeSessionId) return s;
                        return {
                            ...s,
                            messages: s.messages.map((m) =>
                                m.id === tempId ? saved : m
                            ),
                            updated_at: saved.timestamp ?? new Date().toISOString(),
                        };
                    })
                );

                optimisticMap.current.set(tempId, saved.id);
            } catch (err) {
                console.error("[useChatHistory] Error finalizando mensaje:", err);
                setSessions((prev) =>
                    prev.map((s) => {
                        if (s.id !== activeSessionId) return s;
                        return {
                            ...s,
                            messages: s.messages.filter((m) => m.id !== tempId),
                        };
                    })
                );
                setError(`Error persistiendo mensaje: ${err}`);
            }
        },
        [activeSessionId]
    );




    const loadMoreMessages = useCallback(async () => {
        if (!activeSessionId || !hasMoreMessages) return;

        const nextPage = currentPage.current + 1;

        try {
            const older = await invoke<ChatMessage[]>("load_messages_page", {
                sessionId: activeSessionId,
                pageSize: PAGE_SIZE,
                page: nextPage,
            });

            if (older.length === 0) {
                setHasMoreMessages(false);
                return;
            }

            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== activeSessionId) return s;
                    return {...s, messages: [...older, ...s.messages]};
                })
            );

            currentPage.current = nextPage;
            setHasMoreMessages(older.length === PAGE_SIZE);
        } catch (err) {
            console.error("[useChatHistory] Error cargando más mensajes:", err);
        }
    }, [activeSessionId, hasMoreMessages]);

    return {
        sessions,
        activeSession,
        messages,
        isLoading,
        error,
        selectSession,
        createSession,
        deleteSession,
        saveMessage,
        addOptimisticMessage,
        finalizeMessage,
        loadMoreMessages,
        hasMoreMessages,
    };
}

