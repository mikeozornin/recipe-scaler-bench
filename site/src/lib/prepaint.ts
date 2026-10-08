import type { Locale, QualityTier, Run } from './types';
import type { SortKey } from './prefs';
import { compareRuns } from './filter';
import { normalizeSearchString } from './search';
import { PREFS_STORAGE_KEY } from './prefs';
import { TIER_ORDER } from './runs';

const SORT_KEYS: SortKey[] = [
  'cost-desc',
  'cost-asc',
  'tier-good',
  'tier-bad',
  'date-desc',
  'date-asc',
  'alpha-asc',
  'alpha-desc',
];

/** Style element id; ResultsExplorer removes it once React state matches the URL. */
export const PREPAINT_STYLE_ID = 'rsb-prepaint';

/**
 * Inline script for the results page. Static HTML is rendered with the default
 * filter; this runs before first paint, reads the URL + saved prefs and injects
 * a stylesheet that reorders/hides runs by `data-run-id` (CSS `order`), so the
 * page paints the right list without touching React's DOM before hydration.
 * Filter semantics mirror `filterAndSortRuns`; sort ranks are precomputed here.
 */
export function explorerPrepaintScript(
  runs: Run[],
  locale: Locale,
  agentOptions: string[],
  tierOptions: string[],
): string {
  const ranks: Record<string, number[]> = {};
  for (const key of SORT_KEYS) {
    const order = runs.map((_, i) => i);
    order.sort((a, b) => compareRuns(runs[a], runs[b], key, locale));
    const rank = new Array<number>(runs.length);
    order.forEach((runIndex, pos) => {
      rank[runIndex] = pos;
    });
    ranks[key] = rank;
  }

  const data = {
    ids: runs.map((r) => r.id),
    agents: runs.map((r) => r.agent),
    tiers: runs.map((r) => r.tier),
    hay: runs.map((r) =>
      normalizeSearchString(`${r.agent} ${r.model} ${r.comment.ru} ${r.comment.en}`),
    ),
    ranks,
    agentOptions,
    tierOptions,
    validTiers: TIER_ORDER satisfies QualityTier[],
    defaultSort: 'tier-good',
    prefsKey: PREFS_STORAGE_KEY,
    styleId: PREPAINT_STYLE_ID,
  };

  return `(function () {
  var D = ${JSON.stringify(data).replace(/</g, '\\u003c')};
  function norm(v) {
    try {
      return v.normalize('NFKD').replace(/[^\\p{Letter}\\p{Number}\\s._/-]/gu, '').toLocaleLowerCase();
    } catch (e) {
      return v.toLocaleLowerCase();
    }
  }
  function tokenize(q) {
    var s = (q || '').trim();
    var out = [];
    var re = /"([^"]+)"|'([^']+)'|(\\S+)/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      var n = norm(m[1] || m[2] || m[3] || '');
      if (n) out.push(n);
    }
    return out;
  }
  function attr(v) {
    return '"' + String(v).replace(/["\\\\]/g, '\\\\$&') + '"';
  }
  function isSort(v) {
    return typeof v === 'string' && Object.prototype.hasOwnProperty.call(D.ranks, v);
  }
  var prefsSort = D.defaultSort;
  try {
    var p = JSON.parse(localStorage.getItem(D.prefsKey) || 'null');
    if (p && isSort(p.sort)) prefsSort = p.sort;
  } catch (e) {}
  var params = new URLSearchParams(location.search);
  var agent = params.get('agent') || 'all';
  var tier = params.get('tier');
  if (D.validTiers.indexOf(tier) < 0) tier = 'all';
  var sortRaw = params.get('sort');
  var sort = isSort(sortRaw) ? sortRaw : prefsSort;
  var tokens = tokenize(params.get('q') || '');

  var visible = [];
  var css = [];
  for (var i = 0; i < D.ids.length; i++) {
    var ok =
      (agent === 'all' || D.agents[i] === agent) &&
      (tier === 'all' || D.tiers[i] === tier) &&
      tokens.every(function (t) { return D.hay[i].indexOf(t) >= 0; });
    if (ok) visible.push(i);
    else css.push('[data-run-id=' + attr(D.ids[i]) + ']{display:none!important}');
  }
  var rank = D.ranks[sort];
  visible.sort(function (a, b) { return rank[a] - rank[b]; });

  var isTierSort = sort === 'tier-good' || sort === 'tier-bad';
  css.push('.rsb-table [data-run-id]{border-top-width:1px!important}');
  css.push('.rsb-gallery [data-run-id]{grid-column-start:auto!important}');
  visible.forEach(function (runIndex, pos) {
    var sel = '[data-run-id=' + attr(D.ids[runIndex]) + ']';
    css.push(sel + '{order:' + pos + '!important}');
    if (pos === 0) css.push('.rsb-table ' + sel + '{border-top-width:0!important}');
    if (isTierSort && pos > 0 && D.tiers[runIndex] !== D.tiers[visible[pos - 1]]) {
      css.push('.rsb-gallery ' + sel + '{grid-column-start:1!important}');
    }
  });
  if (!visible.length) {
    css.push('.rsb-results{display:none!important}.rsb-empty{display:block!important}');
  }

  function selectLabel(name, value, options) {
    var shown = options.indexOf(value) >= 0 ? value : options[0];
    var root = '[data-select-name=' + attr(name) + '] ';
    css.push(root + '[data-opt]{display:none!important}');
    css.push(root + '[data-opt=' + attr(shown) + ']{display:inline!important}');
  }
  selectLabel('agent', agent, D.agentOptions);
  selectLabel('tier', tier, D.tierOptions);

  var style = document.createElement('style');
  style.id = D.styleId;
  style.textContent = css.join('\\n');
  document.head.appendChild(style);
})();`;
}
