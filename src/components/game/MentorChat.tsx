import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoGrowTextarea } from '@/components/common/AutoGrowTextarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, Trash2, MoreVertical, GraduationCap, Volume2, Loader2, Paperclip, Settings2, Reply, X as XIcon, Camera } from 'lucide-react';
import { ChatFileUpload, ChatFilePreview } from '@/components/game/ChatFileUpload';
import { ChatPreferencesDialog } from '@/components/game/ChatPreferencesDialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMentorChat } from '@/hooks/useMentorChat';
import DOMPurify from 'dompurify';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return <span className="opacity-50">...</span>;
  
  // Use DOMPurify (battle-tested) instead of a homegrown allowlist.
  const sanitize = (html: string) => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  });

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
  const [pendingAttachments, setPendingAttachments] = useState<{url:string;type:string;name:string}[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; role: 'user' | 'assistant' } | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;
    const attachmentText = pendingAttachments.map(a =>
      a.type === 'image' ? `![${a.name}](${a.url})` : `[${a.type}: ${a.name}](${a.url})`
    ).join('\n');
    const fullContent = [attachmentText, input.trim()].filter(Boolean).join('\n\n');
    const quotedPrefix = replyTo ? `> You said: "${replyTo.content.replace(/\n/g,' ').slice(0, 90)}"\n\n` : '';
    const userMsg = { role: 'user' as const, content: quotedPrefix + fullContent, timestamp: new Date() };
    addMessage(userMsg);
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
    setReplyTo(null);
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
          body: JSON.stringify({ messages: apiMessages, studyTrack, studentName: profile.name, attachments: sentAttachments, clientContext }),
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
  }, [input, isLoading, messages, studyTrack, profile.name, addMessage, updateMessage, pendingAttachments]);

  // Render message content with inline images/files (markdown ![](url) or [type: name](url))
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
              <p className="text-[10px] text-muted-foreground">{mentor.desc} • Aap-tum, kabhi tu nahi 🙏</p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel">
            <DropdownMenuItem onClick={() => setShowPrefs(true)}><Settings2 className="w-4 h-4 mr-2" />Chat Preferences</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => {
                    const url = re.target?.result as string;
                    localStorage.setItem('biro_chat_bg_mentor', url);
                    toast({ title: 'Background updated' });
                    window.location.reload();
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}><Camera className="w-4 h-4 mr-2" />Change Background</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-raid"><Trash2 className="w-4 h-4 mr-2" />Clear All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChatPreferencesDialog open={showPrefs} onClose={() => setShowPrefs(false)} />

      {/* Chat Background */}
      <div className="absolute inset-0 top-14 bottom-16 pointer-events-none overflow-hidden">
        <div 
          className="w-full h-full bg-repeat transition-opacity duration-500" 
          style={{
            backgroundImage: `url("${localStorage.getItem('biro_chat_bg_mentor') || 'data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E'}")`,
            backgroundSize: localStorage.getItem('biro_chat_bg_mentor') ? 'cover' : '60px',
            backgroundPosition: 'center',
            opacity: 0.08,
          }} 
        />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 relative" ref={scrollRef}>
        <div className="space-y-3 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex animate-fade-in', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className="group relative max-w-[85%]" onDoubleClick={() => setReplyTo({ id: msg.id, content: msg.content, role: msg.role })}>
                <div className={cn('rounded-2xl px-3 py-2 shadow-sm',
                  msg.role === 'user' ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-card border border-amber-500/20 rounded-bl-sm'
                )}>
                  <div className="text-sm">{renderMsg(msg.content)}</div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button onClick={() => setReplyTo({ id: msg.id, content: msg.content, role: msg.role })} className="opacity-40 hover:opacity-100"><Reply className="w-3 h-3" /></button>
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
        {replyTo && (
          <div className="flex items-center gap-2 max-w-lg mx-auto mb-2 px-3 py-2 rounded-md bg-amber-500/10 border-l-2 border-amber-500">
            <Reply className="w-3 h-3 text-amber-500 shrink-0" />
            <div className="text-xs flex-1 truncate opacity-80">Replying to: {replyTo.content.slice(0, 80)}</div>
            <button onClick={() => setReplyTo(null)}><XIcon className="w-3 h-3" /></button>
          </div>
        )}
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
            placeholder="Ask your mentor..." disabled={isLoading} minRows={1} maxRows={6}
            className="flex-1 bg-secondary/50 border-amber-500/20" />
          <Button onClick={sendMessage} disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading} size="icon" className="bg-amber-500 hover:bg-amber-600 shrink-0">
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
