"""DALL-E skill — generate images via OpenAI gpt-image-1."""

import base64
import os
from openai import OpenAI


def generate_image_bytes(prompt: str, size: str = "1536x1024") -> bytes:
    """Generate an image with gpt-image-1. Returns raw image bytes."""
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        n=1,
    )
    data = response.data[0]
    if getattr(data, "b64_json", None):
        return base64.b64decode(data.b64_json)
    if getattr(data, "url", None):
        import requests
        return requests.get(data.url, timeout=30).content
    raise ValueError("gpt-image-1 returned no image data")


def generate_blog_cover_bytes(title: str, topic: str) -> bytes:
    """Generate a professional blog cover image. Returns raw bytes."""
    prompt = (
        f"A professional, modern blog cover image for an article titled '{title}' "
        f"about {topic}. Clean, minimal design, high quality photography or illustration style. "
        "No text, no words, no letters in the image."
    )
    return generate_image_bytes(prompt)
