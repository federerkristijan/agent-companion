# Agent Companion

An AI-powered multi-agent system that monitors and manages a personal website, with an Android companion app as the control interface.

## Architecture

```
Android App (Expo)
    ↕ Supabase Realtime
Supabase (Postgres)
    ↑ agents write reports, tasks, messages
GitHub Actions
    → Input Agent (routes user instructions)
    → Team Lead Agent (delegates to specialists)
    → Feature Agent (Next.js component generation)
    → Content Agent (blog posts, portfolio items)
    → Optimizer Agent (SEO, a11y, styling/UX)
    → Monitor Agent (uptime, broken links)
```

## Agents

| Agent | Role | Trigger |
|---|---|---|
| Input Agent | Reads app messages, routes to Team Lead | Supabase webhook |
| Team Lead Agent | Delegates to specialist agents | On demand |
| Feature Agent | Next.js component generation | Human-approved |
| Content Agent | Blog posts, portfolio items | Human-approved |
| Optimizer Agent | SEO, a11y, styling, performance | Weekly cron |
| Monitor Agent | Uptime, broken links | Every 6h cron |

## Companion App

Android-only app (Expo) — local APK, no Play Store.

**Screens:**
- **Home** — dashboard overview
- **Chat** — send instructions, receive agent reports (Supabase Realtime)
- **Calendar** — scheduled runs and task history
- **Memos** — quick idea capture for the agent

## Stack

- **Agents** — Python, LangGraph, GitHub Actions
- **AI** — Anthropic Claude API
- **Database** — Supabase (Postgres + Realtime)
- **Mobile** — Expo (React Native, Android)
- **Site** — Next.js on Vercel

## Structure

```
agents/         # Python agents (LangGraph)
mobile/         # Expo companion app
supabase/       # DB migrations
.github/        # Actions workflows
```
