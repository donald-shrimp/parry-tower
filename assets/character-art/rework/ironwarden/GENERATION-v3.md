# 鉄血の監督官・構え再作画 v3

- 制作日：2026-10-19。内蔵 image_gen、transparent_background=true。
- 出力：`ironwarden-ready-guard-v3.png`。1445×1088 RGBA。元原画とv2を保持し、別名で保存。
- SHA-256：`2292e6baa69e06ead87843d9b43ce94771bd4fad9eb7eb36d80db37f27020fa5`。
- 元出力：`C:/Users/EBIHARA/.codex/generated_images/01a152a3-5e02-7992-9ac6-654b55aa7045/exec-c9727818-6857-40d8-882b-6c8a2fe69d5d.png`。
- デザイン・画風の参照：同フォルダの `ironwarden-ready-candidate.png`。司祭の最終案は、先に生成した後方構え案も参照して再構成。
- 全プロンプト：`docs/character-art/BOSS_REWORK_V3_PROMPTS.json`。原画だけの手の差し替えではなく、両肩・肘・手首と全身を描き直した。
- 動き：両手で肩脇へ引き、斜めに振り下ろす。 一本の柄と両手は一体で変換し、二組の肩・肘をそれぞれの手首へ接続する。
- 実装：`assets/character-enemy-data.js` と既存 `character-enemy-puppet.js`。元PNGを直接マスク分割。ゲーム・確認ページで同じ描画を使用。
- 自動検証：真の透明度、非欠け、接触、両手と前腕の接続、剣の切り残し、ゲーム状態互換。描画検査は作画の正しさそのものの保証ではない。原画と動作は帰宅後のユーザーレビュー対象。
