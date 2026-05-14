import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!
const GITHUB_REPO = "federerkristijan/agent-companion"
const COMPLEX_WORKFLOW = "chat-complex.yml"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SYSTEM_PROMPT = `You are a personal AI assistant for Kristijan. You help with research, answer questions, and discuss ideas. Be concise and direct.`

const CLASSIFIER_PROMPT = `Classify the user's intent into exactly one of these categories:
- "chat" — conversation, questions, research, brainstorming, or anything that does not require creating or publishing content
- "blog" — user wants to write, create, or publish a blog post

Reply with ONLY the single word, lowercase.`

const INJECTION_RE =
  /ignore\s+(all\s+)?previous\s+instructions?|forget\s+(your|all)|you\s+are\s+now|new\s+instructions?:|system\s*prompt|disregard\s+(all|your|previous)/i

Deno.serve(async (req) => {
  const payload = await req.json()
  const record = payload.record

  // Only handle user messages in mobile chat (conversation_id IS NULL)
  if (record.role !== "user" || record.conversation_id != null) {
    return new Response("skip", { status: 200 })
  }

  const content: string = record.content

  if (INJECTION_RE.test(content) || content.length > 4000) {
    return new Response("rejected", { status: 200 })
  }

  // Load last 20 messages from mobile chat
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .is("conversation_id", null)
    .order("created_at", { ascending: true })
    .limit(20)

  const messages = (history ?? []).map((m: { role: string; content: string }) => ({
    role: m.role === "agent" ? "assistant" : "user",
    content: m.content,
  }))

  // Classify intent
  const classifyRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content },
      ],
      max_tokens: 10,
      temperature: 0,
    }),
  })
  const classifyData = await classifyRes.json()
  const intent: string = classifyData.choices[0].message.content.trim().toLowerCase()

  if (intent === "chat") {
    // Fast path — respond directly
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
      }),
    })
    const chatData = await chatRes.json()
    const reply: string = chatData.choices[0].message.content

    await supabase.from("messages").insert({ role: "agent", content: reply })
  } else {
    // Complex task — hand off to GitHub Actions
    await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${COMPLEX_WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { message_id: record.id, task_type: intent },
        }),
      }
    )
  }

  return new Response("ok", { status: 200 })
})
