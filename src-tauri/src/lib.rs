
// 1. Declaramos los módulos hijos
pub mod embeddings;
pub mod book_finder;
pub mod commands; // <--- ¡NUEVO!

// 2. Función de arranque
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Usamos la función importándola desde el módulo commands
        .invoke_handler(tauri::generate_handler![commands::ask_gerisabet]) 
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
