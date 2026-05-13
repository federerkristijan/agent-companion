"""Researcher — gathers structured research on the blog topic. Runs once."""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.blog.state import BlogState
from team.skills.web_search import search_text


def research(state: BlogState) -> BlogState:
    llm = ChatOpenAI(model="gpt-4o", max_tokens=4096)

    topic = state["user_message"]
    search_results = search_text(topic, max_results=8)
    print(f"[researcher] web search complete for: {topic}")

    system = SystemMessage(content="""You are a research assistant for a blog writer.
Given a topic and web search results, produce structured research notes the writer will use to draft a post.

Include:
- Core concepts and definitions
- Key points, patterns, and best practices
- Interesting angles or perspectives worth exploring
- Concrete examples or real-world use cases
- Suggested post structure (sections)

Be factual and concise. Output plain text only.""")

    human = HumanMessage(content=f"""Topic: {topic}

Web search results:
{search_results}""")

    response = llm.invoke([system, human])
    print(f"[researcher] research notes ready")
    return {**state, "research": response.content.strip(), "phase": "drafting"}
