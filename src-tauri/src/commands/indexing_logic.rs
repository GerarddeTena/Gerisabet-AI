pub const WORDS_PER_CHUNK: usize = 150;

pub(crate) fn split_into_chunks(text: &str, words_per_chunk: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    words
        .chunks(words_per_chunk)
        .map(|chunk| chunk.join(" "))
        .collect()
}

pub(crate) fn is_meaningful_chunk(text: &str) -> bool {
    let alpha_count = text.chars().filter(|c| c.is_alphabetic()).count();
    let dot_count = text.chars().filter(|c| *c == '.' || *c == '-').count();
    let total_count = text.chars().count();

    if total_count < 10 {
        return false;
    }
    if (alpha_count as f32) / (total_count as f32) < 0.2 {
        return false;
    }
    if (dot_count as f32) / (total_count as f32) > 0.3 {
        return false;
    }

    true
}
