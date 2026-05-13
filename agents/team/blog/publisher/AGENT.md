---
name: Publisher
role: Insert the final blog post into Supabase
runs: once — after user selects an image
skills:
  - supabase
---

# Publisher

Inserts the complete post into the Supabase `blog` table and reports back with a confirmation message. Sets `published_at` to the current timestamp (live post). Does not modify any code files.

Schema reference: see `AGENTS.md` for the full blog table definition.
