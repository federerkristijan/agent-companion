---
name: web-search
description: Search the web using DuckDuckGo. No API key required. Use to find documentation, component examples, npm package usage, and Next.js patterns before generating code.
---

# Web Search Skill

## When to use
- Before generating a component: search for patterns and examples
- When unsure about an API: search the docs
- When a package is unfamiliar: search for usage examples

## Key functions
- `search_text(query, max_results)` — returns formatted string for LLM
- `search_nextjs(topic)` — scoped to nextjs.org and GitHub
- `search_npm_package(name)` — TypeScript usage examples for a package
