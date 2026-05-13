"""
Supabase skill — read and write to the shared Supabase database.
Used by the orchestrator to report results and by future agents to read tasks.
"""

import os
import uuid
import requests
from supabase import create_client, Client


def get_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def insert_message(role: str, content: str) -> None:
    """Write a message to the messages table."""
    get_client().table("messages").insert({
        "role": role,
        "content": content,
    }).execute()


def get_pending_tasks(limit: int = 10) -> list[dict]:
    """Fetch pending tasks from the tasks table."""
    resp = (
        get_client()
        .table("tasks")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return resp.data or []


def update_task_status(task_id: str, status: str, result: str = "") -> None:
    """Update a task's status and optional result."""
    get_client().table("tasks").update({
        "status": status,
        "result": result,
    }).eq("id", task_id).execute()


def insert_agent_report(agent: str, status: str, detail: str) -> None:
    """Write a structured report to the agent_reports table."""
    get_client().table("agent_reports").insert({
        "agent": agent,
        "status": status,
        "detail": detail,
    }).execute()


def upload_blog_image(image_source: str | bytes, content_type: str = "image/png") -> str:
    """Upload an image to the blog-images Supabase Storage bucket.

    Accepts either a URL (str) to download from, or raw image bytes.
    Returns the permanent public URL.
    """
    if isinstance(image_source, str):
        resp = requests.get(image_source, timeout=30)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "image/jpeg")
        data = resp.content
    else:
        data = image_source

    ext = content_type.split("/")[-1].split(";")[0] or "png"
    filename = f"{uuid.uuid4()}.{ext}"

    client = get_client()
    client.storage.from_("blog-images").upload(
        filename,
        data,
        {"content-type": content_type},
    )

    return client.storage.from_("blog-images").get_public_url(filename)
