// 1. Declaramos los módulos hijos
pub mod book_finder;
pub mod commands;
pub mod embeddings;
pub mod qdrant_db;

// 2. Función de arranque
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::ask_gerisabet,
            commands::index_library
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
