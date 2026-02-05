import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reactions?: string[];
}

const CHAT_STORAGE_KEY = 'biro-yaar-chats';

export const useChatStorage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const messagesWithDates = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch {
        // Invalid data, start fresh
        setMessages([]);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

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
    // Update localStorage
    const remaining = messages.filter(m => m.id !== id);
    if (remaining.length === 0) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, [messages]);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
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