# Pokémon GO 整理アシスタント

保有ポケモンを「レイド」「PvP」「種族値」のデータを参考に **残す / 保留 / 整理** に仕分けし、
Pokémon GO の検索文字列を作る静的Webアプリ。GitHub Pages で動く（バックエンドなし）。

> ⚠ 同梱の `data/` はサンプルです。種族値は手入力、**ランキング順位はダミー**です。
> アプリの「設定 → データ更新」から AI で正式データを作って差し替えてください。

## 使い方

1. ホーム → 「整理する」でおすすめを確認し、残す・保留・整理を決める
2. 「検索」で対象と出力形式を選び、検索文字列をコピー
3. Pokémon GO のポケモンボックス検索欄に貼り付け

データ更新は：設定 → データ更新 → プロンプトをコピー → AI（Web検索ON）→ `.md` を保存 → 設定 → データアップロード → 検証 → 採用

## ローカルで動かす

`index.html` を直接ダブルクリックすると、ブラウザの制限で `data/*.md` を読めません。フォルダでサーバーを起動します。

```bash
python -m http.server 8765
```

→ http://localhost:8765 を開く

## GitHub Pages で公開

1. このフォルダを GitHub リポジトリに push
2. リポジトリの Settings → Pages → Branch: `main` / `(root)` を選んで保存

`user/*.md`（個人の判断データ）は `.gitignore` 済みで公開されません。判断はブラウザの LocalStorage に保存されます。

## フォルダ構成

```text
pokemon-go-organizer/
├── README.md            … このファイル
├── DESIGN.md            … 設計書（元資料）
├── DATA_SCHEMA.md       … Markdownデータの書式・検証ルール
├── RULES.md             … 整理ルール・おすすめ判定・検索構文
├── SEARCH_PROMPT.md     … AIプロンプトの方針
├── index.html
├── css/style.css
├── js/
│   ├── app.js           … 画面・ルーティング
│   ├── markdown.js      … Markdownの解析・検証・書き出し
│   ├── store.js         … データ読み込み・LocalStorage保存
│   ├── rules.js         … 整理ルール・おすすめ判定
│   └── search.js        … 検索文字列の生成
├── data/                … 外部データ（客観データ）
├── prompts/             … AI検索用プロンプト（アプリからコピー）
├── templates/           … 各データの空テンプレート
├── user/                … 自分の判断（Git管理外）
└── docs/ui-mock.png     … UIモック
```

## 開発フェーズの進捗（DESIGN.md §29）

- [x] Phase 1 データ仕様（DATA_SCHEMA / RULES / SEARCH_PROMPT / README）
- [x] Phase 2 サンプルデータ
- [x] Phase 3 Web UI（一覧・詳細・判断・ルールトグル・検索文字列生成）
- [x] Phase 4 Markdownアップロード（検証 → 採用、同梱データへ戻す）
- [x] Phase 5 AI更新センター（プロンプト表示・コピー・手順）
- [ ] Phase 6 一時Web検索（外部サイト直接取得 → 一時データ → 確認 → 採用）
