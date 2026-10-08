import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { X } from 'lucide-react';

type Item = { src: string; label: string; width: number; height: number };

/**
 * @2x assets: CSS size = natural / 2 (retina density).
 * May shrink further via maxWidth: 100%; never larger than 50% of pixel size.
 * Size comes from the build-time manifest, so the box is reserved before load.
 */
function RetinaImage({
  item,
  className,
  onClick,
  fitViewport,
}: {
  item: Item;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  /** For lightbox overlay: also cap by viewport */
  fitViewport?: boolean;
}) {
  const style: CSSProperties = {
    width: item.width ? item.width / 2 : 'auto',
    maxWidth: '100%',
    height: 'auto',
    maxHeight: fitViewport ? '90vh' : undefined,
    objectFit: 'contain',
  };

  return (
    <img
      src={item.src}
      alt={item.label}
      width={item.width || undefined}
      height={item.height || undefined}
      decoding="async"
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}

export function ImageLightbox({ items }: { items: Item[] }) {
  const [active, setActive] = useState<Item | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [active]);

  return (
    <>
      <div className="space-y-6">
        {items.map((item) => (
          <button
            key={item.src}
            type="button"
            className="inline-block max-w-full overflow-hidden rounded-xl border border-[oklch(var(--border))] bg-[oklch(var(--muted))] p-0 text-left align-top"
            onClick={() => setActive(item)}
          >
            <RetinaImage item={item} className="block" />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setActive(null)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <RetinaImage
            item={active}
            fitViewport
            className="block"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
