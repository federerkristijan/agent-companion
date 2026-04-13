export type MessageRole = 'user' | 'agent'

export interface Message {
  id: string
  role: MessageRole
  content: string
  created_at: string
}
