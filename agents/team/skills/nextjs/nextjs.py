"""
Next.js skill — App Router specific analysis and documentation retrieval.
Understands routes, layouts, server vs client components, and metadata.
"""

from team.skills.http import fetch
from team.skills.web_search import search_text

NEXTJS_DOCS_BASE = "https://nextjs.org/docs"


# ---------------------------------------------------------------------------
# Route analysis
# ---------------------------------------------------------------------------

def parse_app_router_structure(project_tree: str) -> dict:
    """
    Parse a project tree string and extract the App Router route structure.
    Returns a dict with routes, layouts, and special files found.
    """
    lines = project_tree.splitlines()
    app_files = [l for l in lines if l.startswith("src/app/")]

    routes = []
    layouts = []
    special = []

    for path in app_files:
        filename = path.split("/")[-1]
        if filename == "page.tsx":
            route = path.replace("src/app", "").replace("/page.tsx", "") or "/"
            routes.append(route)
        elif filename == "layout.tsx":
            layouts.append(path)
        elif filename in ("loading.tsx", "error.tsx", "not-found.tsx", "template.tsx"):
            special.append(path)

    return {"routes": routes, "layouts": layouts, "special_files": special}


def is_client_component(file_content: str) -> bool:
    """Return True if the file has a 'use client' directive."""
    return file_content.strip().startswith(("'use client'", '"use client"'))


def is_server_component(file_content: str) -> bool:
    """Return True if the file is a Server Component (no 'use client')."""
    return not is_client_component(file_content)


def requires_client(file_content: str) -> bool:
    """
    Heuristic: return True if the file uses hooks or browser APIs
    that require 'use client'.
    """
    client_patterns = [
        "useState", "useEffect", "useRef", "useCallback", "useMemo",
        "useContext", "useReducer", "useLayoutEffect",
        "onClick", "onChange", "onSubmit", "onKeyDown", "onFocus", "onBlur",
        "addEventListener", "window.", "document.", "localStorage", "sessionStorage",
        "useRouter", "usePathname", "useSearchParams",
    ]
    return any(p in file_content for p in client_patterns)


# ---------------------------------------------------------------------------
# Documentation retrieval
# ---------------------------------------------------------------------------

def fetch_docs_page(slug: str) -> str | None:
    """
    Fetch a Next.js docs page by its slug.
    Example: fetch_docs_page("app/building-your-application/routing")
    """
    url = f"{NEXTJS_DOCS_BASE}/{slug}"
    content = fetch(url)
    if content:
        # Strip HTML tags crudely — good enough for LLM context
        import re
        text = re.sub(r"<[^>]+>", " ", content)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:8000]  # cap at 8k chars
    return None


def search_docs(topic: str) -> str:
    """Search Next.js 15 App Router documentation for a topic."""
    return search_text(
        f"Next.js 15 App Router {topic}",
        max_results=4,
    )


# ---------------------------------------------------------------------------
# Component convention checks
# ---------------------------------------------------------------------------

def check_app_router_conventions(path: str, content: str) -> list[str]:
    """
    Check a file against Next.js 15 App Router conventions.
    Returns a list of warning strings (empty if all good).
    """
    warnings = []

    is_page = path.endswith("page.tsx") or path.endswith("page.ts")
    is_layout = path.endswith("layout.tsx")
    is_component = "components/" in path

    if is_component and requires_client(content) and not is_client_component(content):
        warnings.append(f"{path}: uses hooks/events but missing 'use client' directive")

    if is_page and "export default" not in content:
        warnings.append(f"{path}: page file must have a default export")

    if is_layout and "export default" not in content:
        warnings.append(f"{path}: layout file must have a default export")

    if "import React from" in content and is_client_component(content):
        warnings.append(f"{path}: React import is not needed in Next.js 13+ — remove it")

    return warnings


def audit_files(files: dict[str, str]) -> list[str]:
    """
    Run App Router convention checks across all files.
    Returns all warnings found.
    """
    all_warnings = []
    for path, content in files.items():
        if path.endswith((".tsx", ".ts")):
            all_warnings.extend(check_app_router_conventions(path, content))
    return all_warnings
