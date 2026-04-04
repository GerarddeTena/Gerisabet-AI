//! Retrieval service — semantic search and context assembly.

use crate::config::{LIBRARY_THRESHOLD, SEARCH_LIMIT, SKILLS_THRESHOLD};
use crate::domain::search::SkillSearchResult;
use crate::error::AppError;
use crate::ports::embedder::Embedder;
use crate::ports::vector_store::VectorStore;

/// Orchestrates embedding a question and retrieving relevant context.
pub struct RetrievalService<E: Embedder, V: VectorStore> {
    embedder: E,
    store: V,
}

impl<E: Embedder, V: VectorStore> RetrievalService<E, V> {
    pub fn new(embedder: E, store: V) -> Self {
        Self { embedder, store }
    }

    /// Embed `question`, search both collections, and build the context string.
    ///
    /// Rules are always injected first; regular skills second; docs third.
    /// Returns `None` if both searches return empty results.
    pub async fn build_context(&self, question: &str) -> Result<Option<String>, AppError> {
        let vector = self.embedder.embed(question).await?;

        let (skill_results, doc_results) = tokio::join!(
            self.store.search_skills(vector.clone(), SEARCH_LIMIT, SKILLS_THRESHOLD),
            self.store.search_docs(vector, SEARCH_LIMIT, LIBRARY_THRESHOLD),
        );

        let skill_results = skill_results.unwrap_or_else(|e| {
            log::warn!("Skills search failed: {e}");
            vec![]
        });
        let doc_results = doc_results.unwrap_or_else(|e| {
            log::warn!("Docs search failed: {e}");
            vec![]
        });

        if skill_results.is_empty() && doc_results.is_empty() {
            return Ok(None);
        }

        let mut parts: Vec<String> = Vec::new();

        let (rules, skills): (Vec<_>, Vec<_>) =
            skill_results.iter().partition(|s| s.is_rule());

        if !rules.is_empty() {
            parts.push(format!(
                "=== RULES (always follow) ===\n{}",
                format_skills(&rules)
            ));
        }

        if !skills.is_empty() {
            parts.push(format!(
                "=== SKILLS (use when relevant) ===\n{}",
                format_skills(&skills)
            ));
        }

        if !doc_results.is_empty() {
            let docs_text = doc_results
                .iter()
                .map(|r| {
                    format!(
                        "source: {}\nscore: {:.2}\ncontent: |\n  {}",
                        r.file_path,
                        r.score,
                        r.text.lines().collect::<Vec<_>>().join("\n  ")
                    )
                })
                .collect::<Vec<_>>()
                .join("\n---\n");
            parts.push(format!("=== DOCUMENTATION ===\n{docs_text}"));
        }

        Ok(Some(parts.join("\n\n")))
    }
}

fn format_skills(skills: &[&SkillSearchResult]) -> String {
    skills
        .iter()
        .map(|s| {
            format!(
                "skill_name: {}\nskill_type: {}\nscore: {:.2}\ncontent: |\n  {}",
                s.skill_name,
                s.skill_type,
                s.score,
                s.content.lines().collect::<Vec<_>>().join("\n  ")
            )
        })
        .collect::<Vec<_>>()
        .join("\n---\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::search::{DocSearchResult, SkillSearchResult};

    struct FixedEmbedder;
    impl Embedder for FixedEmbedder {
        async fn embed(&self, _text: &str) -> Result<Vec<f32>, AppError> {
            Ok(vec![0.5; 768])
        }
    }

    struct EmptyStore;
    impl VectorStore for EmptyStore {
        async fn init_library(&self) -> Result<(), AppError> { Ok(()) }
        async fn upsert_doc(&self, _t: &str, _f: &str, _v: Vec<f32>) -> Result<(), AppError> { Ok(()) }
        async fn search_docs(&self, _: Vec<f32>, _: u64, _: f32) -> Result<Vec<DocSearchResult>, AppError> { Ok(vec![]) }
        async fn init_skills(&self) -> Result<(), AppError> { Ok(()) }
        async fn upsert_skill(&self, _: &str, _: &str, _: &str, _: Vec<f32>) -> Result<(), AppError> { Ok(()) }
        async fn search_skills(&self, _: Vec<f32>, _: u64, _: f32) -> Result<Vec<SkillSearchResult>, AppError> { Ok(vec![]) }
    }

    struct StubStore {
        skills: Vec<SkillSearchResult>,
        docs: Vec<DocSearchResult>,
    }
    impl VectorStore for StubStore {
        async fn init_library(&self) -> Result<(), AppError> { Ok(()) }
        async fn upsert_doc(&self, _: &str, _: &str, _: Vec<f32>) -> Result<(), AppError> { Ok(()) }
        async fn search_docs(&self, _: Vec<f32>, _: u64, _: f32) -> Result<Vec<DocSearchResult>, AppError> {
            Ok(self.docs.clone())
        }
        async fn init_skills(&self) -> Result<(), AppError> { Ok(()) }
        async fn upsert_skill(&self, _: &str, _: &str, _: &str, _: Vec<f32>) -> Result<(), AppError> { Ok(()) }
        async fn search_skills(&self, _: Vec<f32>, _: u64, _: f32) -> Result<Vec<SkillSearchResult>, AppError> {
            Ok(self.skills.clone())
        }
    }

    #[tokio::test]
    async fn returns_none_when_both_empty() {
        let svc = RetrievalService::new(FixedEmbedder, EmptyStore);
        assert!(svc.build_context("anything").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn rules_appear_first_in_context() {
        let store = StubStore {
            skills: vec![
                SkillSearchResult { content: "always be concise".to_string(), skill_name: "brevity".to_string(), skill_type: "rules".to_string(), score: 0.9 },
                SkillSearchResult { content: "be friendly".to_string(), skill_name: "tone".to_string(), skill_type: "persona".to_string(), score: 0.8 },
            ],
            docs: vec![],
        };
        let svc = RetrievalService::new(FixedEmbedder, store);
        let ctx = svc.build_context("hello").await.unwrap().unwrap();
        let rules_pos = ctx.find("RULES").unwrap();
        let skills_pos = ctx.find("SKILLS").unwrap();
        assert!(rules_pos < skills_pos, "Rules must appear before skills");
    }

    #[tokio::test]
    async fn docs_section_included() {
        let store = StubStore {
            skills: vec![],
            docs: vec![DocSearchResult { text: "sample content".to_string(), file_path: "/a.pdf".to_string(), score: 0.8 }],
        };
        let svc = RetrievalService::new(FixedEmbedder, store);
        let ctx = svc.build_context("question").await.unwrap().unwrap();
        assert!(ctx.contains("DOCUMENTATION"));
        assert!(ctx.contains("sample content"));
    }

    #[tokio::test]
    async fn context_with_only_rules_returns_some() {
        let store = StubStore {
            skills: vec![
                SkillSearchResult {
                    content: "always follow the rules".to_string(),
                    skill_name: "grounding".to_string(),
                    skill_type: "rules".to_string(),
                    score: 0.95,
                },
            ],
            docs: vec![],
        };
        let svc = RetrievalService::new(FixedEmbedder, store);
        let ctx = svc.build_context("anything").await.unwrap();
        let ctx = ctx.expect("Expected Some context when only rules are present");
        assert!(ctx.contains("RULES"));
        assert!(ctx.contains("always follow the rules"));
        assert!(!ctx.contains("SKILLS"));
        assert!(!ctx.contains("DOCUMENTATION"));
    }
}
