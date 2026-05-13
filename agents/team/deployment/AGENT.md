# Deployment Agent

## Purpose
Monitor the Vercel deployment triggered by the PR.
Polls until a result is available, then reports it.

## Inputs (from state)
- `pr_url` — the URL of the opened PR

## Outputs (to state)
- `deploy_status` — `"success"` | `"failure"` | `"timeout"`

## Skills used
- `vercel.check_deployment`

## Behaviour
- Resolves the PR head commit SHA via GitHub API
- Polls GitHub check runs every 20 seconds
- Times out after 5 minutes
- A timeout does not fail the run — it is reported to Supabase as `"timeout"`
