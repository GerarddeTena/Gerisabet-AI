use glob::glob;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};
use crate::book_finder::file_process;
use crate::embeddings::get_embedding;
use crate::commands::indexing_logic::{split_into_chunks, is_meaningful_chunk, WORDS_PER_CHUNK};
use crate::indexer_tracker::{
    is_already_indexed, load_indexed_files, mark_as_indexed, save_indexed_files,
};
use crate::qdrant_db::{get_client, init_collection, upsert_chunk};
use crate::INDEXING_CANCELLED;

#[tauri::command]
pub async fn cancel_indexing() -> Result<String, String> {
    INDEXING_CANCELLED.store(true, Ordering::SeqCst);
    println!("Indexing cancelled by the user.");
    Ok("Cancelled".to_string())
}

#[tauri::command]
pub async fn index_library(app: AppHandle, directory_path: String) -> Result<String, String> {
    println!(
        "Starting library indexing in Qdrant from: {}",
        directory_path
    );

    let q_client = get_client().await?;
    init_collection(&q_client).await?;

    let pattern = format!("{}/**/*.*", directory_path);
    let entries = glob(&pattern).map_err(|e| e.to_string())?;

    let mut indexed_files = load_indexed_files();
    println!(
        "Tracker loaded: {} files already indexed",
        indexed_files.len()
    );

    let mut new_count = 0;
    let mut skipped_count = 0;

    INDEXING_CANCELLED.store(false, Ordering::SeqCst);

    for entry in entries.flatten() {
        if !entry.is_file() {
            continue;
        }

        if INDEXING_CANCELLED.load(Ordering::SeqCst) {
            println!("Indexing cancelled between files.");
            app.emit(
                "indexing_progress",
                serde_json::json!({
                    "type": "cancelled",
                    "file": "",
                }),
            )
                .ok();
            return Ok(format!(
                "Indexación cancelada. {} chunks guardados antes de cancelar.",
                new_count
            ));
        }

        let path_str = entry.to_string_lossy().to_string();

        if is_already_indexed(&indexed_files, &path_str) {
            println!("⏭ Skipping already indexed: {}", path_str);
            skipped_count += 1;

            app.emit(
                "indexing_progress",
                serde_json::json!({
                    "type": "file_skipped",
                    "file": path_str,
                }),
            )
                .ok();

            continue;
        }

        let doc = match file_process(&entry) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Saltando {:?}: {}", entry, e);
                app.emit(
                    "indexing_progress",
                    serde_json::json!({
                        "type": "file_error",
                        "file": path_str,
                        "error": e,
                    }),
                )
                    .ok();
                continue;
            }
        };

        let chunks = split_into_chunks(&doc.content, WORDS_PER_CHUNK);
        let total_chunks = chunks.len();

        println!("Indexing document: {} ({} chunks)", doc.route, total_chunks);

        app.emit(
            "indexing_progress",
            serde_json::json!({
                "type": "file_start",
                "file": doc.route,
                "total": total_chunks,
            }),
        )
            .ok();

        let mut success = true;

        for (i, chunk) in chunks.iter().enumerate() {
            // Check cancellation on every chunk
            if INDEXING_CANCELLED.load(Ordering::SeqCst) {
                println!("Indexing interrupted at chunk {}/{}", i + 1, total_chunks);
                app.emit(
                    "indexing_progress",
                    serde_json::json!({
                        "type": "cancelled",
                        "file": doc.route,
                    }),
                )
                    .ok();
                return Ok(format!(
                    "Indexation cancelled. {} storing chunks before finish cancelling.",
                    new_count
                ));
            }

            println!("  Chunk {}/{} of {}", i + 1, total_chunks, doc.route);

            if !is_meaningful_chunk(chunk) {
                println!("  Skipping non-meaningful chunk {}", i + 1);
                // Still emit chunk progress so the bar advances
                app.emit(
                    "indexing_progress",
                    serde_json::json!({
                        "type": "chunk",
                        "file": doc.route,
                        "current": i + 1,
                        "total": total_chunks,
                    }),
                )
                    .ok();
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
                    app.emit(
                        "indexing_progress",
                        serde_json::json!({
                            "type": "chunk",
                            "file": doc.route,
                            "current": i + 1,
                            "total": total_chunks,
                        }),
                    )
                        .ok();
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
            app.emit(
                "indexing_progress",
                serde_json::json!({
                    "type": "file_done",
                    "file": doc.route,
                }),
            )
                .ok();
        } else {
            // Emit file error event
            app.emit(
                "indexing_progress",
                serde_json::json!({
                    "type": "file_error",
                    "file": doc.route,
                    "error": "Error during embedding or upsert",
                }),
            )
                .ok();
        }
    }

    // Emit completion event
    app.emit(
        "indexing_progress",
        serde_json::json!({
            "type": "completed",
            "file": "",
            "new_count": new_count,
            "skipped_count": skipped_count,
        }),
    )
        .ok();

    Ok(format!(
        "Indexation completed. {} Chunks successfully stored into Qdrant. {} files skipped.",
        new_count, skipped_count
    ))
}

