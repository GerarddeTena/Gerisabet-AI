//! LLM streaming port — sends a prompt and streams tokens to the frontend.

use crate::domain::chat::HistoryEntry;
use crate::error::AppError;
use tauri::AppHandle;

/// Streams an LLM response token-by-token, emitting Tauri events.
///
/// Implementors must emit `"ai_token"` events for each token and
/// an `"ai_done"` event with the full response when generation ends.
pub trait LlmStreamer: Send + Sync {
    fn stream(
        &self,
        question: &str,
        context: String,
        model: &str,
        history: Vec<HistoryEntry>,
        app: AppHandle,
    ) -> impl std::future::Future<Output = Result<(), AppError>> + Send;
}
