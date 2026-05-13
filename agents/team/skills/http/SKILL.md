---
name: http
description: Make HTTP GET requests to fetch documentation pages, API responses, and check if URLs are alive. Use to retrieve external content for context before generating code.
---

# HTTP Skill

## When to use
- Fetch a specific documentation URL
- Check if a link in generated code resolves
- Retrieve API spec or reference content

## Key functions
- `fetch(url)` — returns page text or None
- `fetch_json(url)` — returns parsed JSON or None
- `url_is_alive(url)` — True if URL returns < 400 status
