//! Index tracker port — tracks which files have already been indexed.

use crate::error::AppError;

/// Tracks which file paths have been indexed into the vector store.
///
/// Implementations persist the set to disk (e.g. as JSON) so that
/// re-running the indexer is safe and idempotent.
pub trait IndexTracker: Send + Sync {
    /// Returns `true` if `path` has already been indexed.
    fn is_indexed(&self, path: &str) -> bool;

    /// Mark `path` as indexed (in-memory only; call [`persist`] to save).
    fn mark_indexed(&mut self, path: &str);

    /// Persist the current set of indexed paths to storage.
    fn persist(&self) -> Result<(), AppError>;
}
