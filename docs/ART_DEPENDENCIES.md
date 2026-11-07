# アート・描画の参照関係

2026-11-07、5Aの調査対象。ファイル名にcandidate/rework/previewがあっても未使用とは限らない。採用状態は [ADOPTED_ART](./ADOPTED_ART.md)、編集の運用は [ART_STUDIO](./ART_STUDIO.md) と [LOCAL_FILES](./LOCAL_FILES.md) を参照。

## 本編・Devの描画入口

`character-renderer.js` は描画先の選択だけを担当する。gameから時刻/寸法/姿勢/敵の表示情報と、そのフレームの採用絵/legacyフラグを受け取る。状態更新、乱数、保存、音声、独自の時計を持たない。

| 系統 | 入口と使用箇所 | 主な依存 |
| --- | --- | --- |
| 採用絵（指定なし / art=illustrated） | index/dev → renderer → knight-puppet。主人公はhero-puppet、騎士以外はenemy-puppetへ振り分け | character-style、palette-candidates、character-edit、enemy-data、combat-art |
| art=rework | index/dev → renderer → character-rig。art-previewでも直接使用 | Canvas/Path2D、既存時刻による姿勢 |
| art=impact | index/dev → renderer → combat-art。art-previewでも直接使用 | character-ready、character-knight、character-art |
| art=ready / trace / flat / svg / prototype | index/dev → rendererのローカル座標描画 | 各character-*と対応するSVG/Canvas素材 |
| art=knight-trace | index/dev → renderer → character-knight。専用previewでも使用 | tracing/knightの採用SVGとmask |
| legacy表示 / 読込失敗時 | gameの既存Canvas描画。専用敵はenemy-motionsから描画 | ゲームの既存transform、演出、攻撃時刻 |

world描画とlocal描画を分ける。local描画前後のtranslate/scale/shadow/filterはgameが所有し、失敗した描画先は従来と同じ順に次へ渡す。重攻撃オーラはsample→背面→本体→前面。主役が描けなかったときに前面オーラを余分に描かない。

gameのprepareEncounterArtは引き続き読込開始/停止/進行を所有する。未読込ではBGMを止めてloadingへ入り、主人公と敵の準備後に新しい拍原点から開始する。完了時のrun同一性・enemy同一性・mode===loadingの三条件を維持し、別ラン/別遭遇/タイトルに戻った後の完了で戦闘を再開しない。失敗はartFallbackを立てる。

## 工房・比較ページ

| ページ | 使用モジュール/データ | 本編との関係 |
| --- | --- | --- |
| art-studio.html | character-edit、hero/enemy/knight-puppet、enemy-data、combat-art、art-studio | 同じ原画とpuppetを編集。採用fineへのcharacter-style差替えは読み込まない |
| art-preview.html | character-art/ready/knight、combat-art、rig、各puppet、character-edit | 元原画とモーションの比較。game.jsは使わない |
| skin-preview.html | art-defaults、edit、character-style、hero-puppet | 採用スキンと確定ポーズの確認 |
| pixel-compare.html | encounters、pixel-compare、pixel/paletteのmanifestと画像 | 加工段階の比較。通常ゲームとは別入口 |
| filter-paint.html | filter-paint-core、filter-paint、読み込んだ画像/編集JSON | 塗分け編集用。描画dispatcherから独立 |
| tracing/hero/{compare,animate-preview,ready-preview}.html | 各tracing素材/モジュール | 旧方式の比較に使用 |
| tracing/knight/preview.html | character-knight | 旧方式の比較に使用 |
| ending-preview.html | art-defaults、edit、palette、style、hero-puppet、ending-scene | 終幕の独立プレビュー。本編入口はending-sceneを読み込まない |

## 正本と生成物

| 正本/入力 | 生成処理 | 出力/利用 |
| --- | --- | --- |
| character-art/rework の原画、puppet/data内のsource定義 | scripts/build-pixel-art.py | pixel-candidates各密度画像とmanifest。本編はfineを選択 |
| pixel manifest、encountersの配色、approved/endkingの塗分け済素材 | scripts/build-palette-art.py | palette-candidates画像/manifestとassets/palette-candidates.js |
| スキン原画 | scripts/build-hero-skin-art.py | 採用スキン画像。マスク・姿勢はhero-puppet |
| character-art/studio-project.json | scripts/build-art-defaults.js（character-edit.normalizeを使用） | assets/character-art-defaults.js。起動時に確定ポーズを同期供給 |

character-editは確定default/HTTPの正本JSONと、ブラウザーの手動適用データを扱う。工房の「保存してゲームに反映」はserve-localのAPI経由でJSONを保存し、直前版をbackupに残し、同時にart-defaultsを更新する。今回この保存形式と優先順、画像/ポーズは変更しない。生成の一致検査はrender(project)と追跡済みart-defaultsの比較で行い、検査のためにユーザーのJSONを上書きしない。

## 今後変更するとき

採用絵を足す場合はenemy-data/puppet/style側、描画方式を足す場合はrenderer側を先に確認する。戦闘判定に表示側の姿勢やフレームdtを流用しない。工房は各puppetの編集APIを直接使うため、ゲームのdispatcherへの統一を強制しない。未使用資産の削除は各HTML・生成スクリプト・manifest・実行時source解決まで調べた別作業とする。
