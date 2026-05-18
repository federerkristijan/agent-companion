"""
Blog Agent — orchestrator.
Stateless per-turn: reads conversation history from Supabase, routes to the correct agent, saves the response.
See team/blog/AGENTS.md for the full team description.
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_INJECTION_PATTERNS = re.compile(
    r"ignore\s+(all\s+)?previous\s+instructions?|"
    r"forget\s+(your|all)|"
    r"you\s+are\s+now|"
    r"new\s+instructions?:|"
    r"system\s*prompt|"
    r"disregard\s+(all|your|previous)|"
    r"\x00|"          # null bytes
    r"\x1b\[",        # ANSI escape sequences
    re.IGNORECASE,
)

def _validate_user_message(message: str) -> None:
    if len(message) > 4000:
        raise ValueError(f"user_message exceeds 4000 character limit ({len(message)} chars)")
    if _INJECTION_PATTERNS.search(message):
        raise ValueError("user_message contains a disallowed pattern")

from langgraph.graph import StateGraph, END

from team.blog.state import BlogState
from team.blog.researcher.agent import research
from team.blog.writer.agent import write
from team.blog.verifier.agent import verify
from team.blog.image_picker.agent import pick_image, select_image
from team.blog.publisher.agent import publish
from team.skills.supabase import get_client

METADATA_PREFIX = "__METADATA__:"
METADATA_FIELDS = ("title", "slug", "excerpt", "tags", "reading_time_minutes",
                   "meta_title", "meta_description", "content", "cover_image_url", "image_options")


# ── Supabase helpers ──────────────────────────────────────────────────────────

def load_history(conversation_id: str) -> list[dict]:
    """Load all messages for this conversation from Supabase, oldest first."""
    resp = (
        get_client()
        .table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return resp.data or []


def save_response(conversation_id: str, content: str) -> None:
    get_client().table("messages").insert({
        "role": "agent",
        "content": content,
        "conversation_id": conversation_id,
    }).execute()


def save_metadata(conversation_id: str, state: BlogState) -> None:
    """Persist post metadata between turns so title/slug/etc survive a fresh run.
    Stored as an agent message with a __METADATA__: prefix to avoid enum constraints.
    """
    payload = {k: state.get(k) for k in METADATA_FIELDS}
    get_client().table("messages").insert({
        "role": "agent",
        "content": METADATA_PREFIX + json.dumps(payload),
        "conversation_id": conversation_id,
    }).execute()


def extract_metadata(messages: list[dict]) -> dict:
    """Load the latest metadata snapshot from conversation history."""
    for m in reversed(messages):
        if m.get("content", "").startswith(METADATA_PREFIX):
            try:
                return json.loads(m["content"][len(METADATA_PREFIX):])
            except (json.JSONDecodeError, KeyError):
                pass
    return {}


# ── Phase detection ───────────────────────────────────────────────────────────

def detect_phase(messages: list[dict]) -> str:
    """Infer the current phase by scanning agent messages newest-first.
    Scanning all history (not just the last message) recovers conversations
    where a later writer response overwrote the phase signal."""
    agent_messages = [m for m in messages if m["role"] == "agent"]
    if not agent_messages:
        return "new"
    for m in reversed(agent_messages):
        c = m["content"].lower()
        if "published" in c and ("slug" in c or "reading time" in c):
            return "done"
        if "cover image options" in c or "dall-e" in c:
            return "awaiting_image"
        if "image generation failed" in c or "all facts verified" in c:
            return "image_picking"
        if "verifying facts" in c or "draft approved" in c:
            return "verifying"
    return "awaiting_review"


# ── Graph nodes ───────────────────────────────────────────────────────────────

def load_node(state: BlogState) -> BlogState:
    """Load conversation history, restore metadata, and detect current phase."""
    all_messages = load_history(state["conversation_id"])
    metadata = extract_metadata(all_messages)
    visible = [m for m in all_messages if not m.get("content", "").startswith(METADATA_PREFIX)]
    phase = detect_phase(visible)
    print(f"[orchestrator] phase={phase}, history={len(visible)} messages")
    return {**state, **metadata, "messages": visible, "phase": phase}


def save_node(state: BlogState) -> BlogState:
    """Save the agent's response and, for post-approval phases, persist metadata."""
    save_response(state["conversation_id"], state["response"])
    if state["phase"] in ("image_picking", "awaiting_image", "publishing", "done"):
        save_metadata(state["conversation_id"], state)
    print(f"[orchestrator] response saved ({len(state['response'])} chars)")
    return state


# ── Routing ───────────────────────────────────────────────────────────────────

def route(state: BlogState) -> str:
    phase = state["phase"]
    if phase == "new":
        return "research"
    if phase in ("drafting", "awaiting_review"):
        return "write"
    if phase == "verifying":
        return "verify"
    if phase == "image_picking":
        return "pick_image"
    if phase == "awaiting_image":
        return "select_image"
    if phase == "publishing":
        return "publish"
    return END


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_graph():
    graph = StateGraph(BlogState)

    graph.add_node("load", load_node)
    graph.add_node("research", research)
    graph.add_node("write", write)
    graph.add_node("verify", verify)
    graph.add_node("pick_image", pick_image)
    graph.add_node("select_image", select_image)
    graph.add_node("publish", publish)
    graph.add_node("save", save_node)

    graph.set_entry_point("load")
    graph.add_conditional_edges("load", route, {
        "research": "research",
        "write": "write",
        "verify": "verify",
        "pick_image": "pick_image",
        "select_image": "select_image",
        "publish": "publish",
        END: END,
    })

    # researcher chains into writer on the same turn — user gets a draft, not silence
    graph.add_edge("research", "write")
    # image selection chains into publish on the same turn — no extra user turn needed
    graph.add_edge("select_image", "publish")
    for node in ("write", "verify", "pick_image", "publish"):
        graph.add_edge(node, "save")
    graph.add_edge("save", END)

    return graph.compile()


if __name__ == "__main__":
    _validate_user_message(os.environ["USER_MESSAGE"])
    build_graph().invoke({
        "conversation_id": os.environ["CONVERSATION_ID"],
        "user_message": os.environ["USER_MESSAGE"],
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
