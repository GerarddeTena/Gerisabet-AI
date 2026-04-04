import React from "react";
export type { Role, ChatMessage, MessageMetadata } from './message';
export type { ChatSession, UseChatHistoryReturn } from './session';

export interface FormProps {
  disabled?: boolean;
  chatHistory?: import('./message').ChatMessage[];
  onChatHistoryChange?: React.Dispatch<React.SetStateAction<import('./message').ChatMessage[]>>;
}

export type InputSelectModelProps = {
  model: string;
  changeEvent: React.ChangeEventHandler<HTMLSelectElement>;
  models?: string[];
};

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

export interface DatabaseManagerProps {
  onIndexingChange: (state: boolean) => void;
}

export interface DisplayResponsesProps {
  history: import('./message').ChatMessage[];
  isLoading?: boolean;
  className?: string;
}

export type ProgressEvent = {
  skipped_count: number;
  new_count: number;
  type: "file_start" | "file_done" | "file_skipped" | "chunk" | "cancelled" | "file_error" | "completed";
  file: string;
  current?: number;
  total?: number;
};
