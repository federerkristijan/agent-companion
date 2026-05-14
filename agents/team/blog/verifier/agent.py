"""Verifier — fact-checks the final article and checks slug uniqueness before publish."""

import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.blog.state import BlogState
from team.skills.supabase import get_client
from team.skills.web_search import search_text


def _extract_claims(llm: ChatOpenAI, content: str) -> list[str]:
    response = llm.invoke([
        SystemMessage(content="""Extract 3 to 5 specific, verifiable factual claims from this article.
Only include claims that can be checked against a web search (dates, statistics, names, technical facts).
Output one claim per line, nothing else."""),
        HumanMessage(content=content),
    ])
    return [line.strip() for line in response.content.strip().splitlines() if line.strip()]


def _check_claim(llm: ChatOpenAI, claim: str) -> bool:
    results = search_text(claim, max_results=3)
    response = llm.invoke([
        SystemMessage(content="""You are a fact-checker. Given a claim and web search results,
determine if the claim is supported by the evidence.
Reply with exactly SUPPORTED or UNSUPPORTED. Nothing else."""),
        HumanMessage(content=f"Claim: {claim}\n\nSearch results:\n{results}"),
    ])
    return response.content.strip().upper() == "SUPPORTED"


def verify(state: BlogState) -> BlogState:
    llm = ChatOpenAI(model="gpt-4o", max_tokens=1024)
    issues: list[str] = []

    # Check slug uniqueness
    existing = get_client().table("blog").select("slug").eq("slug", state["slug"]).execute()
    if existing.data:
        issues.append(f"Slug `{state['slug']}` already exists — needs a unique slug.")
        print(f"[verifier] slug conflict: {state['slug']}")

    # Fact-check key claims in the article
    claims = _extract_claims(llm, state["content"])
    print(f"[verifier] checking {len(claims)} claims")
    for claim in claims:
        if not _check_claim(llm, claim):
            issues.append(f"Could not verify: {claim}")
            print(f"[verifier] unverified: {claim}")

    if issues:
        issue_list = "\n".join(f"- {i}" for i in issues)
        return {
            **state,
            "phase": "awaiting_review",
            "verification_issues": issues,
            "response": (
                f"Found {len(issues)} issue(s) before publishing:\n{issue_list}\n\n"
                "Please review and let me know how to proceed."
            ),
        }

    print(f"[verifier] all checks passed")
    return {
        **state,
        "phase": "image_picking",
        "verification_issues": [],
        "response": "All facts verified! Finding a cover image for you now...",
    }
