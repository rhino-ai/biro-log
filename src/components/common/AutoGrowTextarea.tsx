import { forwardRef, useEffect, useRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

/**
 * WhatsApp-style textarea that grows with the content up to maxRows, then scrolls.
 * Keeps all typed words visible as user types.
 */
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ minRows = 1, maxRows = 6, className, value, onChange, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const cs = window.getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight) || 20;
      const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const maxH = lineHeight * maxRows + paddingY + borderY;
      const next = Math.min(el.scrollHeight, maxH);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
    };

    useEffect(() => { resize(); }, [value]);
    useEffect(() => { resize(); }, []);

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        onChange={(e) => { onChange?.(e); resize(); }}
        className={cn(
          'flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
AutoGrowTextarea.displayName = 'AutoGrowTextarea';

export default AutoGrowTextarea;