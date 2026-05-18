"""
Team Lead — routes validated tasks to specialist agents, manages multi-turn
session state, and relays results back to the mobile chat.

Adding a new agent: implement a runner function and add it to TASK_ROUTES.
"""

import uuid

from team.skills.supabase import get_client


# ── Mobile chat relay ─────────────────────────────────────────────────────────

def post_to_mobile_chat(content: str) -> None:
    get_client().table("messages").insert({"role": "agent", "content": content}).execute()


# ── Session management (via agent_reports) ────────────────────────────────────

def get_active_session(task_type: str) -> str | None:
    """Return the conversation_id of the active session for this task type, or None."""
    resp = (
        get_client().table("agent_reports")
        .select("summary, details")
        .eq("type", f"{task_type}_session")
        .order("created_at", ascending=False)
        .limit(1)
        .execute()
    )
    for row in (resp.data or []):
        if (row.get("details") or {}).get("status") == "active":
            return row["summary"]
    return None


def open_session(task_type: str) -> str:
    conversation_id = str(uuid.uuid4())
    get_client().table("agent_reports").insert({
        "type": f"{task_type}_session",
        "summary": conversation_id,
        "details": {"status": "active"},
    }).execute()
    return conversation_id


def close_session(task_type: str, conversation_id: str) -> None:
    rows = (
        get_client().table("agent_reports")
        .select("id")
        .eq("type", f"{task_type}_session")
        .eq("summary", conversation_id)
        .execute()
    )
    for row in (rows.data or []):
        get_client().table("agent_reports").update(
            {"details": {"status": "done"}}
        ).eq("id", row["id"]).execute()


# ── Specialist runners ────────────────────────────────────────────────────────

def _run_blog(user_message: str, conversation_id: str, is_new: bool) -> str:
    from tasks.blog_agent import build_graph

    get_client().table("messages").insert({
        "role": "user",
        "content": user_message,
        "conversation_id": conversation_id,
    }).execute()

    build_graph().invoke({
        "conversation_id": conversation_id,
        "user_message": user_message,
        "messages": [],
        "phase": "new",
        "research": "",
        "title": "",
        "slug": "",
        "excerpt": "",
        "content": "",
        "tags": [],
        "reading_time_minutes": 0,
        "cover_image_url": "",
        "image_options": [],
        "meta_title": "",
        "meta_description": "",
        "verification_issues": [],
        "response": "",
    })

    resp = (
        get_client().table("messages")
        .select("content")
        .eq("conversation_id", conversation_id)
        .eq("role", "agent")
        .order("created_at", ascending=False)
        .execute()
    )
    for row in (resp.data or []):
        content = row.get("content") or ""
        if not content.startswith("__METADATA__:"):
            return content
    return ""


# ── Routing table ─────────────────────────────────────────────────────────────
# Each entry: task_type → (runner_fn, closes_session_when)
# closes_session_when: callable(response: str) -> bool

TASK_ROUTES: dict = {
    "blog": (
        _run_blog,
        lambda response: "published" in response.lower(),
    ),
    # future agents:
    # "feature": (_run_feature, lambda r: True),
    # "monitor": (_run_monitor, lambda r: True),
    # "optimize": (_run_optimize, lambda r: True),
}


# ── Entry point ───────────────────────────────────────────────────────────────

def run(task_type: str, user_message: str) -> None:
    if task_type not in TASK_ROUTES:
        post_to_mobile_chat(f"Task type '{task_type}' is not yet supported.")
        return

    runner, should_close = TASK_ROUTES[task_type]

    conversation_id = get_active_session(task_type)
    is_new = conversation_id is None
    if is_new:
        conversation_id = open_session(task_type)
        print(f"[team_lead] new {task_type} session: {conversation_id}")
    else:
        print(f"[team_lead] continuing {task_type} session: {conversation_id}")

    response = runner(user_message, conversation_id, is_new)

    if response:
        post_to_mobile_chat(response)
    else:
        post_to_mobile_chat("Something went wrong processing your request. Please try again.")

    if should_close(response):
        close_session(task_type, conversation_id)
        print(f"[team_lead] session closed: {conversation_id}")
