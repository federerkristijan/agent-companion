# Feature Agent Team

## Purpose
Fulfil plain-English tasks on a Next.js portfolio site by scanning the project,
planning changes, generating code file-by-file, verifying correctness, and opening
a pull request — then monitoring the Vercel deployment result.

## Flow

```
scanner → planner → [router loop: builder → reviewer] → integrator → create_pr → report
```

## Members

| Agent | Folder | Responsibility |
|---|---|---|
| Scanner | `scanner/` | Reads full project tree and key files from GitHub |
| Planner | `planner/` | Analyses project, produces per-file change plan |
| Builder | `builder/` | Generates one file at a time with focused context |
| Reviewer | `reviewer/` | Fixes one file immediately after it is built |
| Integrator | `integrator/` | Cross-file consistency — props, imports, types |

Note: `deployment/` agent exists but is not wired — GitHub fine-grained PATs
cannot access the Checks API. Future: monitor via Vercel API directly.

## Skills used

See `skills/SKILLS.md` for the full list.

- Scanner uses: `github.read_project_tree`, `github.read_files`
- Planner uses: `web_search.search_nextjs`
- Builder uses: `npm.missing_packages`, `nextjs.search_docs`, `nextjs.parse_app_router_structure`
- Reviewer uses: `nextjs.check_app_router_conventions`, `typescript.check_files`
- Integrator uses: `typescript.check_files`, `nextjs.audit_files`
- Deployment uses: `github.get_repo`, `vercel.check_deployment`
- Orchestrator uses: `github.create_branch`, `github.apply_changes`, `github.open_pr`, `supabase.insert_message`

## Shared state

Defined in `state.py`. Passed through every agent unchanged except for the fields
each agent is responsible for updating.

## Orchestrator

`tasks/feature_agent.py` — wires agents together via LangGraph. Contains no
business logic.
