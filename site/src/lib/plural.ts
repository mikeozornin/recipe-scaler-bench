import type { Locale } from './types';

/** Russian plural forms: one / few / many */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function pluralEn(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function kpiRunsLabel(n: number, locale: Locale): string {
  if (locale === 'en') return pluralEn(n, 'run', 'runs');
  return pluralRu(n, 'прогон', 'прогона', 'прогонов');
}

export function kpiImagesLabel(n: number, locale: Locale): string {
  if (locale === 'en') return pluralEn(n, 'screen', 'screens');
  return pluralRu(n, 'экран', 'экрана', 'экранов');
}

export function kpiAgentsLabel(n: number, locale: Locale): string {
  if (locale === 'en') return pluralEn(n, 'agent', 'agents');
  return pluralRu(n, 'агент', 'агента', 'агентов');
}
