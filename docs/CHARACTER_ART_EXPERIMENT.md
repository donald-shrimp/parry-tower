# キャラクター作画プロトタイプ（Draft PR / 破棄可能）

## 目的とスコープ

既存の Canvas 2D 描画・戦闘挙動を保持したまま、主人公と主要な敵系統のシルエット、装甲の陰影、素材感を試す **視覚専用の試作品**。

- 主人公：マント・脚・胴体・兜・盾・剣を別パーツとして Canvas に重ね描き。既存の盾の上昇タイミング、構え、反撃モーション、ジャスト時の発光を踏襲。
- 敵：騎士、スライム、暗殺者、亡霊、ボス、番兵、双剣士、詠み手、機兵をパーツ分割・立体的な陰影で試作。既存の各武器先端座標・動作補間を参照し、接触タイミングは変更しない。
- 既存 `sprite` と `kind` で描画の分岐を選択。色替え敵（炉の番兵、白銀の双剣士、星屑の詠み手等）は元キャラの新しい形状＋既存パレット補正を使用。
- **未対応**：敵タイプごとの完全な新規3D/画像アニメーション、外部アート素材、追加キャラクター固有の新モーション。描画のみが試験範囲。
- SVGの外部ファイル化は *意図的に未実施*。まず最小のCanvasパーツ試作で見た目・可読性・コード分離を評価し、採用が決まってから素材形式を検討する。

## 新旧表示の切替（クエリで opt-in）

このブランチをローカルでチェックアウトして、リポジトリ直下で:

```sh
python3 -m http.server 8000
```

ブラウザで次を開く。Node.js の場合は `npx --yes http-server . -p 8000` でも起動できる。

- 旧描画（比較用）: `http://localhost:8000/dev.html?floor=2&enemy=knight`
- **新描画**: `http://localhost:8000/dev.html?floor=2&enemy=knight&art=prototype`
- スライム: `http://localhost:8000/dev.html?floor=1&enemy=slime&art=prototype`
- 暗殺者: `http://localhost:8000/dev.html?floor=3&enemy=rogue&art=prototype`
- 亡霊: `http://localhost:8000/dev.html?floor=4&enemy=wraith&art=prototype`
- ボス: `http://localhost:8000/dev.html?floor=5&enemy=guardian&art=prototype`
- 番兵: `http://localhost:8000/dev.html?floor=11&enemy=sentinel&art=prototype`
- 双剣士: `http://localhost:8000/dev.html?floor=14&enemy=duelist&art=prototype`
- 詠み手: `http://localhost:8000/dev.html?floor=21&enemy=cantor&art=prototype`
- 機兵: `http://localhost:8000/dev.html?floor=31&enemy=clockwork&art=prototype`
- 通常プレイの新描画: `http://localhost:8000/index.html?art=prototype`

稽古場 / dev モードで各敵との接触・通常パリィ・ジャスト・長押しガードを確認する。新描画はデフォルトで **OFF**。URLから `art=prototype` を外して再読み込みすれば旧描画に戻る。値の保存や設定変更は行わない。

GitHub Pages は既定で `main` を公開するため、**Draft PR のURLを開いただけではこの試作はプレイできない**。上記のようにブランチをチェックアウトして確認するか、別途隔離されたプレビュー環境を使用する。

## 技術的な境界線

- `assets/character-art.js` は Canvas に描くだけの関数 `drawHero` / `drawEnemy` を公開。ブラウザのゲーム状態、ローカル保存、AudioContext、DOM、タイマーへアクセスしない。
- `assets/game.js` はクエリゲートの下で関数を呼び、非対象・未読込の場合には元の描画処理へフォールバック。
- 既存の `hero()`, `enemy()` にある移動・拡大・縮小・パレット・衝突・接地描画を再利用する。
- **制約**：ゲーム全体の「当たり判定」は変えない。剣先と盾の見かけ上の一致、予兆の読みやすさを目視でも確認してから採用判断する。

## テストと破棄

```sh
node --check assets/character-art.js
node --test tests/character-art.test.js
node --test tests/game-smoke.test.js tests/enemy-motions.test.js
```

既存 CI も全て適用される。現段階はグラフィックの試験運用であり **マージも本番デプロイもしない**。

破棄する場合は **この Draft PR を Close → `experiment/character-art-canvas-v1` ブランチを削除**。main側には一切変更が残らない。
