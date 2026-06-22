# Agent Companion

An AI-powered multi-agent system that monitors and manages a personal website, with an Android companion app as the control interface.

## Architecture

```
Android App (Expo)
    ↕ Supabase Realtime
Supabase (Postgres + Edge Function)
    chat-router (Deno) — classifies intent, handles simple chat directly
        ├── simple chat  → GPT-4o reply (2–5s)
        └── complex task → GitHub Actions workflow_dispatch (30–60s)
GitHub Actions
    → input_agent.py (routes to specialist)
    → Blog Agent (research → write → image → publish)
    → Feature Agent (Next.js component generation)
```

## Agents

| Agent | Role | Trigger |
|---|---|---|
| chat-router | Classifies intent, handles simple chat | Supabase DB webhook → Edge Function |
| Input Agent | Routes complex tasks to specialists | workflow_dispatch from chat-router |
| Blog Agent | Research, write, image, publish | Input Agent |
| Feature Agent | Next.js component generation | Human-approved, workflow_dispatch |
| Optimizer Agent | SEO, a11y, styling, performance | Weekly cron (planned) |
| Monitor Agent | Uptime, broken links | Every 6h cron (planned) |

## Companion App

Android app (Expo) — distributed via Google Play internal testing.

**Screens:**
- **Home** — dashboard with quick-action cards and app version
- **Chat** — send instructions and receive agent replies (Supabase Realtime)
- **Calendar** — Google Calendar and Gmail events with reminders
- **Alarms** — recurring alarms with day-of-week selection

## Stack

- **Agents** — Python, LangGraph, GitHub Actions
- **AI** — OpenAI GPT-4o
- **Chat router** — Supabase Edge Function (Deno/TypeScript)
- **Database** — Supabase (Postgres + Realtime)
- **Mobile** — Expo (React Native, Android)
- **Site** — Next.js on Vercel

## Structure

```
mobile/                 # Expo companion app
supabase/
  functions/chat-router # Edge Function — intent classifier and chat handler
  migrations/           # DB schema
.github/workflows/      # GitHub Actions
```

## Setup

### Supabase Edge Function secrets
Set these in the Supabase dashboard under Project Settings → Edge Functions:
- `OPENAI_API_KEY`
- `GITHUB_TOKEN` (fine-grained token with `Actions: write` on this repo)

### Supabase Database Webhook
Create a webhook in the Supabase dashboard under Database → Webhooks:
- Table: `messages`, Event: `INSERT`
- URL: `https://<project-ref>.supabase.co/functions/v1/chat-router`
- HTTP method: POST
