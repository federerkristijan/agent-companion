import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as AuthSession from 'expo-auth-session'
import {
  clearGoogleSession,
  getStoredEmail,
  getValidAccessToken,
  storeGoogleToken,
} from '../lib/google-auth'
import { CalendarEvent, getUpcomingEvents } from '../lib/google-calendar'
import { getEmailEvents } from '../lib/gmail'
import { scheduleEventReminder } from '../lib/notifications'

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!

export default function CalendarScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [reminderSet, setReminderSet] = useState<Set<string>>(new Set())

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true })

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: CLIENT_ID,
    redirectUri,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'email',
    ],
  })

  useEffect(() => {
    checkExistingSession()
  }, [])

  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token, expires_in } = response.authentication!
      handleSignIn(access_token, expires_in ?? 3600)
    }
  }, [response])

  async function checkExistingSession() {
    const token = await getValidAccessToken()
    if (token) {
      setAccessToken(token)
      const storedEmail = await getStoredEmail()
      setEmail(storedEmail)
      fetchEvents(token)
    } else {
      setLoading(false)
    }
  }

  async function handleSignIn(token: string, expiresIn: number) {
    try {
      const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const profile = await profileResp.json()
      await storeGoogleToken(token, expiresIn, profile.email)
      setAccessToken(token)
      setEmail(profile.email)
      fetchEvents(token)
    } catch {
      setLoading(false)
    }
  }

  async function fetchEvents(token: string) {
    setSyncing(true)
    try {
      const [calEvents, gmailEvents] = await Promise.all([
        getUpcomingEvents(token),
        getEmailEvents(token),
      ])
      const all = [...calEvents, ...gmailEvents].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      )
      setEvents(all)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await clearGoogleSession()
    setAccessToken(null)
    setEmail(null)
    setEvents([])
  }

  async function handleSetReminder(event: CalendarEvent) {
    if (event.allDay) return
    const id = await scheduleEventReminder(event.title, event.start)
    if (id) {
      setReminderSet(prev => new Set(prev).add(event.id))
    }
  }

  function formatEventTime(event: CalendarEvent): string {
    if (event.allDay) return 'All day'
    const start = new Date(event.start)
    return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatEventDate(event: CalendarEvent): string {
    const date = new Date(event.start)
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  if (!accessToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Connect Google Calendar</Text>
        <Text style={styles.sub}>Sign in to see your events and Gmail reservations</Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={!request}
        >
          <Text style={styles.signInText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emailText}>{email}</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {syncing && <ActivityIndicator color="#2563eb" style={{ marginVertical: 8 }} />}

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No upcoming events in the next 14 days</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={styles.eventLeft}>
              <Text style={styles.eventDate}>{formatEventDate(item)}</Text>
              <Text style={styles.eventTime}>{formatEventTime(item)}</Text>
            </View>
            <View style={styles.eventRight}>
              <View style={styles.eventTitleRow}>
                <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                {item.source === 'gmail' && (
                  <View style={styles.gmailBadge}>
                    <Text style={styles.gmailBadgeText}>Gmail</Text>
                  </View>
                )}
              </View>
              {item.location ? (
                <Text style={styles.eventLocation} numberOfLines={1}>{item.location}</Text>
              ) : null}
              {!item.allDay && (
                <TouchableOpacity
                  style={[
                    styles.reminderBtn,
                    reminderSet.has(item.id) && styles.reminderBtnSet,
                  ]}
                  onPress={() => handleSetReminder(item)}
                  disabled={reminderSet.has(item.id)}
                >
                  <Text style={styles.reminderText}>
                    {reminderSet.has(item.id) ? 'Reminder set' : 'Remind me 30 min before'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  emailText: { color: '#888', fontSize: 13 },
  signOutText: { color: '#ef4444', fontSize: 13 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  signInBtn: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { color: '#444', textAlign: 'center', marginTop: 48, fontSize: 15 },
  eventCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  eventLeft: { width: 72, marginRight: 12 },
  eventDate: { color: '#888', fontSize: 11 },
  eventTime: { color: '#2563eb', fontSize: 13, fontWeight: '600', marginTop: 2 },
  eventRight: { flex: 1 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventTitle: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
  eventLocation: { color: '#666', fontSize: 12, marginTop: 4 },
  gmailBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  gmailBadgeText: { color: '#60a5fa', fontSize: 10, fontWeight: '600' },
  reminderBtn: { marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  reminderBtnSet: { borderColor: '#1e3a1e', backgroundColor: '#0d2010' },
  reminderText: { color: '#2563eb', fontSize: 11 },
})
