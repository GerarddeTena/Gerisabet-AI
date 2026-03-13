use crate::book_finder::file_process;
use crate::embeddings::{stream_ollama_response , get_embedding};
use crate::indexer_tracker::{
    is_already_indexed, load_indexed_files, mark_as_indexed, save_indexed_files,
};
use crate::qdrant_db::{
    get_client, init_collection, init_skills_collection, search_context, search_skills,
    upsert_chunk, upsert_skill, SkillSearchResult,
};
use crate::INDEXING_CANCELLED;
use glob::glob;
use std::collections::HashSet;
use std::io::Write;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};

const SIMILARITY_THRESHOLD: f32 = 0.65;
const SKILLS_SIMILARITY_THRESHOLD: f32 = 0.5;
const WORDS_PER_CHUNK: usize = 150;
const SKILLS_TRACKER_PATH: &str = "C:\\Users\\Gerard\\qdrant_storage\\indexed_skills.json";

fn load_indexed_skills() -> HashSet<String> {
    match std::fs::read_to_string(SKILLS_TRACKER_PATH) {
        Ok(content) => serde_json::from_str::<HashSet<String>>(&content).unwrap_or_default(),
        Err(_) => HashSet::new(),
    }
}

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

#[tauri::command]
pub async fn cancel_indexing() -> Result<String, String> {
    INDEXING_CANCELLED.store(true, Ordering::SeqCst);
    println!("Indexing cancelled by the user.");
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

    if total_count < 10 {
        return false;
    }
    if (alpha_count as f32) / (total_count as f32) < 0.2 {
        return false;
    }
    if (dot_count as f32) / (total_count as f32) > 0.3 {
        return false;
    }

    true
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

        // Check cancellation between files
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

            // Emit skip event to frontend
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

        // Emit file start event
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
                    "Indexación cancelada. {} chunks guardados antes de cancelar.",
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
                    "error": "Error durante el embedding o upsert",
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
        "Indexación completada. {} fragmentos guardados en Qdrant. {} Archivos omitidos",
        new_count, skipped_count
    ))
}

#[tauri::command]
pub async fn ask_gerisabet(
    app: AppHandle,
    question: String,
    model: String,
) -> Result<(), String> {
    println!("Querying knowledge base for: '{}'", question);

    let question_vector = get_embedding(&question).await?;
    let q_client = get_client().await?;

    let skill_results = search_skills(&q_client, question_vector.clone(), 2, SKILLS_SIMILARITY_THRESHOLD)
        .await.unwrap_or_default();
    let doc_results = search_context(&q_client, question_vector, 2, SIMILARITY_THRESHOLD)
        .await.unwrap_or_default();

    if skill_results.is_empty() && doc_results.is_empty() {
        return {
            app.emit("ai_token", "No encontré información relevante en los documentos para responder a tu pregunta.").ok();
            app.emit("ai_done", "").ok();
            Ok(())
        };
    }

    let mut context_parts: Vec<String> = Vec::new();

    // === RULES (always follow) ===
    let rules: Vec<&SkillSearchResult> = skill_results
        .iter()
        .filter(|s| s.skill_type == "rules")
        .collect();

    if !rules.is_empty() {
        let rules_text = rules
            .iter()
            .map(|s| {
                format!(
                    "skill_name: {}\nskill_type: {}\nscore: {:.2}\ncontent: |\n  {}",
                    s.skill_name,
                    s.skill_type,
                    s.score,
                    s.content.lines().collect::<Vec<_>>().join("\n  ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n---\n");
        context_parts.push(format!("=== RULES (always follow) ===\n{}", rules_text));
    }

    // === SKILLS (use when relevant) ===
    let skills: Vec<&SkillSearchResult> = skill_results
        .iter()
        .filter(|s| s.skill_type != "rules")
        .collect();

    if !skills.is_empty() {
        let skills_text = skills
            .iter()
            .map(|s| {
                format!(
                    "skill_name: {}\nskill_type: {}\nscore: {:.2}\ncontent: |\n  {}",
                    s.skill_name,
                    s.skill_type,
                    s.score,
                    s.content.lines().collect::<Vec<_>>().join("\n  ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n---\n");
        context_parts.push(format!(
            "=== SKILLS (use when relevant) ===\n{}",
            skills_text
        ));
    }

    // === DOCUMENTATION ===
    if !doc_results.is_empty() {
        let docs_text = doc_results
            .iter()
            .map(|res| {
                format!(
                    "source: {}\nscore: {:.2}\ncontent: |\n  {}",
                    res.file_path,
                    res.score,
                    res.text.lines().collect::<Vec<_>>().join("\n  ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n---\n");
        context_parts.push(format!("=== DOCUMENTATION ===\n{}", docs_text));
    }

    let context = context_parts.join("\n\n");
    stream_ollama_response(&question, context, &model, app).await?;
    Ok(())

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
