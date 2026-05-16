import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { CalendarEvent, getUpcomingEvents } from '../lib/google-calendar'
import { getEmailEvents } from '../lib/gmail'
import { scheduleEventReminder } from '../lib/notifications'

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
]

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
})

export default function CalendarScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [reminderSet, setReminderSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    try {
      const user = await GoogleSignin.signInSilently()
      setEmail(user.data?.user.email ?? null)
      const { accessToken: token } = await GoogleSignin.getTokens()
      setAccessToken(token)
      fetchEvents(token)
    } catch {
      setLoading(false)
    }
  }

  async function handleSignIn() {
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      setEmail(userInfo.data?.user.email ?? null)
      await GoogleSignin.addScopes({ scopes: CALENDAR_SCOPES })
      const { accessToken: token } = await GoogleSignin.getTokens()
      setAccessToken(token)
      fetchEvents(token)
    } catch (error: any) {
      Alert.alert('Sign-in error', `Code: ${error.code ?? 'none'}\n${error.message ?? ''}`)
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
    await GoogleSignin.signOut()
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
        <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
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
