# Agent Companion

An AI-powered system that autonomously monitors and manages a personal website, with a mobile app as the control interface.

## What it does

The agent runs daily via GitHub Actions and handles:

| Task | Mode |
|---|---|
| Uptime monitoring | Autonomous |
| Broken link detection | Autonomous |
| SEO & performance checks | Autonomous |
| Content drafting | Human-approved |
| Feature generation | Human-approved |

All creative tasks go through a human-in-the-loop approval flow before anything touches the live site.

## Architecture

```
Android App (Expo)
    ↕ realtime sync
Supabase (Postgres)
    ↑ agent writes reports, tasks, messages
GitHub Actions (daily cron)
    → Claude API
    → GitHub API
    → Vercel API
    → Target site
```

## Stack

- **Agent** — Python, LangGraph, GitHub Actions
- **AI** — Anthropic Claude API
- **Database** — Supabase (Postgres + Realtime)
- **Mobile** — Expo (React Native, Android)
- **Site** — Next.js on Vercel

## Structure

```
agent/          # Python agent (LangGraph)
mobile/         # Expo companion app
supabase/       # DB migrations
.github/        # Actions workflows
```
