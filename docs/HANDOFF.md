# 継続状態（2026-10-20）

## 現在の目的と承認

最新依頼は開始直後の「旧モデル→新立ち絵」の瞬間的な切替を解消すること。`codex/preload-character-art` で、タイトル時に全立ち絵/色違い/打ち込み姿勢を3並列で先読みし、出現キャラの部品準備が終わってから戦闘時計を開始する処理を実装。先読みで全員の部品Canvasを展開せず、既存の直近4敵キャッシュを維持する。画像待ちは `loading`、背景と読み込み文だけを描き、入力/攻撃/BGMカウントを開始しない。離脱/別戦闘への切替後は古い読み込みを無視。画像エラー時は従来表示に固定して進行可能。ローカルの変更で、本番公開はまだ。

本番は引き続き**v0.9.3-4**（防御/連打対策/効果音、公開 `157c81c`）。ユーザーの「本番実装」は公開・公開後確認まで含む（`AGENTS.md`）。先読みの採用/公開を依頼されたら、このブランチの検証結果を確認し、main統合・ビルド識別子更新・push・Pages確認へ進む。

先読み修正の検証：**Node334件成功**（`test-results/art-preload-all.txt`）、変更JS2件の構文/差分空白チェック成功。実ブラウザで通常開始、および8005のPNG応答を12秒遅延させた守護者の無敵練習でLOADING→新立ち絵→戦闘/一時停止/再開を確認。警告/エラーなし。画像正本/手動ポーズは無変更。証跡 `test-results/art-preload-ready.png`。遅延サーバーは検証後停止し、通常確認には既存8002/8004を使う。

## 採用内容と正本

- 剣腕はパリィ/ジャスト成功時だけ反撃。盾は肩から起こして前に出し、構え切った接触位置を保持。ガードには衝突の反動、被弾には別の反動。
- 再パリィは受理入力後300ms＋全指/キーを120ms離す両条件。成功時は接触で300ms回復を解除。拒否入力でも100ms保持すればガード。入力源全体で共有する。判定窓/敵時計/ダメージは変更していない。
- `assets/combat-sfx.js` が添付「打ち合う2」/「3」/「盾で防御」の共振・粗い時間包絡を基準に独自波形を合成。ジャストは1.15倍速相当。再生ゲインはガード0.294/パリィ0.301/ジャスト0.2464。ジャストは4.5kHz周辺を6dB抑えるEQ、9.5kHzの2段ローパス、高い共振を早く減衰させる。EQ後に音量を戻さない。3音をBGMの拍原点確定前に準備し、接触時に一度、同じAudioContextで再生。BGM/ミュートを保持。
- devには任意の敵の無敵練習・3音の個別試聴。通常本編は解放条件/保存を維持。`index.html` / `dev.html` / 診断/CI/テストのビルド識別子をv0.9.3-4へ統一し、combat-sfxも必須アセットとして確認する。
- 了承済みの全画像/配色/確定ポーズ/敵モーション/0.2秒白い反撃/精鋭とレア演出は保持。`assets/character-art/` と `character-art-defaults.js` はmainから差分なし。`studio-project.json` updatedAt **1792426370286** のまま。王は `approved/endking/` の手塗り正本。詳細 [ADOPTED_ART](./ADOPTED_ART.md)、[ART_STUDIO](./ART_STUDIO.md)、[FILTER_PAINT](./FILTER_PAINT.md)。

## 最終検証

- **Node329件成功**。連打5ms/回復と解放の境界/複数入力/全26敵で各16連続成功/剣腕と盾の幾何/ガードと被弾/音の波形と減衰/初回事前準備と再利用/保存互換/診断とビルド一致を含む。`test-results/shield-adoption/node.txt`。
- **Python画像6件成功**、全JS36ファイル構文、CIのSVG/参照PNG/Pagesリンク検証、既存ボスバランスシミュレーション成功。`test-results/shield-adoption/`。
- 通常本編の新しい保存領域（127.0.0.1:8004）でv0.9.3-4、効果音ロード、戦闘、Space長押しGUARD（14攻撃→5ダメージ）、一時停止を確認。360pxで本文345px、横はみ出しなし。console警告/エラーなし。証跡 `main.png` / `mobile.png`。8004の試験は普段の8002の保存データに影響しない。
- 高音抑制の解析は `test-results/just-soft/`。0.1〜0.6秒の3〜8kHzエネルギーは抑制前の約12.5%、4〜5kHzは約6%。主観的な音色/音量はユーザーが外部試遊で最終了承済み。添付MP3/解析用WAV/依存ライブラリは公開対象へ入れていない。
- GitHub CI **39382323360成功**、Pages **39382322207成功**（公開コミット157c81c）。本番のHTML/game.js/combat-sfx.js/hero-puppet/diagnosticsのSHAがGitコミットと一致。公開版ビルドv0.9.3-4、効果音の個別再生、守護者の稽古起動/Spaceガード/一時停止を確認。console警告/エラー、バージョン警告なし。証跡とAPI結果は `test-results/shield-publication/`。

## 起動・外部確認・次の作業

- 本編 <http://127.0.0.1:8002/>、無敵試遊 <http://127.0.0.1:8002/dev.html?floor=5&enemy=guardian&practice=1>。`node scripts/serve-local.js 8002`。既存工房サーバーやタブは変更していない。
- 外部一時試遊 <https://speaking-rico-jacket-period.trycloudflare.com/dev.html?floor=5&enemy=guardian&practice=1&sound=softjust>。`node scripts/serve-playtest.js 8003` とcloudflaredが稼働中。GET/HEAD専用・Git管理のassets/dev/credits/art-previewだけ。Git/docs/output/工房保存APIは配信しない。PC/ネット/プロセスが必要。停止/再起動で切れ、新しいトンネルはURLが変わる。起動情報 `test-results/remote-playtest/processes.json`（作成時server PID14380 / tunnel PID39076）。停止時は実コマンドを照合する。
- 一時QAサーバー8004はPID30644（起動情報 `test-results/shield-adoption/server.pid`）。ローカルだけ。通常本編の確認用で、外部トンネルは8003のまま。
- **本番** <https://donald-shrimp.github.io/parry-tower/?v=v0.9.3-4>。一時トンネルや自宅PCの起動に依存せず利用できる。既存の本番タブは再読込して更新する。
- 防御改善の本編採用/mainマージ/push/CI/Pages/公開確認は完了。最新の先読み修正は上記ブランチでローカル確認する。未追跡 `output/` は保持し、コミットに含めない。4:00予約は実行済み、17:57予約は完了済みとして削除済み。再作成不要。
