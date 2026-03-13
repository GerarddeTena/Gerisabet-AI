import React from "react";

// ================================================================
//                FORM INTERFACES AND TYPES
// ================================================================

export interface FormProps {
  disabled?: boolean;
}

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

export interface DisplayResponsesProps {
  history: ChatMessage[];
  isLoading?: boolean;
  className?: string;
}
// ==================================================================
//                           HOOKS INTERFACES AND TYPES
// ==================================================================
export type ProgressEvent = {
  skipped_count: number;
  new_count: number;
  type: "file_start" | "file_done" | "file_skipped" | "chunk" | "cancelled" | "file_error" | "completed";
  file: string;
  current?: number;
  total?: number;
};
