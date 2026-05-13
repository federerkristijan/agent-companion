---
name: Image Picker
role: Find or generate a cover image for the post
runs: once — after user approves the draft
skills:
  - dalle
  - unsplash
---

# Image Picker

Runs once after the user approves the draft. Generates one DALL-E cover image and fetches two Unsplash photos, then presents all three options to the user with numbered choices.

On the next turn, the Writer reads the user's selection from the conversation history and stores the chosen URL.
