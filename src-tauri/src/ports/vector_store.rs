//! Vector store port — upsert and search for both library and skills collections.

use crate::domain::search::{DocSearchResult, SkillSearchResult};
use crate::error::AppError;

/// Abstracts a vector database for both document library and skills collections.
pub trait VectorStore: Send + Sync {
    // ── Library collection ────────────────────────────────────────────────

    /// Ensure the library collection exists, creating it if needed.
    fn init_library(
        &self,
    ) -> impl std::future::Future<Output = Result<(), AppError>> + Send;

    /// Upsert a document chunk into the library collection.
    ///
    /// Uses deterministic UUID v5 keyed on `file_path + text` to avoid duplicates.
    fn upsert_doc(
        &self,
        text: &str,
        file_path: &str,
        vector: Vec<f32>,
    ) -> impl std::future::Future<Output = Result<(), AppError>> + Send;

    /// Search the library collection for the most similar chunks.
    fn search_docs(
        &self,
        query_vector: Vec<f32>,
        limit: u64,
        threshold: f32,
    ) -> impl std::future::Future<Output = Result<Vec<DocSearchResult>, AppError>> + Send;

    // ── Skills collection ─────────────────────────────────────────────────

    /// Ensure the skills collection exists, creating it if needed.
    fn init_skills(
        &self,
    ) -> impl std::future::Future<Output = Result<(), AppError>> + Send;

    /// Upsert a skill chunk into the skills collection.
    ///
    /// Uses deterministic UUID v5 keyed on `skill_type + skill_name + content`.
    fn upsert_skill(
        &self,
        content: &str,
        skill_name: &str,
        skill_type: &str,
        vector: Vec<f32>,
    ) -> impl std::future::Future<Output = Result<(), AppError>> + Send;

    /// Search the skills collection for the most similar chunks.
    fn search_skills(
        &self,
        query_vector: Vec<f32>,
        limit: u64,
        threshold: f32,
    ) -> impl std::future::Future<Output = Result<Vec<SkillSearchResult>, AppError>> + Send;
}
