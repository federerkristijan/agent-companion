"""Image Picker — generates DALL-E image + Unsplash options, then handles user selection."""

import json as _json

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from team.blog.state import BlogState
from team.skills.image_gen import generate_blog_cover_bytes
from team.skills.unsplash import search_photos
from team.skills.supabase import get_client, upload_blog_image


def _post_image_to_main_chat(url: str, label: str) -> None:
    """Post a single image to the main mobile chat (no conversation_id = appears in ChatScreen)."""
    content = _json.dumps({"text": label, "fileUrl": url, "mimeType": "image/png"})
    get_client().table("messages").insert({"role": "agent", "content": content}).execute()

STOP_WORDS = {
    "a", "an", "the", "and", "or", "for", "of", "in", "to", "with",
    "how", "why", "what", "when", "guide", "tutorial", "introduction",
    "comprehensive", "complete", "ultimate", "beginners", "advanced",
}


def _unsplash_query(title: str, tags: list) -> str:
    """Extract simple visual keywords Unsplash can match against photos."""
    words = [
        w.strip(":.,-–—\"'").lower()
        for w in title.split()
        if len(w) > 3 and w.lower() not in STOP_WORDS
    ]
    keywords = (words[:3] if words else []) + (tags[:2] if tags else [])
    return " ".join(dict.fromkeys(keywords)) or title


def pick_image(state: BlogState) -> BlogState:
    """Generate options, upload them to Supabase Storage, present permanent URLs to user."""
    dalle_stored = None
    try:
        image_bytes = generate_blog_cover_bytes(state["title"], state.get("excerpt", state["title"]))
        print(f"[image_picker] AI image generated — uploading to storage")
        dalle_stored = upload_blog_image(image_bytes, content_type="image/png")
        print(f"[image_picker] AI image stored")
    except Exception as e:
        print(f"[image_picker] AI image generation failed: {e} — Unsplash only")

    try:
        unsplash_query = _unsplash_query(state["title"], state.get("tags", []))
        unsplash_results = search_photos(unsplash_query, count=2)
        print(f"[image_picker] {len(unsplash_results)} Unsplash photos found (query: '{unsplash_query}') — uploading to storage")
        stored_unsplash = []
        for photo in unsplash_results:
            stored_url = upload_blog_image(photo["url"])
            stored_unsplash.append({**photo, "stored_url": stored_url})
        print(f"[image_picker] Unsplash images stored")
    except Exception as e:
        print(f"[image_picker] Unsplash error: {e} — DALL-E only")
        stored_unsplash = []

    image_options = []
    lines = [f"Here are cover image options for **{state['title']}**:\n"]
    counter = 1

    if dalle_stored:
        image_options.append(dalle_stored)
        lines.append(f"{counter}. AI-Generated image")
        _post_image_to_main_chat(dalle_stored, f"Option {counter}: AI-Generated")
        counter += 1

    for photo in stored_unsplash:
        image_options.append(photo["stored_url"])
        lines.append(f"{counter}. {photo['description']} — {photo['credit']}")
        _post_image_to_main_chat(photo["stored_url"], f"Option {counter}: {photo['credit']}")
        counter += 1

    if not image_options:
        return {
            **state,
            "phase": "image_picking",
            "image_options": [],
            "response": "Image generation failed (both AI and Unsplash unavailable). Reply 'try again' to retry.",
        }

    lines.append("\nReply with the number you'd like to use, or 'generate another' for a new AI image.")

    return {
        **state,
        "phase": "awaiting_image",
        "image_options": image_options,
        "response": "\n".join(lines),
    }


def select_image(state: BlogState) -> BlogState:
    """Parse the user's image selection and route to publisher."""
    llm = ChatOpenAI(model="gpt-4o", max_tokens=256)

    options_text = "\n".join(
        f"{i + 1}. option {i + 1}" for i in range(len(state.get("image_options", [])))
    )

    system = SystemMessage(content="""The user is selecting a cover image by number.
If they say 'generate another' or similar, respond with exactly: REGENERATE
Otherwise respond with exactly the number they chose (just the digit). Nothing else.""")

    human = HumanMessage(content=f"""Options available: {len(state.get('image_options', []))}

User said: {state['user_message']}""")

    response = llm.invoke([system, human]).content.strip()

    if response == "REGENERATE":
        print(f"[image_picker] user requested regeneration")
        return pick_image(state)

    if not state.get("image_options"):
        return pick_image(state)

    try:
        index = int(response) - 1
        chosen_url = state["image_options"][index]
    except (ValueError, IndexError):
        chosen_url = state["image_options"][0]

    print(f"[image_picker] image selected (option {response}): {chosen_url}")
    return {
        **state,
        "cover_image_url": chosen_url,
        "phase": "publishing",
        "response": "Perfect! Publishing your post now...",
    }
