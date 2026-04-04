//! Ollama adapter — implements [`Embedder`] and [`LlmStreamer`].

use crate::config::{EMBED_TIMEOUT_SECS, EMBEDDING_MODEL, OLLAMA_BASE_URL, STREAM_TIMEOUT_SECS};
use crate::domain::chat::HistoryEntry;
use crate::error::AppError;
use crate::ports::embedder::Embedder;
use crate::ports::streamer::LlmStreamer;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncBufReadExt;
use tokio_util::io::StreamReader;

#[derive(Serialize)]
struct EmbedRequest<'a> {
    model: &'a str,
    prompt: &'a str,
}

#[derive(Deserialize)]
struct EmbedResponse {
    embedding: Vec<f32>,
}

/// HTTP adapter for Ollama.
///
/// Holds two clients: one with a short timeout for embedding,
/// one with a long timeout for streaming generation.
pub struct OllamaClient {
    embed_client: Client,
    stream_client: Client,
    base_url: String,
}

impl OllamaClient {
    /// Construct a new client pointing at `OLLAMA_BASE_URL`.
    pub fn new() -> Result<Self, AppError> {
        let embed_client = Client::builder()
            .timeout(Duration::from_secs(EMBED_TIMEOUT_SECS))
            .build()
            .map_err(|e| AppError::Embedding(format!("Failed to build embed client: {e}")))?;

        let stream_client = Client::builder()
            .timeout(Duration::from_secs(STREAM_TIMEOUT_SECS))
            .build()
            .map_err(|e| AppError::LlmStream(format!("Failed to build stream client: {e}")))?;

        Ok(Self {
            embed_client,
            stream_client,
            base_url: OLLAMA_BASE_URL.to_string(),
        })
    }
}

impl Embedder for OllamaClient {
    async fn embed(&self, text: &str) -> Result<Vec<f32>, AppError> {
        log::debug!("Embedding text preview: {:?}", &text[..text.len().min(60)]);

        let res = self
            .embed_client
            .post(format!("{}/api/embeddings", self.base_url))
            .json(&EmbedRequest {
                model: EMBEDDING_MODEL,
                prompt: text,
            })
            .send()
            .await
            .map_err(|e| AppError::Embedding(format!("HTTP error: {e}")))?;

        let body = res
            .text()
            .await
            .map_err(|e| AppError::Embedding(format!("Body read error: {e}")))?;

        parse_embedding(&body)
    }
}

// ── Pure parsing helpers (testable without network) ──────────────────────

/// Parse an Ollama `/api/embeddings` JSON response into a float vector.
fn parse_embedding(json_str: &str) -> Result<Vec<f32>, AppError> {
    let response: EmbedResponse = serde_json::from_str(json_str)
        .map_err(|e| AppError::Embedding(format!("Parse error: {e}")))?;
    Ok(response.embedding)
}

/// Extract the `message.content` token from a single Ollama chat-stream JSON line.
///
/// Returns `None` when the line is malformed or the token is empty.
fn parse_stream_token(json_str: &str) -> Option<String> {
    let json: serde_json::Value = serde_json::from_str(json_str).ok()?;
    let token = json["message"]["content"].as_str()?;
    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}

impl LlmStreamer for OllamaClient {
    async fn stream(
        &self,
        question: &str,
        context: String,
        model: &str,
        history: Vec<HistoryEntry>,
        app: AppHandle,
    ) -> Result<(), AppError> {
        let system_prompt = if context.is_empty() {
            "You are GerisabetAI, a coding assistant. \
            Answer concisely and helpfully. \
            Use Markdown. Code blocks must specify language.".to_string()
        } else {
            format!(
                "You are GerisabetAI, a coding assistant. \
                Answer concisely using the provided context when relevant. \
                Use Markdown. Code blocks must specify language. \
                If the answer is not in the context, answer from your own knowledge.\n\n\
                Context:\n{}",
                context
            )
        };

        let mut messages: Vec<serde_json::Value> =
            vec![serde_json::json!({ "role": "system", "content": system_prompt })];

        for entry in &history {
            messages.push(serde_json::json!({
                "role": entry.role,
                "content": entry.content
            }));
        }

        messages.push(serde_json::json!({
            "role": "user",
            "content": question
        }));

        let res = self
            .stream_client
            .post(format!("{}/api/chat", self.base_url))
            .json(&serde_json::json!({
                "model": model,
                "messages": messages,
                "stream": true
            }))
            .send()
            .await
            .map_err(|e| AppError::LlmStream(format!("Ollama request failed: {e}")))?;

        let byte_stream = res
            .bytes_stream()
            .map(|r| r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

        let mut lines = tokio::io::BufReader::new(StreamReader::new(byte_stream)).lines();
        let mut full_response = String::new();

        while let Some(line) = lines
            .next_line()
            .await
            .map_err(|e| AppError::LlmStream(format!("Stream read error: {e}")))?
        {
            if line.is_empty() {
                continue;
            }

            if let Some(token) = parse_stream_token(&line) {
                full_response.push_str(&token);
                app.emit("ai_token", token).ok();
            }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                if json["done"].as_bool().unwrap_or(false) {
                    app.emit("ai_done", &full_response).ok();
                    break;
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── parse_embedding ───────────────────────────────────────────────────

    #[test]
    fn parse_embedding_valid_json_returns_vec() {
        let json = r#"{"embedding": [0.1, 0.2, 0.3]}"#;
        let result = parse_embedding(json).unwrap();
        assert_eq!(result, vec![0.1f32, 0.2, 0.3]);
    }

    #[test]
    fn parse_embedding_invalid_json_returns_error() {
        let result = parse_embedding("not json at all");
        assert!(matches!(result, Err(AppError::Embedding(_))));
    }

    #[test]
    fn parse_embedding_missing_field_returns_error() {
        let json = r#"{"other_field": [1.0]}"#;
        let result = parse_embedding(json);
        assert!(matches!(result, Err(AppError::Embedding(_))));
    }

    // ── parse_stream_token ────────────────────────────────────────────────

    #[test]
    fn parse_stream_token_valid_returns_content() {
        let json = r#"{"message": {"content": "hello"}, "done": false}"#;
        assert_eq!(parse_stream_token(json), Some("hello".to_string()));
    }

    #[test]
    fn parse_stream_token_empty_content_returns_none() {
        let json = r#"{"message": {"content": ""}, "done": false}"#;
        assert_eq!(parse_stream_token(json), None);
    }

    #[test]
    fn parse_stream_token_no_message_returns_none() {
        let json = r#"{"done": true}"#;
        assert_eq!(parse_stream_token(json), None);
    }

    #[test]
    fn parse_stream_token_invalid_json_returns_none() {
        assert_eq!(parse_stream_token("{{bad json"), None);
    }
}
