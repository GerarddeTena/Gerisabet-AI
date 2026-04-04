# Gerisabet AI — Agent Guide

## Overview

Desktop RAG (Retrieval-Augmented Generation) application built with **Tauri v2** (Rust backend) + **React 19 / TypeScript** frontend. All AI runs **100% locally** — no cloud services, no API keys.

- **Ollama** (`http://localhost:11434`) — LLM inference and embeddings (`nomic-embed-text`)
- **Qdrant** (`http://127.0.0.1:6334`) — local vector database (gRPC port `6334`, HTTP port `6333`)
- **Tauri v2** — desktop shell, Rust commands, file system access, native events

The frontend **never** communicates with Ollama or Qdrant directly. All AI and vector logic is encapsulated in `src-tauri/src/`.

---

## Developer Workflows

```powershell
pnpm tauri dev        # Vite dev server + Rust backend (full app)
pnpm tauri build      # Production binary
pnpm dev              # Frontend only — Tauri commands unavailable
pnpm tsc --noEmit     # TypeScript type check (must pass with 0 errors)
```

`beforeDevCommand` / `beforeBuildCommand` are configured in `src-tauri/tauri.conf.json`.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React 19 Frontend (src/)                                │
│                                                          │
│  App.tsx → Layout → [REPL | Indexer | Doctor | History]  │
│                                                          │
│  State layer:  AppStateStore (Zustand-like selector      │
│                store) + React Context providers          │
│                                                          │
│  Query layer:  QueryEngine → queryGerisabet()            │
│                (async generator bridging Tauri events)   │
│                                                          │
│  Command layer: 11 slash commands (/clear /help /model   │
│                 /cost /status /compact /doctor /skills   │
│                 /config /export /rename)                 │
└───────────────────────┬──────────────────────────────────┘
                        │ invoke() / listen()
                        │ (Tauri IPC bridge)
┌───────────────────────▼──────────────────────────────────┐
│  Rust Backend (src-tauri/src/)                           │
│                                                          │
│  commands/  — 6 Tauri commands (IPC entry points)        │
│  services/  — pure business logic (chat, indexing,       │
│               retrieval)                                 │
│  domain/    — core domain types (chat, document, search) │
│  ports/     — trait abstractions (embedder, file reader, │
│               vector store, streamer, index tracker)     │
│  adapters/  — concrete implementations (Ollama, Qdrant,  │
│               fs reader, JSON tracker)                   │
└──────────────────────────────────────────────────────────┘
```

---

## Key Data Flow

### Chat (ask a question)

```
REPL.tsx
  → invoke("ask_gerisabet", { question, model })
  → listen("ai_token")  → stream tokens into chat history
  → listen("ai_done")   → finalise, update stats
  → invoke("save_exchange") [called by App.tsx after ai_done]

Rust side (commands/ai.rs):
  ask_gerisabet()
    → services/retrieval.rs: get_embedding(question) via adapters/ollama.rs
    → services/retrieval.rs: search_skills + search_context via adapters/qdrant.rs
    → build context string (rules chunks injected first, then skills, then library docs)
    → services/chat.rs: stream_ollama_response(question, context, model, history)
      → emits "ai_token" per chunk
      → emits "ai_done" with full response when complete
```

### Indexing (library documents)

```
DatabaseManager.tsx / useIndexer.ts
  → invoke("index_library", { path })
  → listen("indexing_progress") → update UI log and progress bar

Rust side (commands/indexing.rs):
  index_library()
    → glob PDF/DOCX/TXT files
    → adapters/fs_reader.rs: file_process() per file (50 MB limit)
    → services/indexing.rs: chunk text (150 words/chunk, quality filters)
    → adapters/ollama.rs: get_embedding(chunk)
    → adapters/qdrant.rs: upsert into "gerisabet_library" collection
    → adapters/json_tracker.rs: persist indexed_files.json
    → emit "indexing_progress" per chunk/file
```

### Indexing (skills)

```
SkillsManager.tsx / useIndexer.ts
  → invoke("index_skills", { path })
  → listen("skills_progress") → update UI log

Rust side (commands/indexing.rs):
  index_skills()
    → glob .md files; folder name → skill_type, file stem → skill_name
    → chunk, embed, upsert into "gerisabet_skills" collection
    → persist indexed_skills.json
    → emit "skills_progress"
```

---

## Tauri IPC Commands

All commands registered in `src-tauri/src/lib.rs`. TypeScript callers use `invoke()` from `@tauri-apps/api/core`.

| Command | Return | Description |
|---|---|---|
| `ask_gerisabet` | `Result<(), String>` | Streams answer via `ai_token` / `ai_done` events |
| `save_exchange` | `Result<(), String>` | Appends user+assistant turn to Rust in-memory history |
| `clear_history` | `Result<(), String>` | Clears Rust in-memory chat history |
| `index_library` | `Result<String, String>` | Indexes PDF/DOCX/TXT directory into `gerisabet_library` |
| `index_skills` | `Result<String, String>` | Indexes `.md` skills directory into `gerisabet_skills` |
| `cancel_indexing` | `Result<String, String>` | Sets `INDEXING_CANCELLED: AtomicBool` to abort active indexer |

### Tauri Events

| Event | Payload | Direction |
|---|---|---|
| `ai_token` | `string` (partial token) | Rust → TS |
| `ai_done` | `string` (full response) | Rust → TS |
| `indexing_progress` | `ProgressEvent` | Rust → TS |
| `skills_progress` | `ProgressEvent` | Rust → TS |

`ProgressEvent` shape (defined in `src/types/interfaces.ts`):
```ts
{ type: "file_start"|"file_done"|"file_skipped"|"chunk"|"cancelled"|"file_error"|"completed",
  file: string, current?: number, total?: number,
  skipped_count: number, new_count: number }
```

---

## Frontend Architecture

### Entry Points

| File | Role |
|---|---|
| `src/main.tsx` | Root render — wraps app in 5 context providers, calls `registerAllCommands()`, `persistSettings()`, `loadPersistedSettings()`, `initStateChangeHandlers()` |
| `src/App.tsx` | React Router shell — routes to REPL, Indexer, Doctor, ChatHistory; reads `isIndexing` from `AppStateStore` to gate REPL |
| `src/layout/Layout.tsx` | App shell with `Drawer` sidebar + `<Outlet>` for nested routes |

### Screens

| Screen | Route | File |
|---|---|---|
| REPL | `/` (default) | `src/screens/REPL.tsx` |
| Indexer | `/index` | `src/screens/Indexer.tsx` |
| Doctor | `/doctor` | `src/screens/Doctor.tsx` |
| ResumeConversation | `/resume` | `src/screens/ResumeConversation.tsx` |
| ChatHistory | `/history` | `src/pages/ChatHistory.tsx` |

**REPL.tsx** is the main chat interface. It:
- Manages local state: `question`, `isLoading`, `selectModel`, `typeaheadIndex`, `commandResult`
- Intercepts `/slash` commands before sending to Rust
- Navigates command history with `ArrowUp`/`ArrowDown` (guarded by `isSlash`)
- Streams `ai_token` events into the assistant message in-place
- On `ai_done`: estimates tokens (chars/4), updates `AppStateStore.stats`, saves model to `localStorage`
- Renders `Typeahead`, `StatusBar`, `TokenDisplay` as sub-components

### State Management

#### AppStateStore (`src/state/AppStateStore.ts`)

Central singleton store (selector-based, no React dependency). The only global mutable state.

```ts
AppState {
  settings: GerisabetSettings        // persisted to localStorage
  activeSessionId: SessionId | null
  tasks: TaskHandle[]
  agents: AgentDefinition[]
  notifications: Notification[]
  stats: Stats                       // totalTokensIn, totalTokensOut, requestCount, sessionStartedAt
  isIndexing: boolean
  indexingProgress: number
  availableModels: string[]
  pendingPermissions: PendingPermissionEntry[]
  overlayOpen: boolean
  modalStack: ModalEntry[]
  commandHistoryQuery: string
  isSlashMenuOpen: boolean
}
```

Key functions:
- `getAppState()` — read current state (synchronous, no hooks)
- `setAppState(updater)` — immutable update, triggers all subscribed selectors
- `onChangeAppState(selector, listener)` — subscribe to a slice; returns unsubscribe fn
- `updateSettings(partial)` — merge settings update
- `recordTokenUsage(in, out)` — increment stats counters
- `addNotification(partial)` / `dismissNotification(id)` — notification queue (max 50)
- `addTask(task)` / `updateTask(id, partial)` — task lifecycle

#### Store (`src/state/Store.ts`)

Generic selector-based store factory (plain TS, no Zustand/Redux). `createStore<S>(initial)` returns `{ getState, setState, subscribe }`.

#### onChangeAppState (`src/state/onChangeAppState.ts`)

Side-effect handler — call once at startup via `initStateChangeHandlers()` in `main.tsx`. Persists `settings` to `localStorage` on every change.

### Context Providers

Wrap the app (in order) in `src/main.tsx`:

| Provider | File | Purpose |
|---|---|---|
| `ModalProvider` | `context/modalContext.tsx` | Modal open/close stack |
| `NotificationsProvider` | `context/notifications.tsx` | Toast notification queue |
| `StatsProvider` | `context/stats.tsx` | Derived stats for display |
| `OverlayProvider` | `context/overlayContext.tsx` | Full-screen overlay control |
| `QueuedMessageProvider` | `context/QueuedMessageContext.tsx` | Pre-queued prompt injection |

All contexts exported from `src/context/index.ts`.

**Important:** `NotificationsContext` is exported as both the default and a named export from `notifications.tsx`. The `useNotifications` hook imports the named export.

### Query Engine (`src/QueryEngine.ts`)

Per-conversation engine. Holds message history, manages auto-compact, delegates to `queryGerisabet()`.

```ts
new QueryEngine(config: QueryEngineConfig)
  .submitMessage(prompt, options?) → AsyncGenerator<{ type:'token'|'done'|'error', ... }>
```

Config: `{ sessionId, model, tools?, commands?, maxTurns?, maxContextMessages?, customSystemPrompt? }`

Before each turn: calls `shouldCompact(messages)` → if context exceeds 80% of `MAX_CONTEXT_TOKENS` (8000), calls `compactMessages(messages, model)` which invokes `ask_gerisabet` with a summary prompt.

Global singleton helpers: `createGlobalQueryEngine(config)` / `getGlobalQueryEngine()`.

### Query Layer (`src/query.ts`)

`queryGerisabet(params)` — async generator that bridges Tauri events into a typed stream:

1. Registers `listen("ai_token")` and `listen("ai_done")` listeners
2. Fires `invoke("ask_gerisabet")` (non-awaited — errors caught via `.catch`)
3. Yields `{ type: 'token', token }` for each streaming chunk
4. Yields `{ type: 'done', content, metadata }` when `ai_done` fires
5. Yields `{ type: 'error', error }` on invoke failure or abort
6. Cleans up both listeners in `finally`

Error sentinel: a token prefixed with `\x00` signals an error from the invoke `.catch` handler.

`runQuery(params)` — non-generator wrapper, consumes the generator and returns `{ content, metadata, aborted }`.

---

## Type System (`src/types/`)

### Branded ID Types (`ids.ts`)

All IDs are branded strings to prevent accidental cross-assignment:

```ts
SessionId, MessageId, TaskId, ToolUseId, AgentId, CommandId
```

Constructor helpers: `asSessionId(s)`, `asMessageId(s)`, etc.

### Message Types (`message.ts`)

Two parallel message systems coexist:

**Structured `Message` union** (for the reference architecture):
```ts
type Message = UserMessage | AssistantMessage | SystemMessage
             | ToolUseMessage | ToolResultMessage | ErrorMessage | TombstoneMessage
```
Each variant has `id: MessageId`, `timestamp: string` (ISO 8601), typed `content`.

**`ChatMessage`** (flat, used by REPL, Displayer, Rust bridge):
```ts
interface ChatMessage {
  id: string
  session_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string      // ISO 8601 — NEVER pass Date.now() (number) here
  metadata?: MessageMetadata
}
```

`chatMessageToMessage(msg)` converts flat → structured. Type guards: `isUserMessage`, `isAssistantMessage`, `isErrorMessage`, `isToolUseMessage`.

`ContentBlock` union: `TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock`

### Command Types (`command.ts`)

Three command subtypes:
- `PromptCommand` — sends a prompt to the LLM with a custom system context
- `LocalCommand` — executes local logic, returns `{ type: 'text'|'markdown', content }`
- `LocalJSXCommand` — renders a React element inside the chat area

Utility functions (all exported from `src/commands.ts` barrel):
- `parseCommandArgs(raw)` → `ParsedCommandArgs` (`positional[]`, `flags{}`, `raw`)
- `parseSlashCommand(input)` → `{ name, args } | null`
- `isSlashCommand(input)` → boolean
- `findCommand(name, commands[])` — case-insensitive, checks aliases

### Tool Types (`tool.ts`)

```ts
ToolDef { name, description, inputSchema: JSONSchema, call(input, context), permissions?, aliases?, isEnabled? }
CanUseToolFn = (toolName, input, ToolPermissionContext) => Promise<PermissionDecision>
PermissionDecision { behavior: 'allow'|'deny'|'ask', reason? }
PendingPermission { toolUseId: ToolUseId, toolName, input, resolve(decision) }
```

`buildTool(config)` — wraps `call` with error catching and output truncation.

`PermissionMode`: `'default' | 'plan' | 'auto' | 'bypass'`

### Settings (`settings.ts`)

```ts
GerisabetSettings {
  theme: 'system'|'dark'|'light'
  prefersReducedMotion: boolean
  effort: 'quick'|'balanced'|'thorough'
  defaultModel: string            // default: 'qwen2.5-coder:3b'
  maxContextTokens: number        // default: 8192
  autoCompact: boolean            // default: true
  autoCompactThreshold: number    // default: 0.85
  showTokenUsage: boolean
  saveHistory: boolean
  historyMaxEntries: number       // default: 100
  skillsPath?: string
  libraryPath?: string
}
```

`DEFAULT_SETTINGS` is the canonical baseline. `validateSettings(partial)` merges with defaults.

---

## Slash Commands (`src/commands/`)

Registered at startup by `registerAllCommands()` from `src/commands/index.ts`. The barrel `src/commands.ts` re-exports all registry helpers.

| Command | Type | What it does |
|---|---|---|
| `/clear` | local | Clears chat history (calls `invoke("clear_history")` + resets UI) |
| `/help` | local | Lists all available slash commands |
| `/model [name]` | local | Reads or sets the active model |
| `/cost` | local | Shows token usage stats from `AppStateStore.stats` |
| `/status` | local | Reports Ollama + Qdrant connectivity |
| `/compact` | local | Manually triggers `compactMessages()` on current history |
| `/doctor` | local | Navigates to the `/doctor` screen |
| `/skills [path]` | local | Sets or shows the skills directory path |
| `/config [key] [value]` | local | Reads/writes individual `GerisabetSettings` keys |
| `/export` | local | Downloads chat history as a `.md` file via Blob URL |
| `/rename [name]` | local | Renames the active session |

Command lookup is case-insensitive and checks aliases. `REPL.tsx` intercepts any `/` input before sending to Rust.

---

## Services (`src/services/`)

### Compact (`services/compact/`)

- `compact.ts` — `shouldCompact(messages, maxTokens?)` / `compactMessages(messages, model)` — see Query Engine section. `CompactResult` contains `compacted`, `summary`, `tokensReclaimed`, `originalMessages`, `compactedMessages`.
- `autoCompact.ts` — watcher that subscribes to message count changes and auto-triggers compaction.

### Skills Loader (`services/skills/loadSkillsDir.ts`)

Scans a directory for `.md` files. Returns `{ skill_type: string, skill_name: string, content: string }[]`. Used by the `/skills` command and `SkillsManager`.

### Session Memory (`services/SessionMemory/index.ts`)

In-memory session store. Holds per-session key-value context that persists across turns within a session but is cleared on `clear_history`.

### Prompt Suggestions (`services/prompts/PromptSuggestion.ts`)

Generates suggested follow-up prompts based on conversation context. Consumed by `QueuedMessageContext`.

---

## Hooks (`src/hooks/`)

| Hook | Returns | Notes |
|---|---|---|
| `useAppState()` | `AppState` | Re-renders on any state change via `onChangeAppState` |
| `useSetting(key)` | `[value, setter]` | Reads/writes a single `GerisabetSettings` key |
| `useCanUseTool()` | `CanUseToolFn` | Returns a permission checker bound to current settings |
| `useTokenSummary()` | `{ totalIn, totalOut, requests, costEstimate }` | Derived from `AppStateStore.stats` |
| `useNotifications()` | `{ notifications, notifyInfo, notifySuccess, notifyError, notifyWarning, dismiss }` | Wraps `NotificationsContext` |
| `useCommandHistory()` | `{ navigateUp, navigateDown, add, reset }` | Wraps `history.ts` functions |
| `useSlashCommands(input)` | `{ isSlash, suggestions, matchedCommand }` | Filters registered commands for Typeahead |
| `useIndexer(eventName)` | `{ isIndexing, logs, progress, start, cancel }` | Shared logic for library + skills indexers |
| `useChatHistory()` | `{ messages, ... }` | Persistent chat history (localStorage + Rust) |

---

## Components (`src/components/`)

| Component | Purpose |
|---|---|
| `Typeahead.tsx` | Floating dropdown for slash command completion |
| `StatusBar.tsx` | Bottom bar showing model name, indexing/generating state |
| `TokenDisplay.tsx` | Compact token-in/out counter reading from `AppStateStore.stats` |
| `DatabaseManager.tsx` | Folder picker + library indexing UI + progress log |
| `SkillsManager.tsx` | Folder picker + skills indexing UI + progress log |
| `Drawer.tsx` | Sidebar navigation (chat, indexer, doctor, history links) |
| `MarkdownRenderer.tsx` | Renders markdown with syntax highlighting |
| `GerisabetLoader.tsx` | Loading spinner shown during AI generation |
| `IndexerUI.tsx` | Shared indexer progress log and status display |
| `messages/AssistantMessage.tsx` | Renders a single assistant message with markdown |
| `messages/UserMessage.tsx` | Renders a single user message |
| `messages/ErrorMessage.tsx` | Renders an error message in the chat |
| `messages/MessageList.tsx` | Renders the full chat message list |

---

## Utilities (`src/utils/`)

| File | Exports / Purpose |
|---|---|
| `uuid.ts` | `generateUUID()` — uses `crypto.randomUUID()` (no `uuid` package) |
| `ids.ts` | `generateSessionId()`, `generateMessageId()` etc. — wraps branded casts |
| `messages.ts` | `estimateHistoryTokens(msgs)` — chars/4 heuristic; message manipulation helpers |
| `tokens.ts` | Token counting utilities and cost estimation |
| `format.ts` | Date/time formatters, number formatters, duration display |
| `log.ts` | `logError(err, context?)` — safe console logger (dev only via `window` check) |
| `config.ts` | `loadConfig()` / `updateConfigSettings()` — localStorage config helpers |
| `gerisabetmd.ts` | Markdown preprocessing specific to Gerisabet output formatting |
| `SvgProcessor.tsx` | SVG sanitiser for display in chat |
| `model/model.ts` | Model name normalisation, capability flags (supports tools, context size) |
| `settings/settings.ts` | `persistSettings()` / `loadPersistedSettings()` — localStorage round-trip for `GerisabetSettings` |
| `permissions/PermissionMode.ts` | `PermissionMode` type re-export and helper predicates |

---

## Bootstrap (`src/bootstrap/state.ts`)

Session singleton — creates one `SessionId` per app lifetime using `generateUUID()`. Provides `getSessionId(): string`.

---

## Command History (`src/history.ts`)

Module-level (not React state) command history for the REPL input.

- `addToHistory(display: string)` — appends a command to the session history
- `navigateHistoryUp(current: string)` — moves backward; requires current input value
- `navigateHistoryDown(_current: string)` — moves forward; `_current` param intentionally unused
- `resetHistoryNavigation()` — resets cursor to end (call after submit)

History is in-memory only (lost on page reload).

---

## Token Tracker (`src/token-tracker.ts`)

`trackTokenUsage(model, inputChars, outputChars)` — records per-model token estimates. Separate from `AppStateStore.stats` (which uses chars/4 estimates from REPL). The two are not yet reconciled — see Tech Debt.

---

## Context Provider (`src/context.ts`)

`getSystemContext()` — builds the system prompt string injected before user messages. Includes app name, version, active session ID, and current date.

---

## Rust Backend Architecture

The backend follows a **clean hexagonal architecture** (ports & adapters):

```
src-tauri/src/
  lib.rs                — registers all Tauri commands, initialises app state
  main.rs               — binary entry point
  error.rs              — AppError enum (unified error type)
  config.rs             — app-level config constants

  commands/             — Tauri IPC handlers (thin layer, no business logic)
    mod.rs              — shared command module declarations
    ai.rs               — ask_gerisabet command
    chat.rs             — save_exchange, clear_history commands
    indexing.rs         — index_library, index_skills, cancel_indexing commands

  services/             — pure business logic
    mod.rs
    chat.rs             — builds context, calls streamer port
    retrieval.rs        — embedding + vector search orchestration
    indexing.rs         — chunking loop, quality filters, dedup

  domain/               — core domain types (no I/O)
    mod.rs
    chat.rs             — ChatMessage, ConversationHistory
    document.rs         — Document, Chunk types
    search.rs           — SearchResult, SearchQuery types

  ports/                — trait definitions (interfaces)
    mod.rs
    embedder.rs         — Embedder trait: embed(text) → Vec<f32>
    file_reader.rs      — FileReader trait: read(path) → String
    vector_store.rs     — VectorStore trait: upsert / search
    streamer.rs         — Streamer trait: stream_response(...)
    index_tracker.rs    — IndexTracker trait: is_indexed / mark_indexed

  adapters/             — trait implementations (I/O)
    mod.rs
    ollama.rs           — Embedder + Streamer via Ollama HTTP API
    qdrant.rs           — VectorStore via Qdrant gRPC client
    fs_reader.rs        — FileReader for PDF/DOCX/TXT (50 MB limit)
    json_tracker.rs     — IndexTracker backed by JSON files on disk
```

### Qdrant Collections

| Collection | Key | Similarity |
|---|---|---|
| `gerisabet_library` | UUID v5 of `file_path + chunk_content` | Cosine, threshold `0.65` |
| `gerisabet_skills` | UUID v5 of `skill_type + skill_name + chunk_content` | Cosine, threshold `0.5` |

### Chunking Rules (`services/indexing.rs`)

- **150 words per chunk** (`WORDS_PER_CHUNK`)
- Chunk rejected if: `< 10 chars`, `< 20% alphabetic characters`, or `> 30% dots/dashes`
- UUID v5 keying makes re-indexing idempotent (no duplicate vectors)

### Skills Injection Logic (`services/retrieval.rs`)

The `"rules"` `skill_type` is **always injected first** into the LLM context, regardless of semantic score. All other skill types are only injected when their similarity score exceeds `0.5`.

### Tracker File Paths (`adapters/json_tracker.rs`)

```
C:\Users\Gerard\qdrant_storage\indexed_files.json    ← library tracker
C:\Users\Gerard\qdrant_storage\indexed_skills.json   ← skills tracker
```

> ⚠️ These paths are hard-coded. When moving machines, update `adapters/json_tracker.rs` and `commands/mod.rs`.

---

## Skills System

Skills are Markdown files in a user-selected directory:

```
skills-dir/
  rules/           ← skill_type = "rules" (always in context)
    grounding.md   ← skill_name = "grounding"
    safety.md
  persona/
    tone.md
  domain/
    accounting.md
```

- Folder name → `skill_type`
- File stem → `skill_name`
- Indexed into `gerisabet_skills` Qdrant collection
- At query time, `rules/` chunks are prepended unconditionally; other skills are retrieved by semantic similarity

---

## Frontend Conventions

- **Path aliases** (`vite.config.ts`): `@/` → `src/`, `@components` → `src/components/`, `@styles` → `src/styles/`
- **No `uuid` package** — use `generateUUID()` from `src/utils/uuid.ts` (`crypto.randomUUID()`)
- **`ChatMessage.timestamp`** is `string | undefined` (ISO 8601). Never assign `Date.now()` (number).
- **`AppStateStore.stats`** fields: `totalTokensIn`, `totalTokensOut`, `requestCount`, `sessionStartedAt` — not `inputTokens`/`outputTokens`
- **`onChangeAppState(selector, listener)`** takes two arguments. Use identity selector `(s) => s` for full state subscription.
- **`navigateHistoryDown(_current)`** — the `_current` parameter is required by signature but unused internally. Prefix `_` suppresses TS6133.
- **`isMountedRef`** guard pattern — used in REPL.tsx to prevent state updates after component unmount during async listeners.
- **`VIRTUALIZE_THRESHOLD = 100`** — `Displayer.tsx` (legacy) renders only the last 100 messages. `MessageList.tsx` in the new architecture does not yet virtualize.
- **`localStorage` keys used**:
  - `gerisabet.lastModel` — last selected Ollama model
  - `gerisabet.settings` — persisted `GerisabetSettings`

---

## Routing

```
/           → REPL (main chat)
/index      → Indexer (library + skills management)
/doctor     → Doctor (system health: Ollama, Qdrant, collections)
/resume     → ResumeConversation (session picker)
/history    → ChatHistory (past sessions)
```

`App.tsx` reads `appState.isIndexing` from `AppStateStore` to disable the REPL while indexing is in progress.

---

## Tech Debt

### High Priority

1. **Dual message systems** — `ChatMessage` (flat, used by REPL/Rust bridge) and `Message` union (structured, used by types/message.ts) coexist without a clear migration path. `chatMessageToMessage()` converts between them but is not consistently used. A full migration to the structured `Message` union would unify the codebase.

2. **Token tracking duplication** — `token-tracker.ts` and `AppStateStore.stats` both count tokens independently using different estimation methods (chars/4). `recordTokenUsage()` in `query.ts` is called with `(0, 0)` as placeholders. Needs Ollama to return actual token counts and a single source of truth.

3. **Hard-coded tracker paths** — `indexed_files.json` and `indexed_skills.json` paths are hard-coded to `C:\Users\Gerard\qdrant_storage\`. Must be updated on new machines. Should be derived from the Tauri app data directory (`app_data_dir()`).

4. **REPL bypasses QueryEngine** — `REPL.tsx` directly calls `invoke("ask_gerisabet")` and listens to raw Tauri events instead of routing through `QueryEngine.submitMessage()`. This means auto-compact, turn limits, and future tool orchestration are not applied to the chat UI. The `QueryEngine` is instantiated but not wired to the REPL.

5. **`commands/chat.rs` vs `commands/ai.rs` overlap** — the Rust side has both `commands/ai.rs` and `services/chat.rs`. The boundary between them may drift. All prompt-building logic should live exclusively in `services/`.

### Medium Priority

6. **No real-time model list** — `AppStateStore.availableModels` is hard-coded to `['qwen2.5-coder:3b', 'llama3.2:3b', 'mistral:7b']`. Should be populated at startup by calling `GET http://localhost:11434/api/tags`.

7. **`/export` uses Blob URL** — the export command creates a `<a href=blob:...>` download because `@tauri-apps/plugin-fs` is not installed. The native file save dialog (`plugin-dialog`) is available but not wired to file writing. Installing `plugin-fs` would enable proper save-to-disk.

8. **`ToolDef` system is scaffolded but unused** — `Tool.ts`, `Task.ts`, `types/tool.ts`, and `types/task.ts` define a complete tool-permission system with no tools currently registered. The `tools/` directory is empty. This is intentional scaffolding for future tool support.

9. **`SessionMemory` not persisted** — `services/SessionMemory/index.ts` holds in-memory key-value context per session. It is not wired to `localStorage` or any Rust-side persistence.

10. **Auto-compact not connected** — `services/compact/autoCompact.ts` exists but is not called during the REPL's submit flow. Compaction only triggers inside `QueryEngine.submitMessage()`, which the REPL does not use.

11. **`ResumeConversation` screen is stubbed** — The screen renders but session persistence is not implemented end-to-end. `useChatHistory` hook manages history in React state and localStorage, but there is no Rust-side session storage.

### Low Priority

12. **`context.ts` system prompt is static** — `getSystemContext()` always returns the same template. It should incorporate active skills names, session memory summary, and user name if configured.

13. **`gerisabetmd.ts` preprocessing** — markdown postprocessing utility exists but is not connected to `MarkdownRenderer.tsx`.

14. **`SvgProcessor.tsx`** — SVG sanitiser exists in `utils/` but is not imported anywhere. Dead code.

15. **`PromptSuggestion.ts`** — generates follow-up prompt suggestions but `QueuedMessageContext.tsx` does not currently use them for display.

16. **`Doctor.tsx` health checks are placeholders** — the screen renders, but the actual Ollama/Qdrant connectivity checks (`fetch("http://localhost:11434/api/tags")`, etc.) are not implemented.

17. **No error boundary** — the React tree has no `<ErrorBoundary>`. An unhandled render error will crash the entire app window.

18. **`main.tsx` provider order** — The 5 context providers are ordered but there is no enforcement. If `NotificationsProvider` is ever moved below a consumer, silent bugs will appear.

