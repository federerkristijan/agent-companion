---
name: dalle
description: Generate images using OpenAI DALL-E 3
tools:
  - generate_image
  - generate_blog_cover
env:
  - OPENAI_API_KEY
---

# DALL-E Skill

Generates images via OpenAI DALL-E 3. Uses the same `OPENAI_API_KEY` as the LLM.

## Functions

- `generate_image(prompt, size)` — raw generation, returns URL
- `generate_blog_cover(title, topic)` — generates a clean blog cover, no text in image
