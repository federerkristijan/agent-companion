"""
HTTP skill — fetch external web pages and API responses.
Used to retrieve documentation, check URLs, and call external APIs.
"""

import requests

DEFAULT_TIMEOUT = 10
DEFAULT_HEADERS = {"User-Agent": "agent-companion/1.0"}


def fetch(url: str, timeout: int = DEFAULT_TIMEOUT) -> str | None:
    """
    Fetch a URL and return its text content.
    Returns None on error.
    """
    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"[http] fetch error for {url}: {e}")
        return None


def fetch_json(url: str, timeout: int = DEFAULT_TIMEOUT) -> dict | None:
    """
    Fetch a URL and parse it as JSON.
    Returns None on error.
    """
    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[http] fetch_json error for {url}: {e}")
        return None


def url_is_alive(url: str, timeout: int = DEFAULT_TIMEOUT) -> bool:
    """Check if a URL returns a 2xx or 3xx response."""
    try:
        resp = requests.head(url, headers=DEFAULT_HEADERS, timeout=timeout, allow_redirects=True)
        return resp.status_code < 400
    except Exception:
        return False
