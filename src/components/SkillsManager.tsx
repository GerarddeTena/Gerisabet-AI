import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useIndexer } from "@/hooks/useIndexer";
import IndexerUI from "./IndexerUI";

interface Props {
  onIndexingChange: (state: boolean) => void;
}

export default function SkillsManager({ onIndexingChange }: Props) {
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

  const indexSkills = async () => {
    await start(async () => {
      const selectedPath = await open({ multiple: false, directory: true, title: "Select the skills folder" });
      if (!selectedPath) return "Selection cancelled.";
      const response = await invoke<string>("index_skills", { skillsPath: selectedPath });
      return response ?? "";
    }, `Indexing skills...`);
  };

  const cancelIndexing = async () => {
    await cancel();
  };

  return (
    <div className="db-manager">
      <h2>Skills</h2>
      <p>Select a folder containing Markdown skill files to index into Gerisabet AI.</p>

      <div className="db-manager-button-group">
        <button onClick={indexSkills} disabled={isIndexing} className="btn-inject">
          {isIndexing ? "Processing and vectorizing..." : "Index Skills"}
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

