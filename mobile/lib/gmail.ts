import type { CalendarEvent } from './google-calendar'

const BASE = 'https://www.googleapis.com/gmail/v1'

const EVENT_KEYWORDS =
  'subject:(invitation OR reservation OR booking OR confirmation OR flight OR hotel OR restaurant OR appointment) newer_than:7d'

async function fetchMessageSnippet(
  accessToken: string,
  messageId: string
): Promise<{ subject: string; snippet: string; date: string } | null> {
  const resp = await fetch(
    `${BASE}/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!resp.ok) return null
  const data = await resp.json()
  const headers: { name: string; value: string }[] = data.payload?.headers ?? []
  const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
  const date = headers.find(h => h.name === 'Date')?.value ?? ''
  return { subject, snippet: data.snippet ?? '', date }
}

export async function getEmailEvents(accessToken: string): Promise<CalendarEvent[]> {
  const resp = await fetch(
    `${BASE}/users/me/messages?q=${encodeURIComponent(EVENT_KEYWORDS)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!resp.ok) return []

  const data = await resp.json()
  const messages: { id: string }[] = data.messages ?? []

  const events: CalendarEvent[] = []
  for (const msg of messages) {
    const detail = await fetchMessageSnippet(accessToken, msg.id)
    if (!detail) continue
    events.push({
      id: `gmail-${msg.id}`,
      title: detail.subject,
      start: new Date(detail.date).toISOString(),
      end: new Date(detail.date).toISOString(),
      allDay: true,
      description: detail.snippet,
      source: 'gmail',
    })
  }
  return events
}
