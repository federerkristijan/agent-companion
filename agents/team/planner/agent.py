"""Planner Agent — decides what to change. Generates no code."""

import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.state import AgentState
from team.skills.web_search import search_nextjs

# Files that must never be modified unless the task explicitly names them
PROTECTED_PATTERNS = [
    "variables.ts", "variables.tsx",   # shared data
    "src/types/",                       # type definitions
    "src/utils/",                       # utilities
    "src/lib/",                         # libraries
    "layout.tsx",                       # layouts affect entire routes
    "tailwind.config", "next.config",  # project config
    "tsconfig.json", "package.json",   # build config
    "src/components/global/",          # global UI (navbar, footer) — never touch unless asked
    "navbar", "Navbar",                # navigation
    "footer", "Footer",                # footer
    "menuItems", "menu-items",         # menu config
]


def is_protected(path: str, task: str) -> bool:
    """Return True if path is a protected file and the task doesn't explicitly name it."""
    for pattern in PROTECTED_PATTERNS:
        if pattern in path:
            filename = path.split("/")[-1]
            if filename not in task and pattern.rstrip("/") not in task:
                return True
    return False


def is_relevant_to_task(path: str, content: str, task: str) -> bool:
    """Return True if this file's content actually relates to the task subject.

    Extracts meaningful keywords from the task and checks whether the file
    content mentions at least one of them. This prevents the planner from
    including unrelated pages/components it saw in the project tree.
    """
    STOP_WORDS = {
        "the", "from", "that", "this", "with", "only", "file", "into", "and",
        "for", "remove", "delete", "add", "update", "change", "section", "page",
        "component", "website", "site",
    }
    keywords = [
        w.strip(".,;:\"'").lower()
        for w in task.split()
        if len(w) > 3 and w.lower() not in STOP_WORDS
    ]
    if not keywords:
        return True  # can't judge — allow

    content_lower = content.lower()
    path_lower = path.lower()
    return any(kw in content_lower or kw in path_lower for kw in keywords)


def planner(state: AgentState) -> AgentState:
    llm = ChatOpenAI(model="gpt-4o", max_tokens=4096)

    search_results = search_nextjs(state["task_description"])
    print(f"[planner] web search complete")

    key_files_text = "\n\n".join(
        f"=== {path} ===\n{content}"
        for path, content in state["key_files"].items()
    )

    # Build protected files list to include in prompt
    all_paths = state["project_tree"].splitlines()
    protected = [p for p in all_paths if is_protected(p, state["task_description"])]
    protected_text = "\n".join(f"  - {p}" for p in protected[:20])

    system = SystemMessage(content=f"""You are a Next.js change-scope analyst. Your only job is to identify the MINIMUM set of files that must be touched to complete the task. You produce a plan. You write no code.

ROLE BOUNDARIES — you must never cross these:
- You identify files to change. You do not decide how to change them.
- You do not suggest improvements, refactors, or cleanups beyond the task.
- You do not create new components to replace removed ones.
- You do not touch shared infrastructure unless the task explicitly names it.

PROTECTED — never include these files unless the task explicitly names the exact file:
{protected_text}

DECISION RULES by task type:
- "Remove X" → update the ONE file that renders X (delete the JSX element + its import). Almost never more than 1 file.
- "Add X" → create the component file + update the page that should render it. 2 files max unless X is complex.
- "Update X" → update the ONE file where X is defined. Do not touch files that use X unless their interface must change.
- "Delete X" → action: "delete" on that file + action: "update" on any file that imports it. Never replace a deleted file with a new one.

For each planned file, set action to:
- "update" — file exists and needs a targeted change
- "create" — file does not yet exist
- "delete" — file must be removed entirely

Output a JSON array only. Each item:
{{
  "path": "src/app/page.tsx",
  "action": "create" | "update" | "delete",
  "description": "One sentence: exactly what line/block/import changes and how",
  "needs_context": ["src/components/pages/ProjectsSection.tsx"]
}}

Output JSON only — no explanation, no markdown.""")

    human = HumanMessage(content=f"""Task: {state['task_description']}

Relevant Next.js patterns:
{search_results}

Project tree:
{state['project_tree']}

Key files:
{key_files_text}""")

    response = llm.invoke([system, human])
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    plan = json.loads(raw)

    # Enforce protected files — strip any protected file the LLM added anyway
    # Also strip files whose content doesn't mention the task subject at all
    safe_plan = []
    for item in plan:
        path = item["path"]
        if is_protected(path, state["task_description"]):
            print(f"[planner] BLOCKED protected file: {path}")
            continue
        content = state["key_files"].get(path, "")
        if content and not is_relevant_to_task(path, content, state["task_description"]):
            print(f"[planner] BLOCKED unrelated file: {path}")
            continue
        safe_plan.append(item)

    print(f"[planner] {len(safe_plan)} file(s) planned:")
    for item in safe_plan:
        print(f"  {item['action']:6}  {item['path']}")

    return {**state, "plan": safe_plan, "pending_files": list(safe_plan), "built_files": []}
