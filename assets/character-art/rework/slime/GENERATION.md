# 残響スライム 原画案（2026-10-19）

- 状態：今回の全キャラ制作依頼に従い、元PNGを分割して可動化レビュー候補として実装。最終採否は帰宅後のユーザー判断。
- ツール：built-in image_gen、参照付き生成、transparent_background=true。
- 保存：slime-ready-candidate.png、1445×1088、8-bit RGBA。
- SHA-256：70d007d553390765cf968ce153d07b7b654c01fd8e106d016a6432bd099de909
- 生成元：C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-f3a81ced-a835-4fb1-a1b1-f9963e69b161.png
- 参照：../knight/knight-ready-candidate-v3.png と ../hero/hero-ready-candidate.png。線・塗りの参照であり、騎士の装備をそのままコピーする指示ではない。
- 方向：画面右側から主人公のいる画面左へ。主人公がほぼ定位置で受ける既存のゲーム設計に合わせ、敵が接近して攻撃する前の構え。
- 検品：単体全身、攻撃部位・布・足（ある場合）が欠けない、背景・文字・UIなし。PNGアルファと余白を別途検査。
- 比較：art-preview.htmlで原画・部品・骨格・スロー・動作を確認でき、art=illustratedの実戦にも接続。下部の原画一覧から選択可能。

## プロンプト

```text
Use case: stylized-concept. Asset type: ONE assembled, full-body combat-ready enemy illustration for the 2D side-view game Parry Tower, for later direct source-PNG cutout animation.
The two attached images are STYLE REFERENCES: image 1 the rusty red knight, image 2 the silver/blue player hero. Match this EXACT cohesive visual family: confident thick irregular near-black ink contour, sharp angular folds, restrained hand-painted cel shading with some painterly chipped/worn edges, weighted dark shadow shapes, medium stylized proportions, strong readable silhouette. The user specifically likes this illustration style and rejected simple geometric vector/icon art. Match their line character and painting density, not their armor or pose.
Orientation: this ENEMY stands at screen RIGHT and faces the HERO at screen LEFT. Head, chest and body all face LEFT consistently in a three-quarter left-facing view. The hero holds ground; this enemy will approach/lunge LEFT. Draw a neutral combat-ready pose, with energy stored for its particular attack, not an attack already fully extended and not a decorative front-facing stand.
Output: ONLY ONE character/creature on a truly transparent RGBA background. All body parts, weapon tips, cloth tips and feet (if any) fully inside frame with generous safe margins. No ground plane or cast shadow. No text, lettering, labels, swatches, sprite sheet, panel, borders, UI, extra figures, scenery, magical circles or aura backgrounds. Clean isolated painted illustration with clear cutout boundaries. Do not render 3D, photoreal, anime cute, flat geometric vector or a muddy black silhouette. Dark parts remain readable through plane shading.
Subject: ECHO SLIME, the first non-humanoid monster, a dangerous blue-green gel mass with an ominous dense dark core. It must contrast clearly with armored humanoids while belonging to the same illustrated world.
Shape/material: broad low pear-shaped/mounded body with a bulging hunched rear at screen-right, flattened weight-bearing underside, a thick continuous leading pseudopod projecting toward screen-LEFT. Organic asymmetrical lobes and a few pointed viscous edges; no bones, legs, arms, hands or held weapons. Paint gel with broad dark teal and pale mint planes, sharp pale emerald reflected highlights and substantial ink outlines; suggest dense translucent material through layered colour rather than making the entire body invisible. Rich painterly shading matching the references, no plastic 3D gloss. An irregular dark charcoal/blue-green nucleus is clearly suspended toward the center/front; two small pale mint hostile eyes gaze LEFT, no happy smile, no cartoon mouth. The single main front lobe should be broad and blunt enough to read as the source of a future body-lunge attack, not a separate knife or long tentacle.
Combat-ready pose: body is compressed into a loaded crouch, weight gathered in the tall rear on the right, leading pseudopod bent and pointed left just a little ahead of the core. The attack will squish back right then extend the whole mass left. Leave enough body volume to stretch and recoil; avoid a perfectly symmetrical round jelly. The core and eyes are separable interior landmarks, not floating outside the body. Keep a coherent closed silhouette: no cloud of particles, bubbles, fog, scattered droplets, floating crystals or detached effects. Scale as a substantial early enemy, threatening but not a giant boss. Wide framing suitable for a low creature with room above and below.
```
