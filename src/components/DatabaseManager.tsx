import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useIndexer } from "@/hooks/useIndexer";
import IndexerUI from "./IndexerUI";
import {DatabaseManagerProps} from "@/types/interfaces.ts";

export default function DatabaseManager({onIndexingChange}: DatabaseManagerProps) {
    const {
        isIndexing,
        statusMessage,
        logs,
        chunkProgress,
        logEndRef,
        start,
        cancel,
        statusClass,
    } = useIndexer("indexing_progress", onIndexingChange);

    const injectContext = async () => {
        await start(async () => {
            const selectedPath = await open({
                multiple: false,
                directory: true,
                title: "Select the folder with the PDFs",
            });
            if (!selectedPath) {
                return "Selection cancelled.";
            }
            const response = await invoke<string>("index_library", {directoryPath: selectedPath});
            return response ?? "";
        }, `Indexing files...`);
    };

    const cancelIndexing = async () => {
        await cancel();
    };

    return (
        <div className="db-manager">
            <h2>Knowledge Base</h2>
            <p>Select a folder on your machine to inject its content into Gerisabet AI.</p>

            <div className="db-manager-button-group">
                <button onClick={injectContext} disabled={isIndexing} className="btn-inject">
                    {isIndexing ? "Processing and vectorizing..." : "Inject Context"}
                </button>
                {isIndexing && (
                    <button onClick={cancelIndexing} className="btn-cancel">
                        Cancel process
                    </button>
                )}
            </div>

            <IndexerUI
              isIndexing={isIndexing}
              chunkProgress={chunkProgress}
              logs={logs}
              logEndRef={logEndRef}
              statusMessage={statusMessage}
              statusClass={statusClass}
            />
        </div>
    );
}
