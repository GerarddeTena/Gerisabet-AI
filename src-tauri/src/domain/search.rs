//! Result types returned from vector similarity searches.

use serde::{Deserialize, Serialize};

/// A document chunk retrieved from the library collection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocSearchResult {
    /// The chunk text.
    pub text: String,
    /// Absolute path of the source file.
    pub file_path: String,
    /// Cosine similarity score in [0, 1].
    pub score: f32,
}

/// A skill chunk retrieved from the skills collection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSearchResult {
    /// The chunk text.
    pub content: String,
    /// Stem of the skill Markdown file name.
    pub skill_name: String,
    /// Parent folder name (determines injection priority).
    pub skill_type: String,
    /// Cosine similarity score in [0, 1].
    pub score: f32,
}

impl SkillSearchResult {
    /// Returns `true` if this skill is a "rule" that must always be injected.
    pub fn is_rule(&self) -> bool {
        self.skill_type == "rules"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skill_result_is_rule() {
        let r = SkillSearchResult {
            content: "always follow this".to_string(),
            skill_name: "grounding".to_string(),
            skill_type: "rules".to_string(),
            score: 0.9,
        };
        assert!(r.is_rule());
    }

    #[test]
    fn skill_result_not_rule() {
        let r = SkillSearchResult {
            content: "helpful hint".to_string(),
            skill_name: "tone".to_string(),
            skill_type: "persona".to_string(),
            score: 0.7,
        };
        assert!(!r.is_rule());
    }
}
