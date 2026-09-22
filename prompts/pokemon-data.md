# Pokémon GO 基本ポケモンデータ 作成依頼

あなたはPokémon GOのデータ調査担当です。Web検索を使って、Pokémon GOにおける各ポケモンの基本データを調べ、指定のMarkdown形式で出力してください。

## 調査対象

- Pokémon GOに実装済みのポケモン（まずは図鑑番号 {{RANGE}} の範囲）
- 通常形態に加え、リージョンフォーム等でGO上の種族値が異なるものは別レコードにする
- メガシンカ・シャドウはこのファイルには含めない（ランキング側で扱う）

## 推奨情報源（上ほど優先）

1. 公式情報（pokemongo.com / ゲーム内表記）
2. 信頼できる専門データベース（Pokémon GO Hub Database、GamePress、PvPoke のゲームマスター由来データ 等）
3. 複数の情報源で一致する値

## 取得項目

pokedex（全国図鑑番号）/ name_ja（日本語名）/ name_en（英語名）/ types（日本語タイプ、カンマ区切り）/ attack / defense / stamina（GOの種族値）/ evolves_from / evolves_to（図鑑番号）/ form_name（リージョンフォーム等の表示名、任意）

## 出力形式

```md
# Pokemon Data

updated_at: {{TODAY}}
source_name: <参照したサイト名, カンマ区切り>
source_url: <参照したURL, カンマ区切り>
checked_at: {{TODAY}}

## #1 normal

- pokedex: 1
- name_ja: フシギダネ
- name_en: Bulbasaur
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
- 最後に、書いたレコード数を数え、指定件数と一致しているか確認してから出力する。
