export type MessageRole = 'user' | 'agent'

export interface Message {
  id: string
  role: MessageRole
  content: string
  created_at: string
  conversation_id?: string | null
}

export interface Conversation {
  id: string
  title: string
  created_at: string
}
