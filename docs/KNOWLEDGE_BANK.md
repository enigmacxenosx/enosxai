# ENOSX AI Knowledge Bank

The Knowledge Bank is a local-first memory workspace available at `/knowledge-bank`. It stores facts, instructions, documents, skills, and project context in browser storage on the current device. The interface remains usable without an API key or network connection after the application shell has been cached by the existing PWA service worker.

## Current capabilities

| Capability | Behavior |
|---|---|
| Manual commit | Add a title, content, type, and comma-separated tags through the Knowledge Bank composer. |
| Document upload | Import `.txt`, `.md`, `.json`, `.csv`, and `.log` text files as local knowledge entries. |
| Retrieval | Search title, content, type, source, and tags using local word matching. |
| Backup | Export the complete knowledge bank as `enosx-knowledge-bank.json`; import a previous JSON snapshot. |
| GOD MODE | Open the local console and push entries directly into the bank. |

## GOD MODE commands

```text
help
push <title> :: <knowledge content>
stats
search <term>
export
clear
lock
```

The `clear` command is destructive and should be used only after exporting a backup. The GOD MODE console is a local browser interface; it does not execute operating-system commands and does not expose a server shell.

## Architecture direction

This first slice deliberately uses a browser-local store so the knowledge bank does not depend on API credentials. The next hardening step is a local companion service backed by SQLite, with optional vector indexing and an on-device model runtime such as Ollama or llama.cpp. That companion can provide stronger semantic retrieval and answer generation while preserving the current JSON export format as a portable backup.
