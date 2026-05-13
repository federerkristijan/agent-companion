"""Builder Agent — generates one file at a time with focused context."""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.state import AgentState
from team.skills.npm import missing_packages
from team.skills.nextjs import search_docs, parse_app_router_structure


def build_file(state: AgentState) -> AgentState:
    pending = list(state["pending_files"])
    current = pending.pop(0)

    if current["action"] == "delete":
        built = list(state["built_files"])
        built.append({"path": current["path"], "action": "delete", "content": ""})
        print(f"[builder] delete  {current['path']}")
        return {**state, "pending_files": pending, "current_file": {}, "built_files": built}

    llm = ChatOpenAI(model="gpt-4o", max_tokens=8192)

    context_text = "\n\n".join(
        f"=== {path} ===\n{state['key_files'][path]}"
        for path in current.get("needs_context", [])
        if path in state["key_files"]
    )

    built_deps = "\n\n".join(
        f"=== {f['path']} (just built) ===\n{f['content']}"
        for f in state["built_files"]
        if f["path"] in current.get("needs_context", [])
    )

    # Check which packages are installed so builder knows what it can import
    pkg_json = state["key_files"].get("package.json", "")
    common_packages = ["framer-motion", "react-icons", "clsx", "tailwind-merge"]
    missing = missing_packages(pkg_json, common_packages)
    if missing:
        print(f"[builder] missing packages (will avoid): {missing}")

    # Fetch relevant Next.js docs for this file type
    is_component = "components/" in current["path"]
    docs_hint = ""
    if is_component:
        docs_hint = search_docs("component patterns server client")

    # Parse route structure for page-level context
    route_info = parse_app_router_structure(state["project_tree"])

    # File-type enforcement hint
    is_ts_only = current["path"].endswith(".ts") and not current["path"].endswith(".tsx")
    ts_jsx_rule = (
        "\n- CRITICAL: This file has a .ts extension — it is NOT a React component. "
        "Do NOT write any JSX. Do NOT import React. Export only plain TypeScript "
        "values (arrays, objects, constants, types, functions that return plain values)."
        if is_ts_only else ""
    )

    system = SystemMessage(content=f"""You are a Next.js file writer. Your only job is to produce the exact content of one file, applying precisely the change described. You do not make decisions about other files.

ROLE BOUNDARIES:
- action "create" → write the full new file from scratch
- action "update" → take the existing file content (provided in context) and apply ONLY the described change. Do not reformat, refactor, or improve anything else. The rest of the file stays byte-for-byte the same.
- action "delete" → handled upstream, you will never receive this action

CODE RULES:
- TypeScript only — every prop, variable, and function must be typed
- Add 'use client' at the top if the file uses hooks or event handlers
- Tailwind CSS only — no styled-components, no inline styles
- Framer Motion for animations, react-icons for icons
- Default export for every component file (.tsx)
- Use the exact exported names from context files — do not guess or rename
- Define a Props interface whose types exactly match the data you will receive{ts_jsx_rule}

Output raw file content only — no explanation, no markdown fences.""")

    human = HumanMessage(content=f"""File: {current['path']}
Action: {current['action']}
What it must do: {current['description']}

Installed packages (only import from these — do not use missing ones):
Available: {", ".join(p for p in common_packages if p not in missing)}
Missing (do not import): {", ".join(missing) if missing else "none"}

App Router routes in this project: {", ".join(route_info["routes"])}

{f"Next.js docs reference:{chr(10)}{docs_hint}" if docs_hint else ""}

Context files (read carefully before writing):
{context_text}

{f"Already built dependencies:{chr(10)}{built_deps}" if built_deps else ""}""")

    response = llm.invoke([system, human])
    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith(("tsx", "ts", "typescript")):
            content = content.split("\n", 1)[1]
        content = content.strip()

    print(f"[builder] {current['action']:6}  {current['path']}  ({len(content)} chars)")
    return {
        **state,
        "pending_files": pending,
        "current_file": {**current, "content": content},
    }
