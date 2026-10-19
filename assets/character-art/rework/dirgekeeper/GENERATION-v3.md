# 弔鐘の司祭・構え再作画 v3

- 制作日：2026-10-19。内蔵 image_gen、transparent_background=true。
- 出力：`dirgekeeper-ready-low-v3.png`。1445×1088 RGBA。元原画とv2を保持し、別名で保存。
- SHA-256：`b597e7f540683482a15ec05de162bd6c3fe9aedc7b9b717580550d1e41240bba`。
- 元出力：`C:/Users/EBIHARA/.codex/generated_images/01a152a3-5e02-7992-9ac6-654b55aa7045/exec-8b83740a-6777-49a3-a5d4-9b45c6e72043.png`。
- デザイン・画風の参照：同フォルダの `dirgekeeper-ready-candidate.png`。司祭の最終案は、先に生成した後方構え案も参照して再構成。
- 全プロンプト：`docs/character-art/BOSS_REWORK_V3_PROMPTS.json`。原画だけの手の差し替えではなく、両肩・肘・手首と全身を描き直した。
- 動き：剣先を前下へ向けた低い両手構えから斬り上げる。 一本の柄と両手は一体で変換し、二組の肩・肘をそれぞれの手首へ接続する。
- 実装：`assets/character-enemy-data.js` と既存 `character-enemy-puppet.js`。元PNGを直接マスク分割。ゲーム・確認ページで同じ描画を使用。
- 自動検証：真の透明度、非欠け、接触、両手と前腕の接続、剣の切り残し、ゲーム状態互換。描画検査は作画の正しさそのものの保証ではない。原画と動作は帰宅後のユーザーレビュー対象。
