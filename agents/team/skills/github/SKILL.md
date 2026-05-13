---
name: github
description: Read and write files on a GitHub repository. Create branches, commit files, delete files, apply batched changes, and open pull requests. Requires GITHUB_TOKEN env var.
---

# GitHub Skill

## When to use
Use this skill for any interaction with the portfolio GitHub repository:
reading existing files, creating branches, committing generated code, and opening PRs.

## Key functions
- `get_repo()` — authenticated repo object
- `read_project_tree(repo)` — full file listing
- `read_file(repo, path)` / `read_files(repo, paths)` — read content
- `create_branch(repo, name)` — new branch from main
- `commit_file(...)` — create or overwrite a file
- `delete_file(...)` — remove a file
- `apply_changes(repo, branch, changes, run_id)` — batch `[{path, action, content}]`
- `open_pr(repo, branch, title, body)` — open PR, returns URL
