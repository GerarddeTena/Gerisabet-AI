import React from "react";

export type InputSelectModelProps = {
  model: string;
  changeEvent: React.ChangeEventHandler<HTMLSelectElement>;
};

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  text: string;
};

// ==================================================================
//               UI INDEXER INTERFACES AND TYPES
// ==================================================================

export type LogEntry = { id: number; message: string; type: "info" | "success" | "skip" | "error" };
export type ChunkProgress = { current: number; total: number; file: string };

export interface IndexerUIProps {
  isIndexing: boolean;
  chunkProgress: ChunkProgress;
  logs: LogEntry[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
  statusMessage: string;
  statusClass: string;
}

// ==================================================================
//                 DATABASE MANAGER INTERFACES AND TYPES
// ==================================================================

export interface DatabaseManagerProps {
  onIndexingChange: (state: boolean) => void;
}


// ==================================================================
//                           HOOKS INTERFACES AND TYPES
// ==================================================================
export type ProgressEvent = {
  type: "file_start" | "file_done" | "file_skipped" | "chunk" | "cancelled";
  file: string;
  current?: number;
  total?: number;
};
