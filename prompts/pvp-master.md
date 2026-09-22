# Pokémon GO PvP マスターリーグ ランキング 作成依頼

あなたはPokémon GOのデータ調査担当です。Web検索を使って、GOバトルリーグ「マスターリーグ（Master League、CP上限 無制限）」の最新ランキングを調べ、指定のMarkdown形式で出力してください。

## 調査対象

- マスターリーグ（オープン、カップ限定ではない）の総合ランキング上位 100 件
- シャドウ・リージョンフォームは form で区別して別レコードにする

## 推奨情報源（上ほど優先）

1. PvPoke（pvpoke.com）のランキング
2. GamePress / Pokémon GO Hub 等の専門サイト
3. 複数の情報源で一致する評価

評価基準（例：「PvPoke Overall」）を `criteria` に必ず書く。

## 取得項目

pokedex / name（情報源上の名前）/ rank（順位）/ rating（情報源のスコア、なければ unknown）/ moveset（推奨技構成、日本語「通常技 / ゲージ技1, ゲージ技2」）/ notes

## 出力形式

```md
# PvP Master League

updated_at: {{TODAY}}
source_name: <サイト名>
source_url: <URL>
checked_at: {{TODAY}}
criteria: <評価基準>

## #184 normal

- pokedex: 184
- name: マリルリ
- rank: 1
- rating: unknown
- moveset: あわ / じゃれつく, ハイドロポンプ
- notes: unknown
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
