import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Search, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const moods = [
  { e: '😔', v: 1 }, { e: '😐', v: 2 }, { e: '🙂', v: 3 }, { e: '😊', v: 4 }, { e: '🤩', v: 5 },
];

const PROMPTS = [
  'What challenged you today?',
  'What are you grateful for?',
  'What will you do differently tomorrow?',
  '3 wins from today',
  'Biggest distraction & how to beat it',
];

interface Entry {
  id: string;
  entry_date: string;
  mood: number | null;
  prompt: string | null;
  content: string;
  tags: string[];
}

const JournalPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ content: '', mood: 3, prompt: PROMPTS[0], tags: '' });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('journal_entries')
      .select('id,entry_date,mood,prompt,content,tags')
      .eq('user_id', user.id).order('entry_date', { ascending: false }).order('created_at', { ascending: false });
    setEntries((data || []) as Entry[]);
  };

  const save = async () => {
    if (!user || !draft.content.trim()) return;
    const tags = draft.tags.split(',').map(s => s.trim()).filter(Boolean);
    if (editingId) {
      await supabase.from('journal_entries').update({
        content: draft.content, mood: draft.mood, prompt: draft.prompt, tags,
      }).eq('id', editingId).eq('user_id', user.id);
      toast({ title: 'Updated ✏️' });
    } else {
      await supabase.from('journal_entries').insert({
        user_id: user.id, content: draft.content, mood: draft.mood, prompt: draft.prompt, tags,
      });
      toast({ title: 'Saved 📖' });
    }
    setDraft({ content: '', mood: 3, prompt: PROMPTS[0], tags: '' });
    setEditingId(null); setShowNew(false); load();
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setDraft({ content: e.content, mood: e.mood || 3, prompt: e.prompt || PROMPTS[0], tags: (e.tags || []).join(', ') });
    setShowNew(true);
  };

  const remove = async (id: string) => {
    if (!user || !confirm('Delete this entry?')) return;
    await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', user.id);
    load();
  };

  const filtered = entries.filter(e =>
    !search || e.content.toLowerCase().includes(search.toLowerCase()) ||
    (e.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/wellness" />
          <h1 className="font-game text-xl">📖 Journal</h1>
          <Button size="sm" onClick={() => { setShowNew(s => !s); setEditingId(null); setDraft({ content: '', mood: 3, prompt: PROMPTS[0], tags: '' }); }}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>

        {showNew && (
          <Card className="glass-panel border-primary/30">
            <CardHeader><CardTitle className="text-sm font-game">{editingId ? 'Edit entry' : 'New entry'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                {moods.map(m => (
                  <button key={m.v} onClick={() => setDraft(d => ({ ...d, mood: m.v }))}
                    className={cn('text-2xl transition-transform', draft.mood === m.v ? 'scale-125' : 'opacity-40')}>{m.e}</button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {PROMPTS.map(p => (
                  <button key={p} onClick={() => setDraft(d => ({ ...d, prompt: p }))}
                    className={cn('text-[10px] px-2 py-1 rounded-full border', draft.prompt === p ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                    {p}
                  </button>
                ))}
              </div>
              <Textarea rows={5} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                placeholder="Write your thoughts..." className="bg-secondary/50" />
              <Input value={draft.tags} onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))}
                placeholder="Tags (comma separated): physics, mock, focus" className="bg-secondary/50 text-xs" />
              <Button onClick={save} disabled={!draft.content.trim()} className="w-full bg-primary">
                <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries / tags"
            className="pl-9 bg-secondary/50" />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No entries yet. Tap New to start journaling 📓</p>
          ) : filtered.map(e => (
            <Card key={e.id} className="glass-panel border-border">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.entry_date} {e.mood ? moods.find(m => m.v === e.mood)?.e : ''}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(e)} className="text-primary"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => remove(e.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                {e.prompt && <p className="text-[10px] italic text-muted-foreground">{e.prompt}</p>}
                <p className="text-sm whitespace-pre-wrap">{e.content}</p>
                {e.tags && e.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">#{t}</span>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default JournalPage;