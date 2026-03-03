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

const ALLOWED_TYPES = {
  'image/*': { icon: Image, label: 'Image', maxSize: 10 * 1024 * 1024 },
  'video/*': { icon: Film, label: 'Video', maxSize: 50 * 1024 * 1024 },
  'audio/*': { icon: Music, label: 'Audio', maxSize: 20 * 1024 * 1024 },
  'application/pdf': { icon: FileText, label: 'PDF', maxSize: 20 * 1024 * 1024 },
  'application/msword': { icon: FileText, label: 'Doc', maxSize: 20 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'Doc', maxSize: 20 * 1024 * 1024 },
};

export const ChatFileUpload = ({ onFileUploaded, className }: ChatFileUploadProps) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 50MB allowed', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setShowMenu(false);

    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(path, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(path);

      const fileType = file.type.startsWith('image') ? 'image' 
        : file.type.startsWith('video') ? 'video'
        : file.type.startsWith('audio') ? 'audio' 
        : 'document';

      onFileUploaded(urlData.publicUrl, fileType, file.name);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input ref={fileRef} type="file" className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        onChange={handleFileSelect} />
      
      <Button variant="ghost" size="icon" onClick={() => isUploading ? null : setShowMenu(!showMenu)}
        className="h-9 w-9" disabled={isUploading}>
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      </Button>

      {showMenu && (
        <div className="absolute bottom-12 left-0 glass-panel border border-white/20 rounded-xl p-2 space-y-1 min-w-[140px] shadow-xl z-10">
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'image/*'); fileRef.current?.click(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm">
            <Image className="w-4 h-4 text-green-400" /> Photo
          </button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'video/*'); fileRef.current?.click(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm">
            <Film className="w-4 h-4 text-blue-400" /> Video
          </button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', 'audio/*'); fileRef.current?.click(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm">
            <Music className="w-4 h-4 text-purple-400" /> Audio
          </button>
          <button onClick={() => { fileRef.current?.setAttribute('accept', '.pdf,.doc,.docx'); fileRef.current?.click(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm">
            <FileText className="w-4 h-4 text-amber-400" /> Document
          </button>
          <button onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/50 text-sm text-muted-foreground">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// Render uploaded file in chat
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
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
      <FileText className="w-5 h-5 text-amber-400" />
      <span className="text-sm truncate max-w-[180px]">{name}</span>
    </a>
  );
};
