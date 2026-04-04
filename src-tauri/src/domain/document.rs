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

/// Split `text` into sentence-aware chunks targeting `target_words` words each.
///
/// Chunks end at sentence boundaries (`.`, `!`, `?` followed by whitespace) rather
/// than at arbitrary word counts. The last `overlap_sentences` sentences from each
/// chunk are prepended to the next to prevent information loss at boundaries.
///
/// Falls back to [`split_into_chunks`] when no sentence boundaries are detected
/// (e.g. code blocks, TSV tables, or very short text).
pub fn split_into_chunks_sentence_aware(
    text: &str,
    target_words: usize,
    overlap_sentences: usize,
) -> Vec<String> {
    if target_words == 0 {
        return Vec::new();
    }

    let sentences = split_into_sentences(text);

    // No sentence structure detected — fall back to word-boundary splitting.
    if sentences.len() <= 1 {
        return split_into_chunks(text, target_words);
    }

    let mut chunks: Vec<String> = Vec::new();
    let mut current: Vec<String> = Vec::new();
    let mut current_word_count: usize = 0;

    for sentence in &sentences {
        let sentence_words = sentence.split_whitespace().count();

        // If adding this sentence would exceed the target AND we already have content,
        // flush the current chunk and start fresh with the overlap carry-over.
        if current_word_count + sentence_words > target_words && !current.is_empty() {
            chunks.push(current.join(" "));

            // Carry the last N sentences into the next chunk.
            let overlap_start = current.len().saturating_sub(overlap_sentences);
            let overlap: Vec<String> = current[overlap_start..].to_vec();
            current_word_count = overlap
                .iter()
                .map(|s| s.split_whitespace().count())
                .sum();
            current = overlap;
        }

        current_word_count += sentence_words;
        current.push(sentence.clone());
    }

    if !current.is_empty() {
        chunks.push(current.join(" "));
    }

    chunks
}

/// Split `text` into individual sentences.
///
/// A sentence boundary is detected when `.`, `!`, or `?` is immediately followed
/// by whitespace or end-of-string. This is intentionally simple — no NLP
/// dependency — and works well for technical documentation and prose.
///
/// Known limitation: abbreviations like "Dr.", "e.g.", "i.e." will incorrectly
/// split when followed by a space. Acceptable for document chunking purposes.
fn split_into_sentences(text: &str) -> Vec<String> {
    let mut sentences: Vec<String> = Vec::new();
    let mut buf = String::new();

    let mut iter = text.char_indices().peekable();
    while let Some((i, ch)) = iter.next() {
        buf.push(ch);
        if ch == '.' || ch == '!' || ch == '?' {
            // Check the character immediately after
            let after = text[i + ch.len_utf8()..].chars().next();
            match after {
                None | Some(' ') | Some('\n') | Some('\r') | Some('\t') => {
                    let trimmed = buf.trim().to_string();
                    if !trimmed.is_empty() {
                        sentences.push(trimmed);
                    }
                    buf = String::new();
                }
                _ => {}
            }
        }
    }

    let trimmed = buf.trim().to_string();
    if !trimmed.is_empty() {
        sentences.push(trimmed);
    }

    sentences
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

    // ── split_into_sentences ──────────────────────────────────────────────

    #[test]
    fn sentences_basic_period() {
        let s = split_into_sentences("Hello world. Foo bar.");
        assert_eq!(s, vec!["Hello world.", "Foo bar."]);
    }

    #[test]
    fn sentences_exclamation_and_question() {
        let s = split_into_sentences("Are you sure? Yes! Great.");
        assert_eq!(s, vec!["Are you sure?", "Yes!", "Great."]);
    }

    #[test]
    fn sentences_no_boundary_returns_whole() {
        let s = split_into_sentences("no punctuation here");
        assert_eq!(s, vec!["no punctuation here"]);
    }

    #[test]
    fn sentences_empty_returns_empty() {
        assert!(split_into_sentences("").is_empty());
    }

    #[test]
    fn sentences_mid_word_dot_not_split() {
        // "e.g." followed by a non-space should NOT split
        let s = split_into_sentences("Use e.g.something here.");
        // "e.g." is followed by 's', not whitespace, so no mid-word split
        assert_eq!(s, vec!["Use e.g.something here."]);
    }

    // ── split_into_chunks_sentence_aware ─────────────────────────────────

    #[test]
    fn sentence_aware_basic() {
        let text = "First sentence. Second sentence. Third sentence.";
        // Target: 4 words → each sentence is ~2 words but period makes it 3-char token
        // "First sentence." = 2 words, "Second sentence." = 2 words
        // With target=4, should fit 2 sentences per chunk
        let chunks = split_into_chunks_sentence_aware(text, 4, 0);
        assert!(!chunks.is_empty());
        assert!(chunks.iter().all(|c| !c.is_empty()));
    }

    #[test]
    fn sentence_aware_overlap_carries_sentences() {
        let text = "Sentence one here. Sentence two here. Sentence three here. Sentence four here.";
        let chunks = split_into_chunks_sentence_aware(text, 4, 1);
        // With overlap=1, each chunk (except first) starts with the last sentence of the previous
        if chunks.len() >= 2 {
            // The last sentence of chunk[0] should appear at start of chunk[1]
            let last_of_first = chunks[0].split(". ").last().unwrap_or("").to_string();
            assert!(
                chunks[1].starts_with(last_of_first.trim_end_matches('.')),
                "Overlap sentence should be at the start of chunk[1]"
            );
        }
    }

    #[test]
    fn sentence_aware_fallback_when_no_sentences() {
        // No sentence-ending punctuation → falls back to word-boundary split
        let text = "word1 word2 word3 word4 word5 word6";
        let chunks = split_into_chunks_sentence_aware(text, 3, 1);
        assert_eq!(chunks.len(), 2);
    }

    #[test]
    fn sentence_aware_zero_target_returns_empty() {
        assert!(split_into_chunks_sentence_aware("hello world.", 0, 0).is_empty());
    }
}
