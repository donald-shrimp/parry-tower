# パリィの塔 — キャラクターアート制作の入口

画像生成担当とSVG制作担当は**このREADMEだけを入口**にする。作業は必ず既存の [Draft PR #28](https://github.com/donald-shrimp/parry-tower/pull/28)（ブランチ `experiment/character-art-canvas-v1`）にまとめ、別PRも `main` へのマージも行わない。

## SVG下絵の方向性：幾何学的フラットデザイン（2026-10-18再訂正）

**[FLAT_VECTOR_SPEC.md](./FLAT_VECTOR_SPEC.md) がSVG下絵の画風を最優先で定義する。** 既存の「3/4視点」「フラットセル塗り」「影1段階」などではまだ装飾されたイラストになってしまうため、下絵段階では禁止。

- 大きな単色図形20〜30個程度、4色まで＋必要ならアクセント1色、一定幅の輪郭線
- **影0、グラデーション0、金属光沢0、細部装飾0**。小さな線の描き込みも原則なし
- 正面寄りの平面的な2D表現、盾・剣・マント・足を単純な図形として分離し、周囲に15%程度の余白
- 「デフォルメ騎士の綺麗なイラスト」ではなく「図形だけで描けるボードゲームの駒／ピクトグラム」

以前の画像生成ではこの違いを指示しきれず、結果が細密なSD騎士になった。**その生成画像は新下絵として未採用**。旧SVGも不採用の比較用に留める。

## 重要：設定画とSVG下絵は別の成果物

**新方式（2026-10-18改訂）**:

`設定画（任意）→ ユーザーが意匠を採用 → ゲーム用の簡略立ち絵を1枚生成 → ユーザーが下絵を採用 → 下絵の原寸PNGをGitHubへ登録 → SVG化 → ブラウザの実画面で検証 → ユーザーがSVGを採否判断`

設定画に含まれる三面図・装備アップ・細密情報をそのままSVGへ転写しない。ユーザーが採用した**設定画**と**SVG下絵**と**実装SVG**はそれぞれ別に承認する。

| 役割 | 読むファイル | 作成するもの | ユーザーへの確認 |
| --- | --- | --- | --- |
| 設定画生成（任意） | [CONCEPT_GUIDE](./CONCEPT_GUIDE.md) と対象 `prompts/<id>.md` | 世界観・装備の設定画 | 意匠を採用するか |
| **SVG下絵生成（必須）** | **[FLAT_VECTOR_SPEC](./FLAT_VECTOR_SPEC.md)** ＋ [SVG_BASE_GUIDE](./SVG_BASE_GUIDE.md) と対象 `prompts/<id>.md` | **背景なし・1体・全身・簡略化した1枚の立ち絵** | 下絵を採用するか |
| SVG制作 | [SVG_SPEC](./SVG_SPEC.md) と対象 `prompts/<id>.md` | パーツ別SVG・manifest・ゲームでの試験表示 | SVGを採用するか |

## 別チャットへの短い指示

**主人公の簡略立ち絵を再生成:**
> このREADMEと **[FLAT_VECTOR_SPEC](./FLAT_VECTOR_SPEC.md)**、[SVG_BASE_GUIDE](./SVG_BASE_GUIDE.md)、[hero-svg-base](./prompts/hero-svg-base.md)を読んで、**影も質感もない幾何学的フラットデザイン**の主人公を1枚生成して。装備と全身が約30個の単純図形で説明できるように。採用するか判断するまで、SVG化もGitHub登録もしないで。

**別のキャラの簡略立ち絵を生成:**
> このREADMEと **FLAT_VECTOR_SPEC**、SVG_BASE_GUIDE、対象のprompts/<id>.mdを読んで、**図形20〜30個程度・影なし・輪郭線一定の幾何学的フラットデザイン**で1体を1枚生成して。イラスト風の陰影や装飾は禁止。採否待ちで止めて。

**SVG制作エージェント:**
> このREADMEと **FLAT_VECTOR_SPEC**、WORKFLOW、SVG_SPEC、対象のprompts/<id>.mdを読んで。ユーザーが承認した`assets/character-art/references/<id>/svg-base-approved.png`を**実際に開いて確認**し、パーツ別SVGとmanifestにして。同じDraft PR #28を更新し、旧表示は残す。画像がない・読めない場合は制作せず確認して。切り欠け・盾の欠落がないように、待機／パリィ／攻撃／反動のレンダリング画像を検査して。

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

## フラットなSVG主人公の比較試作（採否未確定）

2026-10-18の会話中に作成した手描きSVGを[assets/character-art/svg/hero-flat.svg](../../assets/character-art/svg/hero-flat.svg)として保存した。**これは「原寸の採用画像の再トレース」でも最終採用版でもない、候補を試すための実験**。候補PNGの正式登録や旧SVGの上書きはまだ行わない。

- **新・フラットSVG試作**: `http://127.0.0.1:8000/dev.html?floor=2&enemy=knight&art=flat`
- **従来Canvas試作**: `http://127.0.0.1:8000/dev.html?floor=2&enemy=knight&art=prototype`
- **以前の不採用SVG**: `http://127.0.0.1:8000/dev.html?floor=2&enemy=knight&art=svg`
- **現行既定表示**: `http://127.0.0.1:8000/dev.html?floor=2&enemy=knight`

フラットSVGは7グループのパーツを独立描画し、盾・剣・頭・マントが簡単に動く。元の攻撃時計・命中判定・データに変更はない。**ユーザーがゲーム画面で可視範囲と動きを目視確認するまでは採用しない**。詳細は [フラット試作の説明](../../assets/character-art/svg/HERO_FLAT_EXPERIMENT.md)。

## 静止画トレース：原画との比較（工程1〜4）

元画像の輪郭を色領域として抽出した新しい静止SVGを追加した。従来の `?art=flat` は**不採用の比較用として維持**し、現在はまだゲームに組み込まない。

- [静止SVGと検証手順](../../assets/character-art/tracing/hero/README.md)
- [今回の静止SVG](../../assets/character-art/tracing/hero/hero-static.svg)

静止画を元絵と比較して**ユーザーが承認した後**にだけ、可動パーツの分割へ進む。
