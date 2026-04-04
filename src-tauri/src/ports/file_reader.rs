//! File reader port — reads a file from disk into a `Document`.

use crate::domain::document::Document;
use crate::error::AppError;
use std::path::Path;

/// Reads a file at the given path and extracts its plain-text content.
pub trait FileReader: Send + Sync {
    /// Read the file at `path` and return a [`Document`].
    ///
    /// Returns an error for:
    /// - Files exceeding the size limit
    /// - Unsupported file formats
    /// - I/O or parsing failures
    fn read_file(&self, path: &Path) -> Result<Document, AppError>;
}
