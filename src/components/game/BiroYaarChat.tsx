import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoGrowTextarea } from '@/components/common/AutoGrowTextarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Clock, ArrowLeft, AlertTriangle, Trash2, Smile, MoreVertical, Volume2, Loader2, Paperclip, X, Settings2 } from 'lucide-react';
import { ChatFileUpload, ChatFilePreview } from '@/components/game/ChatFileUpload';
import { ChatPreferencesDialog } from '@/components/game/ChatPreferencesDialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useChatStorage, ChatMessage } from '@/hooks/useChatStorage';
import DOMPurify from 'dompurify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DAILY_LIMIT_MS = 3 * 60 * 60 * 1000;
const STORAGE_KEY = 'biro-yaar-usage';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '💯'];

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
      if (data.date === today) return data;
    } catch {}
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

const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return <span className="opacity-50">...</span>;
  
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, idx) => {
        let processed = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-secondary/50 px-1 rounded text-xs">$1</code>');
        
        // Use DOMPurify — homegrown sanitizers are risky.
        const sanitize = (html: string) => DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'span'],
          ALLOWED_ATTR: ['class'],
          FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
        });
        
        if (line.startsWith('### ')) return <h3 key={idx} className="font-bold text-sm mt-2">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx} className="font-bold text-base mt-2">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={idx} className="font-bold text-lg mt-2">{line.slice(2)}</h1>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={idx} className="flex gap-2"><span>•</span><span dangerouslySetInnerHTML={{ __html: sanitize(processed.slice(2)) }} /></div>;
        }
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) {
          return <div key={idx} className="flex gap-2"><span>{numberedMatch[1]}.</span><span dangerouslySetInnerHTML={{ __html: sanitize(processed.slice(numberedMatch[0].length)) }} /></div>;
        }
        if (line.trim() === '') return <div key={idx} className="h-1" />;
        return <p key={idx} dangerouslySetInnerHTML={{ __html: sanitize(processed) }} />;
      })}
    </div>
  );
};

export const BiroYaarChat = () => {
  const navigate = useNavigate();
  const { profile, studyTrack } = useGame();
  const { messages, addMessage, updateMessage, deleteMessage, addReaction, clearAllMessages } = useChatStorage();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{url:string;type:string;name:string}[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(DAILY_LIMIT_MS - getUsageData().usedMs);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const playTTS = useCallback(async (text: string, messageId: string) => {
    setPlayingAudio(messageId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: text.slice(0, 500) }),
        }
      );
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudio(null);
      await audio.play();
    } catch {
      toast({ title: 'Voice not available', variant: 'destructive' });
      setPlayingAudio(null);
    }
  }, []);

  // Add welcome message if no messages - only once
  const hasAddedWelcome = useRef(false);
  useEffect(() => {
    if (messages.length === 0 && !hasAddedWelcome.current) {
      hasAddedWelcome.current = true;
      addMessage({
        role: 'assistant',
        content: `Yo ${profile.name}! 👋 Kya scene hai bhai?`,
        timestamp: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(DAILY_LIMIT_MS - getUsageData().usedMs);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        updateUsage(1000);
        setRemainingTime(DAILY_LIMIT_MS - getUsageData().usedMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStartTime]);

  useEffect(() => {
    if (messages.length > 1 && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [messages, sessionStartTime]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isLimitReached = remainingTime <= 0;

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading || isLimitReached) return;

    const attachmentText = pendingAttachments.map(a =>
      a.type === 'image' ? `![${a.name}](${a.url})` : `[${a.type}: ${a.name}](${a.url})`
    ).join('\n');
    const fullContent = [attachmentText, input.trim()].filter(Boolean).join('\n\n');

    const userMessage: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content: fullContent,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    const sentAttachments = pendingAttachments;
    const now = new Date();
    const istParts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(now);
    const clientContext = {
      localTime: istParts,
      localTimeIso: new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30'),
      nowEpochMs: now.getTime(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      strictReadMode: true,
      screenTimeData: localStorage.getItem('biro-screen-time'),
      biroUsageData: localStorage.getItem('biro-yaar-usage'),
    };
    setPendingAttachments([]);
    setInput('');
    setIsLoading(true);

    const apiMessages = [...messages, { ...userMessage, id: 'temp' }].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biro-yaar-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            studyTrack,
            studentName: profile.name,
            attachments: sentAttachments,
            clientContext,
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

      const assistantMsgId = addMessage({
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      });
      setCurrentAssistantId(assistantMsgId);

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
              if (assistantMsgId) {
                updateMessage(assistantMsgId, assistantContent);
              }
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
    } finally {
      setIsLoading(false);
      setCurrentAssistantId(null);
      inputRef.current?.focus();
    }
  }, [input, isLoading, isLimitReached, messages, studyTrack, profile.name, addMessage, updateMessage, pendingAttachments]);

  const renderMsg = (content: string) => {
    const lines = content.split('\n');
    const out: JSX.Element[] = [];
    let textBuf: string[] = [];
    const flush = () => {
      if (textBuf.length) {
        out.push(<SimpleMarkdown key={`t-${out.length}`} content={textBuf.join('\n')} />);
        textBuf = [];
      }
    };
    lines.forEach((line, i) => {
      const img = line.match(/^!\[([^\]]*)\]\((https?:[^)]+)\)$/);
      const file = line.match(/^\[(image|video|audio|document)[^\]]*\]\((https?:[^)]+)\)$/i);
      if (img) { flush(); out.push(<ChatFilePreview key={`a-${i}`} url={img[2]} type="image" name={img[1]} />); }
      else if (file) { flush(); out.push(<ChatFilePreview key={`a-${i}`} url={file[2]} type={file[1].toLowerCase()} name={file[1]} />); }
      else textBuf.push(line);
    });
    flush();
    return <div className="space-y-2">{out}</div>;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDeleteMessage = (id: string) => {
    deleteMessage(id);
    setMessageToDelete(null);
    toast({ title: 'Message deleted' });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
    setShowReactionPicker(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-primary/20 to-accent/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl">🤝</div>
            <div>
              <h3 className="font-game text-sm flex items-center gap-1">
                Biro-yaar <span className="text-xs text-green-400">● online</span>
              </h3>
              <p className="text-[10px] text-muted-foreground">tera classmate buddy 📚 • Main galti kar sakta hu 🙏</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
            remainingTime < 30 * 60 * 1000 ? "bg-raid/20 text-raid" : "bg-secondary/50"
          )}>
            <Clock className="w-3 h-3" />
            <span>{formatTime(Math.max(0, remainingTime))}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel">
              <DropdownMenuItem onClick={() => setShowPrefs(true)}><Settings2 className="w-4 h-4 mr-2" />Chat Preferences</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-raid">
                <Trash2 className="w-4 h-4 mr-2" />Clear All Chats
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ChatPreferencesDialog open={showPrefs} onClose={() => setShowPrefs(false)} />

      {/* Chat Background */}
      <div className="absolute inset-0 top-14 bottom-16 opacity-5 pointer-events-none">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 relative" ref={scrollRef}>
        <div className="space-y-3 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex animate-fade-in', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className="group relative max-w-[85%]">
                <div className={cn(
                  'rounded-2xl px-3 py-2 shadow-sm',
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-br-sm'
                    : 'bg-card border border-white/10 rounded-bl-sm'
                )}>
                  <div className="text-sm">{renderMsg(message.content)}</div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {message.role === 'assistant' && message.content && (
                      <button onClick={() => playTTS(message.content, message.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                        {playingAudio === message.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}
                    <span className="text-[10px] opacity-40">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {message.reactions.map((emoji, idx) => (
                        <span key={idx} className="text-sm bg-secondary/50 rounded-full px-1.5 py-0.5 cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => handleReaction(message.id, emoji)}>{emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  'absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                  message.role === 'user' ? '-left-16' : '-right-16'
                )}>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}>
                    <Smile className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-raid hover:text-raid"
                    onClick={() => setMessageToDelete(message.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                {showReactionPicker === message.id && (
                  <div className={cn(
                    'absolute z-10 bg-card border border-white/20 rounded-full px-2 py-1 flex gap-1 shadow-lg',
                    message.role === 'user' ? 'right-0 -bottom-8' : 'left-0 -bottom-8'
                  )}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => handleReaction(message.id, emoji)}
                        className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                    ))}
                  </div>
                )}
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

      {isLimitReached && (
        <div className="p-3 bg-raid/20 border-t border-raid/30 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-raid" />
          <span className="text-raid">Aaj ka limit ho gaya! Kal milte hain 👋</span>
        </div>
      )}

      {messages.length <= 2 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {['Motivation do yaar 💪', 'Doubt hai bhai', 'Bore ho raha 😅', 'Study plan banao'].map((suggestion) => (
            <button key={suggestion} onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 rounded-full bg-secondary/50 border border-white/10 text-xs whitespace-nowrap hover:bg-secondary transition-colors">
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-white/10 bg-card/50 backdrop-blur-sm">
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-lg mx-auto">
            {pendingAttachments.map((a, i) => (
              <div key={i} className="relative shrink-0">
                <ChatFilePreview url={a.url} type={a.type} name={a.name} />
                <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-raid rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-w-lg mx-auto items-center">
          <ChatFileUpload onFileUploaded={(url, type, name) => {
            setPendingAttachments(prev => [...prev, { url, type, name }]);
          }} />
          <AutoGrowTextarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isLimitReached ? "Kal milte hain..." : "Type kar yaar..."}
            disabled={isLoading || isLimitReached} minRows={1} maxRows={6}
            className="flex-1 bg-secondary/50 border-white/10" />
          <Button onClick={sendMessage} disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading || isLimitReached}
            size="icon" className="bg-accent hover:bg-accent/90 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent className="glass-panel border-primary/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
              className="bg-raid hover:bg-raid/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="glass-panel border-primary/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-raid">Clear All Chats?</AlertDialogTitle>
            <AlertDialogDescription>All messages will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearAllMessages(); setShowClearDialog(false); toast({ title: 'All chats cleared' }); }}
              className="bg-raid hover:bg-raid/90">Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
