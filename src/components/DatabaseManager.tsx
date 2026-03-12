import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

interface Props {
    onIndexingChange: (state: boolean) => void;
}

interface LogEntry {
    id: number;
    message: string;
    type: "info" | "success" | "skip" | "error";
}

interface ProgressEvent {
    type: "file_start" | "file_done" | "file_skipped" | "chunk";
    file: string;
    current?: number;
    total?: number;
}

export default function DatabaseManager({ onIndexingChange }: Props) {
    const [isIndexing, setIsIndexing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0, file: "" });
    const logEndRef = useRef<HTMLDivElement>(null);
    const logIdRef = useRef(0);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        const unlisten = listen<ProgressEvent>("indexing_progress", (event) => {
            const data = event.payload;
            const fileName = data.file.split("\\").pop() || data.file;

            if (data.type === "file_start") {
                setChunkProgress({ current: 0, total: data.total || 0, file: fileName });
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `📄 Indexando: ${fileName}`,
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
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `✅ Completado: ${fileName}`,
                    type: "success"
                }]);
            }

            if (data.type === "file_skipped") {
                setLogs(prev => [...prev, {
                    id: logIdRef.current++,
                    message: `⏭ Ya indexado: ${fileName}`,
                    type: "skip"
                }]);
            }
        });

        return () => { unlisten.then(f => f()); };
    }, []);

    const injectContext = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                directory: true,
                title: "Selecciona la carpeta con los PDFs",
            });
            if (!selectedPath) {
                setStatusMessage("Selección cancelada.");
                return;
            }
            setLogs([]); // clear previous logs on new run
            onIndexingChange(true);
            setIsIndexing(true);
            setStatusMessage(`Indexando archivos de: ${selectedPath}...`);
            const response = await invoke<string>("index_library", {
                directoryPath: selectedPath,
            });
            setStatusMessage(`¡Éxito! ${response}`);
        } catch (error) {
            console.error("Error en Rust:", error);
            setStatusMessage(`Error: ${error}`);
        } finally {
            setIsIndexing(false);
            onIndexingChange(false);
            setChunkProgress({ current: 0, total: 0, file: "" });
        }
    };

    const cancelIndexing = async () => {
        await invoke("cancel_indexing");
        setStatusMessage("Cancelando...");
    };

    const statusClass = statusMessage.startsWith("¡")
        ? "status-message success"
        : statusMessage.startsWith("Error")
            ? "status-message error"
            : "status-message";

    return (
        <div className="db-manager">
            <h2>Base de Conocimientos</h2>
            <p>Selecciona una carpeta en tu equipo para inyectar su contenido a Gerisabet AI.</p>

            <div className="db-manager-button-group">
                <button onClick={injectContext} disabled={isIndexing} className="btn-inject">
                    {isIndexing ? "Procesando y vectorizando..." : "Inyectar Contexto"}
                </button>
                {isIndexing && (
                    <button onClick={cancelIndexing} className="btn-cancel">
                        Cancelar proceso
                    </button>
                )}
            </div>

            {/* Chunk progress bar */}
            {isIndexing && chunkProgress.file && (
                <div className="indexing-progress">
                    <span className="indexing-progress-label">
                        {chunkProgress.file} — chunk {chunkProgress.current}/{chunkProgress.total}
                    </span>
                    <div className="indexing-progress-track">
                        <div
                            className="indexing-progress-fill"
                            style={{
                                width: `${chunkProgress.total > 0
                                    ? (chunkProgress.current / chunkProgress.total) * 100
                                    : 0}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {logs.length > 0 && (
                <div className="indexing-log">
                    {logs.map(log => (
                        <div key={log.id} className={`indexing-log-entry ${log.type}`}>
                            {log.message}
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            )}

            {statusMessage && (
                <div className={statusClass}>
                    <strong>Estado:</strong> {statusMessage}
                </div>
            )}
        </div>
    );
}
