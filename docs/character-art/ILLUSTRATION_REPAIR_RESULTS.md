# 立ち絵修整候補 v2（2026-10-19）

> 2026-10-23 整理：この制作記録の旧案PNGは `.local-only/archive/old-art-2026-10-23/` 内へ元の相対パスで保管。現在の採用画像は `pixel-candidates/manifest.json` を参照。過去の入力・出力名は制作履歴として残す。

## ユーザー評価による訂正

黄色い宝石スライム以外の5体は不採用。「手も直ってない」と明示された。目視で修整できたと判断したのは誤りで、v2を改善済み・採用済みと扱わない。次は[構えの作画資料 v3](./POSE_REFERENCE_V3.md)に基づき、手の差し替えではなく身体と構え全体を再作画する。以下は不採用候補も含む保存・検査の記録であり、作画の正しさを保証しない。

内蔵imagegenで元PNGを参照し、5体の左剣手・手首・腕を修整、宝石スライムを黄色系へ変更。レビュー候補であり、ゲーム側の原画参照・マスク・モーションは変更していない。

[スマホ用Googleスライド](https://docs.google.com/presentation/d/1Z8albmoxgn4BiEZEC0-oMElnqi5-TmFQVmNAfQMmaxc/edit?usp=drivesdk) の18〜23ページに、左を修整前・右を修整案として追加した。元の17ページとユーザーの書き込みを保持。各比較ページに編集可能なメモ欄あり。

| キャラクター | 比較ページ | 保存済みPNG | 完全なプロンプト・生成記録 |
| --- | --- | --- | --- |
| 鉄壁の番兵 | 18 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/sentinel/sentinel-ready-anatomy-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/sentinel/sentinel-ready-anatomy-v2.md) |
| 鐘楼の守護者 | 19 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/guardian/guardian-ready-anatomy-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/guardian/guardian-ready-anatomy-v2.md) |
| 鉄血の監督官 | 20 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/ironwarden/ironwarden-ready-anatomy-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/ironwarden/ironwarden-ready-anatomy-v2.md) |
| 弔鐘の司祭 | 21 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/dirgekeeper/dirgekeeper-ready-anatomy-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/dirgekeeper/dirgekeeper-ready-anatomy-v2.md) |
| 時の監視者 | 22 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/timewarden/timewarden-ready-anatomy-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/timewarden/timewarden-ready-anatomy-v2.md) |
| 宝石スライム | 23 | [PNG](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/gem_slime/gem_slime-ready-yellow-v2.png) | [生成記録](C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/gem_slime/gem_slime-ready-yellow-v2.md) |

## 検証

- 6原画を目視し、元デザインとポーズ、剣の握りと手首、黄色の色調を確認。
- PNGの元画像と同じ寸法、RGBA透明背景、主要シルエットの非欠けを確認。宝石スライムの最大アルファは254。生成された値を保持している。
- 元PNGのSHA-256がレビュー資料作成時から変わっていないことを確認。
- APIで全23ページ、6比較ページそれぞれ2画像、元の17ページのテキスト完全保持を確認。
- Googleスライドのブラウザ表示で比較6ページを目視。証跡は `test-results/art-review-build/native-repair-*.png`。
- 全プロンプト集合は [ILLUSTRATION_REPAIR_PROMPTS.json](./ILLUSTRATION_REPAIR_PROMPTS.json)。

## 次の作業

ユーザーの修整案レビューを読む。採用が決まった原画を、帰宅後のモーション調整時に分割し直す。今回の候補を既存の可動PNGへそのまま上書きしない。
