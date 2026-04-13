# Agent Companion

A full-stack AI agent that monitors and updates a personal website, paired with an Android companion app to interact with it.

## Architecture

```
Expo App (Android)
    ↕ Supabase Realtime
Supabase (Postgres)
    ↑ agent writes reports, tasks, messages
GitHub Actions (cron 24h)
    → Claude API (content drafting, feature generation)
    → Vercel API (deployments, analytics)
    → GitHub API (create PRs, open issues)
    → Site URL (uptime ping, link crawl, Lighthouse)
```

## Agent Tasks

| Task | Autonomous | Requires Approval |
|---|---|---|
| Uptime Monitor | Yes | — |
| Broken Link Checker | Yes | — |
| Site Optimizer | Yes | — |
| Content Updater | — | Yes |
| Feature Builder | — | Yes |

## Structure

```
agent/          # GitHub Actions agent (TypeScript)
mobile/         # Expo companion app (React Native)
supabase/       # DB migrations
.github/        # Actions workflows
```

## Environment Variables

```
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
VERCEL_TOKEN
VERCEL_PROJECT_ID
SITE_URL
GITHUB_TOKEN    # auto-provided in Actions
```

Set these as [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) — never commit them.

## Setup

1. Clone the repo
2. Add secrets to GitHub repo settings
3. Create Supabase project and run `supabase/migrations/001_initial.sql`
4. Agent runs automatically at 08:00 UTC daily via GitHub Actions

## Companion App

Android-only, distributed as a local APK. See [mobile/README.md](mobile/README.md) once built.
