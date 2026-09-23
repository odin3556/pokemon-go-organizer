// 画面（ハッシュルーティング）。データ処理は store / rules / search に分離している。

import { KINDS, DATA_KINDS, STATUSES, parse, validate, serializeDecisions } from './markdown.js';
import { state, loadAll, adoptData, revertData, setDecision, importDecisions, clearDecisions, setRule, knownDex, dexMax, obtainable, today } from './store.js';
import { GENERATIONS, GO_STATUS } from './config.js';
import { RULE_GROUPS, LEAGUES, STATUS_LABEL, THRESHOLDS, evaluate, grade, formLabel } from './rules.js';
import { EXTRA_OPTIONS, buildQuery } from './search.js';

const STALE_DAYS = 30;
const STAT_MAX = 320;

// ---------- 小道具 ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(3, '0');
const hrefOf = (p) => `#/p/${encodeURIComponent(p.key)}`;

const ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  mons: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  box: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M10 14h4M8 3h8"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5M12 12v8M9 15l3-3 3 3"/></svg>',
};

const TYPE_COLOR = {
  ノーマル: '#9a9d9a', ほのお: '#e8743b', みず: '#4a90da', でんき: '#d4b21a', くさ: '#3fa129', こおり: '#3bbfe0',
  かくとう: '#ce4069', どく: '#9f5bba', じめん: '#a7672f', ひこう: '#6fa8e6', エスパー: '#e84b85', むし: '#8a9a1b',
  いわ: '#a39c72', ゴースト: '#704170', ドラゴン: '#5060e1', あく: '#5a4b47', はがね: '#5a98ae', フェアリー: '#e06fe0',
};
const typeColor = (t) => TYPE_COLOR[t] || '#8a93a3';
const typeChips = (types) => types.map((t) => `<span class="type" style="background:${typeColor(t)}">${esc(t)}</span>`).join('');
const typeText = (types) => types.length
  ? types.map((t) => `<span style="color:${typeColor(t)}">${esc(t)}</span>`).join(' / ')
  : '<span class="muted">タイプ不明</span>';

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('コピーしました');
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const daysSince = (date) => (date ? Math.floor((Date.parse(today()) - Date.parse(date)) / 86400000) : Infinity);

// ---------- 判定 ----------
let evalCache = null;
function evals() {
  if (!evalCache) {
    evalCache = new Map(state.pokemon.map((p) => [p.key, evaluate(p, state, state.rules)]));
  }
  return evalCache;
}
const invalidate = () => { evalCache = null; };

/** 最終状態 = ユーザー判断 ?? おすすめ */
function statusOf(p) {
  const ev = evals().get(p.key);
  const d = state.decisions[p.key];
  return { status: d?.status || ev.rec, decided: !!d?.status, rec: ev.rec, ev };
}
function statusChip(s) {
  return `<span class="status ${s.status}${s.decided ? '' : ' rec'}">${STATUS_LABEL[s.status]}</span>`;
}
function pageHead(title, sub = '', backTo = null) {
  const back = backTo ? `<button class="back" data-back="${backTo}" aria-label="戻る">${ICON.back}</button>` : '';
  return `<div class="page-head">${back}<h1>${title}${sub ? `<span class="sub">${sub}</span>` : ''}</h1></div>`;
}
function monRow(p, right = '') {
  const s = statusOf(p);
  const form = p.formName || formLabel(p.form) || (p.form !== 'normal' ? p.form : '');
  return `<a class="row" href="${hrefOf(p)}">
    <span class="num">${pad(p.no)}</span>
    <div class="grow"><div class="title">${esc(p.name)}${form ? ` <small class="muted">${esc(form)}</small>` : ''}</div><div class="types-text">${typeText(p.types)}</div></div>
    ${right || (obtainable(p) ? statusChip(s) : goBadge())}${ICON.chev}</a>`;
}
function goBadge() {
  return `<span class="status none">${GO_STATUS.unreleased}</span>`;
}
function matchesQuery(p, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase().replace(/^#/, '');
  if (/^\d+$/.test(s)) return String(p.no) === String(Number(s)) || pad(p.no).startsWith(s);
  return p.name.toLowerCase().includes(s) || p.nameEn.toLowerCase().includes(s);
}

// ---------- 画面 ----------
const views = {};

views.home = () => {
  const counts = { KEEP: 0, HOLD: 0, EXCLUDE: 0 };
  const decided = { KEEP: 0, HOLD: 0, EXCLUDE: 0 };
  for (const p of state.pokemon.filter(obtainable)) {
    const s = statusOf(p);
    counts[s.status]++;
    if (s.decided) decided[s.status]++;
  }
  const samples = DATA_KINDS.filter((k) => state.files[k].parsed.meta.sample === 'true');
  const missing = DATA_KINDS.filter((k) => state.files[k].source === 'missing');
  const enabled = RULE_GROUPS.flatMap((g) => g.rules).filter((r) => state.rules[r.id]).map((r) => r.label);

  return `
  <div class="hero"><h1>Pokémon GO<br>整理アシスタント</h1><p>ポケモンの整理・検索をサポートするシンプルなツールです。</p></div>
  ${missing.length ? `<div class="notice err"><strong>データを読み込めませんでした</strong>${missing.map((k) => KINDS[k].file).join(', ')}。ローカルで開く場合は README の手順でサーバーを起動するか、設定 → データアップロードから読み込んでください。</div>` : ''}
  ${samples.length ? `<div class="notice warn"><strong>サンプルデータで動作中</strong>ランキングの順位はダミーです。設定 → データ更新 から正式データに差し替えてください。</div>` : ''}
  <form class="searchbox" data-action="home-search">${ICON.search}<input name="q" type="search" placeholder="ポケモン名・図鑑番号で検索" autocomplete="off"></form>

  <h2 class="section">クイックアクセス</h2>
  <div class="quick">
    <a class="card" href="#/list"><span class="ico">${ICON.mons}</span><div class="grow"><div class="title">すべてのポケモン</div><div class="desc muted">一覧を表示（${state.pokemon.length}件）</div></div>${ICON.chev}</a>
    <a class="card" href="#/organize"><span class="ico">${ICON.box}</span><div class="grow"><div class="title">整理する</div><div class="desc muted">おすすめを確認して判断する</div></div>${ICON.chev}</a>
    <a class="card" href="#/search"><span class="ico">${ICON.clip}</span><div class="grow"><div class="title">検索キーワード生成</div><div class="desc muted">GOの検索文字列を作成</div></div>${ICON.chev}</a>
    <a class="card" href="#/update"><span class="ico">${ICON.sync}</span><div class="grow"><div class="title">データ更新</div><div class="desc muted">最新のランキング情報を取得</div></div>${ICON.chev}</a>
  </div>

  <h2 class="section">整理状況<span class="note">未判断はおすすめで集計</span></h2>
  <div class="stats3">
    ${STATUSES.map((s) => `<a class="card ${s}" href="#/list?f=${s}"><div class="label">${STATUS_LABEL[s]}</div><div class="val">${counts[s]}</div><div class="sub">判断済み ${decided[s]}</div></a>`).join('')}
  </div>

  <h2 class="section">整理ルール</h2>
  <a class="list row" href="#/settings" style="display:flex"><div class="grow desc">${enabled.length ? esc(enabled.join('・')) : 'すべてOFF'}<br><span class="muted">${state.rules.mode === 'all' ? 'すべての条件を満たす' : 'いずれかの条件を満たす'}</span></div>${ICON.chev}</a>

  <h2 class="section">データ更新状況</h2>
  ${dataStatusList()}`;
};

function dataStatusList(withSource = false) {
  return `<div class="list">${DATA_KINDS.map((k) => {
    const f = state.files[k];
    const date = f.parsed.meta.updated_at;
    const stale = daysSince(date) > STALE_DAYS;
    const tags = [
      f.parsed.meta.sample === 'true' ? 'サンプル' : '',
      withSource ? { bundled: '同梱', uploaded: 'アップロード', missing: '未読込' }[f.source] : '',
    ].filter(Boolean).join('・');
    const count = k === 'pokemon'
      ? `${new Set(state.pokemon.map((p) => p.no)).size} / 全国図鑑 ${dexMax()}種`
      : `${f.parsed.records.length}件`;
    return `<div class="row"><div class="grow"><div class="title">${KINDS[k].label}</div><div class="desc muted">${tags ? `${tags}・` : ''}${count}</div></div>
      <span class="right ${stale ? 'stale' : ''}">${date ? esc(date) : 'なし'}${stale && date ? ' ⚠' : ''}</span></div>`;
  }).join('')}</div>
  ${DATA_KINDS.some((k) => daysSince(state.files[k].parsed.meta.updated_at) > STALE_DAYS) ? `<p class="muted">⚠ は${STALE_DAYS}日以上更新されていないデータです。</p>` : ''}`;
}

// 一覧
const listState = { f: 'ALL', q: '' };
views.list = (params) => {
  if (params.f) listState.f = params.f;
  if (params.q != null) listState.q = params.q;
  const filters = [['ALL', 'すべて'], ['KEEP', '残す'], ['HOLD', '保留'], ['EXCLUDE', '整理'], ['UNRELEASED', GO_STATUS.unreleased]];
  return `
  <div class="page-head"><h1>ポケモン一覧<span class="sub" id="list-count"></span></h1></div>
  <div class="searchbox">${ICON.search}<input id="list-q" type="search" placeholder="ポケモン名・図鑑番号で検索" value="${esc(listState.q)}" autocomplete="off"></div>
  <div class="chips">${filters.map(([id, label]) => `<button data-filter="${id}" aria-pressed="${listState.f === id}">${label}</button>`).join('')}</div>
  <div id="list-rows"></div>`;
};
function renderListRows() {
  const byFilter = (p) => {
    if (listState.f === 'ALL') return true;
    if (listState.f === 'UNRELEASED') return !obtainable(p);
    return obtainable(p) && statusOf(p).status === listState.f;
  };
  const items = state.pokemon.filter((p) => matchesQuery(p, listState.q) && byFilter(p));
  $('#list-count').textContent = `${items.length} / 全${state.pokemon.length}件`;
  $('#list-rows').innerHTML = items.length
    ? `<div class="list">${items.map((p) => monRow(p)).join('')}</div>`
    : '<div class="empty">該当するポケモンがいません</div>';
}

// 詳細
let detailTab = 'basic';
let lastDetailKey = null;
views.detail = ({ key }) => {
  const p = state.byKey.get(key);
  if (!p) return `${pageHead('見つかりません', '', '#/list')}<div class="empty">#${esc(key)} は基本データにありません。</div>`;
  if (lastDetailKey !== key) { detailTab = 'basic'; lastDetailKey = key; }
  const s = statusOf(p);
  const form = p.formName || formLabel(p.form) || (p.form !== 'normal' ? p.form : '');
  const tabs = [['basic', '基本情報'], ['raid', 'レイド'], ['pvp', 'PvP'], ['judge', '判定']];
  const body = { basic: detailBasic, raid: detailRaid, pvp: detailPvp, judge: detailJudge }[detailTab](p, s);
  return `${pageHead(esc(p.name) + (form ? ` <small class="muted">${esc(form)}</small>` : ''), `#${p.no}`, '#/list')}
  <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" data-dtab="${id}" aria-selected="${detailTab === id}">${l}</button>`).join('')}</div>
  ${body}`;
};

function statBars(p) {
  const bar = (label, v) => `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${v == null ? 0 : Math.min(100, (v / STAT_MAX) * 100)}%"></div></div><span class="v">${v ?? '不明'}</span></div>`;
  return `<div class="bars">${bar('攻撃', p.atk)}${bar('防御', p.def)}${bar('HP', p.sta)}</div>`;
}
function decideBlock(p, s) {
  const d = state.decisions[p.key];
  return `<div class="decide" data-key="${esc(p.key)}">${STATUSES.map((st) => `<button data-s="${st}" aria-pressed="${d?.status === st}">${STATUS_LABEL[st]}</button>`).join('')}</div>
  ${d?.status ? `<p class="muted" style="margin:8px 0 0">判断済み（${esc(d.updated || '')}）・<a href="#" data-undecide="${esc(p.key)}" style="color:var(--accent)">未判断に戻す</a></p>` : `<p class="muted" style="margin:8px 0 0">未判断：おすすめは「${STATUS_LABEL[s.rec]}」</p>`}`;
}

function detailBasic(p, s) {
  const ev = s.ev;
  const pvpRows = LEAGUES.map((lg) => {
    const r = ev.pvp[lg.id];
    return `<div class="kv"><span class="k">${lg.label}</span><span class="v">${r ? `<span class="muted">${r.rank}位</span> ` : ''}<span class="grade ${grade(r?.rank)}">${grade(r?.rank)}</span></span></div>`;
  }).join('');
  return `
  <div class="card pad">
    <div class="mon-name">${esc(p.name)}</div>
    <div class="mon-no">#${p.no}${p.nameEn ? ` · ${esc(p.nameEn)}` : ''} · GO ${GO_STATUS[p.goStatus]}</div>
    ${typeChips(p.types)}
    ${statBars(p)}
  </div>
  <div class="card" style="margin-top:12px">
    <a class="card-head" href="#" data-goto-tab="raid">レイドでの評価${ICON.chev}</a>
    <div class="kv"><span class="k">総合評価</span><span class="v">${ev.raid.best ? `<span class="muted">${ev.raid.best.overall}位${ev.raid.best.form !== p.form ? `（${formLabel(ev.raid.best.form)}）` : ''}</span> ` : ''}<span class="grade ${grade(ev.raid.best?.overall)}">${grade(ev.raid.best?.overall)}</span></span></div>
    <div class="kv"><span class="k">タイプ</span><span class="v">${ev.raid.bestType ? `${typeChips([ev.raid.bestType.type].filter(Boolean))}<span class="muted">${ev.raid.bestType.typeRank}位</span>` : '<span class="muted">ランク外</span>'}</span></div>
  </div>
  <div class="card" style="margin-top:12px">
    <a class="card-head" href="#" data-goto-tab="pvp">PvPでの評価${ICON.chev}</a>
    ${pvpRows}
  </div>
  <div class="card pad" style="margin-top:12px">
    <div style="display:flex;justify-content:space-between;align-items:center"><b>整理判定</b>${statusChip(s)}</div>
    <ul class="reasons">${ev.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${decideBlock(p, s)}
  </div>`;
}

function sourceNote(kind) {
  const m = state.files[kind].parsed.meta;
  return `<p class="muted">出典: ${esc(m.source_name || '不明')}${m.criteria ? `（${esc(m.criteria)}）` : ''} / ${esc(m.updated_at || '日付なし')} 更新${m.sample === 'true' ? ' / <b class="stale">サンプル（ダミー値）</b>' : ''}</p>`;
}

function detailRaid(p, s) {
  const recs = state.raid.filter((r) => r.no === p.no).sort((a, b) => (a.overall ?? 1e9) - (b.overall ?? 1e9));
  const rows = recs.map((r) => `
    <div class="card pad">
      <div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(r.name || p.name)}</b><span class="grade ${grade(r.overall)}">${grade(r.overall)}</span></div>
      <div class="kv" style="padding-left:0;padding-right:0"><span class="k">総合順位</span><span class="v">${r.overall ?? '不明'}</span></div>
      <div class="kv" style="padding-left:0;padding-right:0"><span class="k">タイプ別</span><span class="v">${r.type ? typeChips([r.type]) : ''}${r.typeRank ?? '不明'}位</span></div>
      ${r.moveset ? `<div class="kv" style="padding-left:0;padding-right:0"><span class="k">推奨技</span><span class="v">${esc(r.moveset)}</span></div>` : ''}
      ${r.notes ? `<p class="muted">${esc(r.notes)}</p>` : ''}
      ${!s.ev.raid.records.includes(r) ? '<p class="muted" style="margin:6px 0 0">※ 現在のルール設定では判定に使っていません</p>' : ''}
    </div>`).join('');
  return `${rows || '<div class="empty">レイドランキングに登録がありません</div>'}${sourceNote('raid')}`;
}

function detailPvp(p) {
  return LEAGUES.map((lg) => {
    const recs = state.pvp[lg.id].filter((r) => r.no === p.no);
    return `<h2 class="section">${lg.label}</h2>${recs.length ? recs.map((r) => `
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(r.name || p.name)}</b><span class="grade ${grade(r.rank)}">${grade(r.rank)}</span></div>
        <div class="kv" style="padding-left:0;padding-right:0"><span class="k">順位</span><span class="v">${r.rank ?? '不明'}位</span></div>
        ${r.rating != null ? `<div class="kv" style="padding-left:0;padding-right:0"><span class="k">スコア</span><span class="v">${r.rating}</span></div>` : ''}
        ${r.moveset ? `<div class="kv" style="padding-left:0;padding-right:0"><span class="k">推奨技</span><span class="v">${esc(r.moveset)}</span></div>` : ''}
        ${r.notes ? `<p class="muted">${esc(r.notes)}</p>` : ''}
      </div>`).join('') : '<div class="card empty">ランキングに登録がありません</div>'}${sourceNote(`pvp-${lg.id}`)}`;
  }).join('');
}

function detailJudge(p, s) {
  const d = state.decisions[p.key];
  const checks = s.ev.checks;
  return `
  <div class="card pad">
    <div style="display:flex;justify-content:space-between;align-items:center"><b>おすすめ</b><span class="status ${s.rec}">${STATUS_LABEL[s.rec]}</span></div>
    <ul class="reasons">${s.ev.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </div>
  <h2 class="section">ルールとの一致<span class="note">${state.rules.mode === 'all' ? 'すべての条件を満たす' : 'いずれかの条件を満たす'}</span></h2>
  <div class="list">${checks.length ? checks.map((c) => `<div class="row"><div class="grow">${esc(c.label)}</div><span class="${c.hit ? 'check-hit' : 'check-miss'}">${c.hit ? '✓ 一致' : c.hasData ? '–' : 'データなし'}</span></div>`).join('') : '<div class="empty">有効なルールがありません</div>'}</div>
  <h2 class="section">あなたの判断</h2>
  <div class="card pad">
    ${decideBlock(p, s)}
    <div class="field-label">メモ</div>
    <textarea id="memo" data-key="${esc(p.key)}" placeholder="例：色違いあり、高個体値が別にいる">${esc(d?.memo || '')}</textarea>
  </div>`;
}

// 整理
let organizeFilter = 'undecided';
views.organize = () => {
  // GO未実装は手持ちにいないので整理の対象外
  const all = state.pokemon.filter(obtainable).map((p) => ({ p, s: statusOf(p) }));
  const undecided = all.filter((x) => !x.s.decided);
  const differ = all.filter((x) => x.s.decided && x.s.status !== x.s.rec);
  const items = { undecided, differ, all }[organizeFilter];
  const filters = [['undecided', `未判断 ${undecided.length}`], ['differ', `おすすめと違う ${differ.length}`], ['all', 'すべて']];
  return `
  ${pageHead('整理する', 'おすすめを参考に、残す・保留・整理を決めます')}
  <div class="chips">${filters.map(([id, l]) => `<button data-ofilter="${id}" aria-pressed="${organizeFilter === id}">${l}</button>`).join('')}</div>
  ${organizeFilter === 'undecided' && undecided.length ? `<button class="btn block" data-action="apply-all" style="margin-bottom:14px">未判断 ${undecided.length}件におすすめを一括適用</button>` : ''}
  ${items.length ? `<div class="list">${items.map(({ p, s }) => `
    <div class="row">
      <span class="num">${pad(p.no)}</span>
      <a class="grow" href="${hrefOf(p)}"><div class="title">${esc(p.name)}${p.form !== 'normal' ? ` <small class="muted">${esc(p.formName || formLabel(p.form) || p.form)}</small>` : ''}</div><div class="desc">推奨 <b style="color:var(--${{ KEEP: 'keep', HOLD: 'hold', EXCLUDE: 'excl' }[s.rec]})">${STATUS_LABEL[s.rec]}</b> · ${esc(s.ev.reasons[0] || '')}</div></a>
      <div class="decide sm" data-key="${esc(p.key)}">${STATUSES.map((st) => `<button data-s="${st}" aria-pressed="${s.decided && s.status === st}">${STATUS_LABEL[st]}</button>`).join('')}</div>
    </div>`).join('')}</div>` : `<div class="empty">${organizeFilter === 'undecided' ? 'すべて判断済みです 🎉' : '該当なし'}</div>`}`;
};

// 検索キーワード生成
const searchForm = { target: 'KEEP', uses: [], combine: 'or', mode: 'include', extras: [], useRec: true };
const USES = [
  { id: 'raid', label: 'レイド', test: (ev) => (ev.raid.best?.overall ?? Infinity) <= THRESHOLDS.nearRaid || (ev.raid.bestType?.typeRank ?? Infinity) <= THRESHOLDS.nearRaidType },
  ...LEAGUES.map((lg) => ({ id: lg.id, label: `PvP（${lg.short}リーグ）`, test: (ev) => (ev.pvp[lg.id]?.rank ?? Infinity) <= THRESHOLDS.nearPvp })),
];
const TARGETS = [['KEEP', '残すポケモン'], ['EXCLUDE', '整理対象'], ['HOLD', '保留'], ['ALL', 'すべてのポケモン']];

function computeSearch() {
  const f = searchForm;
  const picked = [];
  const skipped = [];
  for (const p of state.pokemon.filter(obtainable)) {
    const s = statusOf(p);
    const status = s.decided || f.useRec ? s.status : null;
    let ok = f.target === 'ALL' || status === f.target;
    if (ok && f.uses.length) {
      const hits = USES.filter((u) => f.uses.includes(u.id)).map((u) => u.test(s.ev));
      ok = f.combine === 'and' ? hits.every(Boolean) : hits.some(Boolean);
    }
    (ok ? picked : skipped).push(p);
  }
  const nums = [...new Set(picked.map((p) => p.no))];
  // 同じ図鑑番号で「対象」と「対象外」が混在 → 検索では区別できない
  const pickedNos = new Set(nums);
  const conflicts = [...new Set(skipped.filter((p) => pickedNos.has(p.no)).map((p) => p.no))];
  return {
    picked, nums, conflicts,
    undecidedUsed: picked.filter((p) => !statusOf(p).decided).length,
    query: buildQuery(nums, f.mode, f.extras),
  };
}

views.search = () => {
  const f = searchForm;
  const r = computeSearch();
  const radio = (name, value, label, checked) => `<label class="opt"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>${label}</label>`;
  const check = (name, value, label, checked) => `<label class="opt"><input type="checkbox" name="${name}" value="${value}" ${checked ? 'checked' : ''}>${label}</label>`;
  return `
  ${pageHead('検索キーワード生成', '', '#/')}
  <form id="search-form">
    <h2 class="section">検索対象</h2>
    <div class="card pad">
      ${TARGETS.map(([v, l]) => radio('target', v, l, f.target === v)).join('')}
      ${check('useRec', '1', '未判断のポケモンはおすすめ状態で扱う', f.useRec)}
    </div>
    <h2 class="section">用途で絞り込む<span class="note">任意・複数選択可</span></h2>
    <div class="card pad">
      ${USES.map((u) => check('uses', u.id, u.label, f.uses.includes(u.id))).join('')}
      <div class="field-label">組み合わせ</div>
      ${radio('combine', 'or', 'いずれかを満たす（OR）', f.combine === 'or')}
      ${radio('combine', 'and', 'すべての条件を満たす（AND）', f.combine === 'and')}
      <p class="muted" style="margin:6px 0 0">レイド：総合${THRESHOLDS.nearRaid}位・タイプ別${THRESHOLDS.nearRaidType}位以内／PvP：${THRESHOLDS.nearPvp}位以内</p>
    </div>
    <h2 class="section">出力形式</h2>
    <div class="card pad">
      ${radio('mode', 'include', '対象だけを表示する（150,184…）', f.mode === 'include')}
      ${radio('mode', 'exclude', '対象以外を表示する（!150&amp;!184…）', f.mode === 'exclude')}
      <div class="field-label">追加条件</div>
      ${EXTRA_OPTIONS.map((o) => check('extras', o.id, `${o.label}（${esc(o.term)}）`, f.extras.includes(o.id))).join('')}
    </div>
  </form>
  <a class="btn primary block" href="#/result" style="margin-top:18px">検索キーワードを生成</a>
  <h2 class="section">プレビュー<span class="note">${r.nums.length}種</span></h2>
  <div class="output" id="preview">${r.query ? esc(r.query) : '<span class="muted">対象がありません</span>'}</div>`;
};

views.result = () => {
  const f = searchForm;
  const r = computeSearch();
  const targetLabel = TARGETS.find(([v]) => v === f.target)[1];
  const useLabels = USES.filter((u) => f.uses.includes(u.id)).map((u) => u.label);
  return `
  ${pageHead('検索結果', '', '#/search')}
  ${r.query
    ? `<div class="notice ok"><strong>検索キーワードが生成されました</strong>下のテキストをコピーして、Pokémon GO のポケモンボックスの検索欄に貼り付けてください。${f.mode === 'exclude' ? '対象<b>以外</b>が表示されます。' : '対象のポケモンが表示されます。'}</div>`
    : '<div class="notice warn"><strong>対象のポケモンがいません</strong>条件を見直してください。</div>'}
  <div class="card pad">
    <div class="output" style="margin-top:0">${esc(r.query) || '—'}</div>
    <div style="text-align:right"><button class="btn sm" data-copy="${esc(r.query)}" ${r.query ? '' : 'disabled'}>コピー</button></div>
  </div>
  ${r.conflicts.length ? `<div class="notice warn" style="margin-top:14px"><strong>形態の違いに注意</strong>次の図鑑番号は、同じ番号の中に対象と対象外の形態が混在しています。検索では区別できないため、ゲーム内で確認してください：${r.conflicts.map((n) => `#${n}`).join(', ')}</div>` : ''}
  <h2 class="section">条件の内訳</h2>
  <div class="list">
    <div class="kv"><span class="k">対象ポケモン数</span><span class="v">${r.nums.length}種（${r.picked.length}件）</span></div>
    <div class="kv"><span class="k">検索対象</span><span class="v">${targetLabel}</span></div>
    <div class="kv"><span class="k">未判断をおすすめで補完</span><span class="v">${f.useRec ? `する（${r.undecidedUsed}件）` : 'しない'}</span></div>
    <div class="kv"><span class="k">用途</span><span class="v">${useLabels.length ? esc(useLabels.join('、')) : '指定なし'}</span></div>
    ${useLabels.length > 1 ? `<div class="kv"><span class="k">組み合わせ</span><span class="v">${f.combine === 'and' ? 'すべて満たす（AND）' : 'いずれか（OR）'}</span></div>` : ''}
    <div class="kv"><span class="k">出力形式</span><span class="v">${f.mode === 'exclude' ? '対象以外を表示（NOT）' : '対象だけを表示'}</span></div>
  </div>
  ${r.picked.length ? `<h2 class="section">対象のポケモン</h2><div class="list">${r.picked.map((p) => monRow(p)).join('')}</div>` : ''}
  <a class="btn block" href="#/search" style="margin-top:18px">もう一度作成する</a>`;
};

// 設定
views.settings = () => `
  ${pageHead('設定')}
  <h2 class="section">整理ルール</h2>
  <p class="lead">残す・保留・整理のおすすめを出す基準です。最終判断はいつでも自分で変えられます。</p>
  ${RULE_GROUPS.map((g) => `
    <h2 class="section">${g.label}</h2>
    <div class="list">${g.rules.map((r) => `
      <label class="toggle-row"><span>${r.label}${r.hint ? `<span class="hint">${esc(r.hint)}</span>` : ''}</span>
        <span class="switch"><input type="checkbox" data-rule="${r.id}" ${state.rules[r.id] ? 'checked' : ''}><span></span></span></label>`).join('')}
    </div>`).join('')}
  <h2 class="section">判定の優先度</h2>
  <div class="card pad">
    <label class="opt"><input type="radio" name="mode" value="any" ${state.rules.mode !== 'all' ? 'checked' : ''}>いずれかの条件を満たせば「残す」</label>
    <label class="opt"><input type="radio" name="mode" value="all" ${state.rules.mode === 'all' ? 'checked' : ''}>すべての条件を満たせば「残す」</label>
  </div>

  <h2 class="section">データ</h2>
  <div class="list">
    <a class="row" href="#/update"><div class="grow"><div class="title">データ更新</div><div class="desc">AI検索用プロンプトをコピー</div></div>${ICON.chev}</a>
    <a class="row" href="#/upload"><div class="grow"><div class="title">データアップロード</div><div class="desc">Markdownファイルを検証して読み込む</div></div>${ICON.chev}</a>
  </div>

  <h2 class="section">判断データ<span class="note">${Object.keys(state.decisions).length}件（このブラウザに保存）</span></h2>
  <div class="card pad">
    <p class="muted" style="margin-top:0">判断はこのブラウザにだけ保存されます。バックアップや別端末への移行には Markdown で書き出してください。</p>
    <div class="btn-row">
      <button class="btn sm" data-action="export-decisions">decisions.md を書き出す</button>
      <button class="btn sm" data-action="import-decisions">読み込む</button>
      <button class="btn sm danger" data-action="clear-decisions">すべて消去</button>
    </div>
    <input type="file" id="decisions-file" accept=".md,.markdown,.txt" hidden>
  </div>`;

// データ更新（AIプロンプト）
let openPrompt = null;
const promptCache = {};
views.update = () => `
  ${pageHead('データ更新', '', '#/settings')}
  <p class="lead">プロンプトをAIに貼り付けて、最新のデータをMarkdownで作ってもらいます。</p>
  <div class="list">${DATA_KINDS.map((k) => {
    const date = state.files[k].parsed.meta.updated_at;
    const stale = daysSince(date) > STALE_DAYS;
    return `<div class="row" style="flex-wrap:wrap">
      <div class="grow"><div class="title">${KINDS[k].label}</div><div class="desc">最終更新 <span class="${stale ? 'stale' : ''}">${esc(date || 'なし')}</span>${state.files[k].parsed.meta.sample === 'true' ? '・サンプル' : ''}</div></div>
      <button class="btn sm" data-prompt="${k}" aria-expanded="${openPrompt === k}">${openPrompt === k ? '閉じる' : '更新'}</button>
      ${openPrompt === k ? `<div id="prompt-box" style="flex-basis:100%">${promptCache[k] ? promptBox(k) : '<p class="muted">読み込み中…</p>'}</div>` : ''}
    </div>`;
  }).join('')}</div>
  <h2 class="section">更新方法</h2>
  <div class="card pad">
    <ol class="steps">
      <li>各データの「更新」ボタンを押す</li>
      <li>表示されたプロンプトをコピー</li>
      <li>AI（ChatGPT / Claude / Gemini）にWeb検索ONで貼り付け</li>
      <li>出力されたMarkdownを <code>.md</code> ファイルとして保存</li>
      <li><a href="#/upload" style="color:var(--accent)">データアップロード</a>から読み込み、検証結果を確認して採用</li>
    </ol>
  </div>`;

let pokemonRange = null; // null = 全国図鑑の全範囲
const fullRange = () => `1-${dexMax()}`;
/** 世代ごとの範囲。最終世代の終わりは図鑑の最新番号に合わせる */
function rangePresets() {
  const max = dexMax();
  return [
    { label: `全範囲（${fullRange()}）`, range: fullRange() },
    ...GENERATIONS.map((g, i) => ({ label: `第${g.gen}世代`, range: `${g.from}-${i === GENERATIONS.length - 1 ? max : g.to}` })),
  ];
}
function promptText(k) {
  return promptCache[k]
    .replaceAll('{{TODAY}}', today())
    .replaceAll('{{RANGE}}', pokemonRange || fullRange())
    .replaceAll('{{DEX_MAX}}', String(dexMax()));
}
function promptBox(k) {
  const range = pokemonRange || fullRange();
  return `
    ${k === 'pokemon' ? `
      <div class="field-label">調査する図鑑番号の範囲<span class="muted">（GO未実装も含む）</span></div>
      <input id="range" value="${esc(range)}" style="width:140px;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface)">
      <div class="chips" style="margin:10px 0 0;flex-wrap:wrap">${rangePresets().map((p) => `<button data-range="${p.range}" aria-pressed="${p.range === range}" style="height:30px;padding:0 12px;font-size:12.5px">${p.label}</button>`).join('')}</div>
      <p class="muted" style="margin:8px 0 0">AIが途中で省略する場合は世代ごとに分けて依頼し、アップロード時に「追加（マージ）」で採用してください。</p>` : ''}
    <pre class="prompt" id="prompt-text">${esc(promptText(k))}</pre>
    <button class="btn primary block" data-copy-prompt="${k}">プロンプトをコピー</button>`;
}

// アップロード
let pending = []; // { name, text, parsed, result, done }
views.upload = () => `
  ${pageHead('データアップロード', '', '#/settings')}
  <label class="drop" id="drop">${ICON.cloud}<div><b>Markdownファイルを選択</b><br>またはドラッグ＆ドロップ</div>
    <input type="file" id="upload-file" accept=".md,.markdown,.txt" multiple hidden></label>
  ${pending.map((u, i) => uploadReport(u, i)).join('')}
  <h2 class="section">対応ファイル</h2>
  <p class="muted" style="margin-top:0">${[...DATA_KINDS, 'decisions'].map((k) => KINDS[k].file).join('、')}（1行目の見出しで種類を判定します）</p>
  <h2 class="section">現在のデータ</h2>
  ${dataStatusList(true)}
  ${DATA_KINDS.some((k) => state.files[k].source === 'uploaded') ? `<div class="btn-row" style="margin-top:10px">${DATA_KINDS.filter((k) => state.files[k].source === 'uploaded').map((k) => `<button class="btn sm" data-revert="${k}">${KINDS[k].label}を同梱データに戻す</button>`).join('')}</div>` : ''}`;

function uploadReport(u, i) {
  const { parsed, result } = u;
  const kind = parsed.kind;
  const cur = kind && kind !== 'decisions' ? state.files[kind].parsed : null;
  const ok = !result.errors.length;
  const cls = u.done ? 'ok' : ok ? (result.warnings.length ? 'warn' : 'ok') : 'err';
  return `<div class="notice ${cls}" style="margin-top:14px">
    <strong>${esc(u.name)} — ${kind ? KINDS[kind].label : '種類不明'}</strong>
    ${u.done ? '✓ 採用しました' : ok ? '検証OK。内容を確認して採用してください。' : '検証エラーのため採用できません。現在のデータはそのままです。'}
    <div class="muted" style="margin-top:4px">レコード ${parsed.records.length}件 / 更新日 ${esc(parsed.meta.updated_at || 'なし')}${cur ? `（現在: ${cur.records.length}件 / ${esc(cur.meta.updated_at || 'なし')}）` : ''}</div>
    ${result.errors.length ? `<ul>${result.errors.slice(0, 20).map((e) => `<li>${esc(e)}</li>`).join('')}${result.errors.length > 20 ? `<li>ほか ${result.errors.length - 20}件</li>` : ''}</ul>` : ''}
    ${result.warnings.length ? `<ul>${result.warnings.map((w) => `<li>⚠ ${esc(w)}</li>`).join('')}</ul>` : ''}
    ${ok && !u.done ? `<div class="btn-row" style="margin-top:10px">${adoptButtons(kind, cur, i)}<button class="btn sm" data-discard="${i}">破棄</button></div>` : ''}
  </div>`;
}

function adoptButtons(kind, cur, i) {
  if (kind === 'decisions') return `<button class="btn sm primary" data-adopt="${i}">判断データに取り込む</button>`;
  // 基本データは範囲を分けて取得することがあるので、追加（マージ）を選べるようにする
  if (kind === 'pokemon' && cur?.records.length && cur.meta.sample !== 'true') {
    return `<button class="btn sm primary" data-adopt="${i}" data-mode="merge">追加（マージ）</button><button class="btn sm" data-adopt="${i}" data-mode="replace">置き換え</button>`;
  }
  return `<button class="btn sm primary" data-adopt="${i}" data-mode="replace">採用する</button>`;
}

async function handleUploadFiles(files) {
  for (const file of files) {
    const text = await file.text();
    const parsed = parse(text);
    const result = validate(parsed, { knownDex: parsed.kind === 'pokemon' ? null : knownDex(), dexMax: dexMax() });
    pending.unshift({ name: file.name, text, parsed, result, done: false });
  }
  render(true);
}

// ---------- ルーティング ----------
function route() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'p') return { name: 'detail', tab: 'list', params: { key: decodeURIComponent(parts.slice(1).join('/')) } };
  const name = views[parts[0]] ? parts[0] : 'home';
  const tab = { update: 'settings', upload: 'settings', result: 'search' }[name] || name;
  return { name, tab, params };
}

let lastRoute = '';
function render(keepScroll = false) {
  const r = route();
  const view = $('#view');
  const y = window.scrollY;
  view.innerHTML = views[r.name](r.params);
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === r.tab));
  if (r.name === 'list') renderListRows();
  if (keepScroll || lastRoute === location.hash) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
  lastRoute = location.hash;
}

// ---------- イベント（委譲） ----------
function onClick(e) {
  const t = e.target.closest('button, a[data-goto-tab], a[data-undecide]');
  if (!t) return;
  const d = t.dataset;

  if (d.back) { history.length > 1 ? history.back() : (location.hash = d.back); return; }
  if (d.filter) { listState.f = d.filter; $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', b === t)); renderListRows(); return; }
  if (d.dtab) { detailTab = d.dtab; render(true); return; }
  if (d.gotoTab) { e.preventDefault(); detailTab = d.gotoTab; render(true); return; }
  if (d.undecide) { e.preventDefault(); setDecision(d.undecide, { status: null }); toast('未判断に戻しました'); render(true); return; }
  if (d.ofilter) { organizeFilter = d.ofilter; render(); return; }
  if (d.s) {
    const key = t.closest('[data-key]').dataset.key;
    const same = state.decisions[key]?.status === d.s;
    setDecision(key, { status: same ? null : d.s });
    toast(same ? '未判断に戻しました' : `「${STATUS_LABEL[d.s]}」にしました`);
    render(true);
    return;
  }
  if (d.copy != null) { copyText(d.copy); return; }
  if (d.prompt) { togglePrompt(d.prompt); return; }
  if (d.copyPrompt) { copyText(promptText(d.copyPrompt)); return; }
  if (d.adopt != null) { adopt(Number(d.adopt), d.mode); return; }
  if (d.range) {
    pokemonRange = d.range;
    $('#range').value = d.range;
    $('#prompt-text').textContent = promptText('pokemon');
    $$('[data-range]').forEach((b) => b.setAttribute('aria-pressed', b === t));
    return;
  }
  if (d.discard != null) { pending.splice(Number(d.discard), 1); render(true); return; }
  if (d.revert) {
    if (confirm(`${KINDS[d.revert].label}をアップロード前（同梱データ）に戻しますか？`)) {
      revertData(d.revert).then(() => { invalidate(); toast('同梱データに戻しました'); render(true); });
    }
    return;
  }
  switch (d.action) {
    case 'apply-all': {
      const list = state.pokemon.filter((p) => obtainable(p) && !state.decisions[p.key]?.status);
      if (!confirm(`未判断の ${list.length}件に、おすすめの状態をそのまま設定します。よろしいですか？`)) return;
      for (const p of list) setDecision(p.key, { status: statusOf(p).rec });
      toast(`${list.length}件に適用しました`);
      render();
      return;
    }
    case 'export-decisions':
      download('decisions.md', serializeDecisions(state.decisions, today()));
      return;
    case 'import-decisions':
      $('#decisions-file').click();
      return;
    case 'clear-decisions':
      if (confirm('このブラウザに保存された判断をすべて消去します。元に戻せません。先に書き出しておくことをおすすめします。消去しますか？')) {
        clearDecisions();
        toast('判断データを消去しました');
        render(true);
      }
      return;
  }
}

async function togglePrompt(k) {
  openPrompt = openPrompt === k ? null : k;
  render(true);
  if (openPrompt && !promptCache[k]) {
    try {
      const res = await fetch(`prompts/${KINDS[k].prompt}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      promptCache[k] = await res.text();
    } catch {
      promptCache[k] = null;
      $('#prompt-box').innerHTML = '<p class="muted">プロンプトを読み込めませんでした（prompts/ フォルダを確認してください）。</p>';
      return;
    }
    render(true);
  }
}

async function adopt(i, mode = 'replace') {
  const u = pending[i];
  try {
    if (u.parsed.kind === 'decisions') {
      const n = importDecisions(u.parsed);
      toast(`判断 ${n}件を取り込みました`);
    } else {
      await adoptData(u.parsed.kind, u.text, mode);
      toast(`${KINDS[u.parsed.kind].label}を${mode === 'merge' ? '追加' : '更新'}しました`);
    }
    u.done = true;
    invalidate();
  } catch (err) {
    alert(err.message);
  }
  render(true);
}

function onChange(e) {
  const t = e.target;
  if (t.dataset.rule) { setRule(t.dataset.rule, t.checked); invalidate(); toast('ルールを更新しました'); return; }
  if (t.name === 'mode' && t.closest('.view') && !t.closest('#search-form')) { setRule('mode', t.value); invalidate(); toast('判定の優先度を更新しました'); return; }
  if (t.closest('#search-form')) {
    const fd = new FormData($('#search-form'));
    Object.assign(searchForm, {
      target: fd.get('target'), combine: fd.get('combine'), mode: fd.get('mode'),
      uses: fd.getAll('uses'), extras: fd.getAll('extras'), useRec: fd.has('useRec'),
    });
    const r = computeSearch();
    $('#preview').innerHTML = r.query ? esc(r.query) : '<span class="muted">対象がありません</span>';
    $('#preview').previousElementSibling.querySelector('.note').textContent = `${r.nums.length}種`;
    return;
  }
  if (t.id === 'memo') { setDecision(t.dataset.key, { memo: t.value.trim() }); toast('メモを保存しました'); return; }
  if (t.id === 'upload-file') { handleUploadFiles([...t.files]); t.value = ''; return; }
  if (t.id === 'decisions-file') {
    const file = t.files[0];
    t.value = '';
    if (!file) return;
    file.text().then((text) => {
      const parsed = parse(text);
      const { errors } = validate(parsed);
      if (parsed.kind !== 'decisions') return alert('User Decisions 形式のファイルではありません。');
      if (errors.length) return alert(`読み込めません:\n${errors.slice(0, 10).join('\n')}`);
      const n = importDecisions(parsed);
      toast(`判断 ${n}件を読み込みました`);
      render(true);
    });
  }
}

function onInput(e) {
  if (e.target.id === 'list-q') { listState.q = e.target.value; renderListRows(); }
  if (e.target.id === 'range') {
    pokemonRange = e.target.value.trim() || null;
    $$('[data-range]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.range === (pokemonRange || fullRange())));
    $('#prompt-text').textContent = promptText('pokemon');
  }
}

function onSubmit(e) {
  if (e.target.dataset.action === 'home-search') {
    e.preventDefault();
    const q = new FormData(e.target).get('q').trim();
    location.hash = `#/list?f=ALL&q=${encodeURIComponent(q)}`;
  }
}

function setupDrop() {
  document.addEventListener('dragover', (e) => {
    const drop = e.target.closest?.('#drop');
    if (drop) { e.preventDefault(); drop.classList.add('over'); }
  });
  document.addEventListener('dragleave', (e) => e.target.closest?.('#drop')?.classList.remove('over'));
  document.addEventListener('drop', (e) => {
    const drop = e.target.closest?.('#drop');
    if (!drop) return;
    e.preventDefault();
    drop.classList.remove('over');
    handleUploadFiles([...e.dataTransfer.files]);
  });
}

// ---------- 起動 ----------
(async function main() {
  await loadAll();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('submit', onSubmit);
  setupDrop();
  window.addEventListener('hashchange', () => render());
  render();
})();
