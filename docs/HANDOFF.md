# 継続状態（2026-10-21）

## 現在の目的と承認

最新依頼はスキン左上の分類ラベル（やさしい/一発勝負/変則リズム/STANDARD）を削除し、ひよこの紹介文を「か、かわいい〜〜〜！！敵もうっとりのかわいさ。」へ変更して本番反映。立ち絵プレビュー・効果・価格ボタン・装備枠は維持。v0.9.3-14として検証・公開まで完了。

関連Node32件・実フォントcmap Python2件成功（test-results/skin-copy-cleanup/）。分類ラベル用DOM/CSSを除去、既存カード検証で非表示・購入/装備と保存互換を確認。新紹介文は現在の拡張フォントで全字対応済み、フォント自体は無変更。JS38構文・差分空白・CIのSVG/PNG/Pages参照成功。main統合/push、CI/Pages・公開実画面の確認まで完了。

採用d8e73c7、main統合/push 48ecd07、Pages 39518951802成功。v0.9.3-14を公開済み。HTML/dev/game/診断/progression/styleの公開6ファイルがGit正本とSHA一致（live-assets.json）。公開実ブラウザで全カードの分類ラベル削除・ひよこの新紹介文・立ち絵プレビュー・金額ボタン/装備枠保持・警告なしを確認（live-shop.png、live-chick.png）。Static checks 39518953171も成功。公開・公開後確認まで完了。次は公開後フィードバック対応。

## 前回の公開：フォント収録文字の拡充

最新追加指示は、サブセット化したフォントの収録不足と適用箇所の再確認。実WOFF2のcmap照合で旧203文字に「ショップ」のシ/ョ/プ、時空の空/加/減/速/定、±/−/＋、読み込み中の日本語や静謐がないことを確認。適用は従来の見出し・カウンター・BGM表示・Canvas演出に限定し、説明/操作ボタンはシステム書体を維持。現在のUI/ゲームデータとかな/英数字/全角文字を含む1,187文字・63,132 bytesのサブセットへ拡充する（全文字版は563,868 bytesのため不採用）。スクリプトと実cmapのCI検査を追加し、元TTFの名前/著作権/字形を保持。フォントURLは?v=2でキャッシュを更新し、v0.9.3-13として価格表記修正と合わせて最終公開確認を行う。

フォント/診断Node13件・ショップ回帰7件・実cmap Python2件成功（test-results/font-audit/）。公式ZIPと全1,187文字のアウトライン座標/輪郭/文字幅・全name記録の一致、再生成バイナリ一致、JS38構文/差分空白/CI参照チェックも成功。実ブラウザでショップ見出しの全字が同じピクセル書体、従来の小さい本文/操作ボタンはUI書体、警告なしを確認（local-shop.png、source-integrity.json）。main統合・CI/Pagesと公開後確認まで完了。

採用8623334、main統合/push 2a5709f、Pages 39517846103成功。v0.9.3-13を公開済み。HTML/dev/game/診断/style/実WOFF2の公開6ファイルがGit正本とSHA一致（live-assets.json）。公開実ブラウザでショップ見出しの混在解消・文字幅129.6pxと指定フォント、操作ボタン/本文の従来書体、警告なしを確認（live-shop.png、live-heading.png）。Static checks 39517846685も成功（全体回帰・画像・フォント実cmap・参照整合）。main統合・公開・公開後確認まで完了。次は公開後のフィードバック対応。

## 直前の公開：おまけの価格表記

直前依頼はおまけタブの購入ボタンを基礎強化と同じ「金額 ✧」に統一して本番反映。演出のおまけは「で解放」を除去し桁区切りも基礎強化と合わせる。スキンはカード内の別枠価格を削除し、未購入ボタンを「50 ✧」「600 ✧」へ変更。購入済みは装備するを保持。プレビュー/紹介文/効果/価格/購入・保存は無変更。採用58bc35d、main統合/push 17d9b58、v0.9.3-12を公開済み。

関連12テスト成功（test-results/bonus-prices/focused.txt）：おまけの購入/切替/保存・スキンの価格ボタン/購入・装備/保存・バージョン整合を確認。JS38構文・差分空白・CIのSVG/PNG/Pages参照成功。全体回帰のStatic checks 39517054516・Pages 39517053289成功。公開5ファイルとGit正本のSHA一致、公開実ブラウザで1000/500/1200 ✧と50/600 ✧の価格ボタン・別価格枠なし・立ち絵プレビュー・警告なしを確認（live-items.png、live-skins.png、live-assets.json）。価格表記の依頼は公開後確認まで完了。

## 前回の公開：ショップ整理

最新依頼は「恒久強化・装備」を「ショップ」へ統一し、スキンカードを購入/装備の1ボタンに整理して本番反映。追加指示で立ち絵プレビュー自体は保持する。「プレビュー中」表示・選んで見る・動作/試遊リンク・右上の効果あり/装備中・上部の装備/プレビュー行を削除。装備中は枠で示し、装備するボタンを無効化する。購入時の自動装備は従来維持。紹介文を遊び心のある文章へ変更し、効果説明・価格・自己記録は保持。v0.9.3-11でHTML/アセットquery/診断/CI/契約テストを統一。

Node全367件成功（test-results/shop-cleanup/node.txt）。旧プレビュー操作専用テスト1件を廃止し、カードごとにプレビューCanvasと購入/装備1ボタンがあり、試遊/状態ラベルがないことと装備枠・保存不変を既存テストへ反映。購入/装備/保存/戦闘/HP1.5倍の回帰も成功。JS38構文・差分空白・CIのSVG/PNG/Pages参照成功。実ブラウザでショップの名称、全カードの立ち絵、ふんどしの紹介文、1操作/右上表示なし、警告なしを確認（local-shop.png）。

採用a9fc975、main統合/push 7a850d1、Pages 39516530210成功。v0.9.3-11を公開済み。HTML/dev/game/診断/progression/styleの公開6ファイルがGit正本とSHA一致。公開実ブラウザでもショップの名称、旧通常記録4F/6COMBO保持、立ち絵プレビュー4体、購入する/装備するの1操作、ふんどしの紹介文、右上表示なし、警告なしを確認（live-top.png、live-shop.png、live-assets.json）。Static checks 39516531250も成功。main統合・公開・公開後確認まで完了。次は公開後フィードバック対応。

## 前回の公開：ひよこちゃんの体力調整

最新依頼はひよこちゃんのHPを5倍から1.5倍へ調整。通常パリィ受付3倍・ジャスト2倍、価格50欠片は維持し、本番反映する。最終最大HPは小数点以下を切り上げて整数にする（基礎65なら98）。生命強化/スキル/遺物再計算も同じ倍率・丸めを使う。v0.9.3-10としてHTML/query/診断/ゲーム/CI/契約テストを統一。

Node全368件成功（test-results/chick-hp-balance/node.txt）。既存の装備・開始HP98/生命スキル追加で120/死神契約96/受付3倍・ジャスト2倍/受付後端/連打抑制を更新・検証。JS38構文・差分空白・CIのSVG/PNG/Pages参照も成功。実ブラウザでHP98/98、HP×1.5・±93ms/±22ms、警告なしを確認。画像・ポーズ・BGM・他スキンは変更なし。

採用115e9bb、main統合/push 358be54、Pages 39514767577成功、v0.9.3-10を公開済み。HTML/dev/game/診断/progressionの公開5ファイルがGit正本とSHA一致。公開Devでも既存生命強化込みHP128/128（通常85×1.5切り上げ）、HP×1.5・±93ms/±22ms、戦闘・停止と警告なしを確認（test-results/chick-hp-balance/live.png、live-status.png、live-assets.json）。GitHub Static checks 39514768041も成功。公開・公開後確認まで完了。次は公開後フィードバック対応。

## 前回の公開：おまけショップ・スキン効果

最新依頼「いいかんじ 実装よろ」でレビュー版を採用し、main統合・公開まで承認。時空は遭遇ごとに+12/0/-12を等確率、戦闘中固定に変更済み。個別価格はユーザー回答でひよこ50、ふんどし600、時空600欠片。採用7b5d64d、公開準備5585d9a、main統合/push c332b2e。v0.9.3-9を公開済み。

実装：購入・一着装備を既存progressionの任意フィールドへ追加し、旧セーブは通常装備に移行。購入後は無料で着替え、挑戦開始時に外見と効果を固定する。開発初期モードとスキンは相互に切り替える（染色/残光は併用可）。スキン別に最高階/コンボ/挑戦回数を記録し、旧最高記録は通常へ引き継ぐ。欠片/図鑑/累計救済は共通。Devは保存しない。

ひよこ：最終最大HP5倍、通常パリィ受付3倍・ジャスト2倍。生命の器/遺物で再計算しても倍率を保つ。静かな呼吸が最大のとき、受付後端が接触後29msまで伸びるため、その範囲だけ未入力のMISS確定を猶予する。成功入力と成立済みガードは接触時に解決、連打抑制は保持。ふんどし：敵の攻撃がガード/被弾なら軽減・障壁・反射・復活を通さず即死。空振りだけでは死なず、イベント等のHP消費は従来どおり。無敵練習は即死を無効にする。

時空：spawnEnemyで一度だけ補正を抽選・保存。BGMと攻撃の共通beatに加算し、一時停止/再開/第二楽章では再抽選しない。次の敵ではその敵の基準BPMへ新たに加算し、累積しない。音程/判定幅は通常と同じ。

Devレビュー http://127.0.0.1:8004/dev.html?floor=5&enemy=guardian&skin=chick&skinEffects=1&practice=1 。上部でスキン/効果ON・OFF/無敵を設定し「指定条件で開始」。ふんどしの即死を見る場合は無敵を外す。全モーションの比較は skin-preview.html。了承済みの画像/手動ポーズ/最前面で跳ねるひよこ/効果音/BGM譜面は無変更。

一回予約1-46は2026-10-21 1:46に実行後削除済み。繰り返し予約は追加しない。既存output/は保持し、コミットしない。8002工房やユーザーの開いているタブは操作しない。

公開用検証：Node全368件・Python画像8件成功（test-results/skin-release/）。JS38構文・CIのSVG/参照PNG/Pages参照チェック・既存バランスシミュレーション・差分空白も確認成功。公開用識別子をHTML/アセットquery/診断/ゲーム登録/CI/契約テストでv0.9.3-9へ統一。既存正本ポーズ/敵画像/BGM/効果音は公開前mainから差分なし。

Pages 39508981745成功。公開HTML/dev/game/診断/progression/style/hero-puppet/combat-art/dev-tools/skin-preview/skin-preview.js/ふんどし採用PNGの12ファイルが公開コミットc332b2eのSHAと一致（Windows作業ファイルのCRLFではなくGit正本と比較）。公開実ブラウザで旧セーブの通常記録4F/6COMBOを保持、ショップの50/600/600と資金不足ボタン・全スキン描画を確認。公開Devのひよこは既存生命強化込みHP425/425、パリィ±93ms・ジャスト±22ms、戦闘/一時停止/再開と警告なし。証跡 live-shop.png、live-shop-more.png、live-chick.png、live-assets.json。GitHub Static checks 39508983485も成功。main統合・公開・公開後確認まで完了。次は公開後のフィードバック対応。

検証完了：Node全368件成功（test-results/skin-effects-final-node.txt）、タイトル記録更新後の関連3件成功（skin-effects-final-ui.txt）、関連16件成功（skin-effects-focused.txt）、Python画像8件成功（skin-effects-art.txt）、JS38ファイル構文と差分空白確認成功。実ブラウザでHP325/通常値へ戻る比較、時空-12→124 BPMと再開後の維持、ふんどし最初の被弾で即死、販売50/600/600・資金不足ボタン・無料装備表示、警告なしを確認。証跡 test-results/skin-effects-chick.png、skin-effects-spacetime.png、skin-effects-fundoshi.png、skin-effects-shop.png。差分レビュー済み。ユーザーのDev試遊レビューは了承済み。公開用識別子・全体検証、main統合/push、CI/Pages・公開実画面の確認まで完了。

## 前回の公開：工房調整

前回依頼「モーションいじったんだけどさ、本番に反映してくんね」で工房保存データの採用・公開まで承認。updatedAt 1792499809689、差分は rogue / guardian / knight / ironwarden / dirgekeeper / timewarden の6体の全体配置。部品キー/連動軌道/残像設定は保持。JSONと同期JSが一致することを確認済み。採用30bb545、main統合/公開ea7383f。現在main、v0.9.3-8。ブラウザの工房/既存試遊タブは操作しない。未追跡outputは公開に含めない。

Node344件成功（test-results/studio-motion-publication/node.txt）、37JS構文/差分空白/JSONと同梱JSの一致確認成功。ローカル実ブラウザで守護者の戦闘表示・動作と警告なしを確認。main統合/pushとPages 39424159925成功。公開HTML/dev/game/diagnostics/同梱JS/正本JSON/edit/knight-puppetの8ファイルが公開コミットとSHA一致。公開実ブラウザでv0.9.3-8、守護者の戦闘描画・振り下ろし・残像、一時停止、警告なしを確認。証跡 test-results/studio-motion-publication/。GitHub Static checks 39424160493成功。依頼は公開後確認まで完了。次は本番プレイでのフィードバック対応。

## 前回の公開：エリア別BGM

前回依頼「めちゃくちゃいい感じなのでもう実装しちゃって」でDevの8曲を全採用し公開まで承認。採用 c92f6aa、main統合/公開 50071ec。当時main、v0.9.3-7を公開・実URL確認済み。1〜10Fは旧曲の発音コードを保持、11〜80Fは10階ごとのエリア専用7曲へ自動切替、81F以降も既存の巡回に従う。通常112/速い敵124/ボス136 BPM、判定時計、効果音25%、保存は保持。両エントリから stage-music.js を読み込む。Dev試聴室/通常・ボス比較/拍表示/曲指定の無敵練習も採用。詳細 [MUSIC_PREVIEW](./MUSIC_PREVIEW.md)。ビルドv0.9.3-7。

先行Dev版はNode342件/外部ブラウザで兵舎112・礼拝堂136 BPMの再生と警告なしを確認済み。採用版はNode344件すべて成功（test-results/stage-bgm-release-final.txt）。全エリア境界/巡回/一時停止/同一判定時計/Dev通常起動の自動選曲を含む。全JS構文/差分空白確認成功。実ブラウザで21Fの自動選曲・戦闘開始・一時停止/再開と警告なしを確認済み。Pages 39422783766成功、Static checks 39422784887成功。公開HTML/dev/game/diagnostics/combat-sfx/stage-music/dev-tools.js/cssの8ファイルが公開コミットとSHA一致。公開実ブラウザでv0.9.3-7、41Fの工房曲自動選曲/戦闘開始、終刻の王のボス136 BPM試聴/拍表示/停止と警告なしを確認。証跡 test-results/stage-music-publication/。依頼は公開後確認まで完了。次は通常プレイでのフィードバック対応。

外部試遊：<https://speaking-rico-jacket-period.trycloudflare.com/dev.html?music=barracks#devMusicRoom>。読み取り専用8003 server PID38832、tunnel PID39076。既存8002の工房サーバー/タブには操作しない。当時工房由来の調整2ファイルをBGMコミットから除外して保持した。今回の最新依頼でその公開が承認された。未追跡outputも保持。

## 前回の公開：防御効果音25%

前回の依頼は **「25%が良かった。実装頼む」**。試遊時の100%を基準に、ガード/パリィ/ジャストをすべて25%へ下げて本番公開する承認あり。採用 `ac2783b`、main統合/push `e611f17` まで完了。**v0.9.3-6を公開・実URL確認済み**。旧ゲイン .294 / .301 / .2464 に .25 を掛け、**guard .0735 / parry .07525 / just .0616** を採用する。BGMのゲイン/時計、波形、音色/EQ、保存、立ち絵/モーションは保持。

Dev音量バーも採用する。0〜100%、初期値を**100%＝採用後の本編音量**へ更新済み。旧試遊の25%をさらに掛けない。3音だけをDev専用Gainへ通し、戦闘音と試聴3ボタンが共通で効く。余韻にも15ms時定数で反映し、BGMとは独立。値はタイトル/再開始でも維持し、`sfxVolume` queryで開始値指定も可。本編100%へ戻すボタンを維持。mainの通常プレイは採用ゲインで直接再生する。

ビルドを**v0.9.3-6**へ統一済み。採用ゲインが旧基準の正確な25%であること、Dev初期100%と実Gain/戦闘時計/BGMの不変、通常ページ隔離、ビルド一致の焦点テスト5件成功（`test-results/sfx25-focused.txt`）。全体Node337件成功（`test-results/sfx25-release-node.txt`）、JS36ファイル構文/差分空白確認成功。先行するDevバー `4dbe17c` はNode336件成功・外部ブラウザ確認済み。ユーザーの音量判断は旧試遊で最終了承済み。

Pages **39417089135成功**、Static checks **39417089251成功**。公開HTML/dev/game.js/diagnostics/combat-sfx/dev-tools.js/cssの7ファイルが公開コミットとSHA一致。実ブラウザでv0.9.3-6、Dev初期100%、戦闘開始と3音の試聴、警告/エラーなしを確認。証跡/API/配信ファイル比較は `test-results/sfx25-publication/`。全チェック/公開後確認まで完了。次は本番プレイのフィードバック対応。今回は公開まで承認済み。新しいDevの確認URLには旧試遊の `sfxVolume=25/50` を付けず、未指定または100を使う。

## 前回の公開：立ち絵の先読み

ユーザーの「実装よろ」で、開始直後の「旧モデル→新立ち絵」の切替防止を**v0.9.3-5としてmainへ統合・公開済み**。実装 `dee311d`、公開準備 `bef8dee`、main統合/公開 `9e02c44`。タイトル時に全立ち絵/色違い/打ち込み姿勢を3並列で先読みし、出現キャラの部品準備が終わってから戦闘時計を開始。先読みで全員の部品Canvasを展開せず、既存の直近4敵キャッシュを維持する。画像待ちは `loading`、背景と読み込み文だけを描き、入力/攻撃/BGMカウントを開始しない。離脱/別戦闘への切替後は古い読み込みを無視。画像エラー時は従来表示に固定して進行可能。

HTML/全アセットquery/ゲーム登録/診断/CI/テストの識別子をv0.9.3-5へ統一済み。公開用ビルドでもNode334件成功（`test-results/preload-release-node.txt`）、JS36ファイルの構文確認成功。Pages **39414757504成功**。Static checks **39414757517成功**。公開HTML/dev/game.js/diagnostics/knight-puppet/character-styleの6ファイルが公開コミットとSHA一致。公開版v0.9.3-5、守護者の無敵練習開始/新立ち絵の描画、警告/エラーなしを実ブラウザで確認。証跡/API/配信ファイル比較は `test-results/preload-publication/`。ユーザーの「本番実装」は公開・公開後確認まで含む（`AGENTS.md`）。

先読み修正の検証：**Node334件成功**（`test-results/art-preload-all.txt`）、変更JS2件の構文/差分空白チェック成功。実ブラウザで通常開始、および8005のPNG応答を12秒遅延させた守護者の無敵練習でLOADING→新立ち絵→戦闘/一時停止/再開を確認。警告/エラーなし。画像正本/手動ポーズは無変更。証跡 `test-results/art-preload-ready.png`。遅延サーバーは検証後停止し、通常確認には既存8002/8004を使う。

## 採用内容と正本

- 剣腕はパリィ/ジャスト成功時だけ反撃。盾は肩から起こして前に出し、構え切った接触位置を保持。ガードには衝突の反動、被弾には別の反動。
- 再パリィは受理入力後300ms＋全指/キーを120ms離す両条件。成功時は接触で300ms回復を解除。拒否入力でも100ms保持すればガード。入力源全体で共有する。判定窓/敵時計/ダメージは変更していない。
- `assets/combat-sfx.js` が添付「打ち合う2」/「3」/「盾で防御」の共振・粗い時間包絡を基準に独自波形を合成。ジャストは1.15倍速相当。採用ゲインはガード0.0735/パリィ0.07525/ジャスト0.0616（v0.9.3-5の25%）。ジャストは4.5kHz周辺を6dB抑えるEQ、9.5kHzの2段ローパス、高い共振を早く減衰させる。EQ後に音量を戻さない。3音をBGMの拍原点確定前に準備し、接触時に一度、同じAudioContextで再生。BGM/ミュートを保持。
- devには任意の敵の無敵練習・3音の個別試聴・効果音量バー。通常本編は解放条件/保存を維持。`index.html` / `dev.html` / 診断/CI/テストのビルド識別子はv0.9.3-8、combat-sfxとstage-musicも必須アセットとして確認する。
- 了承済みの全画像/配色/確定ポーズ/敵モーション/0.2秒白い反撃/精鋭とレア演出は保持。`assets/character-art/` と `character-art-defaults.js` はmainから差分なし。`studio-project.json` updatedAt **1792499809689** の手動調整を採用済み。王は `approved/endking/` の手塗り正本。詳細 [ADOPTED_ART](./ADOPTED_ART.md)、[ART_STUDIO](./ART_STUDIO.md)、[FILTER_PAINT](./FILTER_PAINT.md)。

## 防御改善時の検証（v0.9.3-4）

- **Node329件成功**。連打5ms/回復と解放の境界/複数入力/全26敵で各16連続成功/剣腕と盾の幾何/ガードと被弾/音の波形と減衰/初回事前準備と再利用/保存互換/診断とビルド一致を含む。`test-results/shield-adoption/node.txt`。
- **Python画像6件成功**、全JS36ファイル構文、CIのSVG/参照PNG/Pagesリンク検証、既存ボスバランスシミュレーション成功。`test-results/shield-adoption/`。
- 通常本編の新しい保存領域（127.0.0.1:8004）でv0.9.3-4、効果音ロード、戦闘、Space長押しGUARD（14攻撃→5ダメージ）、一時停止を確認。360pxで本文345px、横はみ出しなし。console警告/エラーなし。証跡 `main.png` / `mobile.png`。8004の試験は普段の8002の保存データに影響しない。
- 高音抑制の解析は `test-results/just-soft/`。0.1〜0.6秒の3〜8kHzエネルギーは抑制前の約12.5%、4〜5kHzは約6%。主観的な音色/音量はユーザーが外部試遊で最終了承済み。添付MP3/解析用WAV/依存ライブラリは公開対象へ入れていない。
- GitHub CI **39382323360成功**、Pages **39382322207成功**（公開コミット157c81c）。本番のHTML/game.js/combat-sfx.js/hero-puppet/diagnosticsのSHAがGitコミットと一致。公開版ビルドv0.9.3-4、効果音の個別再生、守護者の稽古起動/Spaceガード/一時停止を確認。console警告/エラー、バージョン警告なし。証跡とAPI結果は `test-results/shield-publication/`。

## 起動・外部確認・次の作業

- 本編 <http://127.0.0.1:8002/>、無敵試遊 <http://127.0.0.1:8002/dev.html?floor=5&enemy=guardian&practice=1>。`node scripts/serve-local.js 8002`。既存工房サーバーやタブは変更していない。
- 外部一時試遊 <https://speaking-rico-jacket-period.trycloudflare.com/dev.html?floor=5&enemy=guardian&practice=1&sound=softjust>。`node scripts/serve-playtest.js 8003` とcloudflaredが稼働中。GET/HEAD専用・Git管理のassets/dev/credits/art-previewだけ。Git/docs/output/工房保存APIは配信しない。PC/ネット/プロセスが必要。停止/再起動で切れ、新しいトンネルはURLが変わる。起動情報 `test-results/remote-playtest/processes.json`（作成時server PID14380 / tunnel PID39076）。停止時は実コマンドを照合する。
- 一時QAサーバー8004はPID30644（起動情報 `test-results/shield-adoption/server.pid`）。ローカルだけ。通常本編の確認用で、外部トンネルは8003のまま。
- **本番** <https://donald-shrimp.github.io/parry-tower/?v=v0.9.3-8>。一時トンネルや自宅PCの起動に依存せず利用できる。既存の本番タブは再読込して更新する。
- エリアBGM・音量25%と先読み修正を含むmain統合/push/CI/Pages/公開確認まで完了。次は公開後のフィードバック対応。未追跡 `output/` は保持し、コミットに含めない。4:00予約は実行済み、17:57予約は完了済みとして削除済み。再作成不要。
