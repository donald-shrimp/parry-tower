# 塔の亡霊 原画案（2026-10-19）

- 状態：今回の全キャラ制作依頼に従い、元PNGを分割して可動化レビュー候補として実装。最終採否は帰宅後のユーザー判断。
- ツール：built-in image_gen、参照付き生成、transparent_background=true。
- 保存：wraith-ready-candidate.png、1445×1088、8-bit RGBA。
- SHA-256：882ad925956998f8f8abfbb453f9dedd1de21de5ccb541b1cc62fefc288845e8
- 生成元：C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-f96ab3ec-e756-43f1-a1db-273108502174.png
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
Subject: TOWER WRAITH, a floating hooded claw-attacking spirit. It must be visibly different from an armored knight, human assassin, or spell-casting mage.
Design: a narrow crooked hood and long tapered robe with asymmetric angular tattered edges; shoulder width slender, arms unusually long but with clear anatomical shoulder and elbow landmarks. Deep midnight-blue and muted blue-violet outer cloth, dusty grey-blue fold planes, a few restrained pale icy edges. Hood interior nearly black with TWO thin cyan eye lights looking LEFT; no detailed human face, skull spectacle, severed head, gore or exposed organs. No ornate crown, armor, sword, shield, staff, book, orb or casting sigils. A small worn clasp is enough. Match the reference knight's thick irregular contour, rich ink shadow masses and convincing painted cloth folds.
Combat-ready pose: whole hood/chest/robe turn LEFT in a forward-floating threat; shoulders hunched and one near claw arm poised just ahead of the chest with elbow still BENT, not fully lunging. The nearer anatomical LEFT arm reaches somewhat toward screen-left, bent at the elbow; a pale ash-blue skeletal/gaunt hand with five readable elongated pointed claw fingers is the clear attack landmark, oriented toward the hero. Keep a clear negative-space wedge between forearm and torso so the entire shoulder-elbow-claw chain can later extend LEFT and recover. The far arm is drawn slightly back at the opposite side, hand and forearm distinguishable from cloth. Both arms must grow from real separate shoulders; no extra limbs or fingers.
Lower half: NO boots, feet or separate legs. Continuous hanging robe tapers into two or three long torn cloth tails, lifted slightly upward/back toward screen-RIGHT by the spirit's forward intent. Floating pose with coherent opaque painted forms and crisp boundaries; no wispy smoke, particle cloud, giant aura, glowy fog or cut-off transparency used to hide the hem. The attack will draw the shoulder back then extend the claw forward while the robe follows, so hands/claws and the hem need clean complete silhouettes. Full hood, both arms, all five fingers on the visible hand and all cloth tails within frame with safe margins. A menacing illustrated spectral enemy, not a cute ghost.
```
