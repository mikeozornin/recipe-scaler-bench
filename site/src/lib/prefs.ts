import type { Locale } from './types';

/** Single localStorage key for all UI preferences */
export const PREFS_STORAGE_KEY = 'recipe-scaler-bench-prefs';

/** Legacy theme-only key — migrated on first read */
const LEGACY_THEME_KEY = 'prefered-mode';

export type ThemeMode = 'system' | 'light' | 'dark' | 'flashlight';
export type ViewMode = 'table' | 'gallery';
export type SortKey =
  | 'cost-desc'
  | 'cost-asc'
  | 'tier-good'
  | 'tier-bad'
  | 'alpha-asc'
  | 'alpha-desc';

export type SitePrefs = {
  theme: ThemeMode;
  /** Set only when the user explicitly switches language */
  locale?: Locale;
  view: ViewMode;
  sort: SortKey;
};

export const DEFAULT_PREFS: SitePrefs = {
  theme: 'system',
  view: 'table',
  sort: 'tier-good',
};

const VALID_THEME: Record<ThemeMode, true> = {
  system: true,
  light: true,
  dark: true,
  flashlight: true,
};

const VALID_VIEW: Record<ViewMode, true> = {
  table: true,
  gallery: true,
};

const VALID_SORT: Record<SortKey, true> = {
  'cost-desc': true,
  'cost-asc': true,
  'tier-good': true,
  'tier-bad': true,
  'alpha-asc': true,
  'alpha-desc': true,
};

function isTheme(v: unknown): v is ThemeMode {
  return typeof v === 'string' && v in VALID_THEME;
}

function isView(v: unknown): v is ViewMode {
  return typeof v === 'string' && v in VALID_VIEW;
}

function isSort(v: unknown): v is SortKey {
  return typeof v === 'string' && v in VALID_SORT;
}

function isLocale(v: unknown): v is Locale {
  return v === 'ru' || v === 'en';
}

function normalize(raw: unknown): SitePrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const o = raw as Record<string, unknown>;
  const prefs: SitePrefs = {
    theme: isTheme(o.theme) ? o.theme : DEFAULT_PREFS.theme,
    view: isView(o.view) ? o.view : DEFAULT_PREFS.view,
    sort: isSort(o.sort) ? o.sort : DEFAULT_PREFS.sort,
  };
  if (isLocale(o.locale)) prefs.locale = o.locale;
  return prefs;
}

/** Read prefs from localStorage (SSR-safe; returns defaults off-window). */
export function getPrefs(): SitePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));

    // Migrate legacy theme key into the unified object
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (isTheme(legacy)) {
      const migrated: SitePrefs = { ...DEFAULT_PREFS, theme: legacy };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(migrated));
      try {
        localStorage.removeItem(LEGACY_THEME_KEY);
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFS };
}

/** Merge partial prefs into storage and return the full result. */
export function setPrefs(partial: Partial<SitePrefs>): SitePrefs {
  const next: SitePrefs = { ...getPrefs() };
  if (partial.theme !== undefined && isTheme(partial.theme)) next.theme = partial.theme;
  if (partial.view !== undefined && isView(partial.view)) next.view = partial.view;
  if (partial.sort !== undefined && isSort(partial.sort)) next.sort = partial.sort;
  if (partial.locale !== undefined) {
    if (isLocale(partial.locale)) next.locale = partial.locale;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}
