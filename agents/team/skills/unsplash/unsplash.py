"""Unsplash skill — search for high-quality photos."""

import os
import requests


def search_photos(query: str, count: int = 3) -> list[dict]:
    """Search Unsplash. Returns list of {url, description, credit}."""
    resp = requests.get(
        "https://api.unsplash.com/search/photos",
        params={"query": query, "per_page": count, "orientation": "landscape"},
        headers={"Authorization": f"Client-ID {os.environ['UNSPLASH_ACCESS_KEY']}"},
        timeout=10,
    )
    resp.raise_for_status()
    return [
        {
            "url": r["urls"]["regular"],
            "description": r["description"] or r["alt_description"] or query,
            "credit": f"{r['user']['name']} on Unsplash",
        }
        for r in resp.json()["results"]
    ]
