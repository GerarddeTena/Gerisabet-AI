pub mod adapters;
pub mod commands;
pub mod config;
pub mod domain;
pub mod error;
pub mod ports;
pub mod services;

use crate::commands::ai::ask_gerisabet;
use crate::commands::chat::{
    create_session, delete_session, get_active_session, load_chat_history, load_messages_page,
    save_message, set_active_session, update_message_content,
};
use crate::commands::indexing::{cancel_indexing, index_library, index_skills};
use crate::commands::system::{get_available_models, scan_system_info};
use crate::commands::ChatState;
use crate::config::CHAT_STORE_FILENAME;
use crate::services::chat::ChatService;
use std::sync::atomic::AtomicBool;
use tauri::Manager;
use tokio::sync::Mutex;

pub static INDEXING_CANCELLED: AtomicBool = AtomicBool::new(false);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let store_path = app
                .path()
                .app_data_dir()
                .expect("Cannot resolve app_data_dir")
                .join(CHAT_STORE_FILENAME);

            let chat_service = ChatService::load_sync(store_path);
            app.manage(ChatState(Mutex::new(chat_service)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            index_library,
            cancel_indexing,
            index_skills,
            ask_gerisabet,
            get_available_models,
            scan_system_info,
            load_chat_history,
            get_active_session,
            save_message,
            update_message_content,
            create_session,
            delete_session,
            set_active_session,
            load_messages_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
