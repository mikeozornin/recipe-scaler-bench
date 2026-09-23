import type { APIContext } from 'astro';
import rss from '@astrojs/rss';
import { t } from './i18n';
import { homeHref, runHref, runs } from './runs';
import type { Locale, Run } from './types';

/**
 * Parse runDate (YYYY-MM-DD) as noon UTC so rebuilds yield identical RFC-822
 * pubDates. Never use build time or file mtime.
 */
export function runPubDate(runDate: string): Date {
  const [y, m, d] = runDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Runs with a fixed runDate, newest first; id for stable tie-break. */
export function feedRuns(): Array<Run & { runDate: string }> {
  return runs
    .filter((r): r is Run & { runDate: string } => Boolean(r.runDate))
    .sort((a, b) => {
      if (a.runDate !== b.runDate) return b.runDate.localeCompare(a.runDate);
      return a.id.localeCompare(b.id);
    });
}

function toolLabel(run: Run, locale: Locale): string {
  const m = t(locale);
  return run.tool === 'paper' ? m.toolPaper : m.toolFigma;
}

function itemTitle(run: Run, locale: Locale): string {
  return `${run.agent} · ${run.model} (${toolLabel(run, locale)})`;
}

function itemDescription(run: Run, locale: Locale): string {
  const m = t(locale);
  const comment = run.comment[locale] ?? '';
  const tier = m.tiers[run.tier];
  return `${comment} (${tier})`;
}

/** Absolute permalink for a run page (also used as RSS guid). */
export function runPermalink(runId: string, locale: Locale, site: URL, base: string): string {
  return new URL(runHref(runId, locale, base), site).href;
}

export function buildRssFeed(context: APIContext, locale: Locale) {
  const m = t(locale);
  const base = import.meta.env.BASE_URL;
  const site = context.site;
  if (!site) {
    throw new Error('astro.config site is required for RSS feeds');
  }

  const channelLink = new URL(homeHref(locale, base), site);

  return rss({
    title: m.siteTitle,
    description: m.siteTagline,
    site: channelLink,
    trailingSlash: true,
    customData: `<language>${locale}</language>`,
    items: feedRuns().map((run) => {
      const link = runPermalink(run.id, locale, site, base);
      return {
        title: itemTitle(run, locale),
        description: itemDescription(run, locale),
        link,
        pubDate: runPubDate(run.runDate),
      };
    }),
  });
}

export function rssHref(locale: Locale, base: string): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  return locale === 'en' ? `${b}en/rss.xml` : `${b}rss.xml`;
}
