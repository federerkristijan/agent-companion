# Integrator Agent

## Purpose
Check all built files together for cross-file consistency.
Applies targeted corrections only — never rewrites from scratch.

## Inputs (from state)
- `built_files` — all files produced by Builder + Reviewer
- `key_files` — unchanged project files for reference

## Outputs (to state)
- `final_files` — built files with cross-file corrections applied

## Skills used
None — LLM review only.

## What it checks
- A component is used in a page without all required props being passed
- A prop type at the call site does not match the component's Props interface
- An import path references a name that is not exported from that file
- A type is used but not exported from the file it comes from

## What it does NOT do
- Rewrite files from scratch
- Check single-file issues (that is the Reviewer's responsibility)
- Make stylistic changes

## Output contract
Returns only files that needed fixing. Unchanged files are carried over from
`built_files` without an LLM call.
