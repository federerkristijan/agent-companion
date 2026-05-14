"""Publisher — inserts the final post into the Supabase blog table and verifies deployment."""

import math
import os
import time
import urllib.request
from datetime import datetime, timezone

from team.blog.state import BlogState
from team.skills.supabase import get_client

# Supabase blog table schema (for reference):
# title TEXT, slug TEXT UNIQUE, excerpt TEXT, content TEXT,
# cover_image_url TEXT, tags TEXT[], reading_time_minutes INT,
# featured BOOLEAN, meta_title TEXT, meta_description TEXT,
# published_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ


def _estimate_reading_time(content: str) -> int:
    words = len(content.split())
    return max(1, math.ceil(words / 200))


def publish(state: BlogState) -> BlogState:
    reading_time = state.get("reading_time_minutes") or _estimate_reading_time(state["content"])

    row = {
        "title": state["title"],
        "slug": state["slug"],
        "excerpt": state.get("excerpt", ""),
        "content": state["content"],
        "cover_image_url": state.get("cover_image_url", ""),
        "tags": state.get("tags", []),
        "reading_time_minutes": reading_time,
        "featured": False,
        "meta_title": state.get("meta_title") or state["title"],
        "meta_description": state.get("meta_description") or state.get("excerpt", ""),
        "published_at": datetime.now(timezone.utc).isoformat(),
    }

    get_client().table("blog").insert(row).execute()

    print(f"[publisher] published: {state['title']} (slug: {state['slug']})")

    # Deployment check — give Vercel a moment to revalidate, then confirm the page is live
    site_url = os.environ.get("SITE_URL", "").rstrip("/")
    live_url = f"{site_url}/blog/{state['slug']}" if site_url else ""
    deployment_note = ""
    if live_url:
        time.sleep(8)
        try:
            code = urllib.request.urlopen(live_url, timeout=10).status
            if code == 200:
                deployment_note = f"\nLive at: {live_url}"
                print(f"[publisher] deployment confirmed: {live_url}")
            else:
                deployment_note = f"\nDeployment check returned {code} — page may still be revalidating."
                print(f"[publisher] deployment check: HTTP {code}")
        except Exception as e:
            deployment_note = "\nDeployment check failed — page may still be revalidating."
            print(f"[publisher] deployment check error: {e}")

    return {
        **state,
        "phase": "done",
        "response": (
            f"Your post **{state['title']}** has been published!\n"
            f"Slug: `{state['slug']}`\n"
            f"Reading time: ~{reading_time} min"
            f"{deployment_note}"
        ),
    }
