"""
Input Agent — entry point for complex mobile chat tasks.
Validates the triggering message and delegates to the Team Lead.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from team.skills.supabase import get_client
from team import team_lead

_INJECTION_PATTERNS = re.compile(
    r"ignore\s+(all\s+)?previous\s+instructions?|"
    r"forget\s+(your|all)|"
    r"you\s+are\s+now|"
    r"new\s+instructions?:|"
    r"system\s*prompt|"
    r"disregard\s+(all|your|previous)|"
    r"\x00|"
    r"\x1b\[",
    re.IGNORECASE,
)


def get_message(message_id: str) -> dict:
    resp = get_client().table("messages").select("*").eq("id", message_id).single().execute()
    return resp.data


if __name__ == "__main__":
    message_id = os.environ["MESSAGE_ID"]
    task_type = os.environ["TASK_TYPE"]

    message = get_message(message_id)
    user_message = message["content"]

    if len(user_message) > 4000 or _INJECTION_PATTERNS.search(user_message):
        print(f"[input_agent] rejected message {message_id} — injection or length")
        sys.exit(0)

    print(f"[input_agent] task_type={task_type} message_id={message_id}")
    team_lead.run(task_type, user_message)
    print(f"[input_agent] done")
