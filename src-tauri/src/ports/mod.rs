//! Port traits — abstract boundaries between the application and infrastructure.
//!
//! Services depend ONLY on these traits; they never import adapters directly.
//! This makes services testable without real HTTP, file system, or vector DB access.

pub mod embedder;
pub mod file_reader;
pub mod index_tracker;
pub mod streamer;
pub mod vector_store;
