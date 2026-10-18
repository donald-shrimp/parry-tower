# パリィの塔 — キャラクターアート制作の入口

このページが **画像生成エージェントとSVG化エージェント共通の入口** です。会話ではこのURLとキャラIDを指定するだけで進められるようにしています。

- 制作対象リポジトリ: `donald-shrimp/parry-tower`
- 現在の作業先: Draft PR #28 の `experiment/character-art-canvas-v1` ブランチ
- **画像生成 → 人が選別 → 参考画像をGitHubへ登録 → SVG化** の順で進める
- 現在のCanvas描画は比較用として保存し、**採用承認なしに置換・マージしない**
- この文書は **GitHub上のブランチにある最新版** を参照すること。別ブランチの古い内容と混同しない

## 最短の依頼文（そのまま別チャットへ）

**画像生成担当へ:**
> このREADMEとリンク先の `STYLE_GUIDE.md`、`WORKFLOW.md`、対象の `prompts/<キャラID>.md` を読んで、キャラの全身設定画を1案生成してください。今回は **画像生成のみ**。コード変更、SVG作成、GitHubアップロードはしないでください。見せた画像は私が採否を判断します。

**SVG化担当へ:**
> このREADME、`STYLE_GUIDE.md`、`SVG_SPEC.md`、`WORKFLOW.md`、対象の `prompts/<キャラID>.md` を読んでください。私が採用した `assets/character-art/references/<キャラID>/approved.png` を参考に、ゲーム用の **パーツ分割SVG** を設計・制作してください。画像が読めない場合は、勝手に別の絵を想像して進めず添付を求めてください。変更は既存Draft PR #28のブランチ内だけにしてください。

※ `<キャラID>` は下記の `hero`、`knight` などに置き換えてください。参照画像がまだ未登録ならSVG化を始めないこと。

## 読む順番

1. [WORKFLOW.md](./WORKFLOW.md) — 画像生成、採用、アップロード、SVG化の順序
2. [STYLE_GUIDE.md](./STYLE_GUIDE.md) — 全員共通の美術仕様
3. [対象キャラの指示書](./prompts/hero.md) — キャラ固有の目的・配色・形・可動パーツ
4. SVG化時だけ [SVG_SPEC.md](./SVG_SPEC.md) — 座標、分割、出力、検証
5. 派生敵は [VARIANTS.md](./VARIANTS.md) も参照

## 基本キャラクター（各1ファイル）

| ID | キャラクター | 指示書 | 描画の特徴 |
| --- | --- | --- | --- |
| `hero` | 主人公 | [hero.md](./prompts/hero.md) | 盾・片手剣・マント |
| `knight` | 錆びた騎士 | [knight.md](./prompts/knight.md) | 錆びた剣・甲冑 |
| `slime` | 残響スライム | [slime.md](./prompts/slime.md) | 青緑のゲル・核 |
| `rogue` | 影の暗殺者 | [rogue.md](./prompts/rogue.md) | フード・素早い一撃 |
| `duelist` | 紅刃の剣士 | [duelist.md](./prompts/duelist.md) | 双剣・左右非対称 |
| `wraith` | 塔の亡霊 | [wraith.md](./prompts/wraith.md) | 浮遊ローブ・爪 |
| `cantor` | 残響の詠み手 | [cantor.md](./prompts/cantor.md) | 術式・発光する手 |
| `sentinel` | 鉄壁の番兵 | [sentinel.md](./prompts/sentinel.md) | 大盾・重甲冑 |
| `clockwork` | 時計仕掛けの兵士 | [clockwork.md](./prompts/clockwork.md) | 真鍮機構・歯車 |
| `guardian` | 鐘楼の守護者 | [guardian.md](./prompts/guardian.md) | 大剣・巨体・角兜 |

同じ系統でも別名の個体は [VARIANTS.md](./VARIANTS.md) の差分指示を必ず追加で読む。

## 参照画像の所在・受け渡し

- **採用前**: チャット内で画像を提案・比較する。GitHubには保存しない。
- **採用後**: 人が `assets/character-art/references/<キャラID>/approved.png` をアップロード。必要に応じて同じフォルダに `notes.md` で「どの点を採用したか」を記録。
- 選別・画像のアップロード手順: [参照画像README](../../assets/character-art/references/README.md)
- SVGの出力先・パーツ名は [SVG_SPEC.md](./SVG_SPEC.md) に記載。

**注意:** このGitHubディレクトリにあるのは *指示書* です。実際の採用画像がまだ存在しない場合、画像生成を済ませたことにはなりません。
