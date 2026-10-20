# 継続状態（2026-10-20）

## 現在の目的と承認

ユーザーが高音抑制後のジャスト音を「いい感じ。これで実装頼む」と最終了承。試遊で了承された主人公モーション・連打対策・効果音を本編へ採用し、ビルドを **v0.9.3-4** に更新して最終検証済み。採用コミット `1247325` をmainへマージ済み（`c7768ae`）。ユーザーが「本番実装」は公開まで含むと明示したため、mainのpush・Pages反映・公開URL確認まで続行する。今後も同じ意味として扱う（`AGENTS.md` に記録）。現在のブランチはmain。

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

## 起動・外部確認・次の作業

- 本編 <http://127.0.0.1:8002/>、無敵試遊 <http://127.0.0.1:8002/dev.html?floor=5&enemy=guardian&practice=1>。`node scripts/serve-local.js 8002`。既存工房サーバーやタブは変更していない。
- 外部一時試遊 <https://speaking-rico-jacket-period.trycloudflare.com/dev.html?floor=5&enemy=guardian&practice=1&sound=softjust>。`node scripts/serve-playtest.js 8003` とcloudflaredが稼働中。GET/HEAD専用・Git管理のassets/dev/credits/art-previewだけ。Git/docs/output/工房保存APIは配信しない。PC/ネット/プロセスが必要。停止/再起動で切れ、新しいトンネルはURLが変わる。起動情報 `test-results/remote-playtest/processes.json`（作成時server PID14380 / tunnel PID39076）。停止時は実コマンドを照合する。
- 一時QAサーバー8004はPID30644（起動情報 `test-results/shield-adoption/server.pid`）。ローカルだけ。通常本編の確認用で、外部トンネルは8003のまま。
- 公開先 <https://donald-shrimp.github.io/parry-tower/>。origin/mainの更新を確認して通常pushし、CI/Pages成功と公開ビルドv0.9.3-4を確認する。
- 本編採用とmainマージは完了。次は承認済みの公開と実URL確認。既存の未追跡 `output/` の資料/書出しは保持し、コミットに含めない。4:00予約は実行済みで再作成不要。
