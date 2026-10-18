# パリィの塔 — キャラクターアート制作入口

**別のエージェントには、このREADMEのURLと対象キャラIDだけを渡せばよい。** まずユーザーが希望する工程とそのキャラの採用状況を確認する。画像生成・SVG制作・ゲーム実装は**同じターンで無断で連続実行しない**。採用ゲートで止まる。

> 実装先: [Draft PR #28](https://github.com/donald-shrimp/parry-tower/pull/28) / ブランチ `experiment/character-art-canvas-v1`。別PRや`main`へのマージはユーザーの明示指示がない限り行わない。

## 確定した制作方式（2026-10-18）

**ポーズを決める → SVG化しやすい原寸PNGを1枚生成 → 人間が採用 → 原寸PNGを保存 → 色面を自動トレース → 静止SVGを元PNGと重ねてレビュー → 身体・武器などをマスク分割してリグ化 → ゲーム内で動作プレビュー → 人間がアニメーションを採用**。

最初からJSの図形を目測で配置して立ち絵を作り直さない。**原画の輪郭と色をSVGで保ってから、アニメーションする**。主人公ではこの方式が良好だった。

- **[PIPELINE.md](./PIPELINE.md)** — エージェントの工程・成果物・承認ゲート・GitHub更新手順（最優先）
- **[TRACING_AND_RIGGING.md](./TRACING_AND_RIGGING.md)** — OpenCVトレース、静止重ね合わせ、可動部位抽出と可動テスト
- [POSE_GUIDE.md](./POSE_GUIDE.md) — 最初から武器や攻撃部位を構え、肩・肘・核などの可動を成立させる
- [FLAT_VECTOR_SPEC.md](./FLAT_VECTOR_SPEC.md) — フラットな輪郭・配色。**図形数は上限ではない**。原画忠実度を優先
- [SVG_BASE_GUIDE.md](./SVG_BASE_GUIDE.md) — 生成画像の構図とNG集
- [SVG_SPEC.md](./SVG_SPEC.md) — SVG・Canvas可動層・ピボット・viewBoxの品質基準
- [WORKFLOW.md](./WORKFLOW.md) — 短い運用チェックリストと失敗例
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) — キャラ造形の共通方向性
- [CONCEPT_GUIDE.md](./CONCEPT_GUIDE.md) — 多面図などの設定画（任意）。**ゲーム用下絵とは別**。

## 主人公は採用済みの基準実装

**主人公の外観・構え・反撃の逆回転360°は2026-10-18にユーザーが正式採用。**

- 採用デザイン：白銀の兜・青いマント・金縁の青盾・肩横に剣を掲げた戦闘待機姿勢。
- **標準モーション `?art=ready`**：肩を**−360°（−2π）**回し、肘・前腕・握った剣を連動させて振り抜く。戦闘側の240msの表示ウィンドウを維持。
- 比較用 `?art=ready&spin=360`（正回転）、`?art=ready&spin=legacy`（小振り）。`spin=-360`は明示指定でも標準と同じ。
- **[採用主人公の制作メモ](../../assets/character-art/tracing/hero/READY_POSE.md)**、[清書静止SVG](../../assets/character-art/tracing/hero/hero-ready-static.svg)、[動作比較ページ](../../assets/character-art/tracing/hero/ready-preview.html)、[実装](../../assets/character-ready.js)、[関節記録](../../assets/character-art/tracing/hero/ready-manifest.json)を**成功事例**として読む。
- 旧`?art=svg`、`?art=flat`、`?art=trace`は試作の比較・履歴であって、本仕様ではない。主人公`?art=ready`は**ブランチ内の採用仕様**であり、`main`にマージされたわけではない。
- 注意：主人公の採用PNG原本（1402×1122）は**GitHub未登録**。基準画像が必要ならユーザーが会話で承認した元添付を確認する。古い`hero/approved.png`（128×120）を使わない。

**重要：−360°は主人公に限る。** 敵の攻撃には一律適用しない。敵は`assets/game.js`と`assets/enemy-motions.js`の**攻撃方向・届く座標・予備動作・タイミング**からモーションを設計する。

## 錆びた騎士 `knight` — A/B採用、C試作、D目視レビュー待ち

2026-10-18にユーザーが**赤い古布・単色の錆面・片手剣と盾**を備えた戦闘待機PNGを採用。その原寸画像からトレースした静止SVGも確認済みとして**フェーズA/Bは承認**され、可動化を依頼された。

- 静止SVG: [knight-static.svg](../../assets/character-art/tracing/knight/knight-static.svg)
- マスク分割と関節モーション: [character-knight.js](../../assets/character-knight.js)
- [モーション確認ページ](../../assets/character-art/tracing/knight/preview.html) / [rig manifest](../../assets/character-art/tracing/knight/knight-manifest.json)
- 独立ゲーム試験: `dev.html?floor=2&enemy=knight&art=knight-trace`
- 原画1254×1254 PNGは**会話成果物にあり、GitHubには未登録**（バイナリ転送未実施）。トレースSVGのみGitHub登録済み。詳細は[knight制作記録](../../assets/character-art/tracing/knight/README.md)を参照。
- ゲームの既存の戦闘判定・時計・接触距離は変更していない。主人公の`?art=ready`と反撃−360°も変更なし。
- **フェーズDは人間の動作採用待ち**。プレビューは自動テスト合格と別に実機目視が必要。Draft PR #28を維持し、自動マージしない。

## 次の対象：錆びた騎士 `knight`

次のキャラ用の指示書：**[騎士の個別指示書](./prompts/knight.md)** / **[騎士のSVG下絵用完成プロンプト](./prompts/knight-svg-base.md)**。

**別チャットで画像生成を依頼する文**：
> この [README](./README.md) と [PIPELINE](./PIPELINE.md)、[POSE_GUIDE](./POSE_GUIDE.md)、[knight-svg-base](./prompts/knight-svg-base.md) を読んで。錆びた騎士`knight`の**戦闘待機ポーズのPNGを1枚**生成して見せて。元PNGの採否を伝えるまでは、GitHub登録・トレース・実装に進まないで。

**PNG採用後のSVG制作を依頼する文**：
> このREADMEと[PIPELINE](./PIPELINE.md)、[TRACING_AND_RIGGING](./TRACING_AND_RIGGING.md)、[SVG_SPEC](./SVG_SPEC.md)、対象の`prompts/<id>.md`を読んで。承認済みの**原寸PNGを実際に開いて**、元画像と同じ輪郭の静止SVGを作り、等寸重ね合わせ画像と96px/128pxプレビューを出して。**静止画の採用確認で止めて**。

**静止SVG採用後の可動化を依頼する文**：
> このREADMEとPIPELINEとTRACING_AND_RIGGINGを読んで。採用済み静止SVGを使って、部位を**マスク分割（または必要な個別SVGへ分割）**し、関節・親子関係・攻撃先端を元ゲームへ合わせて、**Draft PR #28に独立試験モードで実装**して。待機・予備・攻撃・接触・戻りの比較とテストを提出して。ユーザーの採否判断まで既存描画は残して。

## キャラクター別指示書

| ID | 対象 | 指示書 |
| --- | --- | --- |
| `hero` | 主人公・採用済み | [hero.md](./prompts/hero.md) / [svg-base](./prompts/hero-svg-base.md) |
| `knight` | 錆びた騎士・次の推奨対象 | [knight.md](./prompts/knight.md) / [svg-base](./prompts/knight-svg-base.md) |
| `slime` | 残響スライム | [slime.md](./prompts/slime.md) |
| `rogue` | 影の暗殺者 | [rogue.md](./prompts/rogue.md) |
| `duelist` | 紅刃の剣士 | [duelist.md](./prompts/duelist.md) |
| `wraith` | 塔の亡霊 | [wraith.md](./prompts/wraith.md) |
| `cantor` | 残響の詠み手 | [cantor.md](./prompts/cantor.md) |
| `sentinel` | 鉄壁の番兵 | [sentinel.md](./prompts/sentinel.md) |
| `clockwork` | 時計仕掛けの兵士 | [clockwork.md](./prompts/clockwork.md) |
| `guardian` | 鐘楼の守護者 | [guardian.md](./prompts/guardian.md) |

派生敵は [VARIANTS.md](./VARIANTS.md) も読む。個別指示書に古い「中立ポーズ」「3/4の陰影イラスト」等が残る場合は、**PIPELINE／POSE_GUIDE／SVG_BASE_GUIDEが優先**。ブランチの更新は履歴を壊さない通常コミットとし、マージはユーザーが指示する。
