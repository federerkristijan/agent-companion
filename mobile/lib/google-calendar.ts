const BASE = 'https://www.googleapis.com/calendar/v3'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  description?: string
  location?: string
  source: 'calendar' | 'gmail'
}

export async function getUpcomingEvents(
  accessToken: string,
  days = 14
): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + days * 86_400_000).toISOString()

  const resp = await fetch(
    `${BASE}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!resp.ok) throw new Error(`Calendar API ${resp.status}`)

  const data = await resp.json()
  return (data.items ?? []).map((item: any): CalendarEvent => ({
    id: item.id,
    title: item.summary ?? 'No title',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
    allDay: !item.start?.dateTime,
    description: item.description,
    location: item.location,
    source: 'calendar',
  }))
}
