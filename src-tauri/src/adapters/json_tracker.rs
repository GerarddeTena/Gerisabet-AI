//! JSON-backed index tracker — implements [`IndexTracker`].

use crate::error::AppError;
use crate::ports::index_tracker::IndexTracker;
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Persists the set of indexed file paths to a JSON file on disk.
pub struct JsonTracker {
    path: PathBuf,
    indexed: HashSet<String>,
}

impl JsonTracker {
    /// Load an existing tracker from `path`, or start fresh if it doesn't exist.
    pub fn load(path: impl Into<PathBuf>) -> Result<Self, AppError> {
        let path = path.into();

        let indexed = if path.exists() {
            let content = fs::read_to_string(&path).map_err(|e| {
                AppError::Storage(format!("Cannot read tracker {}: {e}", path.display()))
            })?;
            serde_json::from_str::<HashSet<String>>(&content).unwrap_or_default()
        } else {
            HashSet::new()
        };

        Ok(Self { path, indexed })
    }

    /// Number of tracked entries.
    pub fn len(&self) -> usize {
        self.indexed.len()
    }

    /// Returns `true` if no entries are tracked.
    pub fn is_empty(&self) -> bool {
        self.indexed.is_empty()
    }
}

impl IndexTracker for JsonTracker {
    fn is_indexed(&self, path: &str) -> bool {
        self.indexed.contains(path)
    }

    fn mark_indexed(&mut self, path: &str) {
        self.indexed.insert(path.to_string());
    }

    fn persist(&self) -> Result<(), AppError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                AppError::Storage(format!("Cannot create tracker dir: {e}"))
            })?;
        }

        let json = serde_json::to_string_pretty(&self.indexed)
            .map_err(|e| AppError::Serialization(e.to_string()))?;

        let mut file = fs::File::create(&self.path)
            .map_err(|e| AppError::Storage(format!("Cannot create tracker file: {e}")))?;

        file.write_all(json.as_bytes())
            .map_err(|e| AppError::Storage(format!("Cannot write tracker: {e}")))?;

        log::debug!(
            "Tracker saved: {} entries at {}",
            self.indexed.len(),
            self.path.display()
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_tracker_is_empty() {
        let dir = tempfile::tempdir().unwrap();
        let tracker = JsonTracker::load(dir.path().join("tracker.json")).unwrap();
        assert!(tracker.is_empty());
        assert_eq!(tracker.len(), 0);
    }

    #[test]
    fn mark_and_check_indexed() {
        let dir = tempfile::tempdir().unwrap();
        let mut tracker = JsonTracker::load(dir.path().join("tracker.json")).unwrap();
        assert!(!tracker.is_indexed("/some/file.pdf"));
        tracker.mark_indexed("/some/file.pdf");
        assert!(tracker.is_indexed("/some/file.pdf"));
    }

    #[test]
    fn persist_and_reload() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tracker.json");

        let mut tracker = JsonTracker::load(&path).unwrap();
        tracker.mark_indexed("/doc/a.pdf");
        tracker.mark_indexed("/doc/b.pdf");
        tracker.persist().unwrap();

        // Reload from disk
        let reloaded = JsonTracker::load(&path).unwrap();
        assert!(reloaded.is_indexed("/doc/a.pdf"));
        assert!(reloaded.is_indexed("/doc/b.pdf"));
        assert!(!reloaded.is_indexed("/doc/c.pdf"));
        assert_eq!(reloaded.len(), 2);
    }

    #[test]
    fn persist_creates_parent_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("deep").join("tracker.json");
        let mut tracker = JsonTracker::load(&path).unwrap();
        tracker.mark_indexed("file.txt");
        assert!(tracker.persist().is_ok());
        assert!(path.exists());
    }
}
