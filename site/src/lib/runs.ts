import runsData from '../../data/runs.json';
import type { Locale, QualityTier, Run } from './types';

export const runs = runsData as Run[];

export function getRunById(id: string): Run | undefined {
  return runs.find((r) => r.id === id);
}

export function sortedRuns(list: Run[] = runs): Run[] {
  return [...list].sort((a, b) => {
    if (a.tool !== b.tool) return a.tool.localeCompare(b.tool);
    if (a.agent !== b.agent) return a.agent.localeCompare(b.agent);
    return a.model.localeCompare(b.model);
  });
}

export function getAdjacentRuns(id: string): { prev: Run | null; next: Run | null } {
  const list = sortedRuns();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}

export function runHasImages(run: Run): boolean {
  return Boolean(run.images.all || run.images.desktop || run.images.mobile || run.images.promo);
}

export function primaryThumbFile(run: Run): string | null {
  const name = run.images.all || run.images.desktop || run.images.mobile || run.images.promo;
  if (!name) return null;
  return name.replace(/@2x\.png$/, '.webp');
}

export function fullImagePath(file: string, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${b}/images/full/${file}`;
}

export function thumbImagePath(file: string, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const webp = file.endsWith('.webp') ? file : file.replace(/@2x\.png$/, '.webp');
  return `${b}/images/thumbs/${webp}`;
}

export function runHref(id: string, locale: Locale, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  if (locale === 'en') return `${b}/en/run/${id}/`;
  return `${b}/run/${id}/`;
}

export function homeHref(locale: Locale, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return locale === 'en' ? `${b}/en/` : `${b}/`;
}

export function aboutHref(locale: Locale, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return locale === 'en' ? `${b}/en/about/` : `${b}/about/`;
}

/** Map a pathname to the other locale, preserving query/hash when provided. */
export function switchLocaleHref(
  pathname: string,
  base: string,
  target: Locale,
  search = '',
  hash = '',
): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  let path = pathname;
  if (path.startsWith(b)) path = path.slice(b.length) || '/';
  if (!path.startsWith('/')) path = `/${path}`;

  const isEn = path === '/en' || path.startsWith('/en/');
  let rest = isEn ? path.slice(3) || '/' : path;
  if (!rest.startsWith('/')) rest = `/${rest}`;
  if (rest === '') rest = '/';

  const qs =
    !search || search === '?'
      ? ''
      : search.startsWith('?')
        ? search
        : `?${search}`;
  const frag = !hash || hash === '#' ? '' : hash.startsWith('#') ? hash : `#${hash}`;

  let href: string;
  if (target === 'en') {
    href = rest === '/' ? `${b}/en/` : `${b}/en${rest.endsWith('/') ? rest : `${rest}/`}`;
  } else {
    href = rest === '/' ? `${b}/` : `${b}${rest.endsWith('/') ? rest : `${rest}/`}`;
  }
  return `${href}${qs}${frag}`;
}

export function kpis(list: Run[] = runs) {
  const withImages = list.filter(runHasImages).length;
  let imageCount = 0;
  for (const r of list) {
    imageCount += Object.values(r.images).filter(Boolean).length;
  }
  return {
    runs: list.length,
    withImages,
    imageSlots: imageCount,
    agents: new Set(list.map((r) => r.agent)).size,
    paper: list.filter((r) => r.tool === 'paper').length,
    figma: list.filter((r) => r.tool === 'figma').length,
  };
}

export const TIER_ORDER: QualityTier[] = ['fancy', 'mid', 'weak', 'failed_tools', 'unknown'];
