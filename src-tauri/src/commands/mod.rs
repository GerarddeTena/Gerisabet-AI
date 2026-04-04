//! Tauri command handlers — thin controllers that delegate to services.
//!
//! No business logic lives here. Commands only:
//! 1. Extract parameters from the Tauri IPC call
//! 2. Lock/access application state
//! 3. Delegate to a service
//! 4. Map AppError → String for the Tauri boundary
pub mod ai;
pub mod chat;
pub mod indexing;
pub mod system;

use crate::services::chat::ChatService;
use tokio::sync::Mutex;

/// Tauri managed state for the chat service.
pub struct ChatState(pub Mutex<ChatService>);
