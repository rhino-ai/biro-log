import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persisted?: boolean; // true once it's an actual DB row
}

const LOCAL_KEY = 'biro-mentor-chats-cache';

export const useMentorChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedForUser = useRef<string | null>(null);

  // Load from DB (and warm cache from localStorage so UI is instant)
  useEffect(() => {
    if (!user) {
      const cached = localStorage.getItem(LOCAL_KEY);
      if (cached) {
        try { setMessages(JSON.parse(cached).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))); } catch {}
      }
      setLoaded(true);
      return;
    }
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    (async () => {
      // instant warm from cache
      const cached = localStorage.getItem(LOCAL_KEY);
      if (cached) {
        try { setMessages(JSON.parse(cached).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))); } catch {}
      }
      const { data, error } = await supabase
        .from('mentor_conversations')
        .select('id,role,content,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(500);
      if (!error && data) {
        const msgs: MentorMessage[] = data
          .filter((r: any) => r.role === 'user' || r.role === 'assistant')
          .map((r: any) => ({
            id: r.id,
            role: r.role,
            content: r.content,
            timestamp: new Date(r.created_at),
            persisted: true,
          }));
        setMessages(msgs);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(msgs));
      }
      setLoaded(true);
    })();
  }, [user]);

  // Cache to localStorage as fallback
  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(messages.slice(-200))); } catch {}
    }
  }, [messages, loaded]);

  const addMessage = useCallback((message: Omit<MentorMessage, 'id'>) => {
    const id = `mentor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setMessages(prev => [...prev, { ...message, id }]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (user) {
      await supabase.from('mentor_conversations').delete().eq('id', id).eq('user_id', user.id);
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_KEY);
    if (user) {
      await supabase.from('mentor_conversations').delete().eq('user_id', user.id);
    }
  }, [user]);

  return { messages, addMessage, updateMessage, deleteMessage, clearAll, loaded };
};
