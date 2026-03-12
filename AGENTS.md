# Gerisabet AI — Agent Guide

## Architecture Overview

Desktop RAG (Retrieval-Augmented Generation) app built with **Tauri v2** (Rust backend) + **React 19 / TypeScript** frontend. All AI runs **locally**:

- **Ollama** (`http://localhost:11434`) — embeddings (`nomic-embed-text`) and LLM generation
- **Qdrant** (`http://127.0.0.1:6334`) — local vector DB with two collections:
  - `gerisabet_library` — chunked PDF/DOCX/TXT documents
  - `gerisabet_skills` — chunked Markdown "skill" files

The frontend never talks to Ollama or Qdrant directly. All AI logic lives in `src-tauri/src/`.

## Key Data Flow

```
User question → invoke("ask_gerisabet")
  → get_embedding(question)          [embeddings.rs]
  → search_skills + search_context   [qdrant_db.rs]
  → build context (rules first, then skills, then docs)
  → generate_ollama_response(question, context, model)
  → return String to frontend
```

## Developer Workflows

```powershell
# Run in development (starts both Vite dev server and Rust backend)
pnpm tauri dev

# Production build
pnpm tauri build

# Frontend only (no Rust, no Tauri commands available)
pnpm dev
```

Both `pnpm tauri dev` and `pnpm tauri build` are configured in `src-tauri/tauri.conf.json` via `beforeDevCommand`/`beforeBuildCommand`.

## Tauri Commands (Rust ↔ Frontend Bridge)

All four commands are registered in `src-tauri/src/lib.rs`. Every command returns `Result<String, String>` — not typed objects.

| Command | File | Description |
|---|---|---|
| `index_library` | `commands.rs` | Glob PDF/DOCX/TXT from a directory, chunk + embed into `gerisabet_library` |
| `index_skills` | `commands.rs` | Glob `.md` files from a directory, chunk + embed into `gerisabet_skills` |
| `ask_gerisabet` | `commands.rs` | Semantic search + LLM answer |
| `cancel_indexing` | `commands.rs` | Sets global `INDEXING_CANCELLED: AtomicBool` to stop the indexer loop |

Progress events emitted from Rust via `app.emit(...)` and received in React via `listen("indexing_progress", ...)` / `listen("skills_progress", ...)`.

## Skills System

Skills are **Markdown files** organised into subfolders. The folder name becomes `skill_type` and the file stem becomes `skill_name`. The `"rules"` skill_type is **always injected first** into the LLM context regardless of score. All other skill types are injected only when semantically relevant.

```
skills-dir/
  rules/           ← skill_type = "rules" (always in context)
    grounding.md   ← skill_name = "grounding"
  persona/
    tone.md
```

Indexed-skills tracker: `C:\Users\Gerard\qdrant_storage\indexed_skills.json`  
Indexed-files tracker: `C:\Users\Gerard\qdrant_storage\indexed_files.json`

> ⚠️ These paths are hard-coded in `indexer_tracker.rs` and `commands.rs`. Change them there when moving machines.

## Chunking & Deduplication

- **150 words per chunk** (`WORDS_PER_CHUNK` in `commands.rs`)
- Meaningless chunks filtered: `<10 chars`, `<20% alphabetic`, or `>30% dots/dashes`
- Points use **UUID v5** keyed on `file_path + content` (library) or `skill_type + skill_name + content` (skills) — safe to re-run indexing without duplicates
- Similarity thresholds: `0.65` for docs, `0.5` for skills

## Frontend Conventions

- Path aliases defined in `vite.config.ts`: `@/` → `src/`, `@components` → `src/components/`, `@styles` → `src/styles/`
- Shared types live in `src/interfaces.ts` (`ChatMessage`, `InputSelectModelProps`)
- `react-window` is **lazy-loaded** dynamically in `Displayer.tsx` and only activates when chat history exceeds 40 messages
- `Form.tsx` uses `isMountedRef` to guard async state updates after unmount
- `App.tsx` gates the chat form via `isIndexing` state propagated up from `DatabaseManager` through `onIndexingChange`

## Module Map

```
src-tauri/src/
  lib.rs            — app entry, registers all 4 commands
  commands.rs       — index_library, index_skills, ask_gerisabet, cancel_indexing
  embeddings.rs     — Ollama HTTP calls (get_embedding, generate_ollama_response)
  qdrant_db.rs      — Qdrant client, upsert/search for both collections
  book_finder.rs    — file_process() reads PDF/DOCX/TXT (50 MB limit)
  indexer_tracker.rs — load/save HashSet<String> JSON tracker for indexed files

src/
  App.tsx           — top-level layout, indexing state gate
  interfaces.ts     — shared TypeScript types
  components/DatabaseManager.tsx — folder picker, indexing UI, progress log
  form/Form.tsx     — chat input, model selector, invoke ask_gerisabet
  dashboard/Displayer.tsx — virtualised chat message list
```

