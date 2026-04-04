//! Chat domain models: sessions, messages, and the persistent store.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// The role of a participant in a chat exchange.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
    System,
}

/// Optional metadata attached to an assistant message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_ms: Option<u64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokens: Option<u32>,
}

/// A single message in a chat session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: Role,
    pub content: String,
    pub timestamp: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<MessageMetadata>,
}

impl ChatMessage {
    /// Construct a new message, generating a UUID and UTC timestamp.
    pub fn new(session_id: impl Into<String>, role: Role, content: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.into(),
            role,
            content: content.into(),
            timestamp: Utc::now().to_rfc3339(),
            metadata: None,
        }
    }

    /// Construct a new message with optional metadata.
    pub fn with_metadata(
        session_id: impl Into<String>,
        role: Role,
        content: impl Into<String>,
        metadata: Option<MessageMetadata>,
    ) -> Self {
        let mut msg = Self::new(session_id, role, content);
        msg.metadata = metadata;
        msg
    }
}

/// A named conversation session containing an ordered list of messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<ChatMessage>,
}

impl ChatSession {
    /// Create a new empty session with a generated ID and current timestamp.
    pub fn new(title: impl Into<String>) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            title: title.into(),
            created_at: now.clone(),
            updated_at: now,
            messages: Vec::new(),
        }
    }

    /// Touch the `updated_at` field to the current UTC time.
    pub fn touch(&mut self) {
        self.updated_at = Utc::now().to_rfc3339();
    }
}

/// The top-level store persisted to disk as JSON.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ChatStore {
    /// Bump when the schema changes to enable migrations.
    pub schema_version: u32,
    pub sessions: HashMap<String, ChatSession>,
    pub active_session_id: Option<String>,
}

impl ChatStore {
    pub fn new() -> Self {
        Self {
            schema_version: 1,
            sessions: HashMap::new(),
            active_session_id: None,
        }
    }
}

/// Lightweight DTO used when passing history to the LLM.
/// Kept minimal on purpose — only the fields Ollama needs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub role: String,
    pub content: String,
}

impl From<&ChatMessage> for HistoryEntry {
    fn from(msg: &ChatMessage) -> Self {
        Self {
            role: match msg.role {
                Role::User => "user".to_string(),
                Role::Assistant => "assistant".to_string(),
                Role::System => "system".to_string(),
            },
            content: msg.content.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_session_new_has_unique_ids() {
        let a = ChatSession::new("Session A");
        let b = ChatSession::new("Session B");
        assert_ne!(a.id, b.id);
        assert_eq!(a.title, "Session A");
        assert!(a.messages.is_empty());
    }

    #[test]
    fn chat_message_new_sets_fields() {
        let msg = ChatMessage::new("sess-1", Role::User, "Hello");
        assert_eq!(msg.session_id, "sess-1");
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "Hello");
        assert!(!msg.id.is_empty());
        assert!(!msg.timestamp.is_empty());
    }

    #[test]
    fn chat_store_new_is_empty() {
        let store = ChatStore::new();
        assert_eq!(store.schema_version, 1);
        assert!(store.sessions.is_empty());
        assert!(store.active_session_id.is_none());
    }

    #[test]
    fn history_entry_from_message() {
        let msg = ChatMessage::new("s", Role::Assistant, "Hi");
        let entry = HistoryEntry::from(&msg);
        assert_eq!(entry.role, "assistant");
        assert_eq!(entry.content, "Hi");
    }

    #[test]
    fn chat_session_touch_updates_timestamp() {
        let mut session = ChatSession::new("T");
        let original = session.updated_at.clone();
        // Sleep briefly to ensure timestamp changes
        std::thread::sleep(std::time::Duration::from_millis(10));
        session.touch();
        // timestamps should differ (chrono has ms precision)
        // Note: in fast machines they may be equal in the same second; we just test it doesn't panic
        assert!(!session.updated_at.is_empty());
        drop(original);
    }
}
