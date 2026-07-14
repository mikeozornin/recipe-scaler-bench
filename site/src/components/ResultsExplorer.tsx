import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUpDown, Check, LayoutGrid, List } from 'lucide-react';
import type { Locale, QualityTier, Run } from '../lib/types';
import { t } from '../lib/i18n';
import { getPrefs, setPrefs, type SortKey, type ViewMode } from '../lib/prefs';
import {
  DEFAULT_FILTER,
  filterAndSortRuns,
  filterToQuery,
  queryToFilter,
  runHrefWithFilter,
  type RunFilter,
} from '../lib/filter';
import { primaryThumbFile, TIER_ORDER, thumbImagePath } from '../lib/runs';
import { highlightText, tokenizeQuery } from '../lib/search';
import { cn } from '../lib/utils';
import { Select } from './ui/Select';

export type ExplorerKpis = {
  runs: number;
  imageSlots: number;
  agents: number;
  costSpreadValue: string;
  costSpreadLabel: string;
  runsLabel: string;
  imagesLabel: string;
  agentsLabel: string;
};

type Props = {
  runs: Run[];
  locale: Locale;
  base: string;
  kpis: ExplorerKpis;
  /** SSR seed from the request URL (and cookie for view) — avoids filter/view flash. */
  initialFilter?: RunFilter;
  initialView?: ViewMode;
};

function nonempty(value: string | null | undefined): string {
  const v = value?.trim() || '';
  return !v || v === '—' ? '' : v;
}

function formatCostTokens(run: Run): string {
  return [nonempty(run.cost), nonempty(run.tokens)].filter(Boolean).join(' · ');
}

/** Drop estimate tildes: "~19 min" → "19 min" */
function formatTime(time: string | null | undefined): string {
  const v = nonempty(time);
  return v ? v.replace(/^~\s*/, '').trim() : '';
}

/** Cost · tokens · time — omit missing parts (no leading "— ·"). */
function formatRunMeta(run: Run): string {
  const parts = [formatCostTokens(run), formatTime(run.time)].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

/** «Opus 4.7, xhigh (Claude Code), paper» */
function formatRunTitle(run: Run): string {
  return `${run.model} (${run.agent}), ${run.tool}`;
}

const runLinkClass = 'run-link font-medium leading-snug';

const galleryGridClass =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** Consecutive runs sharing a tier → one row group (for tier sorts in gallery). */
function groupRunsByTier(list: Run[]): Run[][] {
  const groups: Run[][] = [];
  for (const run of list) {
    const last = groups[groups.length - 1];
    if (last && last[0].tier === run.tier) {
      last.push(run);
    } else {
      groups.push([run]);
    }
  }
  return groups;
}

export function ResultsExplorer({
  runs,
  locale,
  base,
  kpis,
  initialFilter = DEFAULT_FILTER,
  initialView = 'table',
}: Props) {
  const m = t(locale);
  const [view, setView] = useState<ViewMode>(initialView);
  const [agent, setAgent] = useState(initialFilter.agent);
  const [tier, setTier] = useState<'all' | QualityTier>(initialFilter.tier);
  const [sort, setSort] = useState<SortKey>(initialFilter.sort);
  const [sortOpen, setSortOpen] = useState(false);
  const [q, setQ] = useState(initialFilter.q);
  const deferredQ = useDeferredValue(q);
  const [filtersStuck, setFiltersStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortMenuId = useId();

  const searchTokens = useMemo(() => tokenizeQuery(deferredQ), [deferredQ]);

  useLayoutEffect(() => {
    const prefs = getPrefs();
    // URL is source of truth; prefs.sort only fills a missing sort param.
    const urlFilter = queryToFilter(new URLSearchParams(window.location.search), prefs.sort);
    flushSync(() => {
      setAgent(urlFilter.agent);
      setTier(urlFilter.tier);
      setSort(urlFilter.sort);
      setQ(urlFilter.q);
      setView(prefs.view);
    });
    document.documentElement.setAttribute('data-view', prefs.view);
    document.documentElement.classList.remove('defer-explorer');
  }, []);

  const setViewPersist = (next: ViewMode) => {
    setView(next);
    document.documentElement.setAttribute('data-view', next);
    setPrefs({ view: next });
  };

  const setSortPersist = (next: SortKey) => {
    setSort(next);
    setPrefs({ sort: next });
  };

  // Keep URL query string in sync with the active filter, so the address bar is
  // shareable/bookmarkable and the run page can read the same filter from the
  // referrer's link target.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = filterToQuery({ agent, tier, q: deferredQ, sort });
    const { pathname, search, hash } = window.location;
    const nextUrl = `${pathname}${qs}${hash}`;
    const current = `${pathname}${search}${hash}`;
    if (nextUrl !== current) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [agent, tier, deferredQ, sort]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    // sticky top-[3.25rem] → px only (rootMargin rejects rem)
    const headerOffsetPx = Math.round(
      parseFloat(getComputedStyle(document.documentElement).fontSize || '16') * 3.25,
    );
    const io = new IntersectionObserver(
      ([entry]) => {
        // When sentinel leaves the top of the viewport (below sticky offset), bar is stuck
        setFiltersStuck(!entry.isIntersecting);
      },
      {
        rootMargin: `-${headerOffsetPx}px 0px 0px 0px`,
        threshold: 0,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  const agents = useMemo(
    () => [...new Set(runs.map((r) => r.agent))].sort((a, b) => a.localeCompare(b)),
    [runs],
  );

  const filter: RunFilter = useMemo(
    () => ({ agent, tier, q: deferredQ, sort }),
    [agent, tier, deferredQ, sort],
  );

  const filtered = useMemo(
    () => filterAndSortRuns(runs, filter, locale),
    [runs, filter, locale],
  );

  const inputClass =
    'h-9 w-full min-w-[12rem] flex-1 rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] px-3 text-sm text-[oklch(var(--foreground))] placeholder:text-[oklch(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--brand)/0.35)]';
  const toolbarIconBtnClass =
    'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] text-[oklch(var(--foreground))] transition hover:bg-[oklch(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--brand)/0.35)]';
  const viewBtnClass =
    'view-btn inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[oklch(var(--border))] text-[oklch(var(--foreground))] transition hover:bg-[oklch(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--brand)/0.35)]';

  const agentOptions = [
    { value: 'all', label: m.filterAll },
    ...agents.map((a) => ({ value: a, label: a })),
  ];
  const hasUnrated = useMemo(() => runs.some((r) => r.tier === 'unknown'), [runs]);
  const tierOptions = [
    { value: 'all', label: m.filterAll },
    ...TIER_ORDER.filter((ti) => ti !== 'unknown' || hasUnrated).map((ti) => ({
      value: ti,
      label: m.tiers[ti],
    })),
  ];
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'cost-desc', label: m.sortCostDesc },
    { value: 'cost-asc', label: m.sortCostAsc },
    { value: 'tier-good', label: m.sortTierGood },
    { value: 'tier-bad', label: m.sortTierBad },
    { value: 'date-desc', label: m.sortDateDesc },
    { value: 'date-asc', label: m.sortDateAsc },
    { value: 'alpha-asc', label: m.sortAlphaAsc },
    { value: 'alpha-desc', label: m.sortAlphaDesc },
  ];
  const activeSortLabel = sortOptions.find((o) => o.value === sort)?.label ?? m.sortLabel;
  const isTierSort = sort === 'tier-good' || sort === 'tier-bad';

  const renderGalleryCard = (run: Run, index: number) => {
    const thumb = primaryThumbFile(run);
    const href = runHrefWithFilter(run.id, locale, base, filter);
    return (
      <a
        key={run.id}
        href={href}
        className="group overflow-hidden rounded-xl bg-[oklch(var(--muted))] transition"
      >
        <div className="aspect-[16/10] bg-[oklch(var(--muted))]">
          {thumb ? (
            <img
              src={thumbImagePath(thumb, base)}
              alt=""
              className="h-full w-full object-cover object-top transition group-hover:scale-[1.02]"
              decoding="async"
              fetchpriority={index === 0 ? 'high' : 'auto'}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[oklch(var(--foreground))]">
              {m.noImage}
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className={`${runLinkClass} text-sm`}>
              {highlightText(formatRunTitle(run), searchTokens)}
            </div>
            {run.tier !== 'unknown' && (
              <span className={`tier-badge tier-${run.tier}`}>{m.tiers[run.tier]}</span>
            )}
          </div>
          <div className="text-caption text-[oklch(var(--foreground))]">
            {formatRunMeta(run)}
          </div>
        </div>
      </a>
    );
  };

  return (
    <div className="results-explorer space-y-4">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <div className="text-[2.25rem] font-bold leading-none tracking-tight">{kpis.runs}</div>
          <div className="text-caption mt-1 text-[oklch(var(--foreground))]">{kpis.runsLabel}</div>
        </div>
        <div>
          <div className="text-[2.25rem] font-bold leading-none tracking-tight">{kpis.imageSlots}</div>
          <div className="text-caption mt-1 text-[oklch(var(--foreground))]">{kpis.imagesLabel}</div>
        </div>
        <div>
          <div className="text-[2.25rem] font-bold leading-none tracking-tight">{kpis.agents}</div>
          <div className="text-caption mt-1 text-[oklch(var(--foreground))]">{kpis.agentsLabel}</div>
        </div>
        <div>
          <div className="text-[2.25rem] font-bold leading-none tracking-tight">{kpis.costSpreadValue}</div>
          <div className="text-caption mt-1 text-[oklch(var(--foreground))]">{kpis.costSpreadLabel}</div>
        </div>
      </div>

      {/* Sentinel: when it scrolls past sticky offset, filters are stuck */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          'sticky top-[3.25rem] z-30 -mx-1 flex flex-wrap gap-2 bg-[oklch(var(--background)/0.92)] px-1 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-[oklch(var(--background)/0.85)]',
          // Stuck: more top breathing room under header, tighter bottom to panel edge
          filtersStuck && 'pt-[14px] pb-1',
        )}
        style={{
          borderBottom: filtersStuck
            ? '1px solid oklch(var(--border) / 0.25)'
            : '1px solid transparent',
        }}
      >
        <input
          className={inputClass}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={m.filterSearch}
          type="search"
        />
        <Select
          value={agent}
          options={agentOptions}
          onChange={setAgent}
          aria-label={m.filterAgent}
          className="min-w-[11rem]"
        />
        <Select
          value={tier}
          options={tierOptions}
          onChange={(v) => setTier(v as typeof tier)}
          aria-label={m.filterTier}
          className="min-w-[11rem]"
        />
        <div ref={sortRef} className="relative shrink-0">
          <button
            type="button"
            className={toolbarIconBtnClass}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-controls={sortMenuId}
            aria-label={`${m.sortLabel}: ${activeSortLabel}`}
            title={activeSortLabel}
            onClick={() => setSortOpen((v) => !v)}
          >
            <ArrowUpDown size={16} />
          </button>
          {sortOpen && (
            <ul
              id={sortMenuId}
              role="listbox"
              className="absolute right-0 top-[calc(100%+0.35rem)] z-40 max-h-72 w-max min-w-[16rem] overflow-auto rounded-md border border-[oklch(var(--border))] bg-[oklch(var(--card))] p-1 shadow-lg"
            >
              {sortOptions.map((opt) => {
                const isActive = opt.value === sort;
                return (
                  <li key={opt.value} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition',
                        isActive
                          ? 'bg-[oklch(var(--accent))] font-medium text-[oklch(var(--accent-foreground))]'
                          : 'text-[oklch(var(--foreground))] hover:bg-[oklch(var(--accent))]',
                      )}
                      onClick={() => {
                        setSortPersist(opt.value);
                        setSortOpen(false);
                      }}
                    >
                      <Check size={14} className={cn('shrink-0', isActive ? 'opacity-100' : 'opacity-0')} />
                      <span>{opt.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div
          className="inline-flex shrink-0 items-center"
          role="group"
          aria-label={`${m.viewTable} / ${m.viewGallery}`}
        >
          <button
            type="button"
            className={cn(viewBtnClass, 'rounded-r-none border-r-0')}
            data-view-btn="table"
            onClick={() => setViewPersist('table')}
            aria-pressed={view === 'table'}
            aria-label={m.viewTable}
            title={m.viewTable}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={cn(viewBtnClass, 'rounded-l-none')}
            data-view-btn="gallery"
            onClick={() => setViewPersist('gallery')}
            aria-pressed={view === 'gallery'}
            aria-label={m.viewGallery}
            title={m.viewGallery}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[oklch(var(--foreground))]">{m.empty}</p>
      ) : view === 'table' ? (
        <div className="flex w-full flex-col">
          {filtered.map((run, index) => {
            const thumb = primaryThumbFile(run);
            const href = runHrefWithFilter(run.id, locale, base, filter);
            return (
              <article
                key={run.id}
                className={`flex items-start gap-4 py-3 ${
                  index > 0 ? 'border-t border-[oklch(var(--border))]' : ''
                }`}
              >
                {/* ~50% of row, keep prev ratio 12/7; cap height at 400px */}
                <a
                  href={href}
                  className="block shrink-0 overflow-hidden rounded-md bg-[oklch(var(--muted))] aspect-[12/7]"
                  style={{
                    width: 'min(50%, calc(400px * 12 / 7))',
                    maxHeight: 400,
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumbImagePath(thumb, base)}
                      alt=""
                      className="h-full w-full object-cover object-top"
                      decoding="async"
                      fetchpriority={index === 0 ? 'high' : 'auto'}
                    />
                  ) : (
                    <span className="text-caption flex h-full items-center justify-center text-[oklch(var(--foreground))]">
                      {m.noImage}
                    </span>
                  )}
                </a>

                <div className="min-w-0 flex-1 space-y-1.5">
                  {/*
                    Flex-wrap by cell width (not page breakpoint): when title +
                    meta don't fit one line, cost/tier drop to the next row.
                  */}
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                    <a
                      href={href}
                      className={`${runLinkClass} min-w-0 flex-[1_1_12rem]`}
                    >
                      {highlightText(formatRunTitle(run), searchTokens)}
                    </a>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="whitespace-nowrap leading-snug">
                        {formatRunMeta(run)}
                      </div>
                      {run.tier !== 'unknown' && (
                        <span className={`tier-badge tier-${run.tier}`}>{m.tiers[run.tier]}</span>
                      )}
                    </div>
                  </div>
                  <p className="leading-snug">
                    {highlightText(run.comment[locale], searchTokens)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : isTierSort ? (
        <div className="flex flex-col gap-4">
          {groupRunsByTier(filtered).map((group, groupIdx) => (
            <div key={group[0].tier} className={galleryGridClass}>
              {group.map((run, idx) => {
                const globalIndex = groupIdx === 0 ? idx : -1;
                return renderGalleryCard(run, globalIndex);
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className={galleryGridClass}>
          {filtered.map((run, idx) => renderGalleryCard(run, idx))}
        </div>
      )}
    </div>
  );
}
