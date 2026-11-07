# リファクタリング比較・検証記録（2026-11-07）

段階0〜5Cのローカル候補で実施した比較。現在の継続状態は[HANDOFF](./HANDOFF.md)。使い捨て比較スクリプト/ログは物理checkoutの .local-only/scratch に保管し、配信対象に含めない。本番公開・実機聴感の検証記録ではない。

## 最終候補・5C

- 全Node **525件 / 39.9秒** 成功（game-entries-node.log）。段階5Aで画像8件/フォント2件も成功、画像とポーズはその後も未変更。
- JS **59ファイル**の構文検査、git diff --check、node scripts/build-game-entries.js --checkが成功。生成後の再実行は差分ゼロ。依存逆転/重複/Dev混入と内容hashの検証を追加した。
- 最終耐久試算の36比較・fixtures・方法記述は段階3C結果と一致（revisionだけ比較外）。balance-simulation成功。refactor-final-survival.json、refactor-final-balance.log。
- Chrome390pxで本編/Dev診断正常、通常ページにDev APIなし、中断→reload→再開時のHP/障壁/敵HP維持と初撃4拍、80F精鋭終王のヒヨコ練習でlocalStorage無変更を確認。
- 工房/アート比較/スキン/ドット絵比較/塗分け/終幕/リンク集/クレジットの8ページがHTTP200、ブラウザー・アセットエラーなし。file://から本編開始も成功。verify-final-entries.cjs。
- 5Cでは機能・画像・音色・保存形式の変更なし。URLは共通の内容hashへ変更し、旧長文queryに依存するテストを更新した。

## 各段階の比較

- 5B：全Node522件（39.7秒）成功。基準297620bと252遷移時点の公開状態/DOM/保存/音声予約が一致。新規/チュートリアル/再開/新規確認の取消と確定/一時停止/設定/Dev4スキン・テンポ・商人・曲試聴と練習を比較。Chrome3幅の本編/Devで設定・音量・較正取消・pause復帰・Dev無保存も成功。構文/diff check成功。scratchのverify-controller.cjs、verify-controller-browser.cjs、controller-node.logが証跡。恒久テスト追加なし。

- 5A：全Node522件（39.0秒）、画像8件・フォント2件成功。基準01643b6とChrome390/1280pxの312 Canvas出力がピクセル一致（採用/legacy/8試作方式、6種の敵、通常/ヒヨコ/ふんどし、予備動作/接触/JUST/被弾/入力待ち）。ブラウザーエラーなし。読込失敗と離脱/別遭遇後の遅延完了は既存Nodeで成功。工房JSONとart-defaultsは改行CRLFを正規化すると完全一致、データ変更なし。構文/Pages/diff check成功。旧画面のソース文字列検査は公開描画APIの実呼出へ移行。scratchのverify-character-browser.cjs、character-renderer-node.log、character-renderer-chick.pngが証跡。

- 4B-3：全Node520件（40.3秒）成功。基準5bfb729と15mode×Dev/保存失敗/死亡入力禁止/中断有無の240条件で表示・戻り先・pause・中断読取位置と条件が一致。Chrome320/390/1280pxの本編/Devで文字/寸法、音量更新、Dev無保存、戦闘から設定→一時停止→再開、較正開始→取消を確認。構文/Pages/diff check成功。scratchのverify-settings-view.cjs、verify-settings-browser.cjs、settings-view-node.logが証跡。恒久テスト追加なし。

- 4B-2：全Node520件（39.2秒）成功。基準ff170ecと864条件を2回ずつ描画し、全表示/状態/保存位置が一致。Chrome320/390/1280pxで13種の分岐・部屋・イベント画面、購入・強化/限界突破/研磨の選択→戻る→確定、休息後の進行を比較。文字/寸法/HTML一致、エラー/ページ横はみ出しなし。寸法比較はhoverの1px移動とCSSアニメーションを両版で無効化。390pxの強化/祭器を目視確認。構文/Pages/diff check成功。scratchのverify-room-view.cjs、verify-room-browser.cjs、room-view-node.logが証跡。

- 4B-1：全Node519件（40.2秒）成功。基準61ae6efと200条件で全表示値/全状態/保存呼出位置が一致。Chromeの320/390/1280pxで報酬/遺物/イベントスキルの文字と座標/寸法が一致。引き直し1回、4択、取得、所持満杯の遺物選択→戻る→交換、イベントスキル取得後9Fへ進行、ページ横はみ出し/ブラウザーエラーなしを確認。390pxの3画面を目視確認。構文/Pages/diff check成功。scratchのverify-rewards-view.cjs、verify-rewards-browser.cjs、rewards-view-node.logが証跡。

- 3C：全Node518件（40.2秒）成功。基準661a1f9と通常/稽古/ふんどし/80F、JUST/PARRY/GUARD/MISS、スキル・遺物あり/なし、敵HP6水準の192条件を実ゲームハーネスで比較。7,826 callback前後の全状態、乱数消費数、最終パーティクル/文字が一致。耐久36比較とfixturesも一致。Chromeで通常PARRYの6コンボ追撃と奥義チャージ消費、その次のガード被弾を確認。構文/diff check成功。scratchのverify-strike-order.cjs、strike-order-parity.log、strike-order-node.log、strike-order-survival.json、verify-strike-browser.cjsが証跡。恒久テストの追加なし。

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
