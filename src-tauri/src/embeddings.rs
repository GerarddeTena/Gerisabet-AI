use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_util::io::StreamReader;

const EMBEDDING_MODEL: &str = "nomic-embed-text";
static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();
static STREAM_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_http_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .expect("Failed to init HTTP client")
    })
}

fn get_stream_client() -> &'static Client {
    STREAM_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(600)) // 10min for long generations
            .build()
            .expect("Failed to init stream client")
    })
}

#[derive(Serialize)]
struct EmbeddingRequest {
    model: String,
    prompt: String,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: Vec<f32>,
}

pub async fn get_embedding(text: &str) -> Result<Vec<f32>, String> {
    let client = get_http_client();

    let res = client
        .post("http://localhost:11434/api/embeddings")
        .json(&EmbeddingRequest {
            model: EMBEDDING_MODEL.to_string(),
            prompt: text.to_string(),
        })
        .send()
        .await
        .map_err(|e| format!("Error HTTP Embeddings: {}", e))?;

    let data: EmbeddingResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.embedding)
}

pub async fn stream_ollama_response(
    question: &str,
    context: String,
    model: &str,
    app: AppHandle,
) -> Result<(), String> {
    let system_prompt = "You are GerisabetAI, a coding assistant. \
        Answer concisely using ONLY the provided context. \
        Use Markdown. Code blocks must specify language. \
        If the answer is not in the context, say so clearly.";

    let full_prompt = format!("Context:\n{}\n\nQuestion: {}", context, question);

    let client = get_stream_client();

    let res= client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": model,
            "prompt": full_prompt,
            "system": system_prompt,
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    let byte_stream = res
        .bytes_stream()
        .map(|r| r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));

    let mut lines = BufReader::new(StreamReader::new(byte_stream)).lines();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| format!("Stream read error: {}", e))?
    {
        if line.is_empty() { continue; }

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
            let token = json["response"].as_str().unwrap_or("");
            let done = json["done"].as_bool().unwrap_or(false);

            if !token.is_empty() {
                app.emit("ai_token", token).ok();
            }
            if done {
                app.emit("ai_done", "").ok();
                break;
            }
        }
    }

    Ok(())
}
