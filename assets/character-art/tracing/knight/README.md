# 錆びた騎士 / knight — 採用画像・静止SVG・可動リグ

- 原画採用：2026-10-18、ユーザーが**大きな単色の錆面**に修正した騎士立ち絵を採用。
- 原寸PNG：1254×1254px。PNG本体はこの環境のGitHub連携からバイナリを転送できず、現時点では**リポジトリ未登録**。採用原寸PNGは会話成果物 `錆びた騎士の戦闘ポーズ.png` と照合すること。代替の旧サムネイルは使わない。
- 承認された静止SVG：`assets/character-art/tracing/knight/knight-static.svg`、`viewBox="0 0 760 760"`。元PNGの色面を直接トレース。
- SVG化／小サイズ比較：会話で提示したPNG対SVG、96px/128pxプレビューをユーザーが「かなりいい」と評価し可動化を依頼（工程B採用）。
- 造形：剣を肩上に構え、もう一方の腕には錆びた盾、赤い古布、鈍い装甲。旧`knight-svg-base.md`の「盾なし」より、ユーザーが採用した原画を優先。
- 可動レンダラー：`assets/character-knight.js`。**同じ静止SVGを一度読み込んで**Canvas上で本体・頭・剣肩・剣を握る前腕・盾肩・盾に連動する前腕へマスク分割。親子変換により武器だけを回さない。
- Game URL：`dev.html?floor=2&enemy=knight&art=knight-trace`。独立プレビュー：`assets/character-art/tracing/knight/preview.html`。
- ゲームの既存値 `knight.reach=110`、接触高さ`y=-58`、`swing=270ms`、`prepare=850ms`、`recovery=380ms`。**これらは変更していない**。攻撃終了時の剣先が接触座標付近になるよう描画上の肩角を調整。
- リグの記録：`knight-manifest.json`。idle→windup→strike→impact→recover のレンダリングは**ブラウザで人間が確認するまで未採用**。自動テストだけで見た目の完了とはしない。
- デフォルト描画・主人公の`?art=ready`とその−360°、既存敵モーション、当たり判定、音、セーブの変更なし。
