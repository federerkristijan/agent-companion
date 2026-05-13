---
name: nextjs
description: Next.js 15 App Router specific analysis. Parse route structure, detect Server vs Client components, check App Router conventions, and fetch relevant Next.js documentation.
---

# Next.js Skill

## When to use
- Before generating any component: check conventions and route structure
- After generating: audit files for App Router violations
- When unsure about a pattern: fetch the relevant docs page

## Key functions
- `parse_app_router_structure(project_tree)` — extracts routes, layouts, special files
- `is_client_component(content)` / `is_server_component(content)` — detect directive
- `requires_client(content)` — heuristic: does this file need `'use client'`?
- `check_app_router_conventions(path, content)` — returns list of violation warnings
- `audit_files(files)` — run checks across all files at once
- `fetch_docs_page(slug)` — fetch a nextjs.org/docs page by slug
- `search_docs(topic)` — DuckDuckGo search scoped to Next.js 15 App Router

## Convention checks enforced
- Missing `'use client'` when hooks or browser APIs are used
- Missing default export on page or layout files
- Unnecessary React import in Next.js 13+
