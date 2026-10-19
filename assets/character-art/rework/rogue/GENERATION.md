# 影の暗殺者 原画案（2026-10-19）

- 状態：今回の全キャラ制作依頼に従い、元PNGを分割して可動化レビュー候補として実装。最終採否は帰宅後のユーザー判断。
- ツール：built-in image_gen、参照付き生成、transparent_background=true。
- 保存：rogue-ready-candidate.png、1445×1088、8-bit RGBA。
- SHA-256：f16e4a87cab1f768c1cef514943d6c29e5076e063118cfd3b985f2069d6ca4be
- 生成元：C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-719bfd0a-b8de-43cc-9155-0b1d0e6677f7.png
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
Subject: SHADOW ASSASSIN, a swift slim hooded medieval dark-fantasy enemy carrying ONE dagger. Not a knight recolour: lighter, leaner and lower than the reference knights, with roughly 4-head stylized proportions.
Design: small pointed deep-indigo hood; face largely hidden by a dark cloth mask and hood shadow, only two fine dim pink eye slits visible looking LEFT. Layered charcoal, dark plum and navy cloth, practical weathered dark brown leather bracers and boots, a few dull small iron buckles, one muted burgundy sash and torn diagonal waistcloth. Sleeveless/short cloak with strong angular ragged ends flowing behind toward screen-RIGHT. Hand-painted cloth folds and leather edge wear with the same bold irregular near-black outlines as the knight. No huge plate pauldrons, no armor suit, no superhero bodysuit, no modern ninja, no gun, no excessive belts or decorative jewelry.
Combat-ready pose: athletic LOW crouch aimed LEFT, compact head and torso leaning into the attack direction, stable wide staggered boots both planted on the same baseline. Screen-left forward knee bent; screen-right rear leg braces, torso and pelvis both turn left rather than chest square to camera. Weapon is in anatomical RIGHT hand on the far side: elbow bent and pulled back toward screen-right beside the ribs/shoulder, clearly connected shoulder-upperarm-elbow-forearm-gauntlet. A single practical short SILVER dagger, simple worn guard and dark handle, standard forward grip, blade axis pointing LEFT, held at upper-waist/chest height poised for a straight thrust. Keep the dagger tip readable with a narrow negative-space gap from the torso/hood. The nearer anatomical LEFT hand is empty and held forward in a natural open counterbalance/guard, fingers anatomically plausible and not fused. ONE dagger only, no second blade hidden in the other hand. Show both shoulder/elbow paths clearly so thrusting and recovering can be cut into articulated parts. Cape stays behind arms, never threads between the hand and weapon. No running stride or acrobatic leap. No attack lines or magical weapon glow. Strong sharp silhouette, lively and dangerous rather than bulky.
```
