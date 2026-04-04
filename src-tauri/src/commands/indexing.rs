//! Indexing command handlers — thin wrappers over IndexingService.

use crate::adapters::fs_reader::FsFileReader;
use crate::adapters::json_tracker::JsonTracker;
use crate::adapters::ollama::OllamaClient;
use crate::adapters::qdrant::QdrantStore;
use crate::config::{LIBRARY_TRACKER_FILENAME, SKILLS_TRACKER_FILENAME};
use crate::ports::vector_store::VectorStore;
use crate::services::indexing::IndexingService;
use crate::INDEXING_CANCELLED;
use glob::glob;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn cancel_indexing() -> Result<String, String> {
    INDEXING_CANCELLED.store(true, Ordering::SeqCst);
    log::info!("Indexing cancelled by user");
    Ok("Cancelled".to_string())
}

#[tauri::command]
pub async fn index_library(app: AppHandle, directory_path: String) -> Result<String, String> {
    log::info!("Starting library indexing from: {directory_path}");

    let ollama = OllamaClient::new().map_err(|e| e.to_string())?;
    let qdrant = QdrantStore::connect().await.map_err(|e| e.to_string())?;
    qdrant.init_library().await.map_err(|e| e.to_string())?;

    let tracker_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(LIBRARY_TRACKER_FILENAME);

    let tracker = JsonTracker::load(&tracker_path).map_err(|e| e.to_string())?;

    // Normalise to forward-slash and ensure a trailing separator so the glob
    // wildcard applies INSIDE the directory, not to the directory name itself.
    let base = directory_path.replace('\\', "/");
    let base = if base.ends_with('/') { base } else { format!("{base}/") };
    let pattern = format!("{base}**/*.*");
    let paths: Vec<_> = glob(&pattern)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|p| p.is_file())
        .collect();

    let app_clone = app.clone();
    let mut svc = IndexingService::new(ollama, qdrant, FsFileReader, tracker, &INDEXING_CANCELLED);

    let (new_count, skipped_count) = svc
        .index_files(paths, move |progress| {
            app_clone.emit("indexing_progress", &progress).ok();
        })
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Indexation completed. {new_count} chunks stored into Qdrant. {skipped_count} files skipped."
    ))
}

#[tauri::command]
pub async fn index_skills(app: AppHandle, skills_path: String) -> Result<String, String> {
    log::info!("Starting skills indexing from: {skills_path}");

    let ollama = OllamaClient::new().map_err(|e| e.to_string())?;
    let qdrant = QdrantStore::connect().await.map_err(|e| e.to_string())?;
    qdrant.init_skills().await.map_err(|e| e.to_string())?;

    let tracker_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(SKILLS_TRACKER_FILENAME);

    let tracker = JsonTracker::load(&tracker_path).map_err(|e| e.to_string())?;

    // Normalise to forward-slash and ensure a trailing separator so ** becomes
    // a proper recursive segment, not a suffix on the directory name.
    let base = skills_path.replace('\\', "/");
    let base = if base.ends_with('/') { base } else { format!("{base}/") };
    let pattern = format!("{base}**/*.md");
    let paths: Vec<_> = glob(&pattern)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|p| p.is_file())
        .collect();

    let app_clone = app.clone();
    let mut svc = IndexingService::new(ollama, qdrant, FsFileReader, tracker, &INDEXING_CANCELLED);

    let (new_count, skipped_count) = svc
        .index_skills(paths, move |progress| {
            app_clone.emit("skills_progress", &progress).ok();
        })
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Skills indexing completed. {new_count} chunks saved to Qdrant. {skipped_count} files skipped."
    ))
}
