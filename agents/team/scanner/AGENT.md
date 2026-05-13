# Scanner Agent

## Purpose
Read the full portfolio repository and load all files the rest of the team needs.
Knows what exists. Makes no decisions.

## Inputs (from state)
- `target_page` — the page file the task targets

## Outputs (to state)
- `project_tree` — newline-separated list of all relevant file paths
- `key_files` — dict of `{path: content}` for all files read

## Skills used
- `github.read_project_tree`
- `github.read_files`

## What it reads
- Target page file
- `package.json`, `tsconfig.json`
- First matching data file (`src/utils/variables.ts`, etc.)
- First matching types file (`src/types/global.ts`, etc.)
- First matching ESLint config
- **All** page files (`src/app/**/page.tsx`) — so integrator knows every import across the site
- **All** layout files (`src/app/**/layout.tsx`)
- **All** components (`src/components/**/*.tsx`) — full picture of what exists

Reading everything prevents the agent from breaking shared files (like variables.ts)
whose exports are consumed by pages it wasn't asked to touch.
