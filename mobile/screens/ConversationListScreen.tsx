import { useCallback, useEffect, useState } from 'react'
import { Dimensions, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import type { Conversation } from '../types'

type ChatStackParams = {
  ConversationList: undefined
  Conversation: { conversationId: string; title: string }
}

type Nav = NativeStackNavigationProp<ChatStackParams, 'ConversationList'>

const SCREEN_W = Dimensions.get('window').width
const MENU_W = 180

function formatTime(iso: string): string {
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ConversationListScreen() {
  const navigation = useNavigation<Nav>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [renameVisible, setRenameVisible] = useState(false)
  const [renameText, setRenameText] = useState('')

  useFocusEffect(
    useCallback(() => {
      fetchConversations()
    }, [])
  )

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
          <Ionicons name="create-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  async function fetchConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setConversations(data)
  }

  async function handleNewChat() {
    const { data } = await supabase
      .from('conversations')
      .insert({ title: 'New Chat' })
      .select()
      .single()
    if (data) {
      navigation.navigate('Conversation', { conversationId: data.id, title: data.title })
    }
  }

  function openMenu(conv: Conversation, pageX: number, pageY: number) {
    const clampedX = Math.min(Math.max(pageX - MENU_W / 2, 12), SCREEN_W - MENU_W - 12)
    setSelectedConv(conv)
    setMenuPos({ x: clampedX, y: pageY + 8 })
    setMenuVisible(true)
  }

  function startRename() {
    setRenameText(selectedConv?.title ?? '')
    setMenuVisible(false)
    setRenameVisible(true)
  }

  async function saveRename() {
    if (!selectedConv || !renameText.trim()) return
    const title = renameText.trim()
    await supabase.from('conversations').update({ title }).eq('id', selectedConv.id)
    setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, title } : c))
    setRenameVisible(false)
  }

  async function deleteConversation() {
    if (!selectedConv) return
    setMenuVisible(false)
    await supabase.from('messages').delete().eq('conversation_id', selectedConv.id)
    await supabase.from('conversations').delete().eq('id', selectedConv.id)
    setConversations(prev => prev.filter(c => c.id !== selectedConv.id))
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={conversations.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={52} color="#2a2a2a" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>Tap the pencil icon to start</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('Conversation', { conversationId: item.id, title: item.title })}
            onLongPress={(e) => openMenu(item, e.nativeEvent.pageX, e.nativeEvent.pageY)}
          >
            <View style={styles.avatar}>
              <Ionicons name="chatbubble-outline" size={18} color="#60a5fa" />
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemDate}>{formatTime(item.created_at)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#333" />
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { top: menuPos.y, left: menuPos.x }]}>
            <TouchableOpacity style={styles.menuItem} onPress={startRename}>
              <Ionicons name="pencil-outline" size={18} color="#e5e5e5" />
              <Text style={styles.menuItemText}>Rename</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={deleteConversation}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setRenameVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.renameSheet}>
            <Text style={styles.renameTitle}>Rename</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              selectTextOnFocus
              placeholderTextColor="#555"
            />
            <View style={styles.renameActions}>
              <TouchableOpacity onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRename}>
                <Text style={styles.renameSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  headerBtn: { marginRight: 4 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#444', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub: { color: '#333', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#141414', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemBody: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  itemDate: { color: '#555', fontSize: 12, marginTop: 2 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuSheet: { position: 'absolute', backgroundColor: '#1a1a1a', borderRadius: 14, paddingVertical: 6, width: MENU_W },
  menuDivider: { height: 1, backgroundColor: '#2a2a2a', marginHorizontal: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  menuItemText: { color: '#e5e5e5', fontSize: 15 },
  menuItemDanger: { color: '#f87171' },
  renameSheet: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, width: 280 },
  renameTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  renameInput: { backgroundColor: '#252525', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 16 },
  renameCancel: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
  renameSave: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
})
