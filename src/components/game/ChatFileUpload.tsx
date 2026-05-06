import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, FileText, Film, Music, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatFileUploadProps {
  onFileUploaded: (url: string, type: string, name: string) => void;
  className?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const extractVideoFrames = async (file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not read video frames'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(960, video.videoWidth || 960);
    canvas.height = Math.round(canvas.width * ((video.videoHeight || 540) / (video.videoWidth || 960)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const stamps = [0.1, 0.5, 0.9].map(p => Math.max(0, Math.min(duration - 0.05, duration * p)));
    const frames: { blob: Blob; name: string }[] = [];
    for (const [idx, stamp] of stamps.entries()) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error('Could not seek video'));
        video.currentTime = stamp;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (blob) frames.push({ blob, name: `${file.name} frame ${idx + 1}.jpg` });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const ChatFileUpload = ({ onFileUploaded, className }: ChatFileUploadProps) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Max 20MB per file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setShowMenu(false);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `chat-uploads/${user.id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(path);

      const fileType = file.type.startsWith('image')
        ? 'image'
        : file.type.startsWith('video')
          ? 'video'
          : file.type.startsWith('audio')
            ? 'audio'
            : 'document';

      onFileUploaded(urlData.publicUrl, fileType, file.name);
      if (fileType === 'video') {
        const frames = await extractVideoFrames(file).catch(() => []);
        for (const frame of frames) {
          const framePath = `chat-uploads/${user.id}/${Date.now()}-${frame.name.replace(/[^a-z0-9._-]/gi, '-')}`;
          const { error: frameError } = await supabase.storage
            .from('chat-uploads')
            .upload(framePath, frame.blob, { contentType: 'image/jpeg', upsert: false });
          if (!frameError) {
            const { data: frameUrl } = supabase.storage.from('chat-uploads').getPublicUrl(framePath);
            onFileUploaded(frameUrl.publicUrl, 'image', frame.name);
          }
        }
      }
      toast({ title: 'File uploaded ✅' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        onChange={handleFileSelect}
      />

      <Button variant="ghost" size="icon" onClick={() => !isUploading && setShowMenu(!showMenu)} className="h-9 w-9" disabled={isUploading}>
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      </Button>

      {showMenu && (
        <div className="absolute bottom-12 left-0 glass-panel border border-white/20 rounded-xl p-2 space-y-1 min-w-[150px] shadow-xl z-10">
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'image/*'); fileRef.current?.click(); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm"><Image className="w-4 h-4 text-primary" /> Photo</button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'video/*'); fileRef.current?.click(); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm"><Film className="w-4 h-4 text-accent" /> Video</button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'audio/*'); fileRef.current?.click(); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm"><Music className="w-4 h-4 text-muted-foreground" /> Audio</button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx'); fileRef.current?.click(); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm"><FileText className="w-4 h-4 text-primary" /> Document</button>
          <button onClick={() => setShowMenu(false)} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm text-muted-foreground"><X className="w-4 h-4" /> Cancel</button>
        </div>
      )}
    </div>
  );
};

export const ChatFilePreview = ({ url, type, name }: { url: string; type: string; name: string }) => {
  if (type === 'image') {
    return <img src={url} alt={name} className="max-w-[250px] max-h-[200px] rounded-lg object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />;
  }
  if (type === 'video') {
    return <video src={url} controls className="max-w-[250px] max-h-[200px] rounded-lg" />;
  }
  if (type === 'audio') {
    return <audio src={url} controls className="w-full max-w-[250px]" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
      <FileText className="w-5 h-5 text-primary" />
      <span className="text-sm truncate max-w-[180px]">{name}</span>
    </a>
  );
};
