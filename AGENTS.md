<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions (Atelier FLE)

## Commit messages

When a story or task is done (or when there are meaningful uncommitted changes ready to ship), **always propose a commit message** without waiting to be asked. Do not create the commit unless the user asks.

Format:

- Subject: imperative, ~50–72 chars, focuses on *why* / outcome (e.g. `Scaffold Atelier FLE with Next.js, Biome, shadcn, and SQLite DB port`).
- Optional body: 1–2 short sentences with context (story ID, what is intentionally out of scope).
- Prefer referencing the user story when relevant (`US-1.0`, `US-2.2`, …).
