pub mod book_finder;
pub mod commands;
pub mod embeddings;
pub mod indexer_tracker;
pub mod qdrant_db;

use std::sync::atomic::AtomicBool;

pub static INDEXING_CANCELLED: AtomicBool = AtomicBool::new(false);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::index_library,
            commands::ask_gerisabet,
            commands::cancel_indexing,
            commands::index_skills,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
