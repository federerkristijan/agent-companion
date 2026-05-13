# Planner Agent

## Purpose
Analyse the full project context and the task, then produce a precise per-file
change plan. Generates no code — only decides what needs to change and why.

## Inputs (from state)
- `task_description`
- `project_tree`
- `key_files`

## Outputs (to state)
- `plan` — list of `PlannedFile` (path, action, description, needs_context)
- `pending_files` — copy of plan, consumed by builder loop
- `built_files` — initialised to `[]`

## Skills used
None — LLM reasoning only.

## Output format
Each plan item includes `needs_context`: the exact file paths the Builder must
read to implement that specific file correctly.
