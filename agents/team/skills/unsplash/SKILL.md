---
name: unsplash
description: Search Unsplash for high-quality, free-to-use photos
tools:
  - search_photos
env:
  - UNSPLASH_ACCESS_KEY
---

# Unsplash Skill

Searches Unsplash via their public API. Requires a free Unsplash developer account.

## Setup

1. Create account at unsplash.com/developers
2. Create a new application → copy the Access Key
3. Add `UNSPLASH_ACCESS_KEY` to Infisical

## Functions

- `search_photos(query, count)` — returns list of `{url, description, credit}`
