import type { APIContext } from 'astro';
import { buildRssFeed } from '../../lib/rss';

export function GET(context: APIContext) {
  return buildRssFeed(context, 'en');
}
