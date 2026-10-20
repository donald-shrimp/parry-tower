# 継続状態（2026-10-20）

## 現在の目的と承認

最新依頼「めちゃくちゃいい感じなのでもう実装しちゃって」でDevの8曲を全採用し公開まで承認。採用 c92f6aa、main統合/公開 50071ec。現在main、v0.9.3-7を公開・実URL確認済み。1〜10Fは旧曲の発音コードを保持、11〜80Fは10階ごとのエリア専用7曲へ自動切替、81F以降も既存の巡回に従う。通常112/速い敵124/ボス136 BPM、判定時計、効果音25%、保存は保持。両エントリから stage-music.js を読み込む。Dev試聴室/通常・ボス比較/拍表示/曲指定の無敵練習も採用。詳細 [MUSIC_PREVIEW](./MUSIC_PREVIEW.md)。ビルドv0.9.3-7。

先行Dev版はNode342件/外部ブラウザで兵舎112・礼拝堂136 BPMの再生と警告なしを確認済み。採用版はNode344件すべて成功（test-results/stage-bgm-release-final.txt）。全エリア境界/巡回/一時停止/同一判定時計/Dev通常起動の自動選曲を含む。全JS構文/差分空白確認成功。実ブラウザで21Fの自動選曲・戦闘開始・一時停止/再開と警告なしを確認済み。Pages 39422783766成功、Static checks 39422784887成功。公開HTML/dev/game/diagnostics/combat-sfx/stage-music/dev-tools.js/cssの8ファイルが公開コミットとSHA一致。公開実ブラウザでv0.9.3-7、41Fの工房曲自動選曲/戦闘開始、終刻の王のボス136 BPM試聴/拍表示/停止と警告なしを確認。証跡 test-results/stage-music-publication/。依頼は公開後確認まで完了。次は通常プレイでのフィードバック対応。

外部試遊：<https://speaking-rico-jacket-period.trycloudflare.com/dev.html?music=barracks#devMusicRoom>。読み取り専用8003 server PID38832、tunnel PID39076。既存8002の工房サーバー/タブには操作しない。**作業中に工房由来の assets/character-art-defaults.js / assets/character-art/studio-project.json の未コミット変更が入ったため、そのまま保持してBGMコミットから除外する**。未追跡outputも保持。

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
- devには任意の敵の無敵練習・3音の個別試聴・効果音量バー。通常本編は解放条件/保存を維持。`index.html` / `dev.html` / 診断/CI/テストのビルド識別子はv0.9.3-7、combat-sfxとstage-musicも必須アセットとして確認する。
- 了承済みの全画像/配色/確定ポーズ/敵モーション/0.2秒白い反撃/精鋭とレア演出は保持。`assets/character-art/` と `character-art-defaults.js` はmainから差分なし。`studio-project.json` updatedAt **1792426370286** のまま。王は `approved/endking/` の手塗り正本。詳細 [ADOPTED_ART](./ADOPTED_ART.md)、[ART_STUDIO](./ART_STUDIO.md)、[FILTER_PAINT](./FILTER_PAINT.md)。

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
- **本番** <https://donald-shrimp.github.io/parry-tower/?v=v0.9.3-7>。一時トンネルや自宅PCの起動に依存せず利用できる。既存の本番タブは再読込して更新する。
- エリアBGM・音量25%と先読み修正を含むmain統合/push/CI/Pages/公開確認まで完了。次は公開後のフィードバック対応。未追跡 `output/` は保持し、コミットに含めない。4:00予約は実行済み、17:57予約は完了済みとして削除済み。再作成不要。
