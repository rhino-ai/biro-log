import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Clock, ArrowLeft, Sparkles, AlertTriangle, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
    try {
      const data = JSON.parse(stored) as UsageData;
      if (data.date === today) {
        return data;
      }
    } catch {
      // Invalid data, reset
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

// Simple markdown renderer without external dependencies
const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return <span className="opacity-50">...</span>;
  
  const lines = content.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
        processed = processed.replace(/`(.*?)`/g, '<code class="bg-secondary/50 px-1 rounded text-xs">$1</code>');
        
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="font-bold text-sm mt-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="font-bold text-base mt-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="font-bold text-lg mt-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2">
              <span>•</span>
              <span dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />
            </div>
          );
        }
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex gap-2">
              <span>{numberedMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: processed.slice(numberedMatch[0].length) }} />
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-1" />;
        }
        return <p key={idx} dangerouslySetInnerHTML={{ __html: processed }} />;
      })}
    </div>
  );
};

export const BiroYaarChat = () => {
  const navigate = useNavigate();
  const { profile, studyTrack } = useGameStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Yo ${profile.name}! 👋 Kya scene hai bhai?`,
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
        updateUsage(1000);
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

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-primary/20 to-accent/20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl">
              🤝
            </div>
            <div>
              <h3 className="font-game text-sm flex items-center gap-1">
                Biro-yaar 
                <span className="text-xs text-green-400">● online</span>
              </h3>
              <p className="text-[10px] text-muted-foreground">
                tera study buddy 📚
              </p>
            </div>
          </div>
        </div>
        
        {/* Time Remaining */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
          remainingTime < 30 * 60 * 1000 ? "bg-raid/20 text-raid" : "bg-secondary/50"
        )}>
          <Clock className="w-3 h-3" />
          <span>{formatTime(Math.max(0, remainingTime))}</span>
        </div>
      </div>

      {/* Chat Background */}
      <div className="absolute inset-0 top-14 bottom-16 opacity-5 pointer-events-none">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 relative" ref={scrollRef}>
        <div className="space-y-3 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex animate-fade-in',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm',
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-br-sm'
                    : 'bg-card border border-white/10 rounded-bl-sm'
                )}
              >
                <div className="text-sm">
                  <SimpleMarkdown content={message.content} />
                </div>
                <span className="text-[10px] opacity-40 mt-1 block text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-card border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
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
          <span className="text-raid">Aaj ka limit ho gaya! Kal milte hain 👋</span>
        </div>
      )}

      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {['Motivation do yaar 💪', 'Doubt hai bhai', 'Bore ho raha 😅', 'Study plan banao'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 rounded-full bg-secondary/50 border border-white/10 text-xs whitespace-nowrap hover:bg-secondary transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLimitReached ? "Kal milte hain..." : "Type kar yaar..."}
            disabled={isLoading || isLimitReached}
            className="flex-1 bg-secondary/50 border-white/10"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isLimitReached}
            size="icon"
            className="bg-accent hover:bg-accent/90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
