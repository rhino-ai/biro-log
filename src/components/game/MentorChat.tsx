import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, Trash2, MoreVertical, GraduationCap, Volume2, Loader2, Paperclip } from 'lucide-react';
import { ChatFileUpload, ChatFilePreview } from '@/components/game/ChatFileUpload';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMentorChat } from '@/hooks/useMentorChat';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return <span className="opacity-50">...</span>;
  
  const sanitize = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,style').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML;
  };

  return (
    <div className="space-y-1">
      {content.split('\n').map((line, idx) => {
        let processed = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-secondary/50 px-1 rounded text-xs">$1</code>');
        if (line.startsWith('### ')) return <h3 key={idx} className="font-bold text-sm mt-2">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx} className="font-bold text-base mt-2">{line.slice(3)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={idx} className="flex gap-2"><span>•</span><span dangerouslySetInnerHTML={{ __html: sanitize(processed.slice(2)) }} /></div>;
        }
        const numMatch = line.match(/^(\d+)\.\s/);
        if (numMatch) return <div key={idx} className="flex gap-2"><span>{numMatch[1]}.</span><span dangerouslySetInnerHTML={{ __html: sanitize(processed.slice(numMatch[0].length)) }} /></div>;
        if (line.trim() === '') return <div key={idx} className="h-1" />;
        return <p key={idx} dangerouslySetInnerHTML={{ __html: sanitize(processed) }} />;
      })}
    </div>
  );
};

const trackMentorNames: Record<string, { name: string; emoji: string; desc: string }> = {
  jee: { name: 'JEE Guru', emoji: '🎯', desc: 'IIT-JEE Expert Mentor' },
  neet: { name: 'NEET Guide', emoji: '🩺', desc: 'Medical Entrance Mentor' },
  highschool: { name: 'School Mentor', emoji: '📚', desc: 'All-Subject Guide' },
  teacher: { name: 'Teaching Coach', emoji: '👨‍🏫', desc: 'Pedagogy Expert' },
  other: { name: 'Life Coach', emoji: '💼', desc: 'Productivity Mentor' },
};

export const MentorChat = () => {
  const navigate = useNavigate();
  const { profile, studyTrack } = useGame();
  const { messages, addMessage, updateMessage, deleteMessage, clearAll } = useMentorChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mentor = trackMentorNames[studyTrack] || trackMentorNames.jee;

  const hasAddedWelcome = useRef(false);
  useEffect(() => {
    if (messages.length === 0 && !hasAddedWelcome.current) {
      hasAddedWelcome.current = true;
      addMessage({
        role: 'assistant',
        content: `Namaste ${profile.name}! 🙏\n\nMain aapka ${mentor.name} hun. Aapki ${studyTrack.toUpperCase()} journey mein main aapka guide rahunga.\n\nAaj kya padha? Batao, hum milke plan banate hain! 📋`,
        timestamp: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
    } catch (err) {
      console.error('TTS error:', err);
      toast({ title: 'Voice not available', description: 'Could not play audio', variant: 'destructive' });
      setPlayingAudio(null);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user' as const, content: input.trim(), timestamp: new Date() };
    addMessage(userMsg);
    setInput('');
    setIsLoading(true);

    const apiMessages = [...messages, { ...userMsg, id: 'temp' }].map(m => ({ role: m.role, content: m.content }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: apiMessages, studyTrack, studentName: profile.name }),
        }
      );

      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No body');

      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';
      const assistantId = addMessage({ role: 'assistant', content: '', timestamp: new Date() });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '' || line.startsWith(':')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { content += c; updateMessage(assistantId, content); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch (error) {
      console.error('Mentor error:', error);
      toast({ title: 'Error', description: 'Failed to get mentor response', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, studyTrack, profile.name, addMessage, updateMessage]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xl">{mentor.emoji}</div>
            <div>
              <h3 className="font-game text-sm flex items-center gap-1">{mentor.name} <span className="text-xs text-green-400">● online</span></h3>
              <p className="text-[10px] text-muted-foreground">{mentor.desc} • Galti nahi karunga ✅</p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel">
            <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-raid"><Trash2 className="w-4 h-4 mr-2" />Clear All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex animate-fade-in', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className="group relative max-w-[85%]">
                <div className={cn('rounded-2xl px-3 py-2 shadow-sm',
                  msg.role === 'user' ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-card border border-amber-500/20 rounded-bl-sm'
                )}>
                  <div className="text-sm"><SimpleMarkdown content={msg.content} /></div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {msg.role === 'assistant' && msg.content && (
                      <button onClick={() => playTTS(msg.content, msg.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                        {playingAudio === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}
                    <span className="text-[10px] opacity-40">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-card border border-amber-500/20 rounded-2xl rounded-bl-sm px-4 py-3">
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

      {/* Quick suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {['Aaj ka plan banao 📋', 'Study schedule chahiye', 'Weak topics help', 'Nightly check-in karo'].map((s) => (
            <button key={s} onClick={() => setInput(s)} className="px-3 py-1.5 rounded-full bg-secondary/50 border border-amber-500/20 text-xs whitespace-nowrap hover:bg-secondary transition-colors">{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2 max-w-lg mx-auto items-center">
          <ChatFileUpload onFileUploaded={(url, type, name) => {
            const fileMsg = type === 'image' ? `[Image: ${name}](${url})` : `[File: ${name}](${url})`;
            addMessage({ role: 'user', content: fileMsg, timestamp: new Date() });
          }} />
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask your mentor..." disabled={isLoading} className="flex-1 bg-secondary/50 border-amber-500/20" />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="bg-amber-500 hover:bg-amber-600 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="glass-panel border-primary/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Mentor Chats?</AlertDialogTitle>
            <AlertDialogDescription>This will delete all mentor conversation history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearAll(); setShowClearDialog(false); }} className="bg-raid hover:bg-raid/90">Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
