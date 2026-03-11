use crate::embeddings::{get_embedding, generate_ollama_response};
use crate::book_finder::scan_dir;
use crate::qdrant_db::{get_client, init_collection, upsert_chunk, search_context};

const SIMILARITY_THRESHOLD: f32 = 0.65;
const WORDS_PER_CHUNK: usize = 150;
const LLM_MODEL: &str = "qwen2.5-coder:3b"; // <-- Constante añadida

fn split_into_chunks(text: &str, words_per_chunk: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    words.chunks(words_per_chunk)
         .map(|chunk| chunk.join(" "))
         .collect()
}

// [One-time indexing] - La ingesta a Qdrant
#[tauri::command]
pub async fn index_library(directory_path: String) -> Result<String, String> {
    println!("Iniciando indexación de la biblioteca en Qdrant desde: {}", directory_path);
    
    let q_client = get_client().await?;
    init_collection(&q_client).await?;
    
    let library = scan_dir(&directory_path);
    let mut total_chunks = 0;

    for doc in library {
        println!("Indexando documento: {}", doc.route);
        let chunks = split_into_chunks(&doc.content, WORDS_PER_CHUNK);
        
        for (_index, chunk) in chunks.into_iter().enumerate() {
            if let Ok(vector) = get_embedding(&chunk).await {
                if upsert_chunk(&q_client, &chunk, &doc.route, vector).await.is_ok() {
                    total_chunks += 1;
                }
            }
        }
    }
    Ok(format!("Indexación completada. {} fragmentos guardados en Qdrant.", total_chunks))
}

#[tauri::command]
pub async fn ask_gerisabet(question: String) -> Result<String, String> { // <-- Quitamos 'model' de aquí
    println!("Consultando base de conocimientos para: '{}'", question);

    // 1. Vectorizamos la pregunta
    let question_vector = get_embedding(&question).await?;
    
    // 2. Buscamos en Qdrant
    let q_client = get_client().await?;
    let search_results = search_context(&q_client, question_vector, 3, SIMILARITY_THRESHOLD).await?;

    if search_results.is_empty() {
        return Ok("No encontré información relevante en los documentos para responder a tu pregunta.".to_string());
    }

    // 3. Montamos el contexto
    let context_strings: Vec<String> = search_results.into_iter().map(|res| {
        format!("Fuente: {} (Relevancia: {:.2})\nContenido: {}", res.file_path, res.score, res.text)
    }).collect();

    let context = context_strings.join("\n---\n");
    
    // 4. Generamos respuesta pasando la constante
    let response = generate_ollama_response(question, context, LLM_MODEL.to_string()).await?;
    
    Ok(response)
}
