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
pub const LIBRARY_THRESHOLD: f32 = 0.65;

/// Similarity threshold for skill retrieval.
pub const SKILLS_THRESHOLD: f32 = 0.5;

/// Maximum number of words per text chunk.
pub const WORDS_PER_CHUNK: usize = 150;

/// Maximum number of chat history messages to include in LLM context.
pub const MAX_HISTORY_MESSAGES: usize = 10;

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
