# 採用した画像の置き場（アップロードはユーザーの承認後）

このディレクトリは、画像生成エージェントの**全候補を収集する場所ではない**。ユーザーが採用した参考画像だけを保存する。

1. GitHubで **Draft PR #28のブランチ `experiment/character-art-canvas-v1`** を選ぶ。
2. `assets/character-art/references/<id>/approved.png` をアップロード。<id>は`hero`, `knight`, `slime`など、`docs/character-art/prompts/`で定めたID。
3. 画像の採用ポイントや修正点があれば同じフォルダへ `notes.md` を作り、採用理由、生成元、修正希望、ユーザー承認日を記録する。
4. 対象SVGエージェントに `docs/character-art/README.md` とIDを渡す。
5. SVG担当は画像を**実際に閲覧できたことを確認**してから制作する。閲覧できなければ画像ファイルの添付を依頼する。

複数候補を選んだ場合でも`approved.png`は優先参照1枚だけ。副参照は`alternative-01.png`などにし、`notes.md`で優先順位を書く。

現時点では採用画像は **未登録**。存在しない`approved.png`を見たものとして扱わないこと。画像の登録でゲームへの自動反映は行われない。

個別指示書や工程の詳細: [制作ガイド](../../../docs/character-art/README.md) / [WORKFLOW](../../../docs/character-art/WORKFLOW.md)
