import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { X } from 'lucide-react';

type Item = { src: string; label: string };

/**
 * @2x assets: CSS size = natural / 2 (retina density).
 * May shrink further via maxWidth: 100%; never larger than 50% of pixel size.
 */
function RetinaImage({
  src,
  alt,
  className,
  onClick,
  fitViewport,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  /** For lightbox overlay: also cap by viewport */
  fitViewport?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    // Until measured: don't paint at full pixel size (would look 2× too big)
    maxWidth: '100%',
    height: 'auto',
    width: 'auto',
  });

  const applySize = () => {
    const el = ref.current;
    if (!el?.naturalWidth) return;
    // @2x → 50% CSS size (double density). maxWidth 100% allows shrink, not grow.
    const cssW = el.naturalWidth / 2;
    setStyle({
      width: cssW,
      maxWidth: '100%',
      height: 'auto',
      maxHeight: fitViewport ? '90vh' : undefined,
      objectFit: 'contain',
    });
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.complete && el.naturalWidth) {
      applySize();
    }
  }, [src, fitViewport]);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onLoad={applySize}
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
            <RetinaImage src={item.src} alt={item.label} className="block" />
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
            src={active.src}
            alt={active.label}
            fitViewport
            className="block"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
