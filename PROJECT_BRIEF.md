# Project Brief — Personal Website Agent + Companion App

## Overview
Build a two-part system: a full-stack AI agent that monitors and updates a personal website, and a mobile companion app to interact with it. This is a **founding stone** — architecture must be simple and extensible for future agents.

---

## Part 1 — Full-Stack Website Agent

### What it does
Runs every 24h via GitHub Actions and performs the following tasks. All actions require **human approval** before execution (see Human-in-the-Loop below).

| Task | Description |
|---|---|
| **Content Updater** | Drafts blog posts and portfolio items from ideas fed via the app |
| **Feature Builder** | Generates new Next.js components/features from plain-English descriptions |
| **Uptime Monitor** | Pings the site, alerts on downtime or slow response (>3s) |
| **Broken Link Checker** | Crawls pages, reports 404s and dead links |
| **Site Optimizer** | Checks SEO meta tags, Open Graph, alt text, Core Web Vitals via Lighthouse, bundle size, image optimization, accessibility (contrast, ARIA), animation performance, responsive breakpoints, dependency security |

### Tech Stack
- **Runtime**: GitHub Actions (cron `0 8 * * *`, free tier — public repo)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Site**: Next.js on Vercel
- **External APIs**: Vercel API (deployments, analytics), GitHub API (PRs, issues)
- **Database**: Supabase (Postgres) — agent posts reports and tasks here

### Human-in-the-Loop
1. User sends idea or instruction via the app
2. Agent acknowledges and queues the task
3. Agent executes and posts output (draft, PR link, report) back to app
4. User reviews and approves before anything goes live
5. Agent only acts autonomously on **read-only checks** (uptime, links, optimizer)

### Agent Output Channels
- Creates GitHub PRs for content and feature changes (user merges manually)
- Posts daily digest to Supabase → surfaces in app
- Opens GitHub Issues for alerts (downtime, broken links)

---

## Part 2 — Companion Mobile App

### What it does
A two-way chat interface to interact with the agent. Think: personal AI chief of operations for your website, in your pocket.

### Core Screens
1. **Chat** — send ideas, instructions, voice memos; receive agent reports, suggestions, analytics
2. **Calendar** — simple view of scheduled agent runs, content publishing timeline, task history
3. **Memos** — capture raw ideas quickly, feeding them to the agent later

### Tech Stack
- **Framework**: Expo (React Native), Android-first
- **Distribution**: Local APK install (no Play Store, no TestFlight)
- **Backend**: Supabase (Postgres + Realtime for live chat updates)
- **Auth**: Supabase Auth (single user — personal tool)
- **Notifications**: Expo Push Notifications (agent alerts)

### Supabase Schema

```sql
-- Chat messages between user and agent
messages (id, role ENUM('user','agent'), content TEXT, created_at)

-- Raw ideas captured in app
memos (id, content TEXT, status ENUM('raw','queued','done'), created_at)

-- Calendar entries
calendar_events (id, title TEXT, type ENUM('agent_run','content','milestone'), scheduled_at, status)

-- Agent daily digests and findings
agent_reports (id, type TEXT, summary TEXT, details JSONB, created_at)

-- Tasks awaiting user approval or in progress
tasks (id, type ENUM('content','feature','check'), description TEXT, status ENUM('pending','approved','done','rejected'), result JSONB, created_at)
```

---

## Architecture Diagram

```
Expo App (Android)
    ↕ Supabase Realtime
Supabase (Postgres)
    ↑ agent writes reports, tasks, messages
GitHub Actions (cron 24h)
    → Claude API (content drafting, feature generation, suggestions)
    → Vercel API (deployments, analytics)
    → GitHub API (create PRs, open issues)
    → Site URL (uptime ping, link crawl, Lighthouse)
```

---

## Key Constraints & Decisions

| Decision | Choice | Reason |
|---|---|---|
| Mobile framework | Expo | Windows-friendly, no local Android SDK needed, EAS Build in cloud |
| Distribution | Local APK | Personal tool, no store needed |
| Backend | Supabase only | Simplicity — no standalone Node server |
| Agent runtime | GitHub Actions | Free tier sufficient (~60–150 min/month on public repo) |
| Human loop | Always on creative tasks | User approves all content and feature changes |
| Extensibility | Multi-agent ready | Schema and app designed to add more agents later |

---

## Out of Scope (for now)
- iOS support
- Public app distribution
- Multiple users
- Analytics dashboard (beyond weekly digest in chat)
- Automated merging of PRs

---

## Starting Point for Claude Code
1. Set up Supabase project and run schema migrations
2. Build GitHub Actions workflow with agent scaffold
3. Implement agent tasks one by one (start with uptime + content updater)
4. Build Expo app: chat screen → calendar → memos
5. Wire Supabase Realtime between agent and app

## Environment Variables Required
```
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
VERCEL_TOKEN
VERCEL_PROJECT_ID
SITE_URL
GITHUB_TOKEN        # auto-provided in Actions
```