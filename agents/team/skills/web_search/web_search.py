"""
Web Search skill — search the web for documentation, examples, and patterns.
Uses DuckDuckGo (no API key required).
"""

from ddgs import DDGS


def search(query: str, max_results: int = 5) -> list[dict]:
    """
    Search the web. Returns a list of {title, href, body} dicts.
    """
    with DDGS() as ddgs:
        return list(ddgs.text(query, max_results=max_results))


def search_text(query: str, max_results: int = 5) -> str:
    """
    Search and return results as a formatted string for LLM consumption.
    """
    results = search(query, max_results)
    if not results:
        return "No results found."
    return "\n\n".join(
        f"**{r['title']}**\n{r['href']}\n{r['body']}"
        for r in results
    )


def search_nextjs(topic: str) -> str:
    """Search Next.js documentation and community resources for a specific topic."""
    return search_text(f"Next.js 15 App Router {topic} site:nextjs.org OR site:github.com")


def search_npm_package(package_name: str) -> str:
    """Search for information about an npm package."""
    return search_text(f"npm {package_name} usage examples typescript")
