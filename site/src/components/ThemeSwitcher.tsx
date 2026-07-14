import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LightbulbOff, Moon, Sun, SunMoon } from 'lucide-react';
import type { Locale } from '../lib/types';
import { t } from '../lib/i18n';
import { getPrefs, setPrefs, type ThemeMode } from '../lib/prefs';

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode) {
  if (mode === 'dark') return 'dark';
  if (mode === 'light' || mode === 'flashlight') return 'light';
  return prefersDark() ? 'dark' : 'light';
}

export function ThemeSwitcher({ locale }: { locale: Locale }) {
  const m = t(locale);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ThemeMode>('system');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMode(getPrefs().theme);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme-resolved', resolveTheme(mode));

    let raf = 0;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let lastMoveX = lastX;
    let lastMoveY = lastY;
    let lastMoveTime = performance.now();
    let movementEnergy = 0;
    let smoothedMotion = 0.18;
    let candleTilt = 0;
    let lastFrame = 0;

    const setPos = (x: number, y: number, tilt = candleTilt) => {
      root.style.setProperty('--flashlight-x', `${Math.round(x)}px`);
      root.style.setProperty('--flashlight-y', `${Math.round(y)}px`);
      const angle = (tilt * Math.PI) / 180;
      const topDistance = 14;
      root.style.setProperty('--flashlight-glow-x', `${Math.round(x + Math.sin(angle) * topDistance)}px`);
      root.style.setProperty('--flashlight-glow-y', `${Math.round(y - Math.cos(angle) * topDistance)}px`);
    };

    const tick = (now: number) => {
      if (root.getAttribute('data-theme-mode') !== 'flashlight') return;
      if (!lastFrame) lastFrame = now;
      const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
      lastFrame = now;
      movementEnergy = Math.max(0, movementEnergy - dt * 1.8);
      candleTilt += (0 - candleTilt) * Math.min(1, dt * 9);
      const targetMotion = 0.18 + movementEnergy * 0.42;
      smoothedMotion += (targetMotion - smoothedMotion) * Math.min(1, dt * 10);
      const tsec = now * 0.001;
      const noise =
        Math.sin(tsec * 7.1 + 0.4) * 0.45 +
        Math.sin(tsec * 12.7 + 1.7) * 0.35 +
        Math.sin(tsec * 21.3 + 2.8) * 0.2;
      const flicker = Math.min(0.68, Math.max(0.3, 0.3 + smoothedMotion * 0.62 + noise * 0.05));
      const radius = Math.min(146, Math.max(122, 122 + smoothedMotion * 34 + noise * 6));
      const warmth = Math.min(0.38, Math.max(0.2, 0.2 + smoothedMotion * 0.24 + noise * 0.05));
      root.style.setProperty('--flashlight-flicker', flicker.toFixed(3));
      root.style.setProperty('--flashlight-motion', smoothedMotion.toFixed(3));
      root.style.setProperty('--flashlight-radius', `${radius.toFixed(1)}px`);
      root.style.setProperty('--flashlight-warmth', warmth.toFixed(3));
      root.style.setProperty('--flashlight-candle-tilt', `${candleTilt.toFixed(2)}deg`);
      setPos(lastX, lastY, candleTilt);
      raf = requestAnimationFrame(tick);
    };

    const onMove = (x: number, y: number) => {
      lastX = x;
      lastY = y;
      if (mode !== 'flashlight') return;
      const now = performance.now();
      const dx = x - lastMoveX;
      const dy = y - lastMoveY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = Math.max(1, now - lastMoveTime);
      const speed = dist / delta;
      const normalized = Math.min(1, Math.max(0, (speed - 0.1) / 0.9));
      movementEnergy = Math.min(1, Math.max(0, movementEnergy * 0.72 + normalized * 0.85));
      if (dist > 0.01) {
        const targetTilt = Math.min(18, Math.max(-18, (-dx / dist) * normalized * 18));
        candleTilt = Math.min(18, Math.max(-18, candleTilt * 0.55 + targetTilt * 0.45));
      }
      lastMoveX = x;
      lastMoveY = y;
      lastMoveTime = now;
      setPos(x, y, candleTilt);
    };

    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    if (mode === 'flashlight') {
      setPos(lastX, lastY);
      raf = requestAnimationFrame(tick);
      window.addEventListener('mousemove', mm, { passive: true });
      window.addEventListener('touchmove', tm, { passive: true });
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      if (mode === 'system') {
        root.setAttribute('data-theme-resolved', resolveTheme('system'));
      }
    };
    mql.addEventListener('change', onScheme);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('touchmove', tm);
      mql.removeEventListener('change', onScheme);
    };
  }, [mode]);

  const select = (next: ThemeMode) => {
    setMode(next);
    setPrefs({ theme: next });
    setOpen(false);
  };

  const Icon =
    mode === 'light' ? Sun : mode === 'dark' ? Moon : mode === 'flashlight' ? LightbulbOff : SunMoon;

  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'system', label: m.themeSystem, icon: SunMoon },
    { value: 'light', label: m.themeLight, icon: Sun },
    { value: 'dark', label: m.themeDark, icon: Moon },
    { value: 'flashlight', label: m.themeFlashlight, icon: LightbulbOff },
  ];

  return (
    <div ref={rootRef} className="theme-switcher" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="theme-toggle-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={m.themeLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon size={16} />
        <ChevronDown size={12} />
      </button>
      <div className="theme-menu" id={menuId} role="menu" hidden={!open}>
        {options.map((opt) => {
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              className="theme-option"
              role="menuitemradio"
              aria-checked={mode === opt.value}
              onClick={() => select(opt.value)}
            >
              <OptIcon size={16} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
