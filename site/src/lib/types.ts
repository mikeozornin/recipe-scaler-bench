export type QualityTier = 'fancy' | 'mid' | 'weak' | 'failed_tools' | 'unknown';
export type Tool = 'paper' | 'figma';
export type Locale = 'ru' | 'en';

export type RunImages = {
  all?: string;
  desktop?: string;
  mobile?: string;
  promo?: string;
};

export type Run = {
  id: string;
  tool: Tool;
  /** Harness: Claude Code, Cursor, OpenCode, Pi… */
  agent: string;
  /** Model name only, without reasoning level or skills */
  model: string;
  /** Reasoning / effort level as set in the harness (xhigh, max…); null if default or unknown */
  reasoning: string | null;
  /** Skills loaded for the run (Frontend Design, Hallmark…) */
  skills: string[];
  /** Experiment day (YYYY-MM-DD, Europe/Moscow), from Paper file createdAt */
  runDate?: string;
  time: string | null;
  tokens: string | null;
  cost: string | null;
  tier: QualityTier;
  comment: { ru: string; en: string };
  /** Basename of PNG files under images/full/, without path */
  images: RunImages;
};

export type ImageMeta = {
  width: number;
  height: number;
  bytes: number;
};
