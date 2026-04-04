//! Chat command handlers — thin Tauri wrappers over ChatService.

use crate::commands::ChatState;
use crate::domain::chat::{ChatMessage, ChatSession, MessageMetadata, Role};
use tauri::State;

#[tauri::command]
pub async fn load_chat_history(
    state: State<'_, ChatState>,
    limit: Option<usize>,
) -> Result<Vec<ChatSession>, String> {
    let svc = state.0.lock().await;
    Ok(svc.all_sessions(limit))
}

#[tauri::command]
pub async fn get_active_session(state: State<'_, ChatState>) -> Result<Option<String>, String> {
    let svc = state.0.lock().await;
    Ok(svc.active_session_id().map(str::to_string))
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, ChatState>,
    title: String,
) -> Result<ChatSession, String> {
    let mut svc = state.0.lock().await;
    svc.create_session(title).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_session(
    state: State<'_, ChatState>,
    session_id: String,
) -> Result<(), String> {
    let mut svc = state.0.lock().await;
    svc.delete_session(&session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_active_session(
    state: State<'_, ChatState>,
    session_id: String,
) -> Result<(), String> {
    let mut svc = state.0.lock().await;
    svc.set_active(&session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_message(
    state: State<'_, ChatState>,
    session_id: String,
    role: Role,
    content: String,
    metadata: Option<MessageMetadata>,
) -> Result<ChatMessage, String> {
    let mut svc = state.0.lock().await;
    svc.save_message(&session_id, role, content, metadata)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_message_content(
    state: State<'_, ChatState>,
    session_id: String,
    message_id: String,
    content: String,
) -> Result<(), String> {
    let mut svc = state.0.lock().await;
    svc.update_message(&session_id, &message_id, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_messages_page(
    state: State<'_, ChatState>,
    session_id: String,
    page_size: usize,
    page: usize,
) -> Result<Vec<ChatMessage>, String> {
    let svc = state.0.lock().await;
    svc.load_page(&session_id, page_size, page)
        .map_err(|e| e.to_string())
}
