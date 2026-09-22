// Pokémon GO 検索文字列の生成。構文は RULES.md「5. 検索文字列の生成」を参照。
//   ,  = OR   &  = AND（, より弱く結合）   !  = NOT   1-3 = 範囲

export const EXTRA_OPTIONS = [
  { id: 'noShiny', label: '色違いを除く', term: '!色違い' },
  { id: 'noLegend', label: '伝説・幻を除く', term: '!伝説のポケモン&!幻のポケモン' },
  { id: 'noShadow', label: 'シャドウを除く', term: '!シャドウ' },
];

/** [1,2,3,5] → ['1-3', '5'] */
export function toRanges(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j - i >= 2 ? `${sorted[i]}-${sorted[j]}` : sorted.slice(i, j + 1).join(','));
    i = j;
  }
  return out.join(',').split(',');
}

/**
 * @param {number[]} numbers 図鑑番号
 * @param {'include'|'exclude'} mode include = 対象だけ表示 / exclude = 対象以外を表示
 * @param {string[]} extras EXTRA_OPTIONS の id
 */
export function buildQuery(numbers, mode, extras = []) {
  const parts = toRanges(numbers);
  if (!parts.length) return '';
  const base = mode === 'exclude' ? parts.map((p) => `!${p}`).join('&') : parts.join(',');
  const tail = EXTRA_OPTIONS.filter((o) => extras.includes(o.id)).map((o) => o.term);
  return [base, ...tail].join('&');
}
