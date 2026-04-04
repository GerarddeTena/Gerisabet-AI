//! Application-wide configuration constants.
//! All magic strings and numbers live here — nowhere else.

/// Ollama API base URL.
pub const OLLAMA_BASE_URL: &str = "http://localhost:11434";

/// Qdrant gRPC URL.
pub const QDRANT_URL: &str = "http://127.0.0.1:6334";

/// Embedding model name used with Ollama.
pub const EMBEDDING_MODEL: &str = "nomic-embed-text";

/// Vector dimensionality produced by `nomic-embed-text`.
pub const VECTOR_SIZE: u64 = 768;

/// Qdrant collection for document library chunks.
pub const LIBRARY_COLLECTION: &str = "gerisabet_library";

/// Qdrant collection for skill chunks.
pub const SKILLS_COLLECTION: &str = "gerisabet_skills";

/// Similarity threshold for document retrieval.
/// Slightly lower than before (0.65 → 0.62) to catch more edge-relevant chunks
/// without flooding with noise. nomic-embed-text cosine scores cluster 0.5–0.85.
pub const LIBRARY_THRESHOLD: f32 = 0.62;

/// Similarity threshold for skill retrieval.
pub const SKILLS_THRESHOLD: f32 = 0.50;

/// Maximum number of words per text chunk.
/// 200 words keeps semantic coherence better than 150 without exploding context size.
pub const WORDS_PER_CHUNK: usize = 200;

/// Maximum number of chat history messages to include in LLM context.
/// Reduced from 10 to 8 to leave more room for RAG context in small-model windows.
pub const MAX_HISTORY_MESSAGES: usize = 8;

/// HTTP timeout in seconds for embedding requests.
pub const EMBED_TIMEOUT_SECS: u64 = 120;

/// HTTP timeout in seconds for LLM streaming requests.
pub const STREAM_TIMEOUT_SECS: u64 = 600;

/// Maximum file size accepted for indexing (50 MB).
pub const MAX_FILE_SIZE_BYTES: u64 = 50 * 1024 * 1024;

/// File name of the library indexer tracker (stored in app_data_dir).
pub const LIBRARY_TRACKER_FILENAME: &str = "indexed_files.json";

/// File name of the skills indexer tracker (stored in app_data_dir).
pub const SKILLS_TRACKER_FILENAME: &str = "indexed_skills.json";

/// File name of the chat history store (stored in app_data_dir).
pub const CHAT_STORE_FILENAME: &str = "chat_history.json";

/// Maximum results returned per vector similarity search.
pub const SEARCH_LIMIT: u64 = 5;

/// Search limit for the skills collection (focused — fewer results, higher precision).
pub const SKILLS_SEARCH_LIMIT: u64 = 4;

/// Search limit for the library collection (broader — more docs needed for coverage).
pub const LIBRARY_SEARCH_LIMIT: u64 = 6;

/// Maximum characters for the assembled RAG context string sent to the LLM.
/// Prevents context-window overflow on small models (3B with ~4096 token windows).
/// At ~4 chars/token this caps context at ≈1200 tokens, leaving room for history
/// (~800 tokens) + system prompt (~200 tokens) + response budget (~1000 tokens).
pub const MAX_CONTEXT_CHARS: usize = 4_800;

/// Number of sentences to carry over (overlap) from the previous chunk into the next.
/// Prevents information loss at chunk boundaries — the tail of one concept bleeds into
/// the opening of the next chunk so retrieval doesn't silently cut mid-thought.
pub const CHUNK_OVERLAP_SENTENCES: usize = 2;
