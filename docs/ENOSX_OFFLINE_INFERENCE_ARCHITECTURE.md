# ENOSX AI Offline Inference Architecture

## Executive recommendation

ENOSX should support **both a desktop application and a browser interface connected to one local companion service**. The local companion owns the model runtime, Knowledge Bank, embeddings, permissions, and GOD MODE CLI. The browser and desktop shells remain thin clients.

Use **Ollama as the first runtime adapter** because it provides simple local model lifecycle commands and a local HTTP API. Add **llama.cpp as a second adapter** for users who want a more self-contained GGUF runtime, tighter process control, or a packaged deployment with fewer runtime assumptions. The UI should never call either runtime directly; it should call ENOSX Companion APIs.

> The important separation is: **ENOSX owns the brain contract and memory; Ollama or llama.cpp supplies the local inference engine.**

## Why both runtimes are useful

| Runtime | Strengths | Trade-offs | Best ENOSX role |
|---|---|---|---|
| Ollama | Local API at `http://localhost:11434/api`, model listing, pull/delete lifecycle, JavaScript and Python libraries, chat and embedding endpoints. | Requires a separate Ollama installation and daemon; model lifecycle is delegated to Ollama. | Default developer and power-user runtime. |
| llama.cpp server | CPU/GPU inference, quantized GGUF models, OpenAI-compatible chat/responses/embeddings, JSON schema output, function calling, batching, monitoring, and a web UI. | More operational work: model files, startup flags, hardware tuning, and process supervision are ENOSX responsibilities. | Portable packaged runtime and advanced fallback. |
| Remote API | Strongest hosted model quality and no local hardware requirement. | Requires network, credentials, and data leaves the device. | Optional accelerator only; never a hard dependency. |

Ollama’s documentation specifies the local API base URL and exposes chat, generation, embeddings, model listing, model details, pull, push, and delete operations.[1] Its embedding endpoint is suitable for semantic search and RAG, returns unit-length vectors, supports batches, and recommends using the same embedding model for indexing and querying.[2] llama.cpp’s server supports OpenAI-compatible chat, responses, and embedding routes, along with quantized CPU/GPU inference, continuous batching, schema-constrained JSON, tool use, and monitoring.[3]

## Target system

```text
                 ┌────────────────────────────┐
                 │ ENOSX Desktop Shell         │
                 │ Tauri or Electron           │
                 └──────────────┬─────────────┘
                                │ localhost HTTPS / IPC
┌───────────────────────────────▼──────────────────────────────┐
│ ENOSX Local Companion                                          │
│                                                                │
│  Auth + permissions   Knowledge API   Chat orchestration       │
│  GOD MODE CLI         SQLite database  vector index             │
│  model health         import/export    audit log                │
└───────────────┬───────────────────────────────┬────────────────┘
                │                               │
      ┌─────────▼─────────┐           ┌─────────▼─────────┐
      │ Ollama adapter     │           │ llama.cpp adapter  │
      │ localhost:11434    │           │ localhost:8080     │
      └─────────┬─────────┘           └─────────┬─────────┘
                │                               │
      ┌─────────▼───────────────────────────────▼─────────┐
      │ Local chat model + local embedding model            │
      │ e.g. instruct model + embedding model               │
      └─────────────────────────────────────────────────────┘

                 ▲
                 │ localhost only
        ┌────────┴────────┐
        │ ENOSX Web UI     │
        │ existing Vite app│
        └──────────────────┘
```

The web UI can continue to be hosted remotely, but it must connect to the companion only through an explicit local pairing step. For a genuinely private mode, the desktop shell should serve the frontend from the companion itself so no request needs to leave the machine.

## Companion API contract

Create a stable provider-neutral contract. The first endpoints should be:

| Endpoint | Purpose |
|---|---|
| `GET /v1/health` | Report companion, database, embedding model, and chat model status. |
| `GET /v1/models` | List configured local models and their capabilities. |
| `POST /v1/chat` | Accept messages and return a streamed answer. |
| `POST /v1/knowledge` | Add one entry and queue chunking/indexing. |
| `POST /v1/knowledge/import` | Import text or a JSON backup. |
| `GET /v1/knowledge/search?q=` | Perform lexical or semantic retrieval. |
| `POST /v1/knowledge/reindex` | Rebuild embeddings after changing embedding models. |
| `GET /v1/backup/export` | Stream an encrypted or plaintext portable backup. |
| `POST /v1/backup/import` | Restore a backup after explicit confirmation. |
| `POST /v1/god/push` | Commit a GOD MODE knowledge change and write an audit record. |

The chat handler should orchestrate retrieval rather than make the model responsible for memory. Its sequence is:

1. Normalize the user request and identify the active workspace.
2. Search exact terms and tags in SQLite.
3. If an embedding model is available, embed the request and rank chunks with cosine similarity.
4. Apply a token budget and select the highest-scoring sources.
5. Build a context block containing entry IDs, titles, source, and content.
6. Call the selected local chat model through the provider adapter.
7. Stream the answer back to the UI and expose citations to the local entries used.
8. Optionally store a compact conversation summary, never the full transcript by default.

## Storage and indexing

The current browser `localStorage` Knowledge Bank is a useful prototype but should become an export/import bridge rather than the authoritative store. The companion should use SQLite with tables such as `knowledge_entries`, `knowledge_chunks`, `knowledge_embeddings`, `models`, `workspaces`, `audit_events`, and `settings`.

Use a two-level retrieval strategy. First use SQLite full-text search for fast exact matches. Then use local embeddings for semantic retrieval. Store the embedding model name and dimension with every vector. When the embedding model changes, mark the index stale and require a reindex; never compare vectors produced by different embedding models. Ollama explicitly recommends the same embedding model for indexing and querying.[2]

A portable backup should contain the source entries and metadata, not only opaque vectors. This keeps the bank migratable between Ollama, llama.cpp, and future runtimes.

## Ollama adapter

The Ollama adapter can use either the native API or its OpenAI-compatible surface. The native local base URL is `http://localhost:11434/api`.[1] For compatibility with ENOSX’s existing chat client shape, the adapter can use `http://localhost:11434/v1/` with a placeholder local key; Ollama documents that this key is required by the client shape but ignored by the local server.[4]

Recommended operations:

```text
GET  /api/tags                 list installed models
POST /api/show                 inspect capabilities and metadata
POST /api/chat                 stream local chat output
POST /api/embed                create one or many embeddings
POST /api/pull                 install a model, only after user confirmation
DELETE /api/delete             remove a model, only after user confirmation
```

The companion should probe Ollama at startup, cache the result for a short interval, and show a clear “Ollama unavailable” state rather than silently falling back to a remote provider.

## llama.cpp adapter

The llama.cpp adapter should manage a `llama-server` child process or connect to a user-managed server. Store the selected GGUF path, context length, GPU layers, parallel slots, and embedding mode in companion settings. Start with one chat process and one embedding process if concurrent embedding would otherwise disrupt chat latency.

For tool use, prefer models with native tool-use templates. llama.cpp documents native handlers for several model families and a generic fallback when a template is not recognized; generic handling may consume more tokens and be less efficient.[5] ENOSX should treat tool calls as proposed actions that pass through the existing GOD MODE authorization boundary, never as unrestricted shell execution.

## Desktop packaging

The desktop application should bundle the ENOSX companion and its database, but not ship a large model in the base installer. On first run it should:

1. Detect CPU, RAM, GPU, disk space, and operating system.
2. Offer a small starter model and an optional larger model.
3. Let the user choose Ollama-managed or llama.cpp-managed inference.
4. Download model files only after explicit confirmation.
5. Verify checksums and record the model license/source.
6. Start the companion on a random localhost port and issue a per-installation token.
7. Open the ENOSX UI with the companion URL and token already paired.

A Tauri shell is the leaner long-term desktop option because the UI is already a Vite application and the companion can be a native sidecar. Electron is simpler for Node-centric packaging but has a larger memory footprint. Either shell can use the same companion API.

## Security model for GOD MODE

GOD MODE should mean **authorized mutation**, not unrestricted operating-system control. The browser must never be able to execute arbitrary commands. The companion CLI should expose an allowlisted command grammar such as:

```text
enosx knowledge push --title "..." --content "..." --kind fact --tag terminal
enosx knowledge import ./folder
 enosx knowledge search "query"
enosx knowledge export ./backup.json
 enosx model status
 enosx model use ollama:qwen3:8b
```

Every mutation should create an audit record containing timestamp, actor, command, affected entry IDs, and a before/after hash. Destructive operations such as clear, delete-model, restore, or reindex should require an interactive confirmation flag. Bind the companion to loopback by default, use an unpredictable token, reject cross-origin requests unless paired, and never expose the local model server directly to the public internet.

## Offline behavior

ENOSX should have explicit runtime states:

| State | Chat behavior | Knowledge behavior |
|---|---|---|
| Fully offline + model installed | Local model answers with local retrieval. | Read/write/search/import/export fully available. |
| Offline + no model installed | Show memory search and drafting tools; explain that a local model must be installed. | Fully available. |
| Online + local model installed | Prefer local model; allow remote fallback only if enabled. | Fully available; no upload by default. |
| Online + no local model | Use configured remote provider only if user enabled it. | Fully available locally. |

This distinction is important: **an offline knowledge bank is not the same as offline inference**. The model weights and runtime must exist on the machine for natural-language answers to work without a network.

## Recommended rollout

| Stage | Deliverable |
|---|---|
| 1 | Companion service with health, chat, model status, SQLite, and JSON backup. Ollama adapter first. |
| 2 | Move Knowledge Bank authority from browser storage to SQLite while preserving browser import/export. Add FTS retrieval. |
| 3 | Add Ollama embeddings and semantic retrieval with reindexing. |
| 4 | Add llama.cpp adapter and GGUF model management. |
| 5 | Package the desktop shell with companion sidecar, pairing, model download, checksum verification, and crash recovery. |
| 6 | Add offline evaluation suite: retrieval recall, answer grounding, latency, memory usage, and model-switch regression tests. |

## Recommended first model profile

Do not hard-code one model until ENOSX’s target machines are known. Provide a small, fast starter model for CPU-only machines and a larger option for systems with adequate RAM/GPU. Keep the chat model and embedding model separate: the chat model generates answers; the embedding model powers retrieval. Model selection should be configurable, visible, and reversible.

## References

[1]: https://docs.ollama.com/api/introduction "Ollama API Introduction"

[2]: https://docs.ollama.com/capabilities/embeddings "Ollama Embeddings"

[3]: https://github.com/ggml-org/llama.cpp/tree/master/tools/server "llama.cpp Server"

[4]: https://docs.ollama.com/api/openai-compatibility "Ollama OpenAI Compatibility"

[5]: https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md "llama.cpp Function Calling"
