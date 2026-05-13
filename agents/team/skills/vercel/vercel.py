"""
Vercel skill — monitors the deployment triggered by a PR.
Uses GitHub checks API (Vercel registers checks on the head commit).
No LLM calls. No business logic.
"""

import time
from github import Repository as Repo

POLL_INTERVAL = 20
DEFAULT_TIMEOUT = 300  # 5 minutes


def check_deployment(
    repo: Repo.Repository,
    pr_url: str,
    timeout_seconds: int = DEFAULT_TIMEOUT,
) -> str:
    """
    Poll until the Vercel check run on the PR head commit completes.
    Returns: "success" | "failure" | "timeout"
    """
    try:
        pr_number = int(pr_url.rstrip("/").split("/")[-1])
        pr = repo.get_pull(pr_number)
        head_sha = pr.head.sha
    except Exception as e:
        print(f"[vercel] could not resolve PR head SHA: {e}")
        return "timeout"

    print(f"[vercel] watching commit {head_sha[:7]}...")
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        try:
            for run in repo.get_commit(head_sha).get_check_runs():
                if "vercel" in run.name.lower():
                    print(f"[vercel] status={run.status}  conclusion={run.conclusion}")
                    if run.status == "completed":
                        return run.conclusion or "failure"
        except Exception as e:
            print(f"[vercel] poll error: {e}")

        time.sleep(POLL_INTERVAL)

    print("[vercel] timed out")
    return "timeout"
