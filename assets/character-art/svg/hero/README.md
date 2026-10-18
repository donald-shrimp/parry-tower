# 主人公の初版SVG（**不採用・旧比較用**）

このフォルダは、2026-10-18の設定画をもとに制作した**初版12パーツSVGとmanifest**。ユーザーから「盾が切れる」「全体的に微妙」との指摘があり、**現在のデザインは不採用**で、完成版・採用版として使用しない。

- このフォルダの画像入力は従来の `assets/character-art/references/hero/approved.png`（設定画からの**128×120px軽量切り出し**）。新方式の下絵 `hero/svg-base-approved.png` ではない。
- `?art=svg` はこの初版SVGの**比較用プレビュー**にすぎない。製品版描画は変更していない。
- **再制作前に** [hero-svg-base.md](../../../../docs/character-art/prompts/hero-svg-base.md) に従って簡略立ち絵を画像生成し、ユーザーに採否を尋ね、承認された**原寸PNG**を新しい主参照として登録する。
- SVG制作時は [SVG_SPEC](../../../../docs/character-art/SVG_SPEC.md) の**viewBoxと回転後の盾の欠け**を重点検証し、実画面で採用判断する。
- ブランチもPRもこのまま。マージせず、必要ならこの初版を削除・上書き可能。

旧実装技術: 12パーツ、共通viewBox `(-100,-150,200,165)`、`assets/character-svg.js` による非同期ロード。これらはそのまま流用することを保証しない。
