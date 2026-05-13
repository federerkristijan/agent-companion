---
name: vercel
description: Monitor the Vercel deployment triggered by a GitHub PR. Polls GitHub check runs until the Vercel build completes and returns the result.
---

# Vercel Skill

## When to use
After a PR is opened, use this skill to wait for and report the Vercel deployment result.

## Key functions
- `check_deployment(repo, pr_url, timeout_seconds)` — polls every 20s, returns `"success"` | `"failure"` | `"timeout"`
