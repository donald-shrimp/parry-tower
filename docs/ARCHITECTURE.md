# 構成と保守上の注意

2026-11-07、`refactor/run-state` の構成。公開版との差と検証結果は [HANDOFF](./HANDOFF.md)、今後の工程は [REFACTOR_PLAN](./REFACTOR_PLAN.md) を参照。

## 技術構成

Canvas 2Dと素のJavaScript、HTML/CSS、Web Audioによる合成音、localStorageを使用する。GitHub Pagesで静的配信し、ビルド用のバンドラーは使っていない。本編は `index.html`、開発用の試遊・試聴は `dev.html`、原画・ポーズ編集は `art-studio.html`。

## 現在の境界

| 所有者 | 責務 |
| --- | --- |
| `assets/game.js` | ラン状態、進行、戦闘の効果適用、画面・描画・入力、音声への要求。反撃は名前付き同期段階に整理済み。画面/描画/controllerは今後も段階的な抽出対象 |
| `assets/encounters.js` / `enemy-motions.js` | 敵・階層・譜面・モーション定義 |
| `assets/character-renderer.js` | 採用/legacy/比較用描画先の選択。world/local座標と重攻撃オーラの前後順を維持。時刻/姿勢/必要値を受け取り、戦闘状態・読込待ち・時計を所有しない |
| `assets/shop-view.js` / `codex-view.js` | 読取専用の表示入力からHTMLと表示値を生成。DOM反映/スキン先読み/操作リスナー/購入と稽古資格の再検証はgame側 |
| `assets/rewards-view.js` | 報酬/遺物/イベントスキル/所持遺物の表示。抽選済み候補と現在の説明値を読み取るだけで、取得/引き直し/交換/保存はgame側 |
| `assets/room-view.js` | 分岐/休息/商人/イベントの表示。資格・強化対象・補正済み報酬額はgameが解決し、viewは文言とHTMLを生成する |
| `assets/combat-health.js` | HP/障壁/回復準備フラグの同期更新。解決済ルール値と即時callbackを受け取り、演出/死亡/氷鏡/HUDを元の順序で呼ぶ |
| `assets/combat-math.js` | 攻撃倍率・回復量・障壁容量・テンポ/氷結などの純粋計算。効果適用やゲーム状態を所有しない |
| `assets/skills.js` | 25スキルと相乗効果、明示的な数値コンテキストからの説明文。全画面で共用 |
| `assets/progression.js` / `relics.js` | 恒久育成・スキンと遺物の定義・計算 |
| `assets/routes.js` / `events.js` | 経路・イベントの定義と選択 |
| `assets/run-state.js` | 新規ラン生成、検証済み保存の復元準備、スキン/遺物による最大HP計算、ラン内のパリィ入力値解除。稽古の許可・Dev特例・復帰先の画面操作は呼び出し側 |
| `assets/save-store.js` | 本編のstorage/JSONアクセスと明示的な成功・失敗・Devスキップ結果。自動中断保存の失敗時削除は選択可能。キー/正規化/画面遷移を所有しない |
| `assets/run-checkpoint.js` / `player-settings.js` | 中断保存の正規化・検証、設定と補正値 |
| `assets/music.js` | 本編とDev共通の曲カタログ・選曲・音色再生。最初の階層の旧曲、共通アレンジ、開始太鼓も含む |
| `assets/stage-music.js` / `final-boss-music.js` | 通常曲の譜面、終王の譜面と既存楽器レンダラー。共通窓口から利用 |
| `assets/audio-session.js` | AudioContext、BGM/SE/Devバス、音量、譜面時計と先読み、停止と未来の接触音の予約取消 |
| `assets/combat-sfx.js` | Context別に用意した金属音の接触・結果余韻の再生とキャンセル可能なハンドル |
| `assets/audio-clock.js` | 音声時計とperformance時刻の対応を検証。Contextの生成・ゲーム進行は所有しない |
| `tests/helpers/game-harness.js` | ゲームの共通テスト環境。耐久試算もここから読み込む |

状態・戦闘・画面・描画はまだ `game.js` に多く残る。ファイル数を減らすことではなく、変更する責務を限定することを整備の目標にする。

game内のcreateGameControllerが本編/Dev共通の開始・復元・稽古・停止・設定・タイトル操作を所有する。一時停止時刻、設定の戻り先、音声停止時のphase復帰、開始確認中のtutorial選択はcontrollerの私有状態。描画はpausedAt()を読む。Devの操作APIはcreateDevControllerをDevでのみ生成し、共通controllerに開始/終了を依頼する。外部へ任意状態書換え口を増やさない。skills.cap(id,breaks)はgameと単体検証で共用する。

## 音楽と命中判定は同じ時計を使う

基準は `AudioContext.currentTime`、拍の長さは `score.beat`。音声セッションの `startScore` が準備完了後に原点を置き、`scheduleScore` が0.17秒先まで8分音符のステップを予約する。1回の予約は最大24ステップ、25msより古い音は飛ばし、ごく短い遅れは現在時刻+2msへ補正する。

ゲーム側の `startScore` は曲・BPM・第二楽章開始位置を決定し、`scoreToPerf` と `syncAttackClock` が同じ譜面の拍を入力/描画時刻へ対応付ける。`setInterval` や描画フレームのdt累積を攻撃の基準時計にしない。

接触音は拍上へ先行予約する。JUST/PARRY/GUARD/被弾の確定と結果の余韻は判定窓に従い、広い判定窓でも次の拍を後ろへずらさない。振りかぶりは1.5拍前、1.5拍以内の追撃には追加の振りかぶりを付けない。

停止は未来の接触音を取り消し、BGMバスをフェードして遅延解放する。開始済みの撃破フィードバックは保持する。新バスを旧バスの解放タイマーで切断しない。閉じたContextの復旧ではBGM/SE/Devの接続をすべて作り直す。SEだけの要求で戦闘中の時計を差し替えず、既存の安全停止と再開へ渡す。

## 曲や音声経路を変更するとき

曲の定義は既存の曲モジュールに追加し、共通カタログ/再生窓口を通して本編とDevから使う。新しい曲形式が必要な場合は `music.js` でアダプターを登録する。曲モジュールが独自のAudioContextやゲーム時計を作る構成は避ける。

SEの波形準備は譜面の原点を決める前に行う。乱数消費はゲームの抽選にも影響するため、音源抽出でバッファ生成回数や生成順を不用意に変えない。音声管理の抽出と音色の変更は別の変更として比較する。

## 入口と検証

スクリプト順序は両HTMLとCIの静的検査に明記されている。曲定義を `music.js` より前、`music.js` と `audio-session.js` を `game.js` より前に読む。診断の必須アセットも同期する。入口一覧の自動生成は後続工程。

基本検証は `node --test tests/*.test.js`。画像・フォントはAGENTSとCIに従う。タイミング・保存・戦闘順序の代表テストは [工程書の対応表](./REFACTOR_PLAN.md#維持する既存検証の対応表) に記載。音色は譜面ハッシュとノード予約値、操作は実ブラウザーも使って確認する。ヘッドレス実行は実機スピーカー/Bluetoothの聴感と遅延の代わりにはならない。

原画・工房の保存ポーズ・生成アートの扱いは [LOCAL_FILES](./LOCAL_FILES.md) と既存生成スクリプトに従う。

本編/工房/比較ページのアート依存と正本→生成物の関係は [ART_DEPENDENCIES](./ART_DEPENDENCIES.md) を参照。画像読込の取消はgameのrun/encounter/mode検査を維持している。
