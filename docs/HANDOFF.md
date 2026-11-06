# 継続状態（2026-11-07）

## 現在の目的と範囲

[段階的リファクタリング](./REFACTOR_PLAN.md)をローカルで継続中、未公開。以後はユーザーの最新指定により主担当が計画・実装・検証・差分確認を一貫して行う。サブエージェントの起動は不要。

音声基盤、2A（新規ラン生成）、2B（復元準備）、2C（保存IO）、3A（戦闘数式/スキル定義）、4A（ショップ/図鑑表示）、3B（回復/障壁/被ダメージ）が完了。`save-store.js` に本編のlocalStorage read/write/removeを集約。保存の正規化とCP codecは既存モジュール、警告UIと画面進行はgameが担当する。Devは書込禁止、稽古は中断を保存しない。自動保存失敗は旧中断を除去し、手動中断失敗は旧中断を保持してポーズに留まる既存の違いを維持した。複数キー保存は原子的ではなく、課金/報酬の書込順も従来どおり。

`combat-math.js` は必要な値を受け取る純粋な計算。`skills.js` が25スキル・11相乗効果と説明を所有し、describe(id,level,{baseAtk,bladeLevel,baseHp})で現在の表示値を受ける。全表示呼出を移行し、旧descのゲーム状態クロージャーを除去した。戦闘効果の適用・撃破・乱数消費の順序は変更していない。

`shop-view.js` / `codex-view.js` は明示的な表示入力からHTML/文字列/先読みスキンIDのviewを返す。入力状態を変更・保持せず、DOM/保存/進行の操作はgame側。購入/装備/封印/稽古の再検証と既存リスナーの配置を維持した。CSS/デザインは変更なし。

`combat-health.js` はHP/障壁と関連フラグの同期更新を担当。スキル/遺物の数値を呼出側が渡し、文字・パーティクル・復活/死亡・氷鏡・HUDのcallbackを従来の位置で呼ぶ。生存/進行を最後にまとめて適用しない。必要な状態フィールドはREFACTOR_EXECUTIONの3B表を参照。

- ブランチ：`refactor/run-state`（音声基盤と計画を含む）
- 作業ツリー：`E:/Development/parry-tower/parry-tower/.local-only/worktrees/shop-upgrade-display`
- プレビュー：[本編](http://127.0.0.1:8015/) / [Dev](http://127.0.0.1:8015/dev.html)
- 公開中の実装：`db87a1c`（PR #40、能力強化のゲージ幅統一）。

## 完了したこと

- `af790f5`：共通ハーネスを `tests/helpers/game-harness.js` へ抽出。耐久試算がテスト本体の文字列を切り出す依存を解消。ゲームへの検証コード差し込みはハーネスへ隔離し、後続で段階的に置き換える。
- `965e34e`：`assets/music.js` に曲選択と音色・再生窓口を抽出。本編とDevの11曲・共通アレンジ・第二楽章の太鼓を同じ経路から再生。終王の既存楽器生成はアダプターとして保持。
- `assets/audio-session.js`：Context、BGM/SE/Devバス、拍と先読み、停止/フェード/未来の接触音予約取消を集約。閉鎖Context復旧で全バスを作り直し、resume拒否を処理。SEのみでゲーム時計を差し替えない。
- 重要な既存テストの対応表を REFACTOR_PLAN に追加。

## 検証済み

- 3B（11/07）：全Node518件（39.6秒）成功。基準a740057と16,384条件で全状態と文字/パーティクル/音声/死亡/氷鏡/HUD各callback時点の状態・呼出順が一致。耐久36比較とfixturesも一致。Chromeで実際に被弾してHP減少後の中断→reload→再開、初撃4拍、Devヒヨコ稽古の保存無変更とエラーなしを確認。構文/Pages/diff check成功。scratchのverify-combat-health.cjs、combat-health-node.log、combat-health-survival.json、verify-health-browser.cjsが証跡。

- 4A：全Node515件（39.5秒）成功。基準20b55dfとショップ全タブ/旧タブ名/金額/育成段階/スキン/図鑑全フィルター等256条件で表示と先読みIDが一致し、入力非変更も確認。Chromeで320/390/1280pxの文字・全カードとゲージの座標/寸法が旧版と完全一致。繰り返しタブ切替後の購入が一回だけ課金、装備/購入後表示/フィルター/稽古/戻る/保存無変更を実操作で確認。スクリーンショットも目視確認。構文/Pages/diff check成功。文字列の所在に依存するui-copyテストをrender結果の検査へ更新。scratchのverify-menu-views.cjs、verify-menu-browser.cjs、menu-views-node.log、menu-{shop,codex}-{320,390,1280}.pngが証跡。

- 3A：全Node513件（39.0秒）成功。基準da243b8と全スキル説明15,872件、計算60,000件が完全一致。ショップ/図鑑/ビルド/相乗効果/報酬の22 DOM比較、耐久36比較とfixturesも一致。Chromeで育成済みタイトルのショップ/図鑑HP表示とラン内剛剣補正後の落雷表示、診断正常を確認。構文/Pages参照/diff check、balance-simulation成功。旧スキル文字列をgame.jsから探すテスト1件をカタログ検査へ移行。scratchのverify-combat-math.cjs、verify-skill-ui.cjs、verify-skill-browser.cjs、combat-math-node.logが証跡。

- 2C：全Node509件（39.4秒）、復元336条件の状態/外部呼出順比較、耐久36比較とfixturesが成功。Chromeで中断→reload→再開のHP/障壁/敵HPと初撃4拍、Devヒヨコ稽古で保存無変更、ブラウザー/アセットエラーなしを確認。保存失敗・storage取得拒否・JSON不正・削除失敗をstore単体で検証。構文/Pages参照/diff check成功。証跡はscratchのsave-store-node.log、save-store-survival.json、verify-save-browser.cjs。

- 2B：全Node505件（38.4秒）成功。基準f21b9bfに対し、全7保存モード・4スキン・効果ON/OFF・死神契約有無・旧/現行/独自HP値の336条件で全復元状態とUI/時計呼出順が一致。耐久36比較とfixtures、JS構文、Pages参照、diff check成功。Chromeで中断→reload→再開時のHP/障壁/敵HPと初撃4拍を確認。証跡はscratchのverify-restore-parity.cjs、restore-node.log、restore-survival.json。

- 2A：敵生成前の全103項目を11条件で `3a16cc5` と照合し一致。耐久36比較とfixturesも一致。全Node503件（39.8秒）、バランス試算、CI相当のPages静的検査、変更JS構文とdiff check成功。Chromeで本編の開始とDevのヒヨコ稽古を確認。比較用ログは物理repoの `.local-only/scratch/`。

- ハーネス抽出後：全Node496件成功、テスト登録と本体を保持。耐久試算36比較とfixtureを含むJSONが基準と完全一致。
- 楽曲抽出後：全Node497件成功（38.725秒）。静的Pages参照、構文、diff check成功。耐久試算も一致。
- 親の独立比較：基準 `1984c35` と83音楽条件、413,868件の音声ノード生成・接続・パラメーター・開始/終了予約が一致。
- Chrome実行：本編開始・一時停止/再開、全11曲試聴、5F守護者の通常/ヒヨコ、80F精鋭終王のヒヨコ練習。音声時計の進行、攻撃の進行、音声/ブラウザー/アセットエラーなしを確認。
- 最終候補：全Node501件（38.692秒）、画像8件、フォント2件成功。耐久結果一致、構文/Pages参照成功。先読み640条件を抽出前と独立比較し、発音時刻と次ステップが一致。Chromeでは上記に加え、本編のContext強制終了→安全停止→再作成と、Dev効果音バスの再作成を確認。
- 実機スピーカーでの聴感と入力遅延は未検証。

## 残る範囲と次の一手

次は3C。strikeResultの反撃/追撃を名前付きの段階へ整理し、各段の読む/書く状態と停止条件を記録する。通常PARRYでの奥義、追撃途中の撃破で即停止、実ダメージ吸血、80Fの50%下限、乱数/演出の順序を保つ。その後4B残りの画面、5A〜C描画/Dev/配信境界へ進む。公開指示を受けたら統合候補の全チェック・配信検証を行う。

途中の試算・比較スクリプト・ログは物理チェックアウトの `.local-only/scratch/` にあり、Git対象外。既存の原画・ポーズ・ユーザー参照ファイルを保持する。

以前の公開証跡と作業記録は [HANDOFF履歴](./HANDOFF_HISTORY_2026-11-06.md) に保存。履歴中の「最新」「次」は当時の状態であり、現在の作業指示ではない。
