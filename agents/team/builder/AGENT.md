# Builder Agent

## Purpose
Generate the content of exactly one file per invocation.
Reads only the context that specific file needs — nothing more.

## Inputs (from state)
- `pending_files` — pops the first item as its task
- `key_files` — reads only the paths listed in `needs_context`
- `built_files` — reads already-built dependencies if they appear in `needs_context`

## Outputs (to state)
- `pending_files` — with the current file removed
- `current_file` — the planned file + generated content (handed to Reviewer)
- `built_files` — appended to directly for delete actions (no content needed)

## Skills used
None — LLM generation only.

## Rules enforced in prompt
- TypeScript only, all props typed
- `'use client'` when hooks or event handlers are present
- Tailwind CSS only
- Default export for every component
- Props interface must match the actual data from variables files
- All required props must be passed at call sites
