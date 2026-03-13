import { memo, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useIndexer } from "@/hooks/useIndexer";
import IndexerUI from "./IndexerUI";

interface DrawerIndexDatabaseProps {
  onIndexingChange: (state: boolean) => void;
}

const DrawerIndexDatabase = memo(({ onIndexingChange }: DrawerIndexDatabaseProps) => {
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

  const injectContext = useCallback(async () => {
    await start(async () => {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title: "Select the folder with the PDFs",
      });
      if (!selectedPath) {
        return "Selection cancelled.";
      }
      const response = await invoke<string>("index_library", { directoryPath: selectedPath });
      return response ?? "";
    }, `Indexing files...`);
  }, [start]);

  const cancelIndexing = useCallback(async () => {
    await cancel();
  }, [cancel]);

  return (
    <div className="drawer-section">
      <h3>Knowledge Base</h3>
      <p>Select a folder on your machine to inject its content into Gerisabet AI.</p>

      <div className="drawer-button-group">
        <button onClick={injectContext} disabled={isIndexing} className="drawer-action-button">
          {isIndexing ? "Processing and vectorizing..." : "Inject Context"}
        </button>
        {isIndexing && (
          <button onClick={cancelIndexing} className="drawer-action-button danger">
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
});

DrawerIndexDatabase.displayName = "DrawerIndexDatabase";

export default DrawerIndexDatabase;
