import {useEffect, useRef, useState} from "react";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {LogEntry, ProgressEvent} from "@/types/interfaces.ts";

export function useIndexer(
    eventName: string,
    onIndexingChange?: (v: boolean) => void
) {
    const [isIndexing, setIsIndexing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [chunkProgress, setChunkProgress] = useState({
        current: 0, total: 0, file: ""
    });
    const logEndRef = useRef<HTMLDivElement>(null);
    const logIdRef = useRef(0);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [logs]);

    useEffect(() => {
        const unlisten = listen<ProgressEvent>(eventName, (event) => {
            const data = event.payload as ProgressEvent;
            const fileName = data.file.split(/[\\/]/).pop() || data.file;

            if (data.type === "file_start") {
                setChunkProgress({current: 0, total: data.total || 0, file: fileName});
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `📄 Indexing: ${fileName}`,
                    type: "info"
                }]);
            }

            if (data.type === "chunk") {
                setChunkProgress(prev => ({
                    ...prev,
                    current: data.current || 0,
                    total: data.total || 0
                }));
            }

            if (data.type === "file_done") {
                setChunkProgress(prev => ({...prev, current: prev.total}));
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `✅ Completed: ${fileName}`,
                    type: "success"
                }]);
            }

            if (data.type === "file_skipped") {
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `⏭ Already indexed: ${fileName}`,
                    type: "skip"
                }]);
            }

            if (data.type === "file_error") {
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `❌ Error: ${fileName}`,
                    type: "error"
                }]);
            }

            if (data.type === "cancelled") {
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `🛑 Indexing cancelled`,
                    type: "error"
                }]);
                setIsIndexing(false);
                onIndexingChange?.(false);
            }

            if (data.type === "completed") {
                setIsIndexing(false);
                onIndexingChange?.(false);
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `🎉 Done — ${data.new_count ?? 0} chunks, ${data.skipped_count ?? 0} skipped`,
                    type: "success"
                }]);
            }
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, [eventName]);

    const start = async (
        starter: () => Promise<string>,
        startMessage?: string
    ) => {
        try {
            setLogs([]);
            onIndexingChange?.(true);
            setIsIndexing(true);
            if (startMessage) setStatusMessage(startMessage);
            const response = await starter();
            setStatusMessage(`Done! ${response}`);
        } catch (error) {
            setStatusMessage(`Error: ${error}`);
            throw new Error(`Rust error:${error}`);
        } finally {
            setIsIndexing(false);
            onIndexingChange?.(false);
            setChunkProgress({current: 0, total: 0, file: ""});
        }
    };

    const cancel = async () => {
        try {
            await invoke("cancel_indexing");
            setStatusMessage("Cancelling...");
        } catch (error) {
            throw new Error(`cancel_indexing: ${error}` );
        }
    };

    const statusClass = statusMessage.startsWith("Done")
        ? "status-message success"
        : statusMessage.startsWith("Error")
            ? "status-message error"
            : "status-message";

    return {
        isIndexing,
        statusMessage,
        logs,
        chunkProgress,
        logEndRef,
        start,
        cancel,
        statusClass,
    } as const;
}
