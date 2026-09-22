# Pokémon GO レイドアタッカーランキング 作成依頼

あなたはPokémon GOのデータ調査担当です。Web検索を使って、最新のレイドアタッカー評価を調べ、指定のMarkdown形式で出力してください。

## 調査対象

- 総合レイドアタッカーランキングの上位 100 件
- 各タイプ（18タイプ）ごとの上位 10 件（総合と重複してよい。同じポケモンが別タイプで入る場合は見出しの3語目にタイプ名を付けて区別：`## #150 normal エスパー`）
- メガ / ゲンシ / シャドウ は form で区別して別レコードにする

## 推奨情報源（上ほど優先）

1. 信頼できる専門サイトのランキング（Pokebattler、GamePress、DialgaDex、Pokémon GO Hub 等）
2. 複数の情報源で一致する評価

ランキングの評価基準（DPS、TDO、ER など）を `criteria` に必ず書く。単一サイトの順位を絶対的な強さとして扱わない。

## 取得項目

pokedex / name（情報源上の名前）/ overall_rank（総合順位、総合圏外なら unknown）/ attack_type（アタッカーとしてのタイプ、日本語）/ type_rank（タイプ内順位）/ moveset（推奨技、日本語）/ notes

## 出力形式

```md
# Raid Ranking

updated_at: {{TODAY}}
source_name: <サイト名>
source_url: <URL>
checked_at: {{TODAY}}
criteria: <評価基準>

## #150 mega-y

- pokedex: 150
- name: メガミュウツーY
- overall_rank: 1
- attack_type: エスパー
- type_rank: 1
- moveset: サイコカッター / サイコブレイク
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
