use glob::glob;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};
use crate::book_finder::file_process;
use crate::embeddings::{generate_ollama_response, get_embedding};
use crate::indexer_tracker::{load_indexed_files, mark_as_indexed, save_indexed_files, is_already_indexed};
use crate::qdrant_db::{get_client, init_collection, search_context, upsert_chunk};
use crate::INDEXING_CANCELLED;

const SIMILARITY_THRESHOLD: f32 = 0.65;
const WORDS_PER_CHUNK: usize = 150;
const LLM_MODEL: &str = "qwen2.5-coder:3b";

#[tauri::command]
pub async fn cancel_indexing() -> Result<String, String> {
    INDEXING_CANCELLED.store(true, Ordering::SeqCst);
    println!("Indexación cancelada por el usuario.");
    Ok("Cancelado".to_string())
}

fn split_into_chunks(text: &str, words_per_chunk: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    words
        .chunks(words_per_chunk)
        .map(|chunk| chunk.join(" "))
        .collect()
}

fn is_meaningful_chunk(text: &str) -> bool {
    let alpha_count = text.chars().filter(|c| c.is_alphabetic()).count();
    let dot_count = text.chars().filter(|c| *c == '.' || *c == '-').count();
    let total_count = text.chars().count();

    if total_count < 10 { return false; }
    if (alpha_count as f32) / (total_count as f32) < 0.2 { return false; }
    if (dot_count as f32) / (total_count as f32) > 0.3 { return false; }

    true
}

#[tauri::command]
pub async fn index_library(
    app: AppHandle,
    directory_path: String
) -> Result<String, String> {
    println!("Iniciando indexación de la biblioteca en Qdrant desde: {}", directory_path);

    let q_client = get_client().await?;
    init_collection(&q_client).await?;

    let pattern = format!("{}/**/*.*", directory_path);
    let entries = glob(&pattern).map_err(|e| e.to_string())?;

    let mut indexed_files = load_indexed_files();
    println!("Tracker cargado: {} archivos ya indexados", indexed_files.len());

    let mut new_count = 0;
    let mut skipped_count = 0;

    INDEXING_CANCELLED.store(false, Ordering::SeqCst);

    for entry in entries.flatten() {
        if !entry.is_file() { continue; }

        // Check cancellation between files
        if INDEXING_CANCELLED.load(Ordering::SeqCst) {
            println!("Indexación cancelada entre archivos.");
            app.emit("indexing_progress", serde_json::json!({
                "type": "cancelled",
                "file": "",
            })).ok();
            return Ok(format!(
                "Indexación cancelada. {} chunks guardados antes de cancelar.",
                new_count
            ));
        }

        let path_str = entry.to_string_lossy().to_string();

        if is_already_indexed(&indexed_files, &path_str) {
            println!("⏭ Saltando ya indexado: {}", path_str);
            skipped_count += 1;

            // Emit skip event to frontend
            app.emit("indexing_progress", serde_json::json!({
                "type": "file_skipped",
                "file": path_str,
            })).ok();

            continue;
        }

        let doc = match file_process(&entry) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Saltando {:?}: {}", entry, e);
                app.emit("indexing_progress", serde_json::json!({
                    "type": "file_error",
                    "file": path_str,
                    "error": e,
                })).ok();
                continue;
            }
        };

        let chunks = split_into_chunks(&doc.content, WORDS_PER_CHUNK);
        let total_chunks = chunks.len();

        println!("Indexando documento: {} ({} chunks)", doc.route, total_chunks);

        // Emit file start event
        app.emit("indexing_progress", serde_json::json!({
            "type": "file_start",
            "file": doc.route,
            "total": total_chunks,
        })).ok();

        let mut success = true;

        for (i, chunk) in chunks.iter().enumerate() {
            // Check cancellation on every chunk
            if INDEXING_CANCELLED.load(Ordering::SeqCst) {
                println!("Indexación interrumpida en chunk {}/{}", i + 1, total_chunks);
                app.emit("indexing_progress", serde_json::json!({
                    "type": "cancelled",
                    "file": doc.route,
                })).ok();
                return Ok(format!(
                    "Indexación cancelada. {} chunks guardados antes de cancelar.",
                    new_count
                ));
            }

            println!("  Chunk {}/{} de {}", i + 1, total_chunks, doc.route);

            if !is_meaningful_chunk(chunk) {
                println!("  Skipping non-meaningful chunk {}", i + 1);
                // Still emit chunk progress so the bar advances
                app.emit("indexing_progress", serde_json::json!({
                    "type": "chunk",
                    "file": doc.route,
                    "current": i + 1,
                    "total": total_chunks,
                })).ok();
                continue;
            }

            match get_embedding(chunk).await {
                Ok(vector) => {
                    if let Err(e) = upsert_chunk(&q_client, chunk, &doc.route, vector).await {
                        eprintln!("Error en upsert: {}", e);
                        success = false;
                        break;
                    }
                    new_count += 1;

                    // Emit chunk progress
                    app.emit("indexing_progress", serde_json::json!({
                        "type": "chunk",
                        "file": doc.route,
                        "current": i + 1,
                        "total": total_chunks,
                    })).ok();
                }
                Err(e) => {
                    eprintln!("Error embedding chunk {}: {}", i + 1, e);
                    eprintln!("Preview: {:?}", &chunk[..chunk.len().min(100)]);
                    success = false;
                    break;
                }
            }
        }

        if success {
            mark_as_indexed(&mut indexed_files, &doc.route);
            save_indexed_files(&indexed_files)?;

            // Emit file completed event
            app.emit("indexing_progress", serde_json::json!({
                "type": "file_done",
                "file": doc.route,
            })).ok();
        } else {
            // Emit file error event
            app.emit("indexing_progress", serde_json::json!({
                "type": "file_error",
                "file": doc.route,
                "error": "Error durante el embedding o upsert",
            })).ok();
        }
    }

    // Emit completion event
    app.emit("indexing_progress", serde_json::json!({
        "type": "completed",
        "file": "",
        "new_count": new_count,
        "skipped_count": skipped_count,
    })).ok();

    Ok(format!(
        "Indexación completada. {} fragmentos guardados en Qdrant. {} Archivos omitidos",
        new_count, skipped_count
    ))
}

#[tauri::command]
pub async fn ask_gerisabet(question: String, model: String) -> Result<String, String> {
    println!("Consultando base de conocimientos para: '{}'", question);

    let question_vector = get_embedding(&question).await?;
    let q_client = get_client().await?;

    let search_results = search_context(
        &q_client,
        question_vector,
        3,
        SIMILARITY_THRESHOLD
    ).await?;

    if search_results.is_empty() {
        return Ok(
            "No encontré información relevante en los documentos para responder a tu pregunta."
                .to_string(),
        );
    }

    let context_strings: Vec<String> = search_results
        .into_iter()
        .map(|res| {
            format!(
                "Fuente: {} (Relevancia: {:.2})\nContenido: {}",
                res.file_path, res.score, res.text
            )
        })
        .collect();

    let context = context_strings.join("\n---\n");
    let response = generate_ollama_response(question, context, model).await?;

    Ok(response)
}
