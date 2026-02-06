import { useState, useEffect, useCallback } from 'react';

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MENTOR_STORAGE_KEY = 'biro-mentor-chats';

export const useMentorChat = () => {
  const [messages, setMessages] = useState<MentorMessage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(MENTOR_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch {
        setMessages([]);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(MENTOR_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const addMessage = useCallback((message: Omit<MentorMessage, 'id'>) => {
    const newMessage: MentorMessage = {
      ...message,
      id: `mentor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => {
      const remaining = prev.filter(m => m.id !== id);
      if (remaining.length === 0) localStorage.removeItem(MENTOR_STORAGE_KEY);
      return remaining;
    });
  }, []);

  const clearAll = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(MENTOR_STORAGE_KEY);
  }, []);

  return { messages, addMessage, updateMessage, deleteMessage, clearAll };
};
