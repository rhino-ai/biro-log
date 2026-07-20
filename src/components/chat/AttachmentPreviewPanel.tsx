import { useEffect, useState } from 'react';
import { X, Send, FileIcon, Download, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PreviewFile = {
  file: File;
  previewUrl: string;
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'file';
};

export function classify(mime: string, name: string): PreviewFile['kind'] {
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(name)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(name)) return 'audio';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'file';
}

/**
 * Composer preview: opens automatically once a file is chosen. WhatsApp/TG-style.
 */
export function AttachmentComposerPreview({
  file,
  caption,
  onCaptionChange,
  onSend,
  onCancel,
  onAddMore,
  sending,
}: {
  file: PreviewFile;
  caption: string;
  onCaptionChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onAddMore?: () => void;
  sending?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && !e.shiftKey && (e.metaKey || e.ctrlKey || document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        onSend();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onSend]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex flex-col animate-in fade-in duration-150">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
          <span className="text-white text-sm truncate max-w-[60vw]">{file.file.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddMore && (
            <Button variant="ghost" size="icon" onClick={onAddMore} className="text-white hover:bg-white/10" title="Add another">
              <ImagePlus className="w-5 h-5" />
            </Button>
          )}
          <span className="text-[10px] text-white/60">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
        {file.kind === 'image' && (
          <img src={file.previewUrl} alt={file.file.name} className="max-h-full max-w-full rounded-lg shadow-2xl" />
        )}
        {file.kind === 'video' && (
          <video src={file.previewUrl} controls playsInline className="max-h-full max-w-full rounded-lg bg-black" />
        )}
        {file.kind === 'audio' && (
          <div className="w-full max-w-md space-y-3 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center text-4xl">🎵</div>
            <p className="text-white text-sm truncate">{file.file.name}</p>
            <audio src={file.previewUrl} controls className="w-full" />
          </div>
        )}
        {file.kind === 'pdf' && (
          <object data={file.previewUrl} type="application/pdf" className="w-full max-w-3xl h-full min-h-[60vh] rounded-lg bg-white">
            <div className="p-6 text-center text-white">
              <FileIcon className="w-16 h-16 mx-auto mb-2" />
              <p className="text-sm">{file.file.name}</p>
            </div>
          </object>
        )}
        {file.kind === 'file' && (
          <div className="flex flex-col items-center gap-3 text-white">
            <FileIcon className="w-24 h-24" />
            <p className="text-sm truncate max-w-xs">{file.file.name}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex gap-2 items-center max-w-3xl mx-auto">
          <Input
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Add a caption..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          />
          <Button onClick={onSend} disabled={sending} className="bg-primary shrink-0" size="icon" aria-label="Send">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen media viewer for attachments already in the transcript.
 */
export function AttachmentViewer({
  url,
  name,
  kind,
  onClose,
  loading,
}: {
  url: string | null;
  name: string;
  kind: PreviewFile['kind'];
  onClose: () => void;
  loading?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-150">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
          <span className="text-white text-sm truncate max-w-[60vw]">{name}</span>
        </div>
        {url && (
          <a href={url} download={name} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" title="Download">
              <Download className="w-5 h-5" />
            </Button>
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {loading || !url ? (
          <Loader2 className="w-8 h-8 animate-spin text-white/80" />
        ) : kind === 'image' ? (
          <img src={url} alt={name} className="max-h-full max-w-full rounded-lg shadow-2xl" />
        ) : kind === 'video' ? (
          <video src={url} controls autoPlay playsInline className={cn('max-h-full max-w-full rounded-lg bg-black')} />
        ) : kind === 'audio' ? (
          <div className="w-full max-w-md space-y-3 text-center text-white">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center text-4xl">🎵</div>
            <p className="text-sm truncate">{name}</p>
            <audio src={url} controls autoPlay className="w-full" />
          </div>
        ) : kind === 'pdf' ? (
          <object data={url} type="application/pdf" className="w-full h-full rounded-lg bg-white" />
        ) : (
          <a href={url} download={name} className="flex flex-col items-center gap-3 text-white">
            <FileIcon className="w-24 h-24" />
            <p className="text-sm">{name}</p>
            <span className="text-xs underline">Download</span>
          </a>
        )}
      </div>
    </div>
  );
}