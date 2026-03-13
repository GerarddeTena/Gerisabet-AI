pub mod book_finder;
pub mod commands;
pub mod embeddings;
pub mod indexer_tracker;
pub mod qdrant_db;

use std::sync::atomic::AtomicBool;
use crate::commands::ai::ask_gerisabet;
use crate::commands::indexing_library::{cancel_indexing, index_library};
use crate::commands::indexing_skills::index_skills;
use crate::commands::chat_history::{save_exchange, clear_history};

pub static INDEXING_CANCELLED: AtomicBool = AtomicBool::new(false);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            index_library,
            ask_gerisabet,
            cancel_indexing,
            index_skills,
            save_exchange,
            clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
