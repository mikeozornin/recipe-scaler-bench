/**
 * Model release dates (YYYY-MM-DD) for sorting runs by model age.
 * Prefer official announce dates; OpenRouter listing date as fallback.
 * Keys are lowercase substrings matched against the run's model string
 * (longest key wins). Unknown / router modes return null → sorted last.
 */
const MODEL_RELEASE_DATES: Record<string, string> = {
  // Anthropic (Wikipedia / Anthropic)
  'sonnet 4.5': '2025-09-29',
  'haiku 4.5': '2025-10-15',
  'opus 4.6': '2026-02-05',
  'opus 4.7': '2026-04-16',
  'opus 4.8': '2026-05-28',
  fable: '2026-06-09',

  // OpenAI (OpenRouter listing ≈ public availability)
  'gpt 5.4': '2026-03-05',
  'gpt 5.5': '2026-04-24',
  'gpt 5.6 sol': '2026-07-09',
  'gpt 5.6': '2026-07-09',

  // Google
  'gemini 3.1 pro': '2026-02-19',
  'gemini 3.5 flash': '2026-05-19',

  // xAI
  'grok 4.3': '2026-04-30',
  'grok 4.5': '2026-07-08',
  'grok build 0.1': '2026-05-20',
  'grok build': '2026-05-20',

  // Z.ai
  'glm 5.3': '2026-08-14',
  'glm 5.1': '2026-04-07',

  // DeepSeek
  'deepseek v4 pro': '2026-04-24',
  'deepseek v4': '2026-04-24',

  // Qwen / Alibaba
  'qwen 3.5 397': '2026-02-16',
  'qwen 3.5': '2026-02-16',
  'qwen 3.6 max': '2026-04-27',
  'qwen 3.6': '2026-04-27',
  'qwen 3.7 max': '2026-05-21',
  'qwen 3.7': '2026-05-21',

  // Moonshot
  'kimi 2.6': '2026-04-20',
  'kimi k2.6': '2026-04-20',
  'kimi k3': '2026-07-16',

  // Xiaomi
  'mimo v2.5 pro': '2026-04-22',
  'mimo v2.5': '2026-04-22',

  // MiniMax
  'minimax 2.7': '2026-03-18',
  'minimax m2.7': '2026-03-18',
  'minimax m3': '2026-05-31',
  'minimax 3': '2026-05-31',

  // NVIDIA
  'nemotron 3 ultra': '2026-06-04',

  // Tencent
  'hy3 preview': '2026-04-22',
  hy3: '2026-04-22',

  // Cursor (Composer blog)
  'composer 2.5': '2026-05-18',
  'composer 2': '2026-03-19',
};

/** Keys sorted longest-first so more specific families win. */
const RELEASE_KEYS = Object.keys(MODEL_RELEASE_DATES).sort((a, b) => b.length - a.length);

/** Normalize model label for matching (drop effort, provider notes). */
function normalizeModelLabel(model: string): string {
  return model
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve release date for a run model string, or null if unknown
 * (Auto / Default / router modes, etc.).
 */
export function getModelReleaseDate(model: string): string | null {
  const n = normalizeModelLabel(model);
  // Agent router / opaque defaults — not real model releases
  if (
    n === 'auto' ||
    n === 'default' ||
    n === 'default thinking' ||
    n.startsWith('default ')
  ) {
    return null;
  }
  for (const key of RELEASE_KEYS) {
    if (n.includes(key)) return MODEL_RELEASE_DATES[key];
  }
  return null;
}

/** Epoch ms for compare; null → sorted last. */
export function modelReleaseTimestamp(model: string): number | null {
  const d = getModelReleaseDate(model);
  if (!d) return null;
  const t = Date.parse(d + 'T00:00:00Z');
  return Number.isFinite(t) ? t : null;
}
