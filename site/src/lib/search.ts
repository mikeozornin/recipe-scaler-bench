import { createElement, type ReactNode } from 'react';

/**
 * Search helpers (mikeozornin.ru/blog/all/search-ui-tricks/ + recipe-scaler recipe-list).
 * - case-insensitive
 * - from first character
 * - multi-field (caller joins fields)
 * - trim query
 * - tokens split by whitespace; "quoted phrases"
 * - NFKD diacritics via normalize
 */

export function normalizeSearchString(value: string): string {
  if (!value) return '';
  try {
    return value
      .normalize('NFKD')
      .replace(/[^\p{Letter}\p{Number}\s._/-]/gu, '')
      .toLocaleLowerCase();
  } catch {
    return value.toLocaleLowerCase();
  }
}

export function tokenizeQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    const token = match[1] ?? match[2] ?? match[3] ?? '';
    const normalized = normalizeSearchString(token);
    if (normalized) tokens.push(normalized);
  }
  return tokens;
}

/** Every token must appear somewhere in haystack (AND). */
export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const normalized = normalizeSearchString(haystack);
  return tokens.every((t) => normalized.includes(t));
}

const allowedCharRegex = /[\p{Letter}\p{Number}\s._/-]/u;

function utf16IndexAfterCodePointAt(s: string, utf16Start: number): number {
  if (utf16Start >= s.length) return utf16Start;
  const cp = s.codePointAt(utf16Start);
  if (cp === undefined) return utf16Start + 1;
  return utf16Start + (cp > 0xffff ? 2 : 1);
}

function buildNormalizedWithMap(value: string): { normalized: string; map: number[] } {
  let normalized = '';
  const map: number[] = [];

  let utf16Index = 0;
  for (const cp of value) {
    const segmentStart = utf16Index;
    const decomposed = cp.normalize('NFKD');

    for (const dc of decomposed) {
      if (allowedCharRegex.test(dc)) {
        normalized += dc.toLocaleLowerCase();
        map.push(segmentStart);
      }
    }
    utf16Index += cp.length;
  }

  return { normalized, map };
}

/** Highlight all token matches in original text (yellow mark spans). */
export function highlightText(text: string | undefined, tokens: string[]): ReactNode {
  if (!text) return null;
  if (!tokens.length) return text;

  const { normalized, map } = buildNormalizedWithMap(text);
  if (!normalized.length || !map.length) return text;

  const ranges: { start: number; end: number }[] = [];

  for (const token of tokens) {
    if (!token) continue;
    let searchIndex = 0;
    while (searchIndex < normalized.length) {
      const index = normalized.indexOf(token, searchIndex);
      if (index === -1) break;

      const startOrig = map[index] ?? 0;
      const endNormIndex = index + token.length - 1;
      const endOrigSourceIndex = map[endNormIndex] ?? startOrig;
      const endOrig = Math.min(utf16IndexAfterCodePointAt(text, endOrigSourceIndex), text.length);

      if (startOrig < endOrig) {
        ranges.push({ start: startOrig, end: endOrig });
      }
      searchIndex = index + token.length;
    }
  }

  if (!ranges.length) return text;

  ranges.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...range });
      continue;
    }
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  merged.forEach((range, idx) => {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    parts.push(
      createElement(
        'mark',
        { key: `hl-${idx}`, className: 'search-hl' },
        text.slice(range.start, range.end),
      ),
    );
    lastIndex = range.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
