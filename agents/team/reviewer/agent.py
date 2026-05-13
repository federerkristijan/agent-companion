"""Reviewer Agent — checks and fixes one file. Single-file errors only."""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.state import AgentState
from team.skills.nextjs import check_app_router_conventions
from team.skills.typescript import check_files, format_errors


def review_file(state: AgentState) -> AgentState:
    current = state["current_file"]
    if not current:
        return state

    llm = ChatOpenAI(model="gpt-4o", max_tokens=8192)

    # Run Next.js convention checks before LLM review
    convention_warnings = check_app_router_conventions(current["path"], current["content"])

    # Hard check: .ts files must never contain JSX
    is_ts_not_tsx = current["path"].endswith(".ts") and not current["path"].endswith(".tsx")
    content_has_jsx = any(
        marker in current["content"]
        for marker in ["</", "/>", "React.createElement", "<>", "</>"]
    )
    if is_ts_not_tsx and content_has_jsx:
        convention_warnings = list(convention_warnings)
        convention_warnings.insert(0, (
            f"CRITICAL: '{current['path']}' has a .ts extension but contains JSX syntax. "
            "JSX is only allowed in .tsx files. Remove ALL JSX from this file. "
            "This file must export only plain TypeScript values (arrays, objects, constants, types)."
        ))
        print(f"[reviewer] CRITICAL: JSX detected in .ts file {current['path']}")

    warnings_text = ""
    if convention_warnings:
        warnings_text = "Next.js convention violations detected:\n" + "\n".join(
            f"- {w}" for w in convention_warnings
        )
        print(f"[reviewer] {len(convention_warnings)} convention warning(s) for {current['path']}")

    # Run real tsc check on this single file
    ts_result = check_files({current["path"]: current["content"]})
    ts_feedback = format_errors(ts_result)
    if ts_result["passed"] is False:
        print(f"[reviewer] tsc found {len(ts_result['errors'])} error(s) in {current['path']}")

    context_text = "\n\n".join(
        f"=== {path} ===\n{state['key_files'][path]}"
        for path in current.get("needs_context", [])
        if path in state["key_files"]
    )

    built_deps = "\n\n".join(
        f"=== {f['path']} ===\n{f['content']}"
        for f in state["built_files"]
        if f["path"] in current.get("needs_context", [])
    )

    system = SystemMessage(content="""You are a Next.js single-file validator. Your only job is to fix code errors in this one file. You must not change its purpose, scope, or feature set.

ROLE BOUNDARIES:
- Fix syntax and TypeScript errors reported by the compiler
- Fix missing or wrong default export
- Fix missing 'use client' when hooks or event handlers are present
- Fix imports that reference names not exported from that source file
- Fix JSX in .ts files (JSX is only allowed in .tsx files)
- Strip markdown fences or non-code content from the output

DO NOT:
- Add features, components, or sections that the builder did not include
- Remove features or sections the builder intentionally included
- Reformat or restructure code beyond what is needed to fix the error
- Invent or "improve" prop types beyond what is required

If the file is correct, return it exactly unchanged.
Output corrected file content only — no explanation, no markdown fences.""")

    human = HumanMessage(content=f"""File: {current['path']}
Purpose: {current['description']}

{warnings_text}

TypeScript compiler result:
{ts_feedback}

Content:
{current['content']}

Reference files:
{context_text}
{built_deps}""")

    response = llm.invoke([system, human])
    reviewed = response.content.strip()
    if reviewed.startswith("```"):
        reviewed = reviewed.split("```")[1]
        if reviewed.startswith(("tsx", "ts", "typescript")):
            reviewed = reviewed.split("\n", 1)[1]
        reviewed = reviewed.strip()

    built = list(state["built_files"])
    built.append({"path": current["path"], "action": current["action"], "content": reviewed})
    print(f"[reviewer] checked  {current['path']}")
    return {**state, "built_files": built, "current_file": {}}
