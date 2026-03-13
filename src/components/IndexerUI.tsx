import {IndexerUIProps} from "@/types/interfaces.ts";

export default function IndexerUI({ isIndexing, chunkProgress, logs, logEndRef, statusMessage, statusClass }: IndexerUIProps) {
  return (
    <>
      {isIndexing && chunkProgress.file && (
        <div className="indexing-progress">
          <span className="indexing-progress-label">
            {chunkProgress.file} — chunk {chunkProgress.current}/{chunkProgress.total}
          </span>
          <div className="indexing-progress-track">
            <div
              className="indexing-progress-fill"
              style={{
                width: `${chunkProgress.total > 0 ? (chunkProgress.current / chunkProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="indexing-log">
          {logs.map((log) => (
            <div key={log.id} className={`indexing-log-entry ${log.type}`}>
              {log.message}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {statusMessage && (
        <div className={statusClass}>
          <strong>Status:</strong> {statusMessage}
        </div>
      )}
    </>
  );
}
