use std::collections::HashSet;
use std::io::Write;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};
use glob::glob;

use crate::qdrant_db::{get_client, init_skills_collection, upsert_skill};
use crate::INDEXING_CANCELLED;
use crate::commands::indexing_logic::{split_into_chunks, is_meaningful_chunk, WORDS_PER_CHUNK};
use crate::commands::SKILLS_TRACKER_PATH;
use crate::embeddings::get_embedding;

fn save_indexed_skills(indexed: &HashSet<String>) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(SKILLS_TRACKER_PATH).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Error creating skills tracker directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(indexed)
        .map_err(|e| format!("Error serializing skills tracker: {}", e))?;
    let mut file = std::fs::File::create(SKILLS_TRACKER_PATH)
        .map_err(|e| format!("Error creating skills tracker file: {}", e))?;
    file.write_all(json.as_bytes())
        .map_err(|e| format!("Error writing skills tracker: {}", e))?;
    println!("Skills tracker saved: {} skills indexed", indexed.len());
    Ok(())
}

fn load_indexed_skills() -> HashSet<String> {
    match std::fs::read_to_string(SKILLS_TRACKER_PATH) {
        Ok(content) => serde_json::from_str::<HashSet<String>>(&content).unwrap_or_default(),
        Err(_) => HashSet::new(),
    }
}

#[tauri::command]
pub async fn index_skills(app: AppHandle, skills_path: String) -> Result<String, String> {
    println!("Starting skills indexing from: {}", skills_path);

    let q_client = get_client().await?;
    init_skills_collection(&q_client).await?;

    let pattern = format!("{}/**/*.md", skills_path);
    let entries = glob(&pattern).map_err(|e| e.to_string())?;

    let mut indexed_skills = load_indexed_skills();
    println!(
        "Skills tracker loaded: {} files already indexed",
        indexed_skills.len()
    );

    let mut new_count = 0;
    let mut skipped_count = 0;

    INDEXING_CANCELLED.store(false, Ordering::SeqCst);

    for entry in entries.flatten() {
        if !entry.is_file() {
            continue;
        }

        if INDEXING_CANCELLED.load(Ordering::SeqCst) {
            println!("Skills indexing cancelled between files.");
            app.emit(
                "skills_progress",
                serde_json::json!({
                    "type": "cancelled",
                    "file": "",
                }),
            )
            .ok();
            return Ok(format!(
                "Skills indexing cancelled. {} chunks saved before cancellation.",
                new_count
            ));
        }

        let path_str = entry.to_string_lossy().to_string();

        // Extract skill_type from the immediate parent folder name
        let skill_type = entry
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Extract skill_name from the file stem
        let skill_name = entry
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        if indexed_skills.contains(&path_str) {
            println!("⏭ Skipping already indexed skill: {}", path_str);
            skipped_count += 1;
            app.emit(
                "skills_progress",
                serde_json::json!({
                    "type": "file_skipped",
                    "file": path_str,
                }),
            )
            .ok();
            continue;
        }

        let content = match std::fs::read_to_string(&entry) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Skipping {:?}: {}", entry, e);
                app.emit(
                    "skills_progress",
                    serde_json::json!({
                        "type": "file_error",
                        "file": path_str,
                        "error": e.to_string(),
                    }),
                )
                .ok();
                continue;
            }
        };

        let chunks = split_into_chunks(&content, WORDS_PER_CHUNK);
        let total_chunks = chunks.len();

        println!(
            "Indexing skill: {}/{} ({} chunks)",
            skill_type, skill_name, total_chunks
        );

        app.emit(
            "skills_progress",
            serde_json::json!({
                "type": "file_start",
                "file": path_str,
                "total": total_chunks,
            }),
        )
        .ok();

        let mut success = true;

        for (i, chunk) in chunks.iter().enumerate() {
            if INDEXING_CANCELLED.load(Ordering::SeqCst) {
                println!(
                    "Skills indexing interrupted at chunk {}/{}",
                    i + 1,
                    total_chunks
                );
                app.emit(
                    "skills_progress",
                    serde_json::json!({
                        "type": "cancelled",
                        "file": path_str,
                    }),
                )
                .ok();
                return Ok(format!(
                    "Skills indexing cancelled. {} chunks saved before cancellation.",
                    new_count
                ));
            }

            println!(
                "  Skill chunk {}/{} of {}/{}",
                i + 1,
                total_chunks,
                skill_type,
                skill_name
            );

            if !is_meaningful_chunk(chunk) {
                println!("  Skipping non-meaningful skill chunk {}", i + 1);
                app.emit(
                    "skills_progress",
                    serde_json::json!({
                        "type": "chunk",
                        "file": path_str,
                        "current": i + 1,
                        "total": total_chunks,
                    }),
                )
                .ok();
                continue;
            }

            match get_embedding(chunk).await {
                Ok(vector) => {
                    if let Err(e) =
                        upsert_skill(&q_client, chunk, &skill_name, &skill_type, vector).await
                    {
                        eprintln!("Error upserting skill chunk: {}", e);
                        success = false;
                        break;
                    }
                    new_count += 1;
                    app.emit(
                        "skills_progress",
                        serde_json::json!({
                            "type": "chunk",
                            "file": path_str,
                            "current": i + 1,
                            "total": total_chunks,
                        }),
                    )
                    .ok();
                }
                Err(e) => {
                    eprintln!("Error embedding skill chunk {}: {}", i + 1, e);
                    eprintln!("Preview: {:?}", &chunk[..chunk.len().min(100)]);
                    success = false;
                    break;
                }
            }
        }

        if success {
            indexed_skills.insert(path_str.clone());
            save_indexed_skills(&indexed_skills)?;
            app.emit(
                "skills_progress",
                serde_json::json!({
                    "type": "file_done",
                    "file": path_str,
                }),
            )
            .ok();
        } else {
            app.emit(
                "skills_progress",
                serde_json::json!({
                    "type": "file_error",
                    "file": path_str,
                    "error": "Error during embedding or upsert",
                }),
            )
            .ok();
        }
    }

    app.emit(
        "skills_progress",
        serde_json::json!({
            "type": "completed",
            "file": "",
            "new_count": new_count,
            "skipped_count": skipped_count,
        }),
    )
    .ok();

    Ok(format!(
        "Skills indexing completed. {} chunks saved to Qdrant. {} files skipped.",
        new_count, skipped_count
    ))
}
