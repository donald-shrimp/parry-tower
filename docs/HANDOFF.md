# 継続状態（2026-11-07）

## 現在の状態

v1.0.2を本番公開済み。PR #43、main統合08ce3cb19f762d921f696374caea89abba61006b、タグv1.0.2。ユーザー承認済みのUI文言・岐路バッジ・保存済みB編集内容・C04〜C07・ローカル文言エディタを配信した。共鳴説明は「習得済みスキルに共鳴するスキルを1つ習得。」が最終形。ゲーム仕様と保存形式は維持。

検証：全Node530件、画像8件、フォント2件、構文、生成一致、バランス試算が成功。PRのStatic checks（42352553480）、mainのStatic checks（42352697502）、Pages（42352696798）はすべて成功。ライブの本編/Dev HTML・45 JS/CSS・フォント・文言エディタ・リンク集が統合コミットとバイト一致。新しい「歌」と分離済みview/skillsの文字を表示フォントへ収録（1,232文字、CSSフォント版9）。Chrome320/390/1280pxで保存済み文言・補正後報酬・Lv比較・岐路バッジ・下段削除・横はみ出しなしをローカル/本番で確認。本番でも中断/再読込/4拍復帰、80FヒヨコDevの保存分離、8ツールを確認。file://起動も成功。本番のnetworkidle待ちが一度タイムアウトしたため、load待ちへ変更して再確認し全項目成功。実装変更は不要だった。

証跡：物理checkoutの.local-only/scratch内のv102-node-final.log、v102-balance.log、verify-v102-assets.cjs、verify-v102-live-copy.cjs、verify-v102-live-routes.cjs、verify-v102-live.cjs、v102-live-sanctuary.png。リリース作業の残りはなし。この公開結果の追記は配信後の文書記録であり、v1.0.2の配信対象ツリーは上記main統合コミット。

以下のローカル候補・未公開の記述は各変更作成時の記録。

最新：ユーザー保存済みの .local-only/copy-editor/project.json（updatedAt 1794036754634、SHA256 47bee793eeb4c198e2f9dae9b328d4268e6b8b1242ebdcaa061f11143c2d2d4a）を本編のローカル候補へ採用した。祈り3種と金床/祭器の上下文言、B10の「現在：そのスキルの効果」、B11下段非表示を反映。B10の上段/効果、B12は原文と同じため維持。ユーザー編集ファイルは変更していない。C04〜C07、Aとバッジの既存方針も維持。全Node530件、構文/生成一致/diff check成功。Chrome320/390/1280pxで保存文言・補正後報酬額・他スキルの効果表示・非表示見出しを確認。scratchのuser-copy-node.log、verify-user-copy.cjs、user-copy-sanctuary.pngが証跡。未公開。

後続のユーザー指定により、共鳴の下段から「ランダムに」を削除し「習得済みスキルに共鳴するスキルを1つ習得。」へ修正。保存済み編集データのB01.lowerも同じ内容へ更新（更新前をproject.backup.jsonに保存）。再表示で修正前の文言へ戻らないようupdatedAtも更新。初回採用の上記ハッシュは修正前の記録。抽選や進行は変更しない。

最新のローカル候補：Bの短縮をすべて元に戻し、CはC04〜C07だけ採用。共鳴表示、操作欄、報酬のLv比較、スキン見出し、商人の結果文を復元。Aの短縮・英語小見出し・色バッジ・岐路下段削除は維持。B編集用のcopy-editor.htmlを追加し、上段/下段編集、表示切替、原文比較、数値見本、下書き、JSON入出力、ローカルファイル保存を用意した。編集はゲームへ自動適用しない。

文言エディタ：http://127.0.0.1:8016/copy-editor.html（serve-local.jsを8016で起動済み）。保存先は作業ツリー内の .local-only/copy-editor/project.json、直前版はproject.backup.json。ユーザーが「保存」後に反映を頼んだら、このファイルを読み、本編の対応箇所へ採用する。データを勝手に初期化しない。詳細はCOPY_EDITOR.md。

検証：全Node530件、構文/生成一致、diff check成功。Chrome390/1280pxで編集、段の非表示/復元、保存/再読込、JSON出力/入力、項目リセット、差込値の見本を確認。ブラウザー検証は別の一時フォルダーと専用プロファイルで行い、実際のユーザー編集ファイルは未作成。scratchのcopy-editor-node.log、verify-copy-editor.cjs、copy-editor-desktop.pngが証跡。未公開。

公開中はv1.0.1（PR #42、196f778）。現在はui/route-type-badgesでローカルのUI候補を作成。ユーザー指定により英語小見出しは維持し、岐路カードのSAFE/MYSTERY/DANGER/TRADEを部屋名の横の色付きバッジへ移動した。その他の文言短縮は[棚卸し](./UI_COPY_AUDIT.md)の候補段階。今回のバッジは未公開。Chrome320/390/1280pxの4F/8Fで各バッジ、説明・注意文、経路選択、横はみ出しなしを確認。全Node527件、生成一致/diff checkも成功。scratchのroute-badges-node.log、verify-route-badges.cjsと390pxのスクリーンショットが証跡。

v1.0.0はPR #41（e99c226）で公開済み。ユーザー承認済みの紅蓮処刑変更をv1.0.1として公開する。敵HP35%以下、炎上蓄積×1の追撃、蓄積は維持。スキル説明と版/生成物を同期し、35%境界・連続発動・小瓶との合算・残りHP6を炎で倒す回帰ケースを追加。全Node527件、画像8件、フォント2件、構文/生成一致/バランス試算が成功。Chromeでも通常PARRY後の残りHP6を炎が削り切ることを確認。証跡はscratchのv101-node.log、verify-v101-burn.cjs。低fpsで継続ダメージが遅くなる別件は今回の対象外。

[段階的リファクタリング](./REFACTOR_PLAN.md)の段階0〜5Cを実装・検証し、ユーザーの公開指示に従い [v1.0.0](./V100.md) として統合する。主担当が計画・実装・差分確認を行った。

- ブランチ：ui/route-type-badges（ローカルUI候補）
- 作業ツリー：E:/Development/parry-tower/parry-tower/.local-only/worktrees/shop-upgrade-display
- プレビュー：[本編](http://127.0.0.1:8015/) / [Dev](http://127.0.0.1:8015/dev.html) / [工房](http://127.0.0.1:8015/art-studio.html)
- 配信先：[本編](https://donald-shrimp.github.io/parry-tower/) / [Dev](https://donald-shrimp.github.io/parry-tower/dev.html)。前版は db87a1c（PR #40、v0.9.9）。公開結果は [main の CI と Pages](https://github.com/donald-shrimp/parry-tower/actions?query=branch%3Amain) を参照。

## 完了した範囲

| 範囲 | 現在の境界 |
| --- | --- |
| 音声 | musicが本編/Dev共通の選曲・音色窓口、audio-sessionがContext/バス/先読み/停止を所有 |
| 状態・保存 | run-stateが新規/復元準備、save-storeが全storage IO。codec/正規化は既存モジュール |
| 戦闘 | combat-math/skillsの計算・説明、combat-healthの同期HP/障壁更新。反撃はgame内の名前付き段階 |
| 表示 | shop/codex/rewards/room-viewが表示だけを生成。操作再判定/支払/抽選/保存はgame側 |
| 描画 | character-rendererが描画先の選択。原画・ポーズ・座標変換・読込取消を維持 |
| 操作 | game内のcreateGameControllerに開始/復元/稽古/停止/設定/タイトルと私有の遷移状態を集約。Devも同じ開始/終了を使用 |
| 配信 | scripts/game-assets.jsonを正本に、build-game-entries.jsがHTMLと診断定義を生成。版＋内容hashでキャッシュ更新 |

段階5Bまでの主要commit：da243b8（保存）、20b55df（数式/スキル）、a740057（shop/codex）、661a1f9（health）、61ae6ef（反撃）、ff170ec（報酬）、5bfb729（部屋）、01643b6（設定）、297620b（描画）、276c666（controller）。5CはこのHANDOFFを含むmanifestコミット。

## 検証

全Node525件（39.9秒）、JS59本の構文、生成一致、diff check、耐久36比較とfixtures、バランス試算が成功。画像8件・フォント2件も成功。アート生成物はCRLF/LF差を除いて正本と一致。

各段階で旧版の状態/保存位置/乱数/音声予約/画面/描画を比較した。Chromeでは3幅のメニュー操作、312枚の描画ピクセル一致、本編中断→再開、Dev無保存、工房等8入口、file://起動を確認。詳細とscratch証跡は[比較記録](./REFACTOR_VERIFICATION_2026-11-07.md)。

## 次の一手・注意

1. 実機のスピーカー/Bluetoothで聴感・入力遅延を確認する場合は、v1.0.0の本編・Devで試遊する。
2. 今後JS/CSSを変更したら node scripts/build-game-entries.js で再生成し、--checkと全Nodeを実行する。生成領域を直接編集しない。

進行/演出の組み立て、legacy Canvas描画、通常SE/較正音のレシピはgame内に残る。多数のgetter/setterを渡すだけの物理分離を避けた。検証の任意状態fixture/音声観測の差込はtests/helpersに限定して残す。本番へテスト専用書換えAPIを追加しない。これらのさらなる分離は、その領域を変更する独立作業で扱う。

原画・保存済みポーズ・無関係なユーザーファイルは保持。途中の比較スクリプト/ログは物理checkoutの .local-only/scratch（Git対象外）。過去の公開記録は[HANDOFF履歴](./HANDOFF_HISTORY_2026-11-06.md)。構成は[ARCHITECTURE](./ARCHITECTURE.md)、アート参照は[ART_DEPENDENCIES](./ART_DEPENDENCIES.md)を参照。
