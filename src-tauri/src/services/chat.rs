//! Chat service — manages sessions and messages with persistent JSON storage.

use crate::domain::chat::{ChatMessage, ChatSession, ChatStore, MessageMetadata, Role};
use crate::error::AppError;
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// Manages the chat store: session CRUD and message persistence.
pub struct ChatService {
    store: ChatStore,
    store_path: PathBuf,
}

impl ChatService {
    /// Load the store from `path`, creating a fresh one if the file doesn't exist.
    pub async fn load(path: impl Into<PathBuf>) -> Result<Self, AppError> {
        let path = path.into();
        let store = if path.exists() {
            let raw = fs::read_to_string(&path).await.map_err(|e| {
                AppError::Storage(format!("Cannot read chat store: {e}"))
            })?;
            serde_json::from_str::<ChatStore>(&raw).unwrap_or_else(|e| {
                log::error!("Corrupted chat store, starting fresh: {e}");
                ChatStore::new()
            })
        } else {
            ChatStore::new()
        };

        Ok(Self { store, store_path: path })
    }

    /// Load synchronously (used during Tauri setup before async runtime is available).
    pub fn load_sync(path: impl Into<PathBuf>) -> Self {
        let path = path.into();
        let store = if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(raw) => serde_json::from_str::<ChatStore>(&raw).unwrap_or_else(|e| {
                    log::error!("Corrupted chat store, starting fresh: {e}");
                    ChatStore::new()
                }),
                Err(e) => {
                    log::error!("Cannot read chat store: {e}");
                    ChatStore::new()
                }
            }
        } else {
            ChatStore::new()
        };
        Self { store, store_path: path }
    }

    // ── Persistence ───────────────────────────────────────────────────────

    async fn persist(&self) -> Result<(), AppError> {
        if let Some(parent) = self.store_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                AppError::Storage(format!("Cannot create chat store dir: {e}"))
            })?;
        }

        let json = serde_json::to_string_pretty(&self.store)
            .map_err(|e| AppError::Serialization(e.to_string()))?;

        let tmp = self.store_path.with_extension("json.tmp");
        let mut file = fs::File::create(&tmp).await.map_err(|e| {
            AppError::Storage(format!("Cannot create tmp file: {e}"))
        })?;
        file.write_all(json.as_bytes()).await.map_err(|e| {
            AppError::Storage(format!("Cannot write chat store: {e}"))
        })?;
        file.flush().await.map_err(|e| {
            AppError::Storage(format!("Flush failed: {e}"))
        })?;
        fs::rename(&tmp, &self.store_path).await.map_err(|e| {
            AppError::Storage(format!("Rename tmp failed: {e}"))
        })?;
        Ok(())
    }

    // ── Session operations ────────────────────────────────────────────────

    /// Create a new session and set it as active.
    pub async fn create_session(&mut self, title: impl Into<String>) -> Result<ChatSession, AppError> {
        let session = ChatSession::new(title);
        self.store.sessions.insert(session.id.clone(), session.clone());
        self.store.active_session_id = Some(session.id.clone());
        self.persist().await?;
        Ok(session)
    }

    /// Delete a session. If it was active, activate the next available one.
    pub async fn delete_session(&mut self, session_id: &str) -> Result<(), AppError> {
        self.store.sessions.remove(session_id);
        if self.store.active_session_id.as_deref() == Some(session_id) {
            self.store.active_session_id = self.store.sessions.keys().next().cloned();
        }
        self.persist().await?;
        Ok(())
    }

    /// Set the active session. Returns error if the session doesn't exist.
    pub async fn set_active(&mut self, session_id: &str) -> Result<(), AppError> {
        if !self.store.sessions.contains_key(session_id) {
            return Err(AppError::SessionNotFound(session_id.to_string()));
        }
        self.store.active_session_id = Some(session_id.to_string());
        self.persist().await?;
        Ok(())
    }

    /// Return the active session ID.
    pub fn active_session_id(&self) -> Option<&str> {
        self.store.active_session_id.as_deref()
    }

    /// Return all sessions sorted by `updated_at` descending.
    pub fn all_sessions(&self, limit: Option<usize>) -> Vec<ChatSession> {
        let mut sessions: Vec<ChatSession> = self
            .store
            .sessions
            .values()
            .map(|s| {
                if let Some(n) = limit {
                    let msgs = if s.messages.len() > n {
                        s.messages[s.messages.len() - n..].to_vec()
                    } else {
                        s.messages.clone()
                    };
                    ChatSession { messages: msgs, ..s.clone() }
                } else {
                    s.clone()
                }
            })
            .collect();
        sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        sessions
    }

    // ── Message operations ────────────────────────────────────────────────

    /// Append a new message to the given session and persist.
    pub async fn save_message(
        &mut self,
        session_id: &str,
        role: Role,
        content: impl Into<String>,
        metadata: Option<MessageMetadata>,
    ) -> Result<ChatMessage, AppError> {
        let session = self
            .store
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.to_string()))?;

        let message = ChatMessage::with_metadata(session_id, role, content, metadata);
        session.messages.push(message.clone());
        session.touch();
        self.persist().await?;
        Ok(message)
    }

    /// Update the content of an existing message.
    pub async fn update_message(
        &mut self,
        session_id: &str,
        message_id: &str,
        content: impl Into<String>,
    ) -> Result<(), AppError> {
        let session = self
            .store
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.to_string()))?;

        let msg = session
            .messages
            .iter_mut()
            .find(|m| m.id == message_id)
            .ok_or_else(|| AppError::MessageNotFound(message_id.to_string()))?;

        msg.content = content.into();
        session.touch();
        self.persist().await?;
        Ok(())
    }

    /// Load a page of messages for a session (newest-first pagination).
    pub fn load_page(&self, session_id: &str, page_size: usize, page: usize) -> Result<Vec<ChatMessage>, AppError> {
        let session = self
            .store
            .sessions
            .get(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.to_string()))?;

        let total = session.messages.len();
        if total == 0 {
            return Ok(Vec::new());
        }
        let end = total.saturating_sub(page * page_size);
        let start = end.saturating_sub(page_size);
        Ok(session.messages[start..end].to_vec())
    }

    /// Return the last `max_count` messages of the active session as `HistoryEntry` for LLM context.
    pub fn recent_history(&self, max_count: usize) -> Vec<crate::domain::chat::HistoryEntry> {
        let Some(id) = &self.store.active_session_id else { return Vec::new() };
        let Some(session) = self.store.sessions.get(id) else { return Vec::new() };

        let msgs = &session.messages;
        let start = msgs.len().saturating_sub(max_count);
        msgs[start..].iter().map(crate::domain::chat::HistoryEntry::from).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn tmp_service() -> (ChatService, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("chat.json");
        let svc = ChatService::load(&path).await.unwrap();
        (svc, dir)
    }

    #[tokio::test]
    async fn create_and_retrieve_session() {
        let (mut svc, _dir) = tmp_service().await;
        let session = svc.create_session("My Session").await.unwrap();
        assert_eq!(session.title, "My Session");
        assert_eq!(svc.active_session_id(), Some(session.id.as_str()));
        let all = svc.all_sessions(None);
        assert_eq!(all.len(), 1);
    }

    #[tokio::test]
    async fn delete_session_changes_active() {
        let (mut svc, _dir) = tmp_service().await;
        let s1 = svc.create_session("S1").await.unwrap();
        let s2 = svc.create_session("S2").await.unwrap();
        // s2 is now active
        svc.delete_session(&s2.id).await.unwrap();
        // active should fall back to s1
        let all = svc.all_sessions(None);
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, s1.id);
    }

    #[tokio::test]
    async fn save_and_update_message() {
        let (mut svc, _dir) = tmp_service().await;
        let session = svc.create_session("Chat").await.unwrap();
        let msg = svc.save_message(&session.id, Role::User, "Hello", None).await.unwrap();
        assert_eq!(msg.content, "Hello");

        svc.update_message(&session.id, &msg.id, "Hello updated").await.unwrap();
        let all = svc.all_sessions(None);
        assert_eq!(all[0].messages[0].content, "Hello updated");
    }

    #[tokio::test]
    async fn persist_and_reload() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("chat.json");
        {
            let mut svc = ChatService::load(&path).await.unwrap();
            let session = svc.create_session("Persistent").await.unwrap();
            svc.save_message(&session.id, Role::Assistant, "I remember", None).await.unwrap();
        }
        // Reload
        let svc2 = ChatService::load(&path).await.unwrap();
        let all = svc2.all_sessions(None);
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].title, "Persistent");
        assert_eq!(all[0].messages[0].content, "I remember");
    }

    #[tokio::test]
    async fn session_not_found_returns_error() {
        let (mut svc, _dir) = tmp_service().await;
        let result = svc.save_message("nonexistent-id", Role::User, "hi", None).await;
        assert!(matches!(result, Err(AppError::SessionNotFound(_))));
    }

    #[test]
    fn recent_history_empty_when_no_active() {
        let svc = ChatService { store: ChatStore::new(), store_path: "x.json".into() };
        assert!(svc.recent_history(10).is_empty());
    }

    #[tokio::test]
    async fn load_page_returns_slice() {
        let (mut svc, _dir) = tmp_service().await;
        let session = svc.create_session("P").await.unwrap();
        for i in 0..10 {
            svc.save_message(&session.id, Role::User, format!("msg {i}"), None).await.unwrap();
        }
        let page = svc.load_page(&session.id, 3, 0).unwrap();
        assert_eq!(page.len(), 3);
        // Last 3 messages
        assert!(page[2].content.contains("9"));
    }

    #[tokio::test]
    async fn update_message_unknown_session_errors() {
        let (mut svc, _dir) = tmp_service().await;
        let result = svc.update_message("no-such-session", "any-msg-id", "content").await;
        assert!(matches!(result, Err(AppError::SessionNotFound(_))));
    }

    #[tokio::test]
    async fn update_message_unknown_message_errors() {
        let (mut svc, _dir) = tmp_service().await;
        let session = svc.create_session("Chat").await.unwrap();
        let result = svc.update_message(&session.id, "no-such-msg-id", "content").await;
        assert!(matches!(result, Err(AppError::MessageNotFound(_))));
    }

    #[tokio::test]
    async fn load_page_zero_size_returns_empty() {
        let (mut svc, _dir) = tmp_service().await;
        let session = svc.create_session("P").await.unwrap();
        svc.save_message(&session.id, Role::User, "hello", None).await.unwrap();
        let page = svc.load_page(&session.id, 0, 0).unwrap();
        assert!(page.is_empty());
    }
}
