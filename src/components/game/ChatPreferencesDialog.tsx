import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface Props { open: boolean; onClose: () => void; }

export const ChatPreferencesDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const [tone, setTone] = useState('respectful_friendly');
  const [length, setLength] = useState('balanced');
  const [persona, setPersona] = useState('auto');
  const [showThinking, setShowThinking] = useState(false);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase.from('chat_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setTone(data.tone); setLength(data.reply_length); setPersona(data.persona);
        setShowThinking(data.show_thinking); setCustom(data.custom_instructions || '');
      }
    })();
  }, [user, open]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('chat_preferences').upsert({
      user_id: user.id, tone, reply_length: length, persona,
      show_thinking: showThinking, custom_instructions: custom,
    }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Preferences saved ✅' }); onClose(); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-panel max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Preferences</DialogTitle>
          <DialogDescription>Apne hisaab se AI ka behaviour set karein.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="respectful_friendly">Respectful & Friendly (default)</SelectItem>
                <SelectItem value="strict_mentor">Strict Mentor</SelectItem>
                <SelectItem value="chill_buddy">Chill Buddy</SelectItem>
                <SelectItem value="emotional_support">Emotional Support</SelectItem>
                <SelectItem value="formal">Formal & Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reply Length</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ultra_short">Ultra short (1 line)</SelectItem>
                <SelectItem value="short">Short (WhatsApp style)</SelectItem>
                <SelectItem value="balanced">Balanced (default)</SelectItem>
                <SelectItem value="detailed">Detailed explanations</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-switch (smart)</SelectItem>
                <SelectItem value="yaar">Yaar (classmate)</SelectItem>
                <SelectItem value="mentor">Mentor (Biro Guru)</SelectItem>
                <SelectItem value="bhai">Bhai (emotional support)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Thinking Steps</Label>
              <p className="text-xs text-muted-foreground">AI dikhayega kaise socha (slow but transparent)</p>
            </div>
            <Switch checked={showThinking} onCheckedChange={setShowThinking} />
          </div>
          <div>
            <Label>Custom Instructions</Label>
            <Textarea value={custom} onChange={(e) => setCustom(e.target.value)}
              placeholder="E.g. Hindi mein zyada baat karo, emojis kam, mujhe morning person samjho..."
              maxLength={500} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};