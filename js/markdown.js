// Markdownデータの解析・検証・書き出し。書式は DATA_SCHEMA.md を参照。

export const KINDS = {
  pokemon: { title: 'Pokemon Data', file: 'pokemon.md', label: '基本ポケモンデータ', prompt: 'pokemon-data.md' },
  raid: { title: 'Raid Ranking', file: 'raid-ranking.md', label: 'レイドランキング', prompt: 'raid.md' },
  'pvp-great': { title: 'PvP Great League', file: 'pvp-great.md', label: 'PvP（スーパー）', prompt: 'pvp-great.md' },
  'pvp-ultra': { title: 'PvP Ultra League', file: 'pvp-ultra.md', label: 'PvP（ハイパー）', prompt: 'pvp-ultra.md' },
  'pvp-master': { title: 'PvP Master League', file: 'pvp-master.md', label: 'PvP（マスター）', prompt: 'pvp-master.md' },
  decisions: { title: 'User Decisions', file: 'decisions.md', label: '判断データ' },
};
export const DATA_KINDS = ['pokemon', 'raid', 'pvp-great', 'pvp-ultra', 'pvp-master'];
export const STATUSES = ['KEEP', 'HOLD', 'EXCLUDE'];

const SCHEMA = {
  pokemon: { required: ['pokedex', 'name_ja', 'types', 'attack', 'defense', 'stamina'], ints: ['pokedex', 'attack', 'defense', 'stamina'] },
  raid: { required: ['pokedex', 'overall_rank'], ints: ['pokedex', 'overall_rank', 'type_rank'] },
  pvp: { required: ['pokedex', 'rank'], ints: ['pokedex', 'rank'], floats: ['rating'] },
  decisions: { required: ['status'], ints: [] },
};
const schemaOf = (kind) => SCHEMA[kind.startsWith('pvp-') ? 'pvp' : kind];

export const isUnknown = (v) => v == null || v === '' || /^(unknown|null|不明)$/i.test(String(v).trim());
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Markdown文字列 → { kind, meta, records, errors } */
export function parse(text) {
  const src = String(text).replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '');
  const lines = src.split(/\r?\n/);
  const out = { kind: null, title: null, meta: {}, records: [], errors: [] };
  let rec = null;
  let listKey = null; // "- key:" の直後にネストした箇条書きを受ける

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const lineNo = i + 1;
    if (!line.trim()) return;

    if (!out.title && /^#\s+/.test(line)) {
      out.title = line.replace(/^#\s+/, '').trim();
      out.kind = Object.keys(KINDS).find((k) => KINDS[k].title.toLowerCase() === out.title.toLowerCase()) || null;
      return;
    }
    const h2 = line.match(/^##\s+#?(.+)$/);
    if (h2) {
      const tokens = h2[1].trim().split(/\s+/);
      rec = { key: '', headNo: tokens[0], form: (tokens[1] || 'normal').toLowerCase(), variant: tokens.slice(2).join(' '), fields: {}, line: lineNo };
      rec.key = [rec.headNo, rec.form, rec.variant].filter(Boolean).join(' ');
      out.records.push(rec);
      listKey = null;
      return;
    }
    if (/^###\s+/.test(line)) return; // 小見出しは区切りとしてのみ扱う

    const nested = line.match(/^\s{2,}[-*]\s+(.+)$/);
    if (nested && rec && listKey) {
      rec.fields[listKey] = rec.fields[listKey] ? `${rec.fields[listKey]}, ${nested[1].trim()}` : nested[1].trim();
      return;
    }
    const item = line.match(/^[-*]\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (item && rec) {
      const [, k, v] = item;
      rec.fields[k] = v.trim();
      listKey = v.trim() === '' ? k : null;
      return;
    }
    const meta = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (meta && !rec) {
      out.meta[meta[1]] = meta[2].trim();
      return;
    }
    if (rec) out.errors.push(`${lineNo}行目: 解釈できない行です「${line.slice(0, 40)}」`);
  });
  return out;
}

/**
 * 解析結果の検証
 * ctx.knownDex = 基本データに存在する図鑑番号の Set
 * ctx.dexMax   = 全国図鑑の最終番号（超える番号は「新作で増えた可能性」として警告のみ）
 */
export function validate(parsed, ctx = {}) {
  const errors = [...parsed.errors];
  const warnings = [];
  const { kind, meta, records } = parsed;

  if (!kind) {
    errors.push(`1行目の見出しからファイル種類を判定できません（「${parsed.title ?? 'なし'}」）。例: # Raid Ranking`);
    return { errors, warnings };
  }
  if (!meta.updated_at) errors.push('updated_at（更新日）がありません。');
  else if (!DATE_RE.test(meta.updated_at)) errors.push(`updated_at が YYYY-MM-DD 形式ではありません（${meta.updated_at}）。`);
  if (kind !== 'decisions') {
    if (isUnknown(meta.source_url)) warnings.push('source_url（情報源URL）が記録されていません。');
    if (isUnknown(meta.checked_at)) warnings.push('checked_at（確認日）が記録されていません。');
  }
  if (meta.sample === 'true') warnings.push('サンプル（ダミー値を含む）データです。');
  if (!records.length) errors.push('レコード（## #図鑑番号）が1件もありません。');

  const schema = schemaOf(kind);
  const seen = new Map();
  let unknownCount = 0;
  const missingDex = new Set();
  const overMax = new Set();
  const badGoStatus = [];

  for (const r of records) {
    const at = `${r.line}行目 #${r.key}`;
    if (!/^\d+$/.test(r.headNo) || Number(r.headNo) < 1) errors.push(`${at}: 見出しの図鑑番号が1以上の整数ではありません。`);
    else if (ctx.dexMax && Number(r.headNo) > ctx.dexMax) overMax.add(r.headNo);
    if (seen.has(r.key)) errors.push(`${at}: 見出しが重複しています（${seen.get(r.key)}行目と同じ）。`);
    seen.set(r.key, r.line);

    const f = r.fields;
    if (kind !== 'decisions' && f.pokedex == null) f.pokedex = r.headNo; // 見出しから補完
    for (const k of schema.required) {
      if (!(k in f)) errors.push(`${at}: 必須項目 ${k} がありません。`);
    }
    if (kind !== 'decisions' && f.pokedex !== r.headNo) errors.push(`${at}: pokedex（${f.pokedex}）が見出しの番号と一致しません。`);
    for (const k of schema.ints) {
      if (k in f && !isUnknown(f[k]) && !/^\d+$/.test(f[k])) errors.push(`${at}: ${k} は整数か unknown にしてください（${f[k]}）。`);
    }
    for (const k of schema.floats || []) {
      if (k in f && !isUnknown(f[k]) && Number.isNaN(Number(f[k]))) errors.push(`${at}: ${k} は数値か unknown にしてください（${f[k]}）。`);
    }
    if (kind === 'decisions' && f.status && !STATUSES.includes(f.status.toUpperCase())) {
      errors.push(`${at}: status は KEEP / HOLD / EXCLUDE のいずれかです（${f.status}）。`);
    }
    if (kind === 'pokemon' && f.go_status && !['released', 'unreleased', 'unknown'].includes(f.go_status)) badGoStatus.push(r.headNo);
    if (schema.required.some((k) => k !== 'pokedex' && isUnknown(f[k]))) unknownCount++;
    if (ctx.knownDex && kind !== 'pokemon' && !ctx.knownDex.has(Number(r.headNo))) missingDex.add(r.headNo);
  }
  if (unknownCount) warnings.push(`${unknownCount}件のレコードに unknown の必須値があります（判定では「データなし」扱い）。`);
  if (overMax.size) warnings.push(`全国図鑑 ${ctx.dexMax} 番より大きい番号があります（新作で追加された可能性）: ${[...overMax].slice(0, 15).join(', ')}。採用すると図鑑の範囲が自動で広がります。`);
  if (badGoStatus.length) warnings.push(`go_status は released / unreleased / unknown のいずれかです（${badGoStatus.slice(0, 10).join(', ')} ほか）。不明として扱います。`);
  if (kind === 'pokemon' && ctx.dexMax) {
    const covered = new Set(records.map((r) => Number(r.headNo)));
    const lacking = ctx.dexMax - [...covered].filter((n) => n >= 1 && n <= ctx.dexMax).length;
    if (lacking > 0) warnings.push(`全国図鑑 1〜${ctx.dexMax} のうち ${lacking}件が含まれていません。範囲を分けて取得した場合は「追加（マージ）」で採用してください。`);
  }
  if (missingDex.size) warnings.push(`基本データにない図鑑番号があります: ${[...missingDex].slice(0, 15).join(', ')}${missingDex.size > 15 ? ' ほか' : ''}`);
  return { errors, warnings };
}

/** 判断データ → Markdown（user/decisions.md） */
export function serializeDecisions(decisions, today) {
  const keys = Object.keys(decisions).sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
  let md = `# User Decisions\n\nupdated_at: ${today}\n`;
  for (const k of keys) {
    const d = decisions[k];
    md += `\n## #${k}\n\n- status: ${d.status}\n`;
    if (d.memo) md += `- memo: ${d.memo.replace(/\r?\n/g, ' ')}\n`;
  }
  return md;
}

const KEY_ORDER = {
  pokemon: ['pokedex', 'name_ja', 'name_en', 'form_name', 'go_status', 'types', 'attack', 'defense', 'stamina', 'evolves_from', 'evolves_to'],
};

/** 解析結果 → Markdown（マージ後の書き出しに使う） */
export function serialize(parsed) {
  let md = `# ${KINDS[parsed.kind].title}\n\n`;
  for (const [k, v] of Object.entries(parsed.meta)) md += `${k}: ${v}\n`;
  const order = KEY_ORDER[parsed.kind] || [];
  for (const r of parsed.records) {
    md += `\n## #${r.key}\n\n`;
    const keys = [...order.filter((k) => k in r.fields), ...Object.keys(r.fields).filter((k) => !order.includes(k))];
    for (const k of keys) md += `- ${k}: ${r.fields[k]}\n`;
  }
  return md;
}

/**
 * 今のデータに新しいデータを追加する。同じ見出し（番号+form）は新しい方で上書き。
 * メタ情報は新しい方を優先し、dex_max は大きい方を残す。
 */
export function mergeParsed(current, incoming) {
  const byKey = new Map(current.records.map((r) => [r.key, r]));
  for (const r of incoming.records) byKey.set(r.key, r);
  const records = [...byKey.values()].sort((a, b) => Number(a.headNo) - Number(b.headNo) || a.key.localeCompare(b.key));
  const meta = { ...current.meta, ...incoming.meta };
  const dexMax = Math.max(Number(current.meta.dex_max) || 0, Number(incoming.meta.dex_max) || 0);
  if (dexMax) meta.dex_max = String(dexMax);
  if (current.meta.sample === 'true' && incoming.meta.sample !== 'true') delete meta.sample;
  return serialize({ kind: incoming.kind, meta, records });
}
