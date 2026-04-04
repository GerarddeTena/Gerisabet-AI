//! Unified application error type.
//!
//! All fallible operations in adapters and services return `Result<T, AppError>`.
//! Tauri commands convert `AppError` to `String` at the boundary via `map_err(|e| e.to_string())`.

use thiserror::Error;

/// All error variants that can occur in Gerisabet-AI.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Embedding failed: {0}")]
    Embedding(String),

    #[error("LLM stream error: {0}")]
    LlmStream(String),

    #[error("Vector store error: {0}")]
    VectorStore(String),

    #[error("File read error: {path} — {reason}")]
    FileRead { path: String, reason: String },

    #[error("File too large: {path} exceeds {limit_mb} MB")]
    FileTooLarge { path: String, limit_mb: u64 },

    #[error("Unsupported file format: {extension}")]
    UnsupportedFormat { extension: String },

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Message not found: {0}")]
    MessageNotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
