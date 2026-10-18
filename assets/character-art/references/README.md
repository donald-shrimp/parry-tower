# 採用した画像の置き場（アップロードはユーザーの承認後）

このディレクトリは、画像生成エージェントの**全候補を収集する場所ではない**。ユーザーが採用した参考画像だけを保存する。

1. GitHubで **Draft PR #28のブランチ `experiment/character-art-canvas-v1`** を選ぶ。
2. `assets/character-art/references/<id>/approved.png` をアップロード。<id>は`hero`, `knight`, `slime`など、`docs/character-art/prompts/`で定めたID。
3. 画像の採用ポイントや修正点があれば同じフォルダへ `notes.md` を作り、採用理由、生成元、修正希望、ユーザー承認日を記録する。
4. 対象SVGエージェントに `docs/character-art/README.md` とIDを渡す。
5. SVG担当は画像を**実際に閲覧できたことを確認**してから制作する。閲覧できなければ画像ファイルの添付を依頼する。

複数候補を選んだ場合でも`approved.png`は優先参照1枚だけ。副参照は`alternative-01.png`などにし、`notes.md`で優先順位を書く。

**主人公（hero）だけ採用画像の軽量切り出しコピーが登録済み**。`hero/notes.md` に原本が1536×1024pxの設定画である旨と低解像度（128×120px）コピーの注意を記載。SVG制作時は可能なら元の高解像度添付も照合する。その他のキャラは採用画像未登録。画像登録だけで本番ゲームへの反映は行わない。

個別指示書や工程の詳細: [制作ガイド](../../../docs/character-art/README.md) / [WORKFLOW](../../../docs/character-art/WORKFLOW.md)
