import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  const { conversation_id } = await req.json()

  const base = supabase.from("messages").select("role, content").order("created_at", { ascending: false }).limit(10)
  const { data: history } = await (
    conversation_id != null
      ? base.eq("conversation_id", conversation_id)
      : base.is("conversation_id", null)
  )

  const messages = (history ?? []).reverse().map((m: { role: string; content: string }) => ({
    role: m.role === "agent" ? "assistant" : "user",
    content: m.content,
  }))

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Based on the conversation, suggest a single detailed visual image generation prompt. Be specific about style, subject, colors, and mood. Reply with ONLY the prompt text, nothing else.",
        },
        ...messages,
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  })

  const data = await res.json()
  const prompt: string = data.choices?.[0]?.message?.content?.trim() ?? ""

  return new Response(JSON.stringify({ prompt }), {
    headers: { "Content-Type": "application/json" },
  })
})
