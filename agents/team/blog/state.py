"""Shared state for the Blog Agent team."""

from typing import TypedDict


class BlogState(TypedDict):
    conversation_id: str
    user_message: str
    messages: list          # [{role, content}] — full conversation history from Supabase
    phase: str              # new | drafting | awaiting_review | verifying | image_picking | awaiting_image | done
    research: str
    title: str
    slug: str
    excerpt: str
    content: str
    tags: list
    reading_time_minutes: int
    cover_image_url: str
    image_options: list     # URLs presented to user during image_picking phase
    meta_title: str
    meta_description: str
    verification_issues: list  # fact-check failures found by verifier
    response: str           # what the agent sends back to the user this turn
