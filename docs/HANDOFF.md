# 継続状態（2026-10-20）

## 現在の目的と承認

ユーザーが主人公モーション/連打対策/金属音の提案を了承し「遊べる版」を依頼。`codex/shield-feedback-playtest` に実装・検証済み（`9af3408`）。続く「出先から確認する手段が欲しい」で専用HTTPS一時プレビューを公開。次はユーザーの体感レビュー。今回の改善はmainへ未マージ、GitHubへのpush/本番更新はしていない。

最新レビュー：「音はポン、コン、カイーン。他の仕様はいい感じ」。操作/モーション/連打対策は了承状態として保持し、音だけ金属音v2へ調整。外部URL末尾に `&sound=metal2` を付けて新しく開き、上部の「金属音 v2」と3試聴ボタンで確認してもらう。既に開いているページではAudioBufferが残るため再読込が必要。

前回了承済みのドット立ち絵/モーションはmainへ導入・公開済み。機能 `29cc47a`、マージ `c899839`、公開記録 `2aed84b`。CI/Pages成功と公開 `v0.9.3-3` を確認済み。公開先 <https://donald-shrimp.github.io/parry-tower/> は前回版。

## 試遊入口と変更内容

- **外部試遊** <https://speaking-rico-jacket-period.trycloudflare.com/dev.html?floor=5&enemy=guardian&practice=1>。既存cloudflaredで専用の読み取り専用サーバー `node scripts/serve-playtest.js 8003` を公開。ルートURLも同じ無敵稽古へ転送する。PCの起動/ネット接続/両プロセスが必要で、スリープ・終了により切れる。再起動したトンネルのURLは変わる。停止/再開時は `test-results/remote-playtest/processes.json` とWin32_Processの実コマンドを照合する（作成時 server PID14380 / tunnel PID39076）。既存の8002工房サーバーは変更していない。
- 公開対象はGit管理下のassetsとdev/credits/art-previewだけ。GET/HEAD以外は405、Git/ドキュメント/output/工房保存APIは配信しない。ログとプロセス記録は `test-results/remote-playtest/`。一時プレビューは本番Pagesと別の保存領域で、devの記録抑止も維持。

- 内側リポジトリ `C:/Users/EBIHARA/Downloads/parry-tower/parry-tower`。`node scripts/serve-local.js 8002`。試遊 <http://127.0.0.1:8002/dev.html?floor=5&enemy=guardian&practice=1>。「指定条件で開始」、短押し/Spaceでパリィ、長押しでガード。無敵のチェックを外せば通常のダメージありで試せる。devは保存を書き込まない。
- 剣腕の反撃はパリィ/ジャスト成功後だけ。ガード/被弾は剣を回さない。盾腕を肩の支点から起こして前へ出す。上げ切った接触位置は従来と一致し、ガードには衝突の反動がある。
- 受理した入力後300ms回復＋全キー/指を120ms離す両条件で再パリィ。成功時は衝突で300msを解除するが、120ms解放は必要。拒否した押下も100ms保持すればガードになる。全入力源で共有、重複release/複数指/blurを考慮。判定窓・ダメージ・敵の衝突時計は維持。
- `assets/combat-sfx.js` がガード「ガン」/パリィ「ガキン！」/ジャスト「ジャキーン！」をPCM合成。同じAudioContextで衝突時1回、バッファ再利用。dev上部の3ボタンで個別試聴可能。音声OFFを尊重する。
- 金属音v2は低音の胴鳴りを9msで減衰、非整数倍の金属振動を中高域へ分散。短い再衝突と帯域を絞った摩擦ノイズ、初動だけの位相変調を追加して丸い打音/澄んだ鐘音を減らす。ジャストの擦過音を長めにする。ピーク音量は旧版と同じ。生成器以外の戦闘コード/画像は変更していない。
- 通常ゲーム <http://127.0.0.1:8002/> にも変更を反映。立ち絵・敵モーション・配色・精鋭/レア演出・0.2秒白い反撃・セーブ形式は保持。

## 検証済み

- `node --test tests/*.test.js` **326件成功**。5ms連打、299/300ms回復、119/120ms解放、複数指/キー、拒否後ガード、全26敵で各16連続成功、成功時だけ反撃、ガード/被弾反動、衝突時単発音/ミュート/試聴、未遭遇dev稽古とセーブ不変を含む。既存の時計/判定/ダメージ/育成/本編解放/原画/確定ポーズも通過。
- Python画像検証 **6件成功**。`assets/character-art/` 全体と同期の `character-art-defaults.js` にGit差分なし。`studio-project.json` updatedAt **1792426370286** のまま。
- 変更JS構文・空白チェック成功。実ブラウザで守護者の無敵戦闘/長押しGUARD/65HP維持、3音の試聴、OFF時の試聴抑止を確認。console警告/エラーなし。360pxで本文幅345px、横はみ出しなし。音の好みと実機の操作感はユーザー確認が必要。
- 証跡 `test-results/shield-feedback/playable.png`、`mobile.png`。ログ `test-results/shield-feedback-full.txt` / `shield-feedback-python.txt`。初期の失敗ログは修正前の記録なので最終判定に使わない。
- 外部配信追加後のNode全体 **328件成功**。読み取り/HEAD/転送と、POST/保存API/非公開パスの拒否を検証。実HTTPSでも画面/効果音JSが200、Git403、docs/保存API404。外部URLをブラウザで開き、無敵戦闘/試聴/描画を確認、console警告/エラーなし。証跡 `test-results/remote-playtest/external-preview.png`、ログ `tests.txt`。
- 金属音v2の波形/キャッシュ試験成功。変更前後のWAV/周波数解析は `test-results/metal-sfx-v2/`（ゲーム配信には含めない）。最初30msの周波数重心はガード356→1068Hz、パリィ1394→2589Hz、ジャスト2308→4524Hz。ピークは同値。これは音色変化の技術的確認で、目標の擬音に聞こえるかはユーザーの聴感レビューが必要。
- v2の最終状態でNode全328件成功。実HTTPSページを再読込し、3音を個別試聴、console警告/エラーなし。ログ `test-results/metal-sfx-v2/tests.txt`、証跡 `preview.png`。ゲームコード/画像の差分なし。

## 正本と次の作業

画像/工房の正本は前回と同じ。詳細 [ADOPTED_ART](./ADOPTED_ART.md)、[ART_STUDIO](./ART_STUDIO.md)、[FILTER_PAINT](./FILTER_PAINT.md)。王は了承済み `assets/character-art/approved/endking/` の手塗り画像を使う。元画像や保存ポーズを再生成しない。

次は金属音v2の響きをユーザーに聴いてもらう。他の仕様は最新レビューで好評なので、追加指摘がなければ保持する。採用と公開が指示されたら、ビルド識別子/キャッシュ更新を含めて検証し、マージ/公開する。4:00予約は実行済みで再作成不要。既存 `output/` の資料/塗り分け書出しは保持し、コミット対象にしない。
