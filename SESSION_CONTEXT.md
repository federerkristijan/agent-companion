# Session Context

> Living context store. Read at session start, updated as work progresses, finalized when drafting a PR. See [SESSION_WORKFLOW.md](SESSION_WORKFLOW.md) for the protocol.

## Snapshot

- **Date:** 2026-07-01
- **Branch:** `docs/project-standards` (this session's docs work; blog changes deferred to a new session).
- **Focus (this session — done):** establish the session-continuity workflow + community-standard project files.
- **Next session:** implement blog `cover_image_caption` + `sources` in the article generator.

## Project (recap — see [README.md](README.md) / [PROJECT_BRIEF.md](PROJECT_BRIEF.md))

- **Agent Companion** — multi-agent system that maintains the `kf-portfolio` site, with an Expo Android companion app as the control interface.
- **Data plane:** Supabase (Postgres + Realtime + `chat-router` Edge Function).
- Agents originally ran on **GitHub Actions**; being migrated to a server-side `agent_jobs` model (this branch).

## In-flight work

- [x] Created `SESSION_WORKFLOW.md` + `SESSION_CONTEXT.md` (this session).
- [x] Added the "Standard project files & order" convention (full community set) to `~/.claude/CLAUDE.md`.
- [x] **Scaffolded missing standard files** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SUPPORT.md`, `CHANGELOG.md` (Keep a Changelog), `LICENSE` (MIT, © 2026 Kristijan Federer).
- [ ] **Blog schema update** — the article generator must populate two new Supabase `blog` columns. The DB columns were already applied and `kf-portfolio` already renders them as of 2026-06-28; only the writer side is missing here.
  - `cover_image_caption` — `text`, nullable — one-line plain-text caption under the cover image (attribution/provenance, e.g. "Generated with GPT 5.5"). `NULL` if none. Renders as a `<figcaption>` under the cover.
  - `sources` — `jsonb`, nullable — ordered array of `{ "label": string, "url": string }`. `label` = readable link text (site/publication name); `url` = absolute URL with scheme. Order preserved. `NULL`/`[]` if none. Renders as a "Sources" list of `target="_blank" rel="noopener noreferrer"` links after the body.
  - Conventions: tags max 3, lowercase (acronyms lowercase in storage — `ai`, not `AI`); source labels short/descriptive.

## Recent commits (context)

- `route complex chat tasks to agent_jobs instead of github actions`
- `remove migrated agents and their workflows`
- `ignore unfixable expo transitive advisories in mobile sbom`

## Decisions / conventions

- Session context persistence: **two files in root** — `SESSION_WORKFLOW.md` (rules) + `SESSION_CONTEXT.md` (state), kept separate for write-safety and clean diffs.
- Global standard (in `~/.claude/CLAUDE.md`): every project must have, in order — `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `CHANGELOG.md`, `LICENSE`, `SESSION_WORKFLOW.md`, `SESSION_CONTEXT.md`.

## Next steps (next session starts here)

- **Blog schema update — `cover_image_caption` + `sources`.** First resolve the open question: does the article-writing code still live in this repo, or did it move to the `agent_jobs` server (per the `remove migrated agents` commit)? If here → add both fields to the blog insert/upsert **and** the generation prompt/schema. If on the server → the change belongs in that repo, not this one.
- Full contract + conventions for the two fields are captured under **In-flight work** above.
