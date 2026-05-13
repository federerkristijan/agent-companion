---
name: typescript
description: Run the real TypeScript compiler (tsc --noEmit) on generated files to catch type errors before committing. Requires tsc in PATH. Gracefully degrades if unavailable.
---

# TypeScript Skill

## When to use
After all files are generated and reviewed — run before committing to catch
type errors the LLM missed. This is a real compiler check, not a simulation.

## Key functions
- `check_files(files, tsconfig)` — runs `tsc --noEmit` on `{path: content}` dict. Returns `{passed, errors, raw}`
- `format_errors(result)` — formats output as a string for LLM consumption

## Requirements
`tsc` must be in PATH. In GitHub Actions (ubuntu-latest), install with:
```
npm install -g typescript
```
Returns `passed: None` (not a failure) if tsc is unavailable.
