# 主人公パーツSVG — 実装メモ

採用参考: [軽量PNG](../../references/hero/approved.png) と [採用メモ](../../references/hero/notes.md)。元の生成画像は1536×1024pxの設定画。GitHub内の軽量PNGは人物部分を切り出して減色したレビュー用コピーなので、**元の高解像度画像を再アップロードすればそれを優先**する。

- パーツ: `manifest.json` に12層を宣言。各`.svg` は同じゲーム座標系の `viewBox=(-100,-150,200,165)` を使用。
- 盾・剣は局所原点。動作中は元のCanvas pilotと同様の `lift` / `action` / `push` に連動。
- `assets/character-svg.js` が manifest と画像を非同期にプリロードし、全ファイルを読めた時だけSVG表示。失敗・未ロード時は従来描画へフォールバック。
- `dev.html?floor=2&enemy=knight&art=svg`: SVG主人公＋従来敵。
- `dev.html?floor=2&enemy=knight&art=prototype`: 旧Canvas作画プロトタイプ。
- `dev.html?floor=2&enemy=knight`: 既存の安定描画。
- 攻撃時計・パリィ判定・Web Audio・持続データは変更しない。ユーザーの目視採用まではPRをDraftのままにする。
