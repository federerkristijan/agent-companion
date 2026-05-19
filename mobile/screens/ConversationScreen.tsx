import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  AppState,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import type { Message } from '../types'

type ChatStackParams = {
  ConversationList: undefined
  Conversation: { conversationId: string; title: string }
}

type Nav = NativeStackNavigationProp<ChatStackParams, 'Conversation'>
type Route = RouteProp<ChatStackParams, 'Conversation'>

interface ParsedContent {
  text: string
  fileUrl?: string
  fileName?: string
  mimeType?: string
}

function parseContent(raw: string): ParsedContent {
  try {
    const p = JSON.parse(raw)
    if (typeof p === 'object' && 'text' in p) return p
  } catch {}
  return { text: raw }
}

const SCREEN_W = Dimensions.get('window').width
const MENU_W = 180

function formatTime(iso: string): string {
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return isToday ? time : `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`
}

export default function ConversationScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { conversationId, title } = route.params

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const listRef = useRef<FlatList>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstMessage = useRef(true)
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    navigation.setOptions({ title })
  }, [title])

  useEffect(() => {
    fetchMessages()
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchMessages()
    })
    const poll = setInterval(fetchMessages, 3000)
    return () => {
      appStateSub.remove()
      clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    if (!isTyping) {
      dot1.setValue(0); dot2.setValue(0); dot3.setValue(0)
      return
    }
    const anim = Animated.loop(
      Animated.stagger(150, [dot1, dot2, dot3].map(dot =>
        Animated.sequence([
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ))
    )
    anim.start()
    return () => anim.stop()
  }, [isTyping])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
      isFirstMessage.current = data.filter(m => m.role === 'user').length === 0
      if (data.length > 0 && data[data.length - 1].role === 'agent') {
        setIsTyping(false)
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
      }
    }
  }

  function startTypingIndicator() {
    setIsTyping(true)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => setIsTyping(false), 60_000)
  }

  async function sendMessage() {
    const content = input.trim()
    if (!content) return
    setInput('')

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
    }
    setMessages((prev) => [...prev, optimistic])
    startTypingIndicator()

    await supabase.from('messages').insert({ role: 'user', content, conversation_id: conversationId })

    // Update conversation title to first message content
    if (isFirstMessage.current) {
      const newTitle = content.slice(0, 40)
      await supabase.from('conversations').update({ title: newTitle }).eq('id', conversationId)
      navigation.setOptions({ title: newTitle })
      isFirstMessage.current = false
    }
  }

  async function openImageModal() {
    setSuggesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('suggest-image-prompt', {
        body: { conversation_id: conversationId },
      })
      if (error) throw error
      setImagePrompt(data.prompt ?? '')
    } catch {
      setImagePrompt('')
    } finally {
      setSuggesting(false)
      setImageModalVisible(true)
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim()) return
    setGenerating(true)
    try {
      const { error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: imagePrompt.trim(), conversation_id: conversationId },
      })
      if (error) throw error
      setImageModalVisible(false)
      setImagePrompt('')
      startTypingIndicator()
      fetchMessages()
    } catch {
      ToastAndroid.show('Image generation failed', ToastAndroid.SHORT)
    } finally {
      setGenerating(false)
    }
  }

  async function pickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (result.canceled) return
    const file = result.assets[0]
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${Date.now()}.${ext}`
      const blob = await fetch(file.uri).then(r => r.blob())
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(path, blob, { contentType: file.mimeType ?? 'application/octet-stream' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path)
      const content = JSON.stringify({ text: '', fileUrl: publicUrl, fileName: file.name, mimeType: file.mimeType ?? '' })
      const optimistic: Message = { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(), conversation_id: conversationId }
      setMessages(prev => [...prev, optimistic])
      await supabase.from('messages').insert({ role: 'user', content, conversation_id: conversationId })
      fetchMessages()
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setUploading(false)
    }
  }

  function openMenu(item: Message, pageX: number, pageY: number) {
    const clampedX = Math.min(Math.max(pageX - MENU_W / 2, 12), SCREEN_W - MENU_W - 12)
    setSelectedMessage(item)
    setMenuPos({ x: clampedX, y: pageY + 8 })
    setMenuVisible(true)
  }

  async function copyMessage(text: string) {
    if (!text) return
    await Clipboard.setStringAsync(text)
    setMenuVisible(false)
    ToastAndroid.show('Copied', ToastAndroid.SHORT)
  }

  function startEdit(item: Message) {
    setEditText(parseContent(item.content).text)
    setEditingId(item.id)
    setMenuVisible(false)
  }

  async function saveEdit(item: Message) {
    let newContent: string
    try {
      const parsed = JSON.parse(item.content)
      newContent = typeof parsed === 'object' && 'text' in parsed
        ? JSON.stringify({ ...parsed, text: editText })
        : editText
    } catch {
      newContent = editText
    }
    await supabase.from('messages').update({ content: newContent }).eq('id', item.id)
    setMessages(prev => prev.map(m => m.id === item.id ? { ...m, content: newContent } : m))
    setEditingId(null)
  }

  function renderMessage({ item }: { item: Message }) {
    const parsed = parseContent(item.content)
    const isUser = item.role === 'user'
    const isTemp = item.id.startsWith('temp-')

    if (editingId === item.id) {
      return (
        <View style={[styles.row, styles.rowUser]}>
          <View style={[styles.bubble, styles.userBubble, { minWidth: 180 }]}>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              style={[styles.bubbleText, styles.userText]}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setEditingId(null)}>
                <Text style={styles.editCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => saveEdit(item)}>
                <Text style={styles.editSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )
    }

    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="hardware-chip-outline" size={14} color="#60a5fa" />
          </View>
        )}
        <TouchableOpacity
          onLongPress={(e) => openMenu(item, e.nativeEvent.pageX, e.nativeEvent.pageY)}
          activeOpacity={0.8}
          style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}
        >
          {parsed.text.length > 0 && (
            <Text style={[styles.bubbleText, isUser ? styles.userText : styles.agentText]}>
              {parsed.text}
            </Text>
          )}
          {parsed.fileUrl && parsed.mimeType?.startsWith('image/') && (
            <Image source={{ uri: parsed.fileUrl }} style={styles.imageAttach} resizeMode="cover" />
          )}
          {parsed.fileUrl && !parsed.mimeType?.startsWith('image/') && (
            <View style={styles.fileAttach}>
              <Ionicons name="document-outline" size={15} color={isUser ? '#fff' : '#60a5fa'} />
              <Text style={[styles.fileName, isUser ? styles.userText : styles.agentText]} numberOfLines={1}>
                {parsed.fileName}
              </Text>
            </View>
          )}
          <View style={styles.meta}>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            {isUser && (
              <Text style={[styles.status, !isTemp && styles.statusSent]}>
                {isTemp ? '✓' : '✓✓'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={renderMessage}
        ListFooterComponent={isTyping ? (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="hardware-chip-outline" size={14} color="#60a5fa" />
            </View>
            <View style={styles.typingBubble}>
              {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
              ))}
            </View>
          </View>
        ) : null}
      />
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickAndUpload} disabled={uploading}>
          <Ionicons
            name={uploading ? 'hourglass-outline' : 'attach-outline'}
            size={22}
            color="#666"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={openImageModal} disabled={suggesting}>
          <Ionicons
            name={suggesting ? 'hourglass-outline' : 'image-outline'}
            size={22}
            color="#666"
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={17} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Generate Image</Text>
            <TextInput
              style={styles.modalInput}
              value={imagePrompt}
              onChangeText={setImagePrompt}
              placeholder="Describe the image..."
              placeholderTextColor="#555"
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setImageModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGenerateBtn, generating && styles.modalGenerateBtnDisabled]}
                onPress={generateImage}
                disabled={generating || !imagePrompt.trim()}
              >
                <Text style={styles.modalGenerateText}>
                  {generating ? 'Generating…' : 'Generate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { top: menuPos.y, left: menuPos.x }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => selectedMessage && copyMessage(parseContent(selectedMessage.content).text)}
            >
              <Ionicons name="copy-outline" size={18} color="#e5e5e5" />
              <Text style={styles.menuItemText}>Copy</Text>
            </TouchableOpacity>
            {selectedMessage?.role === 'user' && !selectedMessage.id.startsWith('temp-') && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => selectedMessage && startEdit(selectedMessage)}
              >
                <Ionicons name="pencil-outline" size={18} color="#e5e5e5" />
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  list: { padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '82%', marginVertical: 2 },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { padding: 10, borderRadius: 18, flexShrink: 1 },
  userBubble: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  agentBubble: { backgroundColor: '#1e1e1e', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  agentText: { color: '#e5e5e5' },
  imageAttach: { width: 200, height: 150, borderRadius: 10, marginTop: 6 },
  fileAttach: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
  fileName: { fontSize: 13, flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  timestamp: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  status: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  statusSent: { color: '#93c5fd' },
  typingBubble: { flexDirection: 'row', gap: 4, padding: 14, backgroundColor: '#1e1e1e', borderRadius: 18, borderBottomLeftRadius: 4, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#555' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#1e1e1e', backgroundColor: '#0f0f0f' },
  attachBtn: { padding: 6, justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 20, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  editCancel: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  editSave: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  modalInput: { backgroundColor: '#0f0f0f', color: '#fff', borderRadius: 12, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  modalCancel: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
  modalGenerateBtn: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  modalGenerateBtnDisabled: { opacity: 0.5 },
  modalGenerateText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuSheet: { position: 'absolute', backgroundColor: '#1a1a1a', borderRadius: 14, paddingVertical: 6, width: MENU_W },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  menuItemText: { color: '#e5e5e5', fontSize: 15 },
})
