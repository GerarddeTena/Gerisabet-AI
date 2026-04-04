//! Document domain model and text-chunking logic.

use serde::{Deserialize, Serialize};

/// A document loaded from disk, ready for chunking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    /// Absolute path to the source file.
    pub path: String,
    /// Full plain-text content of the document.
    pub content: String,
    /// Lowercase file extension (e.g. `"pdf"`, `"txt"`).
    pub file_type: String,
}

/// Split `text` into chunks of at most `words_per_chunk` whitespace-separated words.
///
/// Empty input returns an empty `Vec`.
pub fn split_into_chunks(text: &str, words_per_chunk: usize) -> Vec<String> {
    if words_per_chunk == 0 {
        return Vec::new();
    }
    let words: Vec<&str> = text.split_whitespace().collect();
    words
        .chunks(words_per_chunk)
        .map(|chunk| chunk.join(" "))
        .collect()
}

/// Return `true` if a chunk is worth embedding.
///
/// Filters out:
/// - Chunks shorter than 10 characters
/// - Chunks with less than 20 % alphabetic characters
/// - Chunks where more than 15 % of characters are dots (common in PDF artefacts)
pub fn is_meaningful_chunk(text: &str) -> bool {
    let total = text.chars().count();
    if total < 10 {
        return false;
    }
    let alpha = text.chars().filter(|c| c.is_alphabetic()).count();
    let dots = text.chars().filter(|&c| c == '.').count();

    (alpha as f32 / total as f32) >= 0.20
        && (dots as f32 / total as f32) <= 0.15
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_empty_text_returns_empty() {
        assert!(split_into_chunks("", 10).is_empty());
    }

    #[test]
    fn split_respects_word_limit() {
        let text = "one two three four five six seven eight nine ten eleven";
        let chunks = split_into_chunks(text, 4);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0], "one two three four");
        assert_eq!(chunks[1], "five six seven eight");
        assert_eq!(chunks[2], "nine ten eleven");
    }

    #[test]
    fn split_exact_multiple() {
        let text = "a b c d e f";
        let chunks = split_into_chunks(text, 3);
        assert_eq!(chunks.len(), 2);
    }

    #[test]
    fn split_single_chunk_when_small() {
        let chunks = split_into_chunks("hello world", 100);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], "hello world");
    }

    #[test]
    fn is_meaningful_rejects_short() {
        assert!(!is_meaningful_chunk("hi"));
    }

    #[test]
    fn is_meaningful_rejects_low_alpha() {
        // Almost all numbers
        assert!(!is_meaningful_chunk("1234 5678 9012 3456"));
    }

    #[test]
    fn is_meaningful_rejects_dot_heavy() {
        assert!(!is_meaningful_chunk("ab.cd.ef.gh.ij.kl.mn.op.qr.st"));
    }

    #[test]
    fn is_meaningful_accepts_normal_text() {
        assert!(is_meaningful_chunk("This is a normal English sentence that should pass."));
    }

    #[test]
    fn split_zero_words_per_chunk_returns_empty() {
        assert!(split_into_chunks("hello world", 0).is_empty());
    }

    #[test]
    fn split_whitespace_only_returns_empty() {
        assert!(split_into_chunks("   \n\t  \r\n  ", 5).is_empty());
    }

    #[test]
    fn split_handles_unicode_words() {
        let text = "héllo wörld café résumé naïve";
        let chunks = split_into_chunks(text, 2);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0], "héllo wörld");
        assert_eq!(chunks[1], "café résumé");
        assert_eq!(chunks[2], "naïve");
    }
}
