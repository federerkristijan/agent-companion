"""Integrator Agent — cross-file consistency. Targeted corrections only."""

import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.state import AgentState
from team.skills.typescript import check_files, format_errors
from team.skills.nextjs import audit_files


def integrate(state: AgentState) -> AgentState:
    llm = ChatOpenAI(model="gpt-4o", max_tokens=8192)

    editable = {f["path"]: f["content"] for f in state["built_files"] if f["action"] != "delete"}

    # Run tsc across all changed files together
    ts_result = check_files(editable)
    ts_feedback = format_errors(ts_result)
    if ts_result["passed"] is False:
        print(f"[integrator] tsc found {len(ts_result['errors'])} cross-file error(s)")
    else:
        print(f"[integrator] tsc: {ts_feedback}")

    # Run Next.js convention audit across all changed files
    convention_warnings = audit_files(editable)
    if convention_warnings:
        print(f"[integrator] {len(convention_warnings)} Next.js convention warning(s)")
    conventions_text = "\n".join(f"- {w}" for w in convention_warnings) if convention_warnings else "None."

    built_text = "\n\n".join(
        f"=== {path} ===\n{content}"
        for path, content in editable.items()
    )

    unchanged_text = "\n\n".join(
        f"=== {path} (unchanged) ===\n{content}"
        for path, content in state["key_files"].items()
        if path not in editable
    )

    system = SystemMessage(content="""You are a TypeScript integration reviewer.
You are given compiler output and convention warnings for a set of changed files.
Fix cross-file issues only:

- A component used in a page is missing required props
- A prop type at the call site does not match the component's Props interface
- An import references a name not exported from that file
- A type is used but not exported from its source file

Return ONLY files that need fixing:
[{"path": "...", "content": "...full corrected file content..."}]

If nothing needs fixing, return: []
Output JSON only — no explanation, no markdown.""")

    human = HumanMessage(content=f"""TypeScript compiler output:
{ts_feedback}

Next.js convention warnings:
{conventions_text}

Changed files:
{built_text}

Unchanged files for reference:
{unchanged_text}""")

    response = llm.invoke([system, human])
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        corrections = {item["path"]: item["content"] for item in json.loads(raw)}
    except (json.JSONDecodeError, KeyError) as e:
        print(f"[integrator] parse error: {e} — carrying built files forward unchanged")
        return {**state, "final_files": state["built_files"]}

    final = []
    for f in state["built_files"]:
        if f["action"] != "delete" and f["path"] in corrections:
            final.append({**f, "content": corrections[f["path"]]})
            print(f"[integrator] fixed   {f['path']}")
        else:
            final.append(f)

    print(f"[integrator] done — {len(final)} file(s), {len(corrections)} corrected")
    return {**state, "final_files": final}
