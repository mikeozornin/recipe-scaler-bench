import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  'aria-label'?: string;
  className?: string;
};

export function Select({ value, options, onChange, className, 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative min-w-[9.5rem]', className)}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] px-3 text-left text-sm text-[oklch(var(--foreground))] transition hover:bg-[oklch(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--brand)/0.35)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown size={14} className={cn('shrink-0 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-40 max-h-64 w-full min-w-[12rem] overflow-auto rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] p-1 shadow-lg"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition',
                    isActive
                      ? 'bg-[oklch(var(--accent))] font-medium text-[oklch(var(--accent-foreground))]'
                      : 'text-[oklch(var(--foreground))] hover:bg-[oklch(var(--accent))]',
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check size={14} className={cn('shrink-0', isActive ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
