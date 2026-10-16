# パリィの塔 / Parry Tower

**音楽を聴き、敵の構えを読み、刃を弾く。** ブラウザで遊べる、リズム＋モーション型のパリィ・ローグライトです。

- **最新版:** v0.5（音楽同期プロトタイプ）
- **操作:** スマホは画面をタップ、PCはクリックまたは Space
- **特徴:** Web Audio APIで生成するBGMと敵の着弾時刻を同期。敵別の攻撃パターン、稽古場、ジャストパリィ、3択強化、シナジー進化、無限階層、恒久強化。
- **外部依存:** なし（ビルド不要、CDN不要）

## 遊び方

[GitHub Pagesでプレイする](https://donald-shrimp.github.io/parry-tower/) （**Pages公開後に有効になります**）

ローカルでは `index.html` をブラウザで開くだけで動きます。BGMの再生はブラウザの制約により「開始」などのユーザー操作後に始まります。

1. 敵の構え・BGMの拍から着弾を予測する。
2. 剣や身体が盾に接触するタイミングに合わせてタップする。
3. 戦闘に勝利してスキルを選び、ビルドを育てながら塔を登る。
4. 稽古場で敵ごとのタイミングを練習する。タイミング補正は端末ごとに調整する。

## 構成

```text
index.html                 ゲーム画面のDOM
assets/style.css           UI・レスポンシブCSS
assets/game.js             ゲーム、描画、音楽とパリィ判定
.nojekyll                  GitHub Pages静的配信設定
.github/workflows/check.yml  構文と静的ファイルのCI
docs/ARCHITECTURE.md       同期方式と改修時の注意
```

`assets/game.js` は元のv0.5のスクリプトを挙動変更なしで分離したものです。v0.1〜v0.5の単一HTML版は Gitタグで保存しています。

```bash
# ローカルWebサーバーで確認する場合（Python 3）
python -m http.server 8000
# http://localhost:8000/
```

## GitHub Pages公開

詳しい手順は [docs/DEPLOY.md](docs/DEPLOY.md) を参照してください。Pages設定は `Deploy from a branch` → `main` → `/(root)`。公開時のURLは `https://donald-shrimp.github.io/parry-tower/` を想定しています（リポジトリ名が `parry-tower` の場合）。

## 今後の進め方

変更はブランチとPull Requestで管理し、音声クロック・モーション・判定の同期を壊さないことを最優先とします。次の課題候補は、楽曲アレンジ、敵モーションの洗練、リズムの公平性、入力遅延の実機検証、強化バランス調整。

## セーブとプライバシー

セーブデータと音声タイミング補正はブラウザ内の `localStorage` に保存されます。外部送信は行いません。`file://` で遊んでいたデータは、GitHub PagesのURLとオリジンが異なるため**自動では引き継がれません**。今後データ移行機能を検討します。

## ライセンス

現時点ではライセンス未設定です。GitHub上で公開されても、再利用・再配布の許諾を意味するものではありません。外部コントリビューションを募集する前に方針を決めます。
