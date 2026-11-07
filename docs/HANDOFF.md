# 継続状態（2026-11-07）

## 現在の状態

v1.0.0はPR #41（e99c226）で公開済み。ユーザー承認済みの紅蓮処刑変更をv1.0.1として公開する。敵HP35%以下、炎上蓄積×1の追撃、蓄積は維持。スキル説明と版/生成物を同期し、35%境界・連続発動・小瓶との合算・残りHP6を炎で倒す回帰ケースを追加。全Node527件、画像8件、フォント2件、構文/生成一致/バランス試算が成功。Chromeでも通常PARRY後の残りHP6を炎が削り切ることを確認。証跡はscratchのv101-node.log、verify-v101-burn.cjs。低fpsで継続ダメージが遅くなる別件は今回の対象外。

[段階的リファクタリング](./REFACTOR_PLAN.md)の段階0〜5Cを実装・検証し、ユーザーの公開指示に従い [v1.0.0](./V100.md) として統合する。主担当が計画・実装・差分確認を行った。

- ブランチ：fix/crimson-execution（v1.0.1）
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
