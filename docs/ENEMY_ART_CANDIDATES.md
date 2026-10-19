# 敵の原画・生成プロンプト一覧（2026-10-19）

[立ち絵の部分修整 v2](./character-art/ILLUSTRATION_REPAIR_RESULTS.md)：番兵・守護者・監督官・司祭・時の監視者の左剣手/腕と、黄色の宝石スライムを別名PNGで保存。元のゲーム参照・モーションは保持し、スマホ用Googleスライド18〜23ページへ修整前後を追加済み。以下は修整前の原画一覧。

ユーザーの「mainを見て立ち絵と各キャラの動作を制作し、帰宅後にレビュー」に従い、14体の原画と派生込み26種の動作を実装した。既存の騎士と以前のスライム/暗殺者/亡霊案を使い、新しく10体を制作。新しい絵と動きはレビュー候補であり、最終採用はユーザー判断。

制作は内蔵image_gen、騎士原画を画風参照、transparent_background=true。CLI/APIや外部生成サービスは使用していない。各PNGはワークスペースへ保存し、生成元も保持した。完全なプロンプト・参照・SHA-256・生成元パスは各GENERATION.mdにある。

| キャラクター | 元PNG | 完全な生成記録 |
| --- | --- | --- |
| 錆びた騎士 | [knight-ready-candidate-v3.png](../assets/character-art/rework/knight/knight-ready-candidate-v3.png) | [GENERATION.md](../assets/character-art/rework/knight/GENERATION.md) |
| 残響スライム | [slime-ready-candidate.png](../assets/character-art/rework/slime/slime-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/slime/GENERATION.md) |
| 影の暗殺者 | [rogue-ready-candidate.png](../assets/character-art/rework/rogue/rogue-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/rogue/GENERATION.md) |
| 塔の亡霊 | [wraith-ready-candidate.png](../assets/character-art/rework/wraith/wraith-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/wraith/GENERATION.md) |
| 鉄壁の番兵 | [sentinel-ready-candidate.png](../assets/character-art/rework/sentinel/sentinel-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/sentinel/GENERATION.md) |
| 紅刃の剣士 | [duelist-ready-candidate.png](../assets/character-art/rework/duelist/duelist-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/duelist/GENERATION.md) |
| 残響の詠み手 | [cantor-ready-candidate.png](../assets/character-art/rework/cantor/cantor-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/cantor/GENERATION.md) |
| 時計仕掛けの兵士 | [clockwork-ready-candidate.png](../assets/character-art/rework/clockwork/clockwork-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/clockwork/GENERATION.md) |
| 鐘楼の守護者 | [guardian-ready-candidate.png](../assets/character-art/rework/guardian/guardian-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/guardian/GENERATION.md) |
| 鉄血の監督官 | [ironwarden-ready-candidate.png](../assets/character-art/rework/ironwarden/ironwarden-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/ironwarden/GENERATION.md) |
| 弔鐘の司祭 | [dirgekeeper-ready-candidate.png](../assets/character-art/rework/dirgekeeper/dirgekeeper-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/dirgekeeper/GENERATION.md) |
| 時の監視者 | [timewarden-ready-candidate.png](../assets/character-art/rework/timewarden/timewarden-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/timewarden/GENERATION.md) |
| 黄金の音叉 | [golden_tone-ready-candidate.png](../assets/character-art/rework/golden_tone/golden_tone-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/golden_tone/GENERATION.md) |
| 宝石スライム | [gem_slime-ready-candidate.png](../assets/character-art/rework/gem_slime/gem_slime-ready-candidate.png) | [GENERATION.md](../assets/character-art/rework/gem_slime/GENERATION.md) |

新規10体の寸法は基本1445×1088 RGBA、鉄血の監督官は1446×1088、宝石スライムは1536×1024。PNGを展開して真の透明画素と画面端での非欠けを自動検査した。マスク・原点・肩・肘・手・打点は assets/character-enemy-data.js に各画像の実ピクセル座標で記録し、PNGを直接分割する。

[確認ページ](../art-preview.html)で原画比較/部品/骨格/スロー/実戦を確認できる。下部の原画14体から「動作を見る」、上部で全26種や次/前の敵を選ぶ。双剣は「次の剣で接触」で二撃目も止めて確認できる。

全体の動き・判断・検証は [ROSTER_MOTION_REVIEW](./ROSTER_MOTION_REVIEW.md)、現在の継続状態は [HANDOFF](./HANDOFF.md)。主人公は [HERO_PUPPET_REVIEW](./HERO_PUPPET_REVIEW.md)、採用騎士の間合いは [KNIGHT_STAGING_REVIEW](./KNIGHT_STAGING_REVIEW.md)。
