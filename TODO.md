## Hetzner server connection

- [x] migration agents to opt/agent-companion-api
- [x] connect server to supabase DB
- [ ] test the connection agents-android app

## Agents features

- [ ] Read and answer gmail
- [ ] extend chat visualisation - find an online open-source library
- [ ] VIsualisation of reminders and google calendar
- [ ] Alarm - add a music file, play first 8 seconds
- [ ] Mood tracker - check with the user every day evening at 20h, a simple smiley face based mood questionnaire (5-6 different moods)
- [ ] Priority setter - based on the schedule and appointments, what to do first
- [ ] create iOS App

## Security pipeline

- [ ] test CodeqQL, why it is failing
- [ ] strict prompts and python blocks against prompt injections

## Blog formatting

- [ ] Add tags to the "github repositories as supply-chain entry points" post (currently has none)
- [ ] Fix blog index card date format — pass `'en-GB'` in `BlogSection.tsx` so cards show DD/MM/YYYY (currently US M/D/YYYY)
- [ ] Create tag pages — a route (e.g. `/blog/tag/[tag]`) listing all articles with a given tag; link the tag chips to it

## Blog: cover-image caption & sources (server — agent-companion-api)

Populate the two new Supabase `blog` columns (`cover_image_caption` TEXT, `sources` JSONB) from the article generator. Both nullable — NULL/empty is safe.

- [x] Unit 1 — model: add `cover_image_caption` + `sources` to `BlogState` (`team/blog/state.py`)
- [x] Unit 2 — persistence: write both to the insert row + update schema comment (`team/blog/publisher/agent.py`)
- [ ] Unit 3 — produce `sources` (`team/blog/researcher/agent.py`, `team/blog/writer/agent.py`)
- [ ] Unit 4 — produce `cover_image_caption` (`team/blog/image_picker/agent.py`)
- [ ] Unit 5 — persist across turns: add both to `METADATA_FIELDS` (`tasks/blog_agent.py`, `team/team_lead.py`)
- [ ] Unit 6 — docs / CHANGELOG
