// Fíjate: NO usamos 'mod', usamos 'use crate::'
use crate::embeddings::{get_embedding, cosine_similarity, generate_ollama_response};
use crate::book_finder::scan_dir;

const BOOK_PATH: &str = "/home/gerisabet/Documents/Prueba_Gerisabet/";

// Función auxiliar para cortar texto
fn split_into_chunks(text: &str, chunk_size: usize) -> Vec<String> {
    let chars: Vec<char> = text.chars().collect();
    let mut chunks = Vec::new();
    for chunk in chars.chunks(chunk_size) {
        chunks.push(chunk.iter().collect());
    }
    chunks
}

#[tauri::command]
pub async fn ask_gerisabet(question: String) -> Result<String, String> {
    println!("1. Iniciando Gerisabet para: '{}'", question);

    let question_vector = get_embedding(&question).await?;
    let library = scan_dir(BOOK_PATH); 
    
    let mut ranking: Vec<(f32, String)> = Vec::new();

    for doc in library {
        let chunks = split_into_chunks(&doc.content, 800);
        for chunk in chunks {
            if let Ok(chunk_vector) = get_embedding(&chunk).await {
                let similarity = cosine_similarity(&question_vector, &chunk_vector);
                if similarity > 0.4 {
                    ranking.push((similarity, chunk));
                }
            }
        }
    }

    ranking.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
    let best_chunks: Vec<String> = ranking.into_iter().take(3).map(|(_, text)| text).collect();

    if best_chunks.is_empty() {
        return Ok("No encontré nada en los libros sobre eso.".to_string());
    }

    let context = best_chunks.join("\n---\n");
    let response = generate_ollama_response(question, context).await?;
    
    Ok(response)
}
