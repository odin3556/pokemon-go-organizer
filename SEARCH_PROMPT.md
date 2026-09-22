# SEARCH_PROMPT.md — AI検索プロンプトの方針

Webアプリ自身は常時Web検索しない。データ更新は次の流れを正式ルートとする。

```text
設定 → データ更新 → [更新] → プロンプトをコピー
  → ChatGPT / Claude / Gemini に貼り付け（Web検索ON）
  → AIが Markdown を生成 → .md としてダウンロード
  → 設定 → データアップロード → 検証 → 採用
```

実際のプロンプト本文は `prompts/` にあり、アプリの「データ更新」画面からそのままコピーできる。

| プロンプト | 生成するファイル |
|---|---|
| `prompts/pokemon-data.md` | `pokemon.md` |
| `prompts/raid.md` | `raid-ranking.md` |
| `prompts/pvp-great.md` | `pvp-great.md` |
| `prompts/pvp-ultra.md` | `pvp-ultra.md` |
| `prompts/pvp-master.md` | `pvp-master.md` |

## すべてのプロンプトに含める要素

1. **調査対象**：何のデータを集めるか
2. **推奨情報源**：優先順位つき（公式 → 専門DB → 複数一致 → その他）
3. **取得項目**：DATA_SCHEMA.md のキー名そのまま
4. **全国図鑑番号への変換**：名前ではなく番号をキーにする。形態は `form` で区別
5. **Markdown形式**：見出し・メタ情報・レコードの書式を例つきで固定
6. **情報源URL**：`source_name` / `source_url` を必ず記入
7. **確認日**：`updated_at` / `checked_at` に今日の日付
8. **推測禁止**：分からない値は `unknown`。存在しないポケモン・順位を作らない
9. **出力制約**：コードブロック1つだけで出力（前後の説明文なし）→ そのまま保存できる

## プロンプト編集時の注意

- キー名を変えたら `DATA_SCHEMA.md` と `js/markdown.js` も同時に直す
- ランキングは「その情報源の評価」であり絶対的な強さではない。`criteria` に評価基準を書かせる
- 件数が多いとAIが途中で省略しがち。「省略記号（…）を使わない」「件数を最後に数えて確認」を入れる
