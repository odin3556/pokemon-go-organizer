# DATA_SCHEMA.md — データ仕様

Webアプリ・AI・人間の三者が同じMarkdownを読み書きできるよう、書式を固定する。
パーサー実装は `js/markdown.js`。

---

## 共通ルール

1. 1行目は **ファイル種別の見出し**（下表）。アップロード時の種類判定に使う。
2. 見出しの直後に **メタ情報**（`key: value`）を書く。`updated_at` は必須。
3. 各レコードは `## #<図鑑番号> <form>` の見出しで始める。`form` を省略すると `normal`。
4. レコード内は `- key: value` の箇条書き。
5. 不明な値は必ず `unknown` と書く（空欄・推測は禁止）。`null` も同じ意味として受け付ける。
6. 日付は `YYYY-MM-DD`。
7. `<!-- -->` のHTMLコメントは無視される（メモに使ってよい）。

| 1行目の見出し | ファイル | 種別ID |
|---|---|---|
| `# Pokemon Data` | `data/pokemon.md` | `pokemon` |
| `# Raid Ranking` | `data/raid-ranking.md` | `raid` |
| `# PvP Great League` | `data/pvp-great.md` | `pvp-great` |
| `# PvP Ultra League` | `data/pvp-ultra.md` | `pvp-ultra` |
| `# PvP Master League` | `data/pvp-master.md` | `pvp-master` |
| `# User Decisions` | `user/decisions.md` | `decisions` |

### 共通メタ情報

| key | 必須 | 内容 |
|---|---|---|
| `updated_at` | ✅ | データの更新日 |
| `source_name` | 推奨 | 情報源名（複数ならカンマ区切り） |
| `source_url` | 推奨 | 情報源URL（複数ならカンマ区切り） |
| `checked_at` | 推奨 | 情報源を確認した日 |
| `criteria` | 任意 | ランキングの評価基準（例：「DPS×TDO」） |
| `sample` | 任意 | `true` ならダミー値を含むサンプル。UIに警告を出す |

---

## form（フォルム・特殊形態）

図鑑番号は共通キーだが、形態で評価が変わるため `form` で区別する。
レコードのキーは `図鑑番号 + form`（例：`150 normal`、`150 shadow`、`6 mega-x`）。

| form | 意味 |
|---|---|
| `normal` | 通常 |
| `shadow` | シャドウ |
| `purified` | ライト |
| `mega` / `mega-x` / `mega-y` | メガシンカ |
| `primal` | ゲンシカイキ |
| `alola` / `galar` / `hisui` / `paldea` | リージョンフォーム |
| その他英小文字 | その他フォルム（例：`origin`, `therian`） |

---

## 1. `pokemon.md`（基本ポケモンデータ）

```md
# Pokemon Data

updated_at: 2026-09-23
source_name: Example
source_url: https://example.com/

## #150 normal

- pokedex: 150
- name_ja: ミュウツー
- name_en: Mewtwo
- types: エスパー
- attack: 300
- defense: 182
- stamina: 214
- evolves_from: unknown
- evolves_to: unknown
```

| key | 必須 | 型 | 内容 |
|---|---|---|---|
| `pokedex` | ✅ | 整数 | 全国図鑑番号（見出しと一致すること） |
| `name_ja` | ✅ | 文字列 | 日本語名 |
| `name_en` | 推奨 | 文字列 | 英語名 |
| `types` | ✅ | カンマ区切り | タイプ（日本語。最大2つ） |
| `attack` / `defense` / `stamina` | ✅ | 整数 or unknown | GOの種族値 |
| `evolves_from` / `evolves_to` | 任意 | 図鑑番号（カンマ区切り） | 進化関係 |
| `form_name` | 任意 | 文字列 | 表示用のフォルム名（例：アローラのすがた） |

※ `types` はネストした箇条書き（`- types:` の下に `  - エスパー`）でも可。

---

## 2. `raid-ranking.md`（レイド）

```md
# Raid Ranking

updated_at: 2026-09-23
source_name: Example
source_url: https://example.com/raid
criteria: 総合DPS順

## #150 shadow

- pokedex: 150
- name: ミュウツー（シャドウ）
- overall_rank: 1
- attack_type: エスパー
- type_rank: 1
- moveset: サイコカッター / サイコブレイク
- notes: unknown
```

| key | 必須 | 内容 |
|---|---|---|
| `pokedex` | ✅ | 全国図鑑番号 |
| `name` | 推奨 | 情報源上の名前（照合確認用） |
| `overall_rank` | ✅ | 総合順位（整数 or unknown） |
| `attack_type` | 推奨 | アタッカーとしてのタイプ |
| `type_rank` | 推奨 | そのタイプ内の順位 |
| `moveset` | 任意 | 推奨技 |
| `notes` | 任意 | 特記事項 |

同じポケモンが複数タイプで評価される場合は、`attack_type` ごとに別レコードにしてよい
（見出しが重複する場合は `## #150 normal` を2回書かず、`- attack_type` の違うレコードを `## #150 normal ドラゴン` のように3語目で区別する）。

---

## 3. `pvp-great.md` / `pvp-ultra.md` / `pvp-master.md`（PvP）

```md
# PvP Great League

updated_at: 2026-09-20
source_name: Example
source_url: https://example.com/pvp
criteria: オープンリーグ総合

## #184 normal

- pokedex: 184
- name: マリルリ
- rank: 12
- rating: 92.1
- moveset: あわ / じゃれつく, ハイドロポンプ
- notes: unknown
```

| key | 必須 | 内容 |
|---|---|---|
| `pokedex` | ✅ | 全国図鑑番号 |
| `name` | 推奨 | 情報源上の名前 |
| `rank` | ✅ | 順位（整数 or unknown） |
| `rating` | 任意 | 情報源のスコア |
| `moveset` | 任意 | 推奨技構成 |
| `notes` | 任意 | 特記事項 |

カップ別データを追加する場合は `# PvP Cup <カップ名>` / `pvp-cup-<id>.md` とする（将来拡張）。

---

## 4. `user/decisions.md`（ユーザー判断）

外部データとは分離する。通常はブラウザの LocalStorage に保存され、
設定画面から Markdown としてエクスポート／インポートできる。

```md
# User Decisions

updated_at: 2026-09-23

## #150 normal

- status: KEEP
- memo: 色違いあり
```

| key | 必須 | 値 |
|---|---|---|
| `status` | ✅ | `KEEP`（残す） / `HOLD`（保留） / `EXCLUDE`（整理） |
| `memo` | 任意 | 自由記述 |

---

## アップロード時の検証（`js/markdown.js` → `validate()`）

エラー（1件でもあれば採用不可）

- 1行目の見出しから種別を判定できない
- `updated_at` がない／日付形式でない
- レコードが0件
- `pokedex` が整数でない、または見出しの番号と一致しない
- 同じ `図鑑番号 + form (+区別語)` の重複
- 必須項目の欠落
- 数値項目に数値でも `unknown` でもない値

警告（採用は可能）

- `source_url` / `checked_at` がない
- ランキング等で `unknown` が含まれる
- 基本データ（pokemon.md）に存在しない図鑑番号
- `sample: true`
