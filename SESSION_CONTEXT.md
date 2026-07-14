# Session Context

> Living context store. Read at session start, updated as work progresses, finalized when drafting a PR. See [SESSION_WORKFLOW.md](SESSION_WORKFLOW.md) for the protocol.

## Snapshot

- **Date:** 2026-07-14
- **Branch (local):** `feat/blog-caption-and-sources`
- **Focus:** populate two new Supabase `blog` columns — `cover_image_caption` + `sources` — from the article generator.

## Where the code lives (RESOLVED this session — important)

- **LOCAL** — this repo (`agent-companion`): Expo mobile app + Supabase Edge Functions. `chat-router` only **enqueues** blog jobs into `agent_jobs`. **There is no article generator here.**
- **SERVER** — Hetzner, `/opt/agent-companion-api` (separate git repo): the LangGraph worker that generates the article and writes the `blog` row. **All generator code lives here.**
  - Blog team: `team/blog/{state,researcher,writer,verifier,image_picker,publisher}`; orchestrator `tasks/blog_agent.py`; `team/team_lead.py`; `worker.py`.
  - Flow: `load → research → write → verify → pick_image → select_image → publish`.
  - `publisher/agent.py` builds the row and calls `table("blog").insert(row)`.
  - **Gotcha:** state survives between turns only if the field is listed in `METADATA_FIELDS` (`tasks/blog_agent.py`).

## Collaboration workflow (this task)

We discuss/research/build **locally (here)**; Kristijan copies the change to the **server** and pastes the file back for verification. Verification is always against **ground truth** (`cat` the server file) — never the draft echoed back. I have no server access.

## Column contract (from kf-portfolio)

- `cover_image_caption` — `text`, nullable — one-line caption under the cover image (attribution/provenance). `NULL` if none → renders as `<figcaption>`.
- `sources` — `jsonb`, nullable — ordered `{label, url}[]`, absolute URLs. `NULL`/`[]` if none → renders as a "Sources" link list after the body.
- Conventions: tags ≤ 3, lowercase (acronyms lowercase in storage — `ai`, not `AI`); source labels short/descriptive.

## Progress — units (all in the SERVER repo)

- [x] **Unit 1 — model:** added `cover_image_caption: str` + `sources: list` to `BlogState` (`team/blog/state.py`). Verified.
- [x] **Unit 2 — persistence:** both written into the insert row in `publisher/agent.py` as `state.get(...) or None` (empty → SQL `NULL`, per contract); schema comment updated. Verified.
- [ ] **Unit 3 — produce `sources`** (`researcher/agent.py`, `writer/agent.py`). **Blocked on:** `cat team/skills/web_search/web_search.py`. Design preference: **deterministic capture of real search-result URLs** — avoid LLM-invented links.
- [ ] **Unit 4 — produce `cover_image_caption`** (`image_picker/agent.py`) — derive from the chosen image (Unsplash `credit` vs AI-generated).
- [ ] **Unit 5 — persist across turns:** add both to `METADATA_FIELDS` (`tasks/blog_agent.py`) and the init dicts (`team/team_lead.py`).
- [ ] **Unit 6 — docs / CHANGELOG.**

Units 1–2 are safe on their own: until producers exist, both columns write `NULL` and the site renders exactly as before.

## Local changes this session

- `TODO.md` — converted to checkboxes; marked Hetzner #1 (agents migrated) and #2 (server↔Supabase) done; added the caption/sources unit breakdown.
- `SESSION_CONTEXT.md` — this file.

## Decisions / conventions

- Session context: **two files** — `SESSION_WORKFLOW.md` (rules) + `SESSION_CONTEXT.md` (state).
- Global standard (`~/.claude/CLAUDE.md`): required project files + their order.
- `BlogState` types use bare `str` / `list` to match the file's house style; the `""`→`None` conversion happens at the DB write to honor the "NULL if none" contract.

## Next steps (next session starts here)

- **Unit 3** — get `cat team/skills/web_search/web_search.py` from the SERVER, then design `sources` production (prefer deterministic capture of real URLs over LLM-emitted ones).
- Then units 4 → 5 → 6.
- **Known stale:** `SECURITY.md` §6 still documents the injection guard as `agents/tasks/blog_agent.py`, but `agents/` no longer exists in this repo (migrated to the server). Needs a fix.
