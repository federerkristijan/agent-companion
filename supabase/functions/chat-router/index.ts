import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY")!
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!
const GITHUB_REPO = "federerkristijan/agent-companion"
const COMPLEX_WORKFLOW = "chat-complex.yml"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SYSTEM_PROMPT = `You are a personal AI assistant for Kristijan. You help with research, answer questions, and discuss ideas. Be concise and direct.`

const CLASSIFIER_PROMPT = `Classify the user message into one of: chat, search, or blog.

ALWAYS reply "search" when the message asks about any of these — even if the question seems simple:
- current or today's prices (crypto, stocks, forex, commodities, fuel, gold, etc.)
- weather — current conditions or forecasts
- news or recent events from the past 12 months
- sports scores, standings, or match results
- exchange rates or currency conversion
- anything where the answer could have changed since 2024

Reply "blog" when the user wants to write, create, draft, or publish a blog post or article.

Reply "chat" for everything else: opinions, explanations, coding help, brainstorming, math, general knowledge.

Reply with ONLY one word: chat, search, or blog.`

const INJECTION_RE =
  /ignore\s+(all\s+)?previous\s+instructions?|forget\s+(your|all)|you\s+are\s+now|new\s+instructions?:|system\s*prompt|disregard\s+(all|your|previous)/i

Deno.serve(async (req) => {
  const payload = await req.json()
  const record = payload.record
  console.log("[chat-router] received record:", JSON.stringify({ role: record?.role, conversation_id: record?.conversation_id }))

  if (record.role !== "user") {
    console.log("[chat-router] skipping — not a user message")
    return new Response("skip", { status: 200 })
  }

  // Determine if this is a mobile chat message
  let isMobileChat = record.conversation_id == null
  if (!isMobileChat && record.conversation_id) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", record.conversation_id)
      .maybeSingle()
    isMobileChat = conv != null
  }

  if (!isMobileChat) {
    console.log("[chat-router] skipping — agent workflow message")
    return new Response("skip", { status: 200 })
  }

  const content: string = record.content

  if (INJECTION_RE.test(content) || content.length > 4000) {
    console.log("[chat-router] rejected — injection or too long")
    return new Response("rejected", { status: 200 })
  }
  console.log("[chat-router] classifying intent...")

  // Load 20 most recent messages from this conversation, reversed to chronological order
  const base = supabase.from("messages").select("role, content").order("created_at", { ascending: false }).limit(20)
  const { data: history } = await (
    record.conversation_id != null
      ? base.eq("conversation_id", record.conversation_id)
      : base.is("conversation_id", null)
  )

  const messages = (history ?? []).reverse().map((m: { role: string; content: string }) => ({
    role: m.role === "agent" ? "assistant" : "user",
    content: m.content,
  }))

  // Classify intent
  const classifyController = new AbortController()
  const classifyTimer = setTimeout(() => classifyController.abort(), 20_000)
  let classifyRes: Response
  try {
    classifyRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: classifyController.signal,
    })
  } finally {
    clearTimeout(classifyTimer)
  }
  const classifyData = await classifyRes.json()
  console.log("[chat-router] classify raw:", JSON.stringify(classifyData).slice(0, 200))
  const intent: string = classifyData.choices[0].message.content.trim().toLowerCase()
  console.log("[chat-router] intent:", intent)

  if (intent === "chat" || intent === "search") {
    let systemPrompt = SYSTEM_PROMPT

    if (intent === "search") {
      console.log("[chat-router] fetching web results via Tavily...")
      const tavilyController = new AbortController()
      const tavilyTimer = setTimeout(() => tavilyController.abort(), 10_000)
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: content,
            search_depth: "basic",
            max_results: 5,
          }),
          signal: tavilyController.signal,
        })
        const tavilyData = await tavilyRes.json()
        const results: { title: string; url: string; content: string }[] = tavilyData.results ?? []
        console.log("[chat-router] Tavily returned", results.length, "results")
        const searchContext = results
          .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
          .join("\n\n")
        systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent web search results for the user's query:\n\n${searchContext}\n\nAnswer using these results. Cite source URLs inline where relevant.`
      } finally {
        clearTimeout(tavilyTimer)
      }
    }

    const chatController = new AbortController()
    const chatTimer = setTimeout(() => chatController.abort(), 40_000)
    let chatRes: Response
    try {
      chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 1024,
        }),
        signal: chatController.signal,
      })
    } finally {
      clearTimeout(chatTimer)
    }
    const chatData = await chatRes.json()
    console.log("[chat-router] response received, inserting reply...")
    const reply: string = chatData.choices[0].message.content

    await supabase.from("messages").insert({
      role: "agent",
      content: reply,
      ...(record.conversation_id != null && { conversation_id: record.conversation_id }),
    })
    console.log("[chat-router] reply inserted")
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
