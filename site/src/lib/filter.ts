import type { Locale, QualityTier, Run } from './types';
import type { SortKey } from './prefs';
import { runDateTimestamp, runHref, runs, TIER_ORDER } from './runs';
import { matchesAllTokens, tokenizeQuery } from './search';

export type NavLink = { href: string; label: string } | null;

export type RunFilter = {
  /** 'all' or exact agent name */
  agent: string;
  /** 'all' or a valid QualityTier */
  tier: 'all' | QualityTier;
  /** Raw search query string (pre-tokenization) */
  q: string;
  /** Sort key from SitePrefs */
  sort: SortKey;
};

export const DEFAULT_FILTER: RunFilter = {
  agent: 'all',
  tier: 'all',
  q: '',
  sort: 'tier-good',
};

const VALID_TIERS: Record<string, true> = TIER_ORDER.reduce(
  (acc, t) => {
    acc[t] = true;
    return acc;
  },
  {} as Record<string, true>,
);

const VALID_SORTS: Record<SortKey, true> = {
  'cost-desc': true,
  'cost-asc': true,
  'tier-good': true,
  'tier-bad': true,
  'date-desc': true,
  'date-asc': true,
  'alpha-asc': true,
  'alpha-desc': true,
};

/** «Opus 4.7, xhigh (Claude Code), paper» */
function formatRunTitle(run: Run): string {
  return `${run.model} (${run.agent}), ${run.tool}`;
}

/** USD from "$12.30"; non-dollar / missing → null (sorted last). */
function parseCostUsd(cost: string | null | undefined): number | null {
  if (!cost?.trim()) return null;
  const m = cost.match(/\$\s*([\d.,]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', ''));
  return Number.isFinite(n) ? n : null;
}

function tierRank(tier: QualityTier): number {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? TIER_ORDER.length : i;
}

function compareNullableNumber(a: number | null, b: number | null, desc: boolean): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return desc ? b - a : a - b;
}

export function compareRuns(a: Run, b: Run, sort: SortKey, locale: Locale): number {
  const collator = locale === 'en' ? 'en' : 'ru';
  switch (sort) {
    case 'cost-desc':
      return (
        compareNullableNumber(parseCostUsd(a.cost), parseCostUsd(b.cost), true) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'cost-asc':
      return (
        compareNullableNumber(parseCostUsd(a.cost), parseCostUsd(b.cost), false) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'tier-good':
      return (
        tierRank(a.tier) - tierRank(b.tier) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'tier-bad':
      return (
        tierRank(b.tier) - tierRank(a.tier) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'date-desc':
      return (
        compareNullableNumber(runDateTimestamp(a.runDate), runDateTimestamp(b.runDate), true) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'date-asc':
      return (
        compareNullableNumber(runDateTimestamp(a.runDate), runDateTimestamp(b.runDate), false) ||
        formatRunTitle(a).localeCompare(formatRunTitle(b), collator)
      );
    case 'alpha-asc':
      return formatRunTitle(a).localeCompare(formatRunTitle(b), collator);
    case 'alpha-desc':
      return formatRunTitle(b).localeCompare(formatRunTitle(a), collator);
    default:
      return 0;
  }
}

/** Apply the agent/tier/q predicate, then sort by the filter's sort key. */
export function filterAndSortRuns(list: Run[], filter: RunFilter, locale: Locale): Run[] {
  const tokens = tokenizeQuery(filter.q);
  const filtered = list.filter((r) => {
    if (filter.agent !== 'all' && r.agent !== filter.agent) return false;
    if (filter.tier !== 'all' && r.tier !== filter.tier) return false;
    if (!tokens.length) return true;
    const hay = `${r.agent} ${r.model} ${r.comment.ru} ${r.comment.en}`;
    return matchesAllTokens(hay, tokens);
  });
  return filtered.sort((a, b) => compareRuns(a, b, filter.sort, locale));
}

/** Find prev/next neighbours of `id` inside an already-filtered+sorted list. */
export function adjacentInList(
  list: Run[],
  id: string,
): { prev: Run | null; next: Run | null } {
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}

export function isDefaultFilter(filter: RunFilter): boolean {
  return (
    filter.agent === DEFAULT_FILTER.agent &&
    filter.tier === DEFAULT_FILTER.tier &&
    filter.q === DEFAULT_FILTER.q &&
    filter.sort === DEFAULT_FILTER.sort
  );
}

/** Encode a filter as a URL query string (always leading '?', even when empty). */
export function filterToQuery(filter: RunFilter): string {
  const params = new URLSearchParams();
  params.set('agent', filter.agent);
  params.set('tier', filter.tier);
  params.set('q', filter.q);
  params.set('sort', filter.sort);
  return `?${params.toString()}`;
}

/**
 * Decode URLSearchParams into a RunFilter. Missing or invalid values fall back
 * to the supplied `fallbackSort` (so callers can pass the persisted SitePrefs sort).
 */
export function queryToFilter(params: URLSearchParams, fallbackSort: SortKey): RunFilter {
  const agent = params.get('agent');
  const tier = params.get('tier');
  const q = params.get('q') ?? '';
  const sortRaw = params.get('sort');

  const sort: SortKey = sortRaw && (sortRaw in VALID_SORTS as Record<string, true>)
    ? (sortRaw as SortKey)
    : fallbackSort;

  return {
    agent: agent && agent !== '' ? agent : 'all',
    tier: tier && tier in VALID_TIERS ? (tier as QualityTier) : 'all',
    q,
    sort,
  };
}

/** Build a run link that carries the active filter in its query string. */
export function runHrefWithFilter(
  id: string,
  locale: Locale,
  base: string,
  filter: RunFilter,
): string {
  return `${runHref(id, locale, base)}${filterToQuery(filter)}`;
}

/**
 * SSR helper: resolve prev/next links for a run page based on the URL's filter
 * query string. Falls back to defaults when the query is empty.
 *
 *   const { prev, next } = getAdjacentRunsForPage(
 *     Astro.url.searchParams, run.id, locale, base, getPrefs().sort,
 *   );
 */
export function getAdjacentRunsForPage(
  searchParams: URLSearchParams,
  currentId: string,
  locale: Locale,
  base: string,
  fallbackSort: SortKey,
): { prev: NavLink; next: NavLink } {
  const filter = queryToFilter(searchParams, fallbackSort);
  const list = filterAndSortRuns(runs, filter, locale);
  const { prev, next } = adjacentInList(list, currentId);
  const qs = filterToQuery(filter);

  const toLink = (run: { id: string; model: string; agent: string } | null): NavLink => {
    if (!run) return null;
    return {
      href: runHref(run.id, locale, base) + qs,
      label: `${run.model} (${run.agent})`,
    };
  };

  return { prev: toLink(prev), next: toLink(next) };
}

