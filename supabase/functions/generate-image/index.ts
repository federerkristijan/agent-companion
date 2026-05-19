import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  const { prompt, conversation_id } = await req.json()

  if (!prompt || typeof prompt !== "string" || prompt.length > 4000) {
    return new Response(JSON.stringify({ error: "Invalid prompt" }), { status: 400, headers: { "Content-Type": "application/json" } })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55_000)

  try {
    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1536x1024",
        n: 1,
      }),
      signal: controller.signal,
    })
    if (!imgRes.ok) {
      const err = await imgRes.json()
      throw new Error(`image-gen ${imgRes.status}: ${JSON.stringify(err.error ?? err)}`)
    }
    const imgData = await imgRes.json()
    const b64: string = imgData.data[0].b64_json
    const imageBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

    const fileName = `${Date.now()}.png`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(fileName, imageBytes, { contentType: "image/png" })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(uploadData.path)

    await supabase.from("messages").insert({
      role: "agent",
      content: JSON.stringify({ text: "", fileUrl: publicUrl, mimeType: "image/png" }),
      ...(conversation_id != null && { conversation_id }),
    })

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("[generate-image] error:", e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  } finally {
    clearTimeout(timer)
  }
})
