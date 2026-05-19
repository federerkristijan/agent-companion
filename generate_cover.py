"""One-off cover image generator. Run with: infisical run -- python generate_cover.py"""
import base64
import os
import time
import requests

PROMPT = (
    "A professional, modern blog cover image for an article about automated software security pipelines. "
    "Sleek dark background with deep blue and cyan accents. "
    "Visual elements: interconnected shield icons, code scanning nodes, pipeline flow lines, lock symbols. "
    "Clean minimal tech illustration style. No text, no letters, no words."
)

openai_key = os.environ["OPENAI_API_KEY"]
supabase_url = os.environ["SUPABASE_URL"]
supabase_key = os.environ["SUPABASE_SERVICE_KEY"]

print("Generating image with DALL-E 3...")
resp = requests.post(
    "https://api.openai.com/v1/images/generations",
    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
    json={"model": "gpt-image-1", "prompt": PROMPT, "size": "1536x1024", "n": 1},
    timeout=90,
)
resp.raise_for_status()
image_bytes = base64.b64decode(resp.json()["data"][0]["b64_json"])
print(f"Generated ({len(image_bytes) // 1024} KB)")

filename = f"cover_{int(time.time())}.png"
print(f"Uploading to Supabase Storage as {filename}...")
upload = requests.post(
    f"{supabase_url}/storage/v1/object/attachments/{filename}",
    headers={"Authorization": f"Bearer {supabase_key}", "Content-Type": "image/png"},
    data=image_bytes,
    timeout=30,
)
upload.raise_for_status()

public_url = f"{supabase_url}/storage/v1/object/public/attachments/{filename}"
print(f"\nDone. Cover image URL:\n{public_url}")
