import { memo, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useIndexer } from "@/hooks/useIndexer";
import IndexerUI from "./IndexerUI";

interface DrawerIndexSkillsProps {
  onIndexingChange: (state: boolean) => void;
}

const DrawerIndexSkills = memo(({ onIndexingChange }: DrawerIndexSkillsProps) => {
  const {
    isIndexing,
    statusMessage,
    logs,
    chunkProgress,
    logEndRef,
    start,
    cancel,
    statusClass,
  } = useIndexer("skills_progress", onIndexingChange);

  const indexSkills = useCallback(async () => {
    await start(async () => {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title: "Select the skills folder",
      });
      if (!selectedPath) return "Selection cancelled.";
      const response = await invoke<string>("index_skills", { skillsPath: selectedPath });
      return response ?? "";
    }, `Indexing skills...`);
  }, [start]);

  const cancelIndexing = useCallback(async () => {
    await cancel();
  }, [cancel]);

  return (
    <div className="drawer-section">
      <h3>Skills</h3>
      <p>Select a folder containing Markdown skill files to index into Gerisabet AI.</p>

      <div className="drawer-button-group">
        <button onClick={indexSkills} disabled={isIndexing} className="drawer-action-button">
          {isIndexing ? "Processing and vectorizing..." : "Index Skills"}
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

DrawerIndexSkills.displayName = "DrawerIndexSkills";

export default DrawerIndexSkills;
