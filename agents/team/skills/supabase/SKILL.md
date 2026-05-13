---
name: supabase
description: Read and write to the shared Supabase database. Insert agent messages, read pending tasks, update task status, and write structured agent reports. Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
---

# Supabase Skill

## When to use
- Report agent results back to the mobile companion app
- Read tasks assigned by the Team Lead agent
- Write structured reports to agent_reports table

## Key functions
- `insert_message(role, content)` — write to messages table
- `get_pending_tasks(limit)` — fetch tasks with status "pending"
- `update_task_status(task_id, status, result)` — mark task done/failed
- `insert_agent_report(agent, status, detail)` — structured report
