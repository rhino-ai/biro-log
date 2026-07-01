import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reactions?: string[];
}

// Chat history was previously persisted to localStorage, which leaked
// potentially sensitive conversation content on shared devices and to any
// third-party script running in the page. We now keep messages in memory only
// and proactively clear any stale data left in browser storage.
const CHAT_STORAGE_KEY = 'biro-yaar-chats';
const LEGACY_KEYS = [CHAT_STORAGE_KEY, 'biro-yaar-messages', 'mentor-chat-history'];

export const useChatStorage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Purge any legacy plaintext chat history on mount.
  useEffect(() => {
    try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? { ...m, content } : m)
    );
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
    try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => 
      prev.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          if (reactions.includes(emoji)) {
            return { ...m, reactions: reactions.filter(r => r !== emoji) };
          }
          return { ...m, reactions: [...reactions, emoji] };
        }
        return m;
      })
    );
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearAllMessages,
    addReaction,
  };
};