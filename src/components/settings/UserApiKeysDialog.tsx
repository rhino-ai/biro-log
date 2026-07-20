import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Loader2, Trash2 } from 'lucide-react';

type Provider = 'gemini' | 'openrouter' | 'openai' | 'anthropic';

const PROVIDERS: { id: Provider; name: string; hint: string; help: string }[] = [
  { id: 'gemini', name: 'Google Gemini', hint: 'aistudio.google.com/apikey', help: 'Free tier: 15 req/min. Recommended.' },
  { id: 'openrouter', name: 'OpenRouter', hint: 'openrouter.ai/keys', help: 'Free Gemini + many models.' },
  { id: 'openai', name: 'OpenAI', hint: 'platform.openai.com/api-keys', help: 'Uses gpt-4o-mini. Paid.' },
  { id: 'anthropic', name: 'Anthropic', hint: 'console.anthropic.com', help: 'Coming soon.' },
];

type SavedKey = { provider: string; label: string | null; updated_at: string };

export const UserApiKeysDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [saved, setSaved] = useState<SavedKey[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-api-keys', { method: 'GET' as any });
      if (error) throw error;
      setSaved((data as any)?.keys || []);
    } catch (e: any) {
      toast({ title: 'Failed to load keys', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const save = async (provider: Provider) => {
    const key = (inputs[provider] || '').trim();
    if (key.length < 10) { toast({ title: 'Key too short', variant: 'destructive' }); return; }
    setBusy(provider);
    try {
      const { error } = await supabase.functions.invoke('user-api-keys', { body: { provider, key } });
      if (error) throw error;
      toast({ title: 'Key saved securely 🔐' });
      setInputs((s) => ({ ...s, [provider]: '' }));
      void load();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const remove = async (provider: string) => {
    setBusy(provider);
    try {
      const { error } = await supabase.functions.invoke('user-api-keys', { body: { provider, action: 'delete' } });
      if (error) throw error;
      toast({ title: 'Removed' });
      void load();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Your AI Keys</DialogTitle>
          <DialogDescription className="text-xs">
            Bring your own API key so you never hit our AI credit limit. Keys are encrypted server-side (AES-GCM) and only used to route your chats.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {PROVIDERS.filter(p => p.id !== 'anthropic').map((p) => {
              const isSaved = saved.find((k) => k.provider === p.id);
              return (
                <div key={p.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{p.name} {isSaved && <Badge variant="secondary" className="ml-1 text-[9px]">SAVED</Badge>}</div>
                      <div className="text-[10px] text-muted-foreground">{p.help} · Get key: {p.hint}</div>
                    </div>
                    {isSaved && (
                      <Button size="icon" variant="ghost" disabled={busy === p.id} onClick={() => remove(p.id)}>
                        {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={isSaved ? 'Replace key…' : 'Paste API key'}
                      value={inputs[p.id] || ''}
                      onChange={(e) => setInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                    />
                    <Button size="sm" disabled={busy === p.id || !(inputs[p.id] || '').trim()} onClick={() => save(p.id)}>
                      {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground text-center">Priority: Gemini → OpenRouter → OpenAI → Lovable default.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};