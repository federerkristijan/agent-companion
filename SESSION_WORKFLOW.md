# Session Workflow

How context survives between sessions for whoever works on this repo (LLM/agent or human).

## Files

- **`session_workflow.md`** — this protocol. Rarely changes.
- **`SESSION_CONTEXT.md`** — the living context store (single source of truth). Current state, in-flight work, decisions, and next steps. Updated in place — one file, always the latest.

## At session start — recover

1. Read `SESSION_CONTEXT.md` **before doing anything else**.
2. Use it to recover: current branch and focus, in-flight tasks, open decisions, and gotchas.
3. Keep it current as the session progresses.

## At session end — persist

**Trigger: the user asks to draft a PR.** That marks the session boundary.

1. Update `SESSION_CONTEXT.md` to reflect the final state: what changed this session, what's next, and any decisions or blockers.
2. Then draft the PR following the repo's conventions.

The context store is written/updated at PR-draft time and read again at the start of the next session, so work continues without re-deriving context.

## `SESSION_CONTEXT.md` shape

- **Snapshot** — date, branch, current focus.
- **Project** — one-paragraph recap with pointers to `README.md` / `PROJECT_BRIEF.md`.
- **In-flight work** — checklist of what's underway.
- **Decisions / conventions** — choices made that aren't obvious from the code.
- **Next steps** — the immediate open items for the next session.
