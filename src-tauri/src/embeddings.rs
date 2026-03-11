use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::time::Duration;

// [🟢 Minor] Nombres de modelos como constantes
const EMBEDDING_MODEL: &str = "nomic-embed-text";

// [🔴 Critical] Cliente HTTP global y reutilizable con [🟡 Logic] Timeout
static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_http_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(120)) // Timeout de 2 min para dar tiempo al LLM
            .build()
            .expect("Fallo al inicializar el cliente HTTP")
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

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    system: String, // Añadimos el campo system
    stream: bool,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: String,
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

pub async fn generate_ollama_response(
    question: String,
    context: String,
    model: String,
) -> Result<String, String> {
    let client = get_http_client();

    // [🟡 Logic] System prompt para asentar ("grounding") al LLM
    let system_prompt = "Eres Gerisabet AI, un asistente experto. Utiliza ÚNICAMENTE la información proporcionada en el contexto para responder a la pregunta del usuario. Si la respuesta no está en el contexto, di claramente que no tienes esa información. No inventes datos ni utilices conocimiento externo.".to_string();

    let final_prompt = format!(
        "Contexto de los documentos:\n{}\n\nPregunta del usuario: {}",
        context, question
    );

    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&GenerateRequest {
            model,
            prompt: final_prompt,
            system: system_prompt,
            stream: false,
        })
        .send()
        .await
        .map_err(|e| format!("Error HTTP Generación: {}", e))?;

    let data: GenerateResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(data.response)
}
