# Pokémon GO 基本ポケモンデータ 作成依頼

あなたはPokémon GOのデータ調査担当です。Web検索を使って、Pokémon GOにおける各ポケモンの基本データを調べ、指定のMarkdown形式で出力してください。

## 調査対象

- 図鑑番号 {{RANGE}} の **すべてのポケモン**（本編ソフトの全国図鑑に基づく。現時点の最終番号は {{DEX_MAX}}）
- **Pokémon GO に未実装のポケモンも省略せずに含める。** GOでの実装状況は `go_status` に書く
- 範囲の終わりが {{DEX_MAX}} で、本編の新作によって全国図鑑がそれより増えている場合は、最新の番号まで含め、`dex_max` にその番号を書く
- 通常形態に加え、リージョンフォーム等でGO上の種族値が異なるものは別レコードにする
- メガシンカ・シャドウはこのファイルには含めない（ランキング側で扱う）

## 推奨情報源（上ほど優先）

1. 公式情報（pokemongo.com / ゲーム内表記、ポケモン公式の全国図鑑 zukan.pokemon.co.jp）
2. 信頼できる専門データベース（Pokémon GO Hub Database、GamePress、PvPoke のゲームマスター由来データ 等）
3. 複数の情報源で一致する値

## 取得項目

pokedex（全国図鑑番号）/ name_ja（日本語名）/ name_en（英語名）/ go_status（GOでの実装状況：`released` = 実装済み、`unreleased` = 未実装、`unknown` = 確認できない）/ types（日本語タイプ、カンマ区切り）/ attack / defense / stamina（GOの種族値。GO未実装で信頼できるデータベースにも値がない場合は `unknown`）/ evolves_from / evolves_to（図鑑番号）/ form_name（リージョンフォーム等の表示名、任意）

## 出力形式

```md
# Pokemon Data

updated_at: {{TODAY}}
source_name: <参照したサイト名, カンマ区切り>
source_url: <参照したURL, カンマ区切り>
checked_at: {{TODAY}}
dex_max: {{DEX_MAX}}

## #1 normal

- pokedex: 1
- name_ja: フシギダネ
- name_en: Bulbasaur
- go_status: released
- types: くさ, どく
- attack: 118
- defense: 111
- stamina: 128
- evolves_from: unknown
- evolves_to: 2
```

## 厳守事項

- **推測でデータを埋めない。** 情報源で確認できない値は必ず `unknown` と書く。
- 存在しないポケモン・順位・数値を作らない。
- ポケモンは名前ではなく **全国図鑑番号** で特定する。見出しは `## #<図鑑番号> <form>`。
- form は `normal` / `shadow` / `purified` / `mega` / `mega-x` / `mega-y` / `primal` / `alola` / `galar` / `hisui` / `paldea` / その他英小文字（例 `origin`）。
- 同じ見出し（番号+form）を2回書かない。
- 省略記号（…、以下略 など）を使わず、対象件数をすべて書く。
- 出力は **Markdownのコードブロック1つだけ**。前後に説明文を書かない。
- 最後に、範囲内の図鑑番号がすべて（GO未実装も含めて）1件以上あるか数えて確認してから出力する。
- 1回で出力しきれない場合に限り、省略記号は使わずに出力できた最後のレコードでコードブロックを閉じ、ブロックの外に「#<番号> まで出力。続きは『続けて』と入力してください」と1行だけ書く。
- 続きを出力するときも、必ず `# Pokemon Data` の見出しとメタ情報から書き始める（別ファイルとして保存し、アプリで「追加（マージ）」して読み込むため）。
