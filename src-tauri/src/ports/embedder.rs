//! Embedding port — converts text to a float vector.

use crate::error::AppError;

/// Converts a text string into a fixed-size embedding vector.
pub trait Embedder: Send + Sync {
    /// Embed `text` and return its vector representation.
    fn embed(
        &self,
        text: &str,
    ) -> impl std::future::Future<Output = Result<Vec<f32>, AppError>> + Send;
}
