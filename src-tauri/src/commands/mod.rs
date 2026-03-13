use std::sync::Mutex;
use crate::embeddings::ChatHistoryMessage;

pub static CHAT_HISTORY: Mutex<Vec<ChatHistoryMessage>> = Mutex::new(Vec::new());
pub const MAX_HISTORY_MESSAGES: usize = 10;
pub const SIMILARITY_THRESHOLD: f32 = 0.65;
pub const SKILLS_SIMILARITY_THRESHOLD: f32 = 0.5;
pub const SKILLS_TRACKER_PATH: &str = "C:\\Users\\Gerard\\qdrant_storage\\indexed_skills.json";

mod indexing_logic;
pub mod indexing_library;
pub mod ai;
pub mod indexing_skills;
pub mod chat_history;