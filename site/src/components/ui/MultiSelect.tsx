import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SelectOption } from './Select';

type Props = {
  /** Exposed as data-select-name so the prepaint script can show the URL's label early. */
  name?: string;
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  /** Button label when nothing is selected. */
  emptyLabel: string;
  'aria-label'?: string;
  className?: string;
};

export function MultiSelect({
  name,
  value,
  options,
  onChange,
  emptyLabel,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const firstSelected = options.find((o) => value.includes(o.value));

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

  // Keep option order in the value so the URL doesn't depend on click order.
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange(options.map((o) => o.value).filter((x) => next.includes(x)));
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)} data-select-name={name}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] px-3 text-left text-sm text-[oklch(var(--foreground))] transition hover:bg-[oklch(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--brand)/0.35)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Selected labels joined by ", "; the prepaint script toggles the same spans. */}
        <span className="truncate">
          <span data-opt="" className={cn(firstSelected && 'hidden')}>
            {emptyLabel}
          </span>
          {options.map((opt) => (
            <span
              key={opt.value}
              data-opt={opt.value}
              className={cn(
                !value.includes(opt.value) && 'hidden',
                opt !== firstSelected && "before:content-[',_']",
              )}
            >
              {opt.label}
            </span>
          ))}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-40 max-h-64 w-full overflow-auto rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] p-1 shadow-lg"
        >
          {options.map((opt) => {
            const isActive = value.includes(opt.value);
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
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-[oklch(var(--border))]',
                      isActive && 'border-[oklch(var(--foreground))]',
                    )}
                  >
                    <Check size={12} className={cn(isActive ? 'opacity-100' : 'opacity-0')} />
                  </span>
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
