# 継続状態（2026-11-07）

## 現在の状態

ユーザーの保存済みレイアウト（updatedAt 1794040490837、SHA256 815405c61d60a471c6287af8b9ca9df10a33a2e35bee8ba20d04fd6ae26d9ac1）をローカル本編へ採用済み。採用スクリプトとエントリー再生成を実行し、列数・余白・サイズ・並びを保存値のまま反映。サブボタンはタイトルのスマホ15px、挑戦終了/一時停止のスマホ13px、PCは全画面16px。ユーザー指定によりサブにもピクセルフォントを適用した。pixelSecondary（初期true）を追加し、工房のボタン欄で主操作と独立して切り替えられる。旧保存/下書きはtrueを補完し、実際の編集ファイルは上書きしていない。サーバー8017は新しいモデルで再起動済み。本番はv1.0.2のまま。

検証：関連Node9件、フォント2件、構文/生成一致/diff check成功。Chrome320/390/1280pxで3画面の保存値一致、メイン/サブのフォント・サイズ・余白、改行/横はみ出しなしを確認。開始・一時停止/再開・中断後のつづきから・敗北後再挑戦も成功。工房のサブ書体切り替えが主操作と独立すること、保存ファイルのバイト不変、採用設定と正規化した保存データの完全一致を確認。証跡はscratchのverify-adopted-menu-layout.cjs、adopted-layout-title-390.png、adopted-layout-death-390.png、adopted-layout-title-1280.png。

次：ローカル本編/工房を再読み込みして採用済みの見た目を確認できる。後続の編集は保存後に同じ採用手順で反映。公開はまだ依頼されていない。

工房の「大きさ・余白」にサブボタンの文字サイズ（10〜24px、初期12px）を追加。3画面それぞれでスマホ/PC別に指定できる。menu-layoutのsecondarySizeを設定・CSS・採用用データ・保存APIへ通し、旧データ/下書きは未設定を12pxへ補完する。ユーザーの保存ファイルは上書きしていない。採用済みの配置値は維持して新項目のみ補完。サーバー8017を新しい検証モデルで再起動する必要があるため、この変更時に再起動済み。

検証：関連Node7件、JS構文/生成一致/diff check成功。別の一時保存先と専用Chromeで3画面×320/390/1280px、スマホ16px/PC20pxの独立設定、主操作サイズの維持、旧保存の読み込み・他設定の維持・保存/再読込を確認。320px/3列/24pxでも横にはみ出さない。証跡はscratchのverify-layout-secondary-size.cjs、layout-secondary-size.png。工房を再読み込みすると新しい入力欄が現れる。本番未公開。

工房のPC幅で挑戦終了の結果文が左へ寄る不具合を修正。共通の段間隔指定でpの横auto marginを打ち消し、max-width:470pxの本文だけ左へ寄っていた（1280pxで編集中41px、採用中57px）。menu-layout.cssで本文枠へalign-self:centerとwidth:100%を指定。Chromeの編集中/採用中両プレビューを320/390/960/1280pxで測定し、結果文・見出し・モーダルの中心が一致、横はみ出しなしを確認。関連Node5件、生成一致、diff check成功。証跡はscratchのverify-layout-result-center.cjsとlayout-result-centered.png。

ユーザーの.local-only/layout-editor/project.jsonは保存済み（修正前後SHA256:53ba37dabb6973f9015a7c197f6339107e5e8b98d0b86e8df2b75bbc0e5de8d3）。下記の「実際の編集ファイルは未作成」は工房作成時の記録。この修正では編集データを変更・本編へ採用していない。再読み込みで修正CSSを読み込める。本番未公開。

最新の作業：レイアウト工房をローカル実装済み。ブランチui/menu-layout-studio、作業ツリーは引き続きshop-upgrade-display。サーバー8017を起動済みで、入口は http://127.0.0.1:8017/layout-studio.html 、実プレイ候補は http://127.0.0.1:8017/ 。今回の依頼は準備まで。本番は下記v1.0.2のまま。

タイトル・挑戦終了・一時停止の3画面に共通のmenu-layoutモデル/DOM適用/CSSと採用設定を導入。主操作を上段単独＋ピクセルフォント、補助操作を下段へ配置し、端数も中央寄せ。タイトルは中断データがあればつづきからを主操作へ変更。既存DOMを移動し、イベント・hidden・disabled・敗北後の入力ロックを維持する。工房では同じindex.html/CSSをスクリプトなしsandboxへ読み込み、主操作・書体・ボタン順・画面の並び/装飾表示・スマホ/PC別の寸法を編集し、320/390/520/960/1280pxで比較する。

編集ファイルは.local-only/layout-editor/project.json、バックアップはproject.backup.json、ブラウザー下書きはparry.menu-layout.draft.v1。実際の編集ファイルは未作成。検証用保存は別の一時フォルダーと専用ブラウザーで行い、既存の文言編集ファイルとプレイヤーの保存を維持。copy/layoutのローカル保存処理をlocal-editor-project.jsへ共通化し、分割されたUTF-8の本文もBuffer結合後に読む。

検証：全Node532件、追加後の関連7件、JS構文、フォント2件、生成一致、diff check成功。Chromeで3画面×320/390/1280px、主操作/書体/並び/表示/サイズ変更、比較、保存/バックアップ/新規ブラウザー復元、JSON入出力/不正データ、画面リセットを確認。実ゲームの開始・中断・再開・新規開始確認、敗北入力ロック・ショップ往復・再挑戦も成功。既存の本編/Dev診断、80FヒヨコDevの保存分離、8ツール、file://起動も成功。採用設定スクリプト欠落時にも初期配置へ退避して戦闘開始できる。証跡はscratchのlayout-node-final.log、verify-layout-studio.cjs、verify-layout-fallback.cjs、layout-studio-desktop.png、layout-studio-mobile.png、layout-game-title-390.png、layout-game-death.png。

次：ユーザーが工房で編集して「保存」後に採用を依頼したら、保存ファイルを確認し、node scripts/adopt-menu-layout.js .local-only/layout-editor/project.json、node scripts/build-game-entries.jsで候補へ反映する。画面追加は今回の3画面の確認後に行う。使い方/契約はMENU_LAYOUT_STUDIO.md、設計判断はDECISIONS.mdを参照。

### 公開済みの状態

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
