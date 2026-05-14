"""Writer — drafts and revises the blog post with the user."""

import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.blog.state import BlogState


def write(state: BlogState) -> BlogState:
    llm = ChatOpenAI(model="gpt-4o", max_tokens=8192)

    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in state["messages"]
    )

    system = SystemMessage(content=f"""You are a professional blog writer working with the user to create a blog post.

YOUR ROLE THIS TURN:
- If no draft exists yet: write a full, high-quality Markdown blog post based on the research, then ask the user for feedback.
- If a draft exists and the user gave feedback: apply every piece of feedback precisely, show the revised post, ask if anything else needs changing.
- If the user signals approval (says something like "looks good", "publish it", "approved", "go ahead"): output APPROVED followed by metadata as JSON.

APPROVAL FORMAT — metadata only, no content field (content is taken from conversation history):
APPROVED
```json
{{
  "title": "Post title",
  "slug": "post-title-lowercase-hyphens",
  "excerpt": "1-2 sentence summary shown in listings.",
  "tags": ["tag1", "tag2"],
  "reading_time_minutes": 6,
  "meta_title": "Post title | Blog",
  "meta_description": "SEO description under 160 characters."
}}
```

WRITING STANDARDS:
- Markdown with clear headings (##, ###)
- Practical examples and code snippets where relevant
- Conversational but professional tone
- No filler phrases like "In this article we will explore..."
- Slug: lowercase, hyphens only, no special characters

Research notes:
{state.get('research', '')}""")

    human = HumanMessage(content=f"""Conversation so far:
{history_text}

User's latest message: {state['user_message']}""")

    response = llm.invoke([system, human])
    content = response.content.strip()

    new_state = dict(state)

    if content.upper().startswith("APPROVED"):
        try:
            json_start = content.index("```json") + 7
            json_end = content.index("```", json_start)
            post_data = json.loads(content[json_start:json_end].strip())

            # Take the content from the last agent message in history (the final draft)
            agent_messages = [m for m in state["messages"] if m["role"] == "agent"]
            post_data["content"] = agent_messages[-1]["content"] if agent_messages else ""

            new_state.update(post_data)
            new_state["phase"] = "verifying"
            new_state["response"] = "Draft approved! Verifying facts before publishing..."
            print(f"[writer] draft approved — title: {post_data.get('title')}")
        except (ValueError, json.JSONDecodeError) as e:
            print(f"[writer] approval parse failed: {e} — treating as revision")
            new_state["phase"] = "awaiting_review"
            new_state["response"] = content
    else:
        new_state["phase"] = "awaiting_review"
        new_state["response"] = content
        print(f"[writer] draft sent, awaiting user review")

    return new_state
