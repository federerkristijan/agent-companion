"""Deployment Agent — monitors Vercel build result via GitHub checks API."""

from team.state import AgentState
from team.skills.github import get_repo
from team.skills.vercel import check_deployment as vercel_check


def check_deployment(state: AgentState) -> AgentState:
    repo = get_repo()
    status = vercel_check(repo, state["pr_url"])
    print(f"[deployment] Vercel: {status}")
    return {**state, "deploy_status": status}
