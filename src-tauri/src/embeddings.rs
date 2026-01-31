use serde::{Deserialize, Serialize};
use reqwest::Client;

// --- STRUCTS FOR EMBEDDINGS ---
#[derive(Serialize)]
struct EmbeddingRequest {
    model: String,
    prompt: String,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: Vec<f32>,
}

// --- STRUCTS FOR CHAT GENERATION ---
#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: String,
}

// 1. Vector Function (Renamed)
pub async fn get_embedding(text: &str) -> Result<Vec<f32>, String> {
    let client = Client::new();
    
    let res = client.post("http://localhost:11434/api/embeddings")
        .json(&EmbeddingRequest {
            model: "nomic-embed-text".to_string(),
            prompt: text.to_string(),
        })
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: EmbeddingResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.embedding)
}

// 2. Chat Function (Renamed)
pub async fn generate_ollama_response(question: String, context: String) -> Result<String, String> {
    let client = Client::new();
    
    // Inject context into the prompt
    let final_prompt = format!("Context:\n{}\n\nUser: {}", context, question);

    let res = client.post("http://localhost:11434/api/generate")
        .json(&GenerateRequest {
            model: "qwen2.5-coder:3b".to_string(),
            prompt: final_prompt,
            stream: false,
        })
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: GenerateResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.response)
}

// 3. Math Function (Renamed)
pub fn cosine_similarity(vec_a: &[f32], vec_b: &[f32]) -> f32 {
    if vec_a.len() != vec_b.len() { return 0.0; }

    let mut dot_product = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for (a, b) in vec_a.iter().zip(vec_b.iter()) {
        dot_product += a * b;
        norm_a += a * a;
        norm_b += b * b;
    }

    if norm_a == 0.0 || norm_b == 0.0 { return 0.0; }

    dot_product / (norm_a.sqrt() * norm_b.sqrt())
}
