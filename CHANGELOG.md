# Changelog

## 0.1.7 — 2026-10-07

### Added

- **Conversation sharing:** use the native share sheet where supported, with clipboard fallback.
- **Conversation export:** download the active conversation as structured Markdown.
- **Conversation copy:** copy a complete transcript directly from the chat header.
- **WhatsApp handoff:** open a pre-filled support handoff for the active conversation.

### Improved

- Markdown exports now include a title, metadata, message headings, and timestamps instead of plain-text formatting.
- Desktop release metadata is aligned at version `0.1.7`.

### Validation

- `pnpm --filter @workspace/enosx-app typecheck`
- `pnpm --filter @workspace/enosx-app build`
