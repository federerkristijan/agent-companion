import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const CARDS = [
  { screen: 'Chat', icon: 'chatbubble' as const, label: 'Chat', sub: 'Message your AI agent' },
  { screen: 'Calendar', icon: 'calendar' as const, label: 'Calendar', sub: 'Upcoming events & reminders' },
  { screen: 'Alarms', icon: 'alarm' as const, label: 'Alarms', sub: 'Manage recurring alarms' },
]

export default function HomeScreen() {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.title}>Agent Companion</Text>
        <Text style={styles.subtitle}>Your personal AI-powered chief of operations.</Text>
        <Text style={styles.version}>
          v{Constants.nativeAppVersion} ({Constants.nativeBuildVersion})
        </Text>
      </View>

      <View style={styles.cards}>
        {CARDS.map(({ screen, icon, label, sub }) => (
          <TouchableOpacity
            key={screen}
            style={styles.card}
            onPress={() => navigation.navigate(screen as never)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={icon} size={24} color="#2563eb" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 24 },
  top: { flex: 1, justifyContent: 'center' },
  greeting: { color: '#666', fontSize: 15, marginBottom: 6 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#444', fontSize: 15, lineHeight: 22 },
  version: { color: '#2a2a2a', fontSize: 11, marginTop: 8 },
  cards: { gap: 12, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#1e1e1e' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0d1f3c', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardLabel: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardSub: { color: '#555', fontSize: 13 },
})
