import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import type { Message } from '../types'

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

function formatTime(iso: string): string {
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return isToday ? time : `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const listRef = useRef<FlatList>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

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
      .is('conversation_id', null)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
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
    const optimistic: Message = { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    startTypingIndicator()
    await supabase.from('messages').insert({ role: 'user', content })
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
      const optimistic: Message = { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, optimistic])
      await supabase.from('messages').insert({ role: 'user', content })
      fetchMessages()
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setUploading(false)
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const parsed = parseContent(item.content)
    const isUser = item.role === 'user'
    const isTemp = item.id.startsWith('temp-')

    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="hardware-chip-outline" size={14} color="#60a5fa" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
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
        </View>
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
})
