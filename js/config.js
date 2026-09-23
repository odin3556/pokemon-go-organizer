// 全国図鑑（本編ソフト）の範囲。GO未実装のポケモンも含めて扱う。
// ここは「最低値」。pokemon.md の dex_max やレコードにこれより大きい番号があれば自動でそちらに追従するので、
// 新作で図鑑が増えても、AIで取り直したデータをアップロードすればコード修正は不要。
export const NATIONAL_DEX_MAX = 1025; // 第9世代（ゼロの秘宝 番外編まで）: 1025 モモワロウ

// 世代ごとの範囲（AIへの依頼を分割するときのプリセット）。最終世代の終わりは dexMax に合わせる。
export const GENERATIONS = [
  { gen: 1, from: 1, to: 151 },
  { gen: 2, from: 152, to: 251 },
  { gen: 3, from: 252, to: 386 },
  { gen: 4, from: 387, to: 493 },
  { gen: 5, from: 494, to: 649 },
  { gen: 6, from: 650, to: 721 },
  { gen: 7, from: 722, to: 809 },
  { gen: 8, from: 810, to: 905 },
  { gen: 9, from: 906, to: 1025 },
];

// GOでの実装状況（pokemon.md の go_status）
export const GO_STATUS = { released: '実装済み', unreleased: 'GO未実装', unknown: '不明' };
