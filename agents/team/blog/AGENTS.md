# Blog Agent Team

## Purpose
Create blog posts collaboratively with the user via the Android companion app.
The user drives the topic and feedback; the agents handle research, writing, images, and publishing to Supabase.

## Flow

```
researcher → writer ⟷ [user feedback loop] → image_picker ⟷ [user selects] → publisher
```

Each turn is one GitHub Actions run. State is reconstructed from the conversation history stored in Supabase.

## Members

| Agent | Folder | Responsibility |
|---|---|---|
| Researcher | `researcher/` | Web search on the topic, returns structured notes |
| Writer | `writer/` | Drafts and revises the post, asks user for feedback |
| Image Picker | `image_picker/` | Generates DALL-E image + searches Unsplash, presents options |
| Publisher | `publisher/` | Inserts the final post into the Supabase `blog` table |

## Skills used

- Researcher uses: `web_search.search_text`
- Writer uses: none (pure LLM)
- Image Picker uses: `dalle.generate_blog_cover`, `unsplash.search_photos`
- Publisher uses: `supabase` (blog table insert)

## Shared state

Defined in `state.py`. Conversation history is the source of truth — no separate state store.

## Supabase requirement

The `messages` table must have a `conversation_id` column:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id TEXT;
```

## Orchestrator

`tasks/blog_agent.py` — stateless per-turn graph. Each run reads full conversation history, routes to the correct agent, stores the response.
