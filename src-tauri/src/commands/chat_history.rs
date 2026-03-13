use crate::commands::{CHAT_HISTORY, MAX_HISTORY_MESSAGES};
use crate::embeddings::ChatHistoryMessage;

#[tauri::command]
pub async fn save_exchange(question: String, answer: String) -> Result<(), String> {
    let mut guard = CHAT_HISTORY.lock().unwrap();

    guard.push(ChatHistoryMessage {
        role: "user".to_string(),
        content: question,
    });
    guard.push(ChatHistoryMessage {
        role: "assistant".to_string(),
        content: answer,
    });

    // Trim to max history
    let len = guard.len();
    if len > MAX_HISTORY_MESSAGES * 2 {
        guard.drain(0..len - MAX_HISTORY_MESSAGES * 2);
    }

    println!("History updated: {} messages", guard.len());
    Ok(())
}

#[tauri::command]
pub async fn clear_history() -> Result<(), String> {
    CHAT_HISTORY.lock().unwrap().clear();
    println!("Chat history cleared");
    Ok(())
}
