# CI lockfile mismatch fix

The `overrides` block exists only in `pnpm-workspace.yaml` (a stale left-over from a template) and no longer in any `package.json`. pnpm's frozen install compares the workspace-level overrides against the lockfile's recorded overrides; the lockfile (lockfileVersion 9.0) was generated when `package.json` held the overrides, so the recorded set differs from the workspace.yaml set and the frozen install aborts with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.

Fix: remove the entire `overrides:` section from `pnpm-workspace.yaml` and regenerate the lockfile with the same pnpm major (v9, matching CI) so the recorded settings match. Using pnpm 11 risks changing lockfile version; pin to 9 for the regen to keep the diff minimal.
