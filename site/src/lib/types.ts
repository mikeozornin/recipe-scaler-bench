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
  agent: string;
  model: string;
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
