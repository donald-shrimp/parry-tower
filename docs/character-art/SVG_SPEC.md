# パーツ分割SVG 制作仕様（採用画像がある場合のみ）

## 入力条件

- [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- [キャラ別の指示](./README.md#基本キャラクター各1ファイル)
- ユーザーが採用した参照画像: `assets/character-art/references/<id>/approved.png`
- オプションの採用メモ: `assets/character-art/references/<id>/notes.md`
- 元のゲームコード `assets/game.js`、`assets/enemy-motions.js`、`assets/encounters.js`

**画像ファイルが視覚的に読めない場合は、SVG化を開始せずユーザーに添付してもらう。** パスが示されているだけでは画像内容は確認できない。

## 出力

- パーツ別SVG: `assets/character-art/svg/<id>/<part-name>.svg`
- 合成用メタデータ: `assets/character-art/svg/<id>/manifest.json`
- 参考画像を上書きしない。差分は同じDraft PR #28に入れる。
- **必要なパーツ**: body、head、upper-arm（左右）、forearm（左右）、hand（左右）、leg（左右）、weapon、shield、cape／robe。存在しないもの（スライムの脚、亡霊の盾など）は省略し、代わりにキャラ固有のパーツ（core、tentacle、rune、gear）を記録する。
- 外観のパーツ分割と関節軸が衝突する場合、関節を覆う接合用の小パーツを追加する。

## 座標系と衝突点を保つ

現行Canvas 2Dでは敵が `ctx.translate(x,y); ctx.scale(-scale,scale)` で描かれる。敵の足元はローカル `y=0`、頭はだいたい負のy、攻撃はローカルの **+x方向** に伸び、盾との接触高さは原則 **`y=-58`**。

- 敵の武器／攻撃部位は、攻撃終了時に **`(reach, -58)`** へ来る必要がある。reachは敵の種類によって異なるので `game.js` の `MOTIONS` と `enemy-motions.js` の計算を**コードで確認**する。
- `knight` の例は到達距離110、`slime` は49、`guardian` は130。これ以外も必ず個別に照合する。
- 主人公は元の `hero()` の shield anchor と `PARRY_STARTUP=100`ms の構え挙動を保持する。
- **SVG内のデザイン座標 = 当たり判定座標とは限らない。** manifestでのスケール・ピボット調整により、既存の当たり判定の見た目に寄せる。攻撃側の判定値は書き換えない。
- 既存の横反転、リコイル、待機の揺れを使うので、SVG素材には**静的なパーツ形状**だけを含める。

## SVG実装品質

- 静的な `<svg>`、`<path>`、`<g>`、`<circle>` 等で構成。外部CSS、外部画像、外部フォント、`<script>`、`<foreignObject>`、イベントハンドラ、外部参照は使わない。
- 全パーツに明示的 `viewBox` と安定した基準位置。ピボット座標はグループ全体で共有できるよう明記する。
- ベクターパスを単純化し、**極端に細い線、数百個の小図形、巨大なフィルターブラー**を避ける。手機や低解像度での表示を最優先。
- 原則: 明確な輪郭、単色面の重なり、影色1〜2段、アクセントは少量。
- 必ず生成したSVGを実際にレンダリング・確認し、空白、パーツずれ、欠け、背景混入がないことを確かめる。
- 生成画像のノイズや歪んだ手指は忠実に再現せず、整形してよい。ただし重要な記号・装備・配色は参照画像の採用意図を残す。

## manifest の最小例

```json
{
  "id": "hero",
  "status": "prototype",
  "reference": "assets/character-art/references/hero/approved.png",
  "coordinateSystem": "game-local",
  "feetY": 0,
  "parts": [
    {"id": "cape", "file": "cape.svg", "layer": 0, "pivot": [0, -70]},
    {"id": "body", "file": "body.svg", "layer": 1, "pivot": [0, -65]},
    {"id": "head", "file": "head.svg", "layer": 2, "pivot": [0, -90]},
    {"id": "weapon", "file": "weapon.svg", "layer": 8, "pivot": [12, -65]},
    {"id": "shield", "file": "shield.svg", "layer": 9, "pivot": [21, -48]}
  ]
}
```

これは**例**であり完成品ではない。各パーツの `viewBox` と位置・重なりを整合させ、実装では各関節の原点を正確に決めること。

## チェック

- 待機/溜め/振り下ろし/接触/反動の5場面を、旧描画との比較で確認
- 主人公のガード100ms後の構えとジャストパリィ時の盾位置を確認
- 敵種固有の攻撃先端が盾へ触れること（フレームレート低下時も同期）
- レア・精鋭・パレット派生の判読性確認
- モバイルサイズで顔・盾・武器が識別可能
- 描画以外のテストと既存CIが通る
- SVGのデータや画像をゲームに入れても **デフォルトでは旧描画**、`?art=prototype` 等の試験モードのみ新描画

マージ判断はユーザーが行う。画像生成・SVG制作担当は勝手に本番反映しない。
