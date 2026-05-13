---
name: skills-index
description: Index of all skills available to the Feature Agent team.
---

# Skills Index

Each skill is a directory with a `SKILL.md` (what it does, when to use it)
and an implementation file. No LLM calls inside skills — pure functions only.

| Skill | Directory | Description |
|---|---|---|
| GitHub | `github/` | Read/write files, branches, PRs on the portfolio repo |
| Vercel | `vercel/` | Monitor Vercel deployment via GitHub checks API |
| Web Search | `web_search/` | DuckDuckGo search — no API key required |
| npm | `npm/` | npm registry queries, package.json dependency checks |
| TypeScript | `typescript/` | Real `tsc --noEmit` validation before committing |
| Supabase | `supabase/` | Read/write to shared Supabase database |
| HTTP | `http/` | Fetch docs pages, check URL availability |
| Next.js | `nextjs/` | App Router analysis, convention checks, docs retrieval |
