# パリィの塔 — キャラクターアート制作の入口

画像生成担当とSVG制作担当は**このREADMEだけを入口**にする。作業は必ず既存の [Draft PR #28](https://github.com/donald-shrimp/parry-tower/pull/28)（ブランチ `experiment/character-art-canvas-v1`）にまとめ、別PRも `main` へのマージも行わない。

## 重要：設定画とSVG下絵は別の成果物

**新方式（2026-10-18改訂）**:

`設定画（任意）→ ユーザーが意匠を採用 → ゲーム用の簡略立ち絵を1枚生成 → ユーザーが下絵を採用 → 下絵の原寸PNGをGitHubへ登録 → SVG化 → ブラウザの実画面で検証 → ユーザーがSVGを採否判断`

設定画に含まれる三面図・装備アップ・細密情報をそのままSVGへ転写しない。ユーザーが採用した**設定画**と**SVG下絵**と**実装SVG**はそれぞれ別に承認する。

| 役割 | 読むファイル | 作成するもの | ユーザーへの確認 |
| --- | --- | --- | --- |
| 設定画生成（任意） | [CONCEPT_GUIDE](./CONCEPT_GUIDE.md) と対象 `prompts/<id>.md` | 世界観・装備の設定画 | 意匠を採用するか |
| **SVG下絵生成（必須）** | [SVG_BASE_GUIDE](./SVG_BASE_GUIDE.md) と対象 `prompts/<id>.md` | **背景なし・1体・全身・簡略化した1枚の立ち絵** | 下絵を採用するか |
| SVG制作 | [SVG_SPEC](./SVG_SPEC.md) と対象 `prompts/<id>.md` | パーツ別SVG・manifest・ゲームでの試験表示 | SVGを採用するか |

## 別チャットへの短い指示

**主人公の簡略立ち絵を再生成:**
> [このREADME](./README.md)、[SVG_BASE_GUIDE](./SVG_BASE_GUIDE.md)、[hero.md](./prompts/hero.md)、[hero-svg-base.md](./prompts/hero-svg-base.md)を読んで。今回は主人公の**SVG下絵を1枚だけ生成**して。絵を見て採否を伝えるので、SVG化もGitHub登録もしないで。

**別のキャラの簡略立ち絵を生成:**
> このREADMEとSVG_BASE_GUIDE、対象のprompts/<id>.mdを読んで、ゲーム用の簡略立ち絵1体を1枚生成して。設定画や複数角度は出さず、採否待ちで止めて。

**SVG制作エージェント:**
> このREADMEとWORKFLOW、SVG_SPEC、対象のprompts/<id>.mdを読んで。ユーザーが承認した`assets/character-art/references/<id>/svg-base-approved.png`を**実際に開いて確認**し、パーツ別SVGとmanifestにして。同じDraft PR #28を更新し、旧表示は残す。画像がない・読めない場合は制作せず確認して。切り欠け・盾の欠落がないように、待機／パリィ／攻撃／反動のレンダリング画像を検査して。

> 注: 他チャットから相対リンクが解決できない場合は、[GitHub上の本README](https://github.com/donald-shrimp/parry-tower/blob/experiment/character-art-canvas-v1/docs/character-art/README.md)を開いてリンクを辿る。

## 基本キャラクター別指示書

| ID | 名称 | キャラ固有の設計書 |
| --- | --- | --- |
| `hero` | 主人公 | [hero](./prompts/hero.md) / **[簡略立ち絵用プロンプト](./prompts/hero-svg-base.md)** |
| `knight` | 錆びた騎士 | [knight](./prompts/knight.md) |
| `slime` | 残響スライム | [slime](./prompts/slime.md) |
| `rogue` | 影の暗殺者 | [rogue](./prompts/rogue.md) |
| `duelist` | 紅刃の剣士 | [duelist](./prompts/duelist.md) |
| `wraith` | 塔の亡霊 | [wraith](./prompts/wraith.md) |
| `cantor` | 残響の詠み手 | [cantor](./prompts/cantor.md) |
| `sentinel` | 鉄壁の番兵 | [sentinel](./prompts/sentinel.md) |
| `clockwork` | 時計仕掛けの兵士 | [clockwork](./prompts/clockwork.md) |
| `guardian` | 鐘楼の守護者 | [guardian](./prompts/guardian.md) |

派生敵は [VARIANTS](./VARIANTS.md) も読む。キャラ別ファイルに以前の「画像生成用指示」が残っている場合、**現在の生成モードの CONCEPT_GUIDE / SVG_BASE_GUIDE が出力形式に優先**する。

## 参照素材の名前と配置

[アップロード手順](../../assets/character-art/references/README.md)

- `references/<id>/concept-approved.png` — **意匠設定画**の採用版（任意）。直接のSVG作画開始根拠にしない。
- `references/<id>/svg-base-approved.png` — **簡略立ち絵**の採用版（SVG化開始に必須）。
- `references/<id>/notes.md` — 採用内容・差し戻し履歴・元画像との違い・参照の優先順位。
- 旧 `references/hero/approved.png` は**設定画からの低解像度切り出し（128×120px）で、新方式の下絵に該当しない**。

## 主人公の現状

2026-10-18、**設定画は採用済み**。一方、設定画から作ったSVG実装はユーザーから**「全体的に微妙、盾が切れる」**と不採用評価を受け、**要再制作・現在のSVGは旧比較用のみ**。現行の `?art=svg` も完成品ではない。新しい `hero/svg-base-approved.png` は**未登録**で、SVG担当は再制作に進まないこと。

[制作フロー・承認ゲート](./WORKFLOW.md) / [共通美術スタイル](./STYLE_GUIDE.md) / [SVG制作仕様](./SVG_SPEC.md)