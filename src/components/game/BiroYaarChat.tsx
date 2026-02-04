import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Clock, X, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DAILY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const STORAGE_KEY = 'biro-yaar-usage';

interface UsageData {
  date: string;
  usedMs: number;
}

const getUsageData = (): UsageData => {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored) as UsageData;
    if (data.date === today) {
      return data;
    }
  }
  return { date: today, usedMs: 0 };
};

const updateUsage = (addedMs: number) => {
  const usage = getUsageData();
  usage.usedMs += addedMs;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
};

const formatTime = (ms: number) => {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
};

interface BiroYaarChatProps {
  onClose?: () => void;
  isFullScreen?: boolean;
}

export const BiroYaarChat = ({ onClose, isFullScreen = false }: BiroYaarChatProps) => {
  const { profile, studyTrack } = useGameStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey ${profile.name}! 👋 Main hoon Biro-yaar, tera study buddy!\n\nKya chal raha hai? Koi doubt hai ya motivation chahiye? Bol bhai, I'm here to help! 💪`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(DAILY_LIMIT_MS - getUsageData().usedMs);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(DAILY_LIMIT_MS - getUsageData().usedMs);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Track session time
  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime.getTime();
        updateUsage(1000); // Update every second
        setRemainingTime(DAILY_LIMIT_MS - getUsageData().usedMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStartTime]);

  // Start session on first interaction
  useEffect(() => {
    if (messages.length > 1 && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [messages, sessionStartTime]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isLimitReached = remainingTime <= 0;

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || isLimitReached) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare messages for API (only role and content)
    const apiMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biro-yaar-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            studyTrack,
            studentName: profile.name,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', timestamp: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      // Remove the user message if failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, isLimitReached, messages, studyTrack, profile.name]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col glass-panel border border-primary/30 overflow-hidden',
        isFullScreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-primary/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-lg">🎓</span>
          </div>
          <div>
            <h3 className="font-game text-sm">Biro-yaar</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Study Mentor
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Remaining */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
            remainingTime < 30 * 60 * 1000 ? "bg-raid/20 text-raid" : "bg-secondary"
          )}>
            <Clock className="w-3 h-3" />
            <span>{formatTime(Math.max(0, remainingTime))}</span>
          </div>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3 animate-fade-in',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  message.role === 'user'
                    ? 'bg-accent/20'
                    : 'bg-gradient-to-br from-primary to-accent'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2',
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-tr-sm'
                    : 'bg-secondary rounded-tl-sm'
                )}
              >
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                </div>
                <span className="text-[10px] opacity-50 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Limit Warning */}
      {isLimitReached && (
        <div className="p-3 bg-raid/20 border-t border-raid/30 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-raid" />
          <span className="text-raid">Daily limit reached! Come back tomorrow. 📚</span>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLimitReached ? "Daily limit reached..." : "Ask anything..."}
            disabled={isLoading || isLimitReached}
            className="flex-1 bg-secondary/50"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isLimitReached}
            className="bg-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Biro-yaar helps with doubts & motivation • 3hrs/day limit
        </p>
      </div>
    </div>
  );
};
