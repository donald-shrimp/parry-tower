# clockwork 原画・可動化レビュー候補

- 最新ユーザー指示に従い制作・ゲーム実装。採否は帰宅後のユーザーレビュー待ち。
- built-in image_gen、transparent_background=true、参照付き生成。
- 保存：clockwork-ready-candidate.png、1445×1088 RGBA。
- 元出力：C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-71b34fd4-fa3e-40f3-9fcf-c9c13cd84553.png
- SHA-256：812ea31fd895bc10c83970ed9397f52a33cb21d971a249d34f0783543c316107
- 画風参照：../knight/knight-ready-candidate-v3.png
- 原画を直接分割し、原画自体は保持。

## 完全なプロンプト

```text
Use case: stylized-concept. Asset type: ONE assembled full-body combat-ready enemy illustration for Parry Tower, later animated by directly masking THIS PNG into connected parts.
The attached rusty knight image is the STYLE REFERENCE ONLY. Match its thick irregular black ink contour, crisp angular painted cel shading, weathered metal and sharp torn cloth, strong near-black shadows, and roughly four-head stylized dark-fantasy proportions. Maintain the same professional illustrated visual family, no simple geometric/vector substitute.
ENEMY at screen RIGHT facing screen LEFT. Head, torso, pelvis and feet consistently face left in a natural three-quarter left battle view. Stable wide planted stance, BOTH feet on the same ground baseline; no running step. Or float if explicitly specified below. This is the cool original READY stance before an attack, not a fully extended attack. Full silhouette wholly inside frame with at least 50px padding around every blade, limb and cloth tip. Truly transparent RGBA background, no cast shadow/ground/scenery, no text/UI/borders, no extra characters, not an atlas or separated parts sheet.
Make cutout animation practical: shoulder to upper arm to elbow to forearm to hand clearly connected and readable, weapon gripped naturally and aligned with fingers. Keep weapon and hand silhouettes clear from face, torso and trailing cape. Only the natural arm overlaps its shoulder; blade never crosses the torso or other arm in the ready pose. Cape hangs behind the body and arms, no thin cloth strand weaving through hands. Keep good negative space between upper arm and torso where possible. No magical aura background.

Subject:
CLOCKWORK INFANTRY: weathered brass-and-iron automaton soldier with a small angular closed medieval bronze helmet, narrow cyan slit eye looking LEFT, exposed toothed gears embedded in chest, cylindrical piston joints at elbows, worn cream-metal armor and dark leather joint bellows. TWO planted articulated boots in wide stable guard. ONE horizontal telescoping mechanical lance integrated into nearer LEFT forearm, pointing screen-left at chest height; sharpened triangular silver spear tip at screen-left is entirely in empty space, retracted piston and large elbow beside lower ribs visible, weapon forearm not crossing torso. Far RIGHT arm flexed back in counterbalance, empty metal hand. Gears have a clear circular silhouette on broad breastplate, not a sci-fi robot. No tower shield, no sword, no gun. Short torn brown waistcloth only, no long cape. Build a distinctive medieval clockwork soldier, not generic knight recolour.
```
