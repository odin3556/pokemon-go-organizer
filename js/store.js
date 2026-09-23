// データの読み込みと保存。
// - 外部データ: data/*.md（同梱）→ アップロードされたものがあれば LocalStorage の方を優先
// - ユーザー判断・ルール設定: LocalStorage（外部データとは別キー）

import { KINDS, DATA_KINDS, parse, isUnknown, mergeParsed } from './markdown.js';
import { NATIONAL_DEX_MAX } from './config.js';
import { DEFAULT_RULES } from './rules.js';

const LS = {
  data: (kind) => `pgo.data.${kind}`,
  decisions: 'pgo.decisions',
  rules: 'pgo.rules',
};

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const num = (v) => (isUnknown(v) ? null : Number(v));
const list = (v) => (isUnknown(v) ? [] : String(v).split(/[,、]/).map((s) => s.trim()).filter(Boolean));

export const state = {
  files: {}, // kind → { source: 'bundled'|'uploaded'|'missing', meta, text }
  pokemon: [], // 一覧の単位（pokemon.md の各レコード）
  byKey: new Map(),
  raid: [], // raid-ranking.md のレコード
  pvp: { great: [], ultra: [], master: [] },
  decisions: {},
  rules: { ...DEFAULT_RULES },
};

export async function loadAll() {
  await Promise.all(DATA_KINDS.map(loadKind));
  buildModel();
  try { state.decisions = JSON.parse(lsGet(LS.decisions) || '{}'); } catch { state.decisions = {}; }
  try { state.rules = { ...DEFAULT_RULES, ...JSON.parse(lsGet(LS.rules) || '{}') }; } catch { state.rules = { ...DEFAULT_RULES }; }
}

async function loadKind(kind) {
  const uploaded = lsGet(LS.data(kind));
  if (uploaded) {
    state.files[kind] = { source: 'uploaded', text: uploaded, parsed: parse(uploaded) };
    return;
  }
  try {
    const res = await fetch(`data/${KINDS[kind].file}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    state.files[kind] = { source: 'bundled', text, parsed: parse(text) };
  } catch {
    state.files[kind] = { source: 'missing', text: '', parsed: parse('') };
  }
}

function buildModel() {
  const recs = (kind) => state.files[kind]?.parsed.records ?? [];

  state.pokemon = recs('pokemon').map((r) => {
    const f = r.fields;
    return {
      key: r.key,
      no: Number(r.headNo),
      form: r.form,
      name: f.name_ja || f.name_en || `#${r.headNo}`,
      nameEn: isUnknown(f.name_en) ? '' : f.name_en,
      formName: isUnknown(f.form_name) ? '' : f.form_name,
      goStatus: ['released', 'unreleased'].includes(f.go_status) ? f.go_status : 'unknown',
      types: list(f.types),
      atk: num(f.attack),
      def: num(f.defense),
      sta: num(f.stamina),
      evolvesFrom: list(f.evolves_from),
      evolvesTo: list(f.evolves_to),
    };
  }).sort((a, b) => a.no - b.no || a.form.localeCompare(b.form));
  state.byKey = new Map(state.pokemon.map((p) => [p.key, p]));

  state.raid = recs('raid').map((r) => ({
    no: Number(r.headNo), form: r.form, name: r.fields.name || '',
    overall: num(r.fields.overall_rank), type: isUnknown(r.fields.attack_type) ? '' : r.fields.attack_type,
    typeRank: num(r.fields.type_rank), moveset: isUnknown(r.fields.moveset) ? '' : r.fields.moveset,
    notes: isUnknown(r.fields.notes) ? '' : r.fields.notes,
  }));
  for (const lg of ['great', 'ultra', 'master']) {
    state.pvp[lg] = recs(`pvp-${lg}`).map((r) => ({
      no: Number(r.headNo), form: r.form, name: r.fields.name || '',
      rank: num(r.fields.rank), rating: num(r.fields.rating),
      moveset: isUnknown(r.fields.moveset) ? '' : r.fields.moveset,
      notes: isUnknown(r.fields.notes) ? '' : r.fields.notes,
    }));
  }
}

export const knownDex = () => new Set(state.pokemon.map((p) => p.no));

/** 全国図鑑の最終番号。定数・pokemon.md の dex_max・実データの最大番号のうち最大のもの */
export function dexMax() {
  const meta = Number(state.files.pokemon?.parsed.meta.dex_max) || 0;
  return Math.max(NATIONAL_DEX_MAX, meta, ...state.pokemon.map((p) => p.no));
}

/** GOで入手できる（未実装でない）ポケモン。整理・検索の対象 */
export const obtainable = (p) => p.goStatus !== 'unreleased';

/**
 * 検証済みのMarkdownを正式データとして採用する
 * @param {'replace'|'merge'} mode merge = 今のデータに追加（同じ見出しは新しい方で上書き）
 */
export async function adoptData(kind, text, mode = 'replace') {
  if (mode === 'merge' && state.files[kind]?.parsed.records.length) {
    text = mergeParsed(state.files[kind].parsed, parse(text));
  }
  if (!lsSet(LS.data(kind), text)) throw new Error('ブラウザへの保存に失敗しました（容量不足の可能性）。');
  await loadKind(kind);
  buildModel();
}
/** アップロードしたデータを破棄して同梱データに戻す */
export async function revertData(kind) {
  lsSet(LS.data(kind), null);
  await loadKind(kind);
  buildModel();
}

/** patch = { status?: 'KEEP'|'HOLD'|'EXCLUDE'|null, memo?: string } */
export function setDecision(key, patch) {
  const next = { ...state.decisions[key], ...patch, updated: today() };
  if (!next.status && !next.memo) delete state.decisions[key];
  else state.decisions[key] = next;
  lsSet(LS.decisions, JSON.stringify(state.decisions));
}
export function importDecisions(parsed) {
  let n = 0;
  for (const r of parsed.records) {
    state.decisions[r.key] = { status: r.fields.status.toUpperCase(), memo: isUnknown(r.fields.memo) ? '' : r.fields.memo, updated: parsed.meta.updated_at };
    n++;
  }
  lsSet(LS.decisions, JSON.stringify(state.decisions));
  return n;
}
export function clearDecisions() {
  state.decisions = {};
  lsSet(LS.decisions, null);
}

export function setRule(id, value) {
  state.rules[id] = value;
  lsSet(LS.rules, JSON.stringify(state.rules));
}
