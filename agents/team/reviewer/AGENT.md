# Reviewer Agent

## Purpose
Check and fix exactly one file immediately after the Builder produces it.
Catches single-file errors before they reach the Integrator.

## Inputs (from state)
- `current_file` — the file just built (path, action, description, content)
- `key_files` — reads only paths listed in the file's `needs_context`
- `built_files` — reads already-built dependencies

## Outputs (to state)
- `built_files` — appended with the reviewed (corrected) file
- `current_file` — reset to `{}`

## Skills used
None — LLM review only.

## What it checks
- Missing or incorrect default export
- Missing `'use client'` when hooks or event handlers are present
- Imports referencing names that don't exist in the source file
- Markdown fences or non-code content
- Obvious TypeScript errors in isolation

## What it does NOT check
Cross-file issues (wrong props at call site, type mismatches across files).
That is the Integrator's responsibility.
