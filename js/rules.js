// 整理ルールとおすすめ判定。仕様は RULES.md を参照。
// ここで出すのは「おすすめ」まで。最終判断はユーザーの decisions。

export const THRESHOLDS = {
  raidTop: 50,
  raidTypeTop: 5,
  pvpTop: 50,
  atk: 250,
  def: 230,
  sta: 230,
  // あと一歩（保留）とみなす範囲
  nearRaid: 100,
  nearRaidType: 10,
  nearPvp: 100,
};

export const RULE_GROUPS = [
  { label: 'レイド', rules: [
    { id: 'raid_top', label: `上位${THRESHOLDS.raidTop}位以内` },
    { id: 'raid_type_top', label: 'タイプ別上位', hint: `タイプ内${THRESHOLDS.raidTypeTop}位以内` },
    { id: 'raid_mega', label: 'メガ・ゲンシ', hint: 'メガ/ゲンシの評価を通常個体に反映' },
    { id: 'raid_shadow', label: 'シャドウ', hint: 'シャドウの評価を通常個体に反映' },
  ] },
  { label: 'PvP', rules: [
    { id: 'pvp_great', label: 'スーパーリーグ', hint: `${THRESHOLDS.pvpTop}位以内` },
    { id: 'pvp_ultra', label: 'ハイパーリーグ', hint: `${THRESHOLDS.pvpTop}位以内` },
    { id: 'pvp_master', label: 'マスターリーグ', hint: `${THRESHOLDS.pvpTop}位以内` },
  ] },
  { label: '種族値', rules: [
    { id: 'stat_attack', label: '攻撃が高い', hint: `${THRESHOLDS.atk}以上` },
    { id: 'stat_defense', label: '防御が高い', hint: `${THRESHOLDS.def}以上` },
    { id: 'stat_stamina', label: 'HPが高い', hint: `${THRESHOLDS.sta}以上` },
  ] },
  { label: 'その他', rules: [
    { id: 'collection', label: 'コレクション目的', hint: 'おすすめを「整理」にしない' },
  ] },
];

export const DEFAULT_RULES = {
  raid_top: true, raid_type_top: true, raid_mega: true, raid_shadow: false,
  pvp_great: true, pvp_ultra: true, pvp_master: true,
  stat_attack: true, stat_defense: false, stat_stamina: false,
  collection: false,
  mode: 'any', // 'any' = いずれかの条件 / 'all' = すべての条件
};

export const LEAGUES = [
  { id: 'great', label: 'スーパーリーグ', short: 'スーパー' },
  { id: 'ultra', label: 'ハイパーリーグ', short: 'ハイパー' },
  { id: 'master', label: 'マスターリーグ', short: 'マスター' },
];

export const STATUS_LABEL = { KEEP: '残す', HOLD: '保留', EXCLUDE: '整理' };

const MEGA_FORMS = ['mega', 'mega-x', 'mega-y', 'primal'];
const FORM_LABEL = { mega: 'メガ', 'mega-x': 'メガX', 'mega-y': 'メガY', primal: 'ゲンシ', shadow: 'シャドウ', purified: 'ライト' };
export const formLabel = (form) => FORM_LABEL[form] || '';

/** 順位 → 表示用ランク */
export function grade(rank) {
  if (rank == null) return '–';
  if (rank <= 10) return 'S';
  if (rank <= 25) return 'A';
  if (rank <= 50) return 'B';
  if (rank <= 100) return 'C';
  return '–';
}

const minBy = (arr, fn) => arr.reduce((best, x) => (fn(x) != null && (best == null || fn(x) < fn(best)) ? x : best), null);

/** このポケモンに関係するランキングレコード（ルールにより別形態も含む） */
function related(records, p, rules) {
  return records.filter((r) => r.no === p.no && (
    r.form === p.form
    || (p.form === 'normal' && rules.raid_mega && MEGA_FORMS.includes(r.form))
    || (p.form === 'normal' && rules.raid_shadow && r.form === 'shadow')
  ));
}

const via = (r, p) => (r.form !== p.form && formLabel(r.form) ? `（${formLabel(r.form)}）` : '');

/**
 * おすすめ判定
 * @returns {{ rec, reasons, checks, raid, pvp }}
 *   checks: 有効ルールごとの { id, label, hit, hasData }
 */
export function evaluate(p, data, rules) {
  const raidRecs = related(data.raid, p, rules);
  const bestRaid = minBy(raidRecs, (r) => r.overall);
  const bestType = minBy(raidRecs, (r) => r.typeRank);
  const pvp = {};
  for (const lg of LEAGUES) {
    // PvPにメガは出せないので、メガ反映はしない（シャドウは対象）
    const recs = data.pvp[lg.id].filter((r) => r.no === p.no && (r.form === p.form || (p.form === 'normal' && rules.raid_shadow && r.form === 'shadow')));
    pvp[lg.id] = minBy(recs, (r) => r.rank);
  }

  const checks = [];
  const add = (id, label, hasData, hit) => { if (rules[id]) checks.push({ id, label, hasData, hit: !!hit }); };
  add('raid_top', bestRaid ? `レイド総合 ${bestRaid.overall}位${via(bestRaid, p)}` : 'レイド総合 ランク外',
    !!bestRaid, bestRaid && bestRaid.overall <= THRESHOLDS.raidTop);
  add('raid_type_top', bestType ? `${bestType.type || 'タイプ別'} ${bestType.typeRank}位${via(bestType, p)}` : 'タイプ別 ランク外',
    !!bestType, bestType && bestType.typeRank <= THRESHOLDS.raidTypeTop);
  for (const lg of LEAGUES) {
    const r = pvp[lg.id];
    add(`pvp_${lg.id}`, r ? `${lg.label} ${r.rank}位${via(r, p)}` : `${lg.label} ランク外`, !!r, r && r.rank <= THRESHOLDS.pvpTop);
  }
  add('stat_attack', `攻撃 ${p.atk ?? '不明'}`, p.atk != null, p.atk >= THRESHOLDS.atk);
  add('stat_defense', `防御 ${p.def ?? '不明'}`, p.def != null, p.def >= THRESHOLDS.def);
  add('stat_stamina', `HP ${p.sta ?? '不明'}`, p.sta != null, p.sta >= THRESHOLDS.sta);

  const hits = checks.filter((c) => c.hit);
  const withData = checks.filter((c) => c.hasData);
  const keep = rules.mode === 'all'
    ? withData.length > 0 && withData.every((c) => c.hit)
    : hits.length > 0;

  let rec;
  const reasons = [];
  if (keep) {
    rec = 'KEEP';
    reasons.push(...hits.map((c) => c.label));
  } else {
    const near = [];
    if (rules.raid_top && bestRaid?.overall <= THRESHOLDS.nearRaid) near.push(`レイド総合 ${bestRaid.overall}位`);
    if (rules.raid_type_top && bestType?.typeRank <= THRESHOLDS.nearRaidType) near.push(`${bestType.type || 'タイプ別'} ${bestType.typeRank}位`);
    for (const lg of LEAGUES) {
      const r = pvp[lg.id];
      if (rules[`pvp_${lg.id}`] && r?.rank <= THRESHOLDS.nearPvp) near.push(`${lg.label} ${r.rank}位`);
    }
    const noData = p.atk == null && !bestRaid && LEAGUES.every((lg) => !pvp[lg.id]);
    if (near.length) { rec = 'HOLD'; reasons.push(`あと一歩: ${near.join(' / ')}`); }
    else if (noData) { rec = 'HOLD'; reasons.push('判定に使えるデータがありません'); }
    else if (rules.collection) { rec = 'HOLD'; reasons.push('コレクション目的のため整理にしない'); }
    else { rec = 'EXCLUDE'; reasons.push('有効なルールに一致しません'); }
    if (rules.mode === 'all' && hits.length) reasons.push(`一致 ${hits.length}/${withData.length}（すべて満たす設定）`);
  }
  return { rec, reasons, checks, raid: { best: bestRaid, bestType, records: raidRecs }, pvp };
}
