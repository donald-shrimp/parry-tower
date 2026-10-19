# sentinel 原画・可動化レビュー候補

- 最新ユーザー指示に従い制作・ゲーム実装。採否は帰宅後のユーザーレビュー待ち。
- built-in image_gen、transparent_background=true、参照付き生成。
- 保存：sentinel-ready-candidate.png、1445×1088 RGBA。
- 元出力：C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-648fbe11-2242-474c-9633-0e5256c2b97c.png
- SHA-256：81bbfda8349fb9d8edd05579e44a8728918ae73567f17fbeb2a3e051885f0312
- 画風参照：../knight/knight-ready-candidate-v3.png
- 原画を直接分割し、原画自体は保持。

## 完全なプロンプト

```text
Use case: stylized-concept. Asset type: ONE assembled full-body combat-ready enemy illustration for Parry Tower, later animated by directly masking THIS PNG into connected parts.
The attached rusty knight image is the STYLE REFERENCE ONLY. Match its thick irregular black ink contour, crisp angular painted cel shading, weathered metal and sharp torn cloth, strong near-black shadows, and roughly four-head stylized dark-fantasy proportions. Maintain the same professional illustrated visual family, no simple geometric/vector substitute.
ENEMY at screen RIGHT facing screen LEFT. Head, torso, pelvis and feet consistently face left in a natural three-quarter left battle view. Stable wide planted stance, BOTH feet on the same ground baseline; no running step. Or float if explicitly specified below. This is the cool original READY stance before an attack, not a fully extended attack. Full silhouette wholly inside frame with at least 50px padding around every blade, limb and cloth tip. Truly transparent RGBA background, no cast shadow/ground/scenery, no text/UI/borders, no extra characters, not an atlas or separated parts sheet.
Make cutout animation practical: shoulder to upper arm to elbow to forearm to hand clearly connected and readable, weapon gripped naturally and aligned with fingers. Keep weapon and hand silhouettes clear from face, torso and trailing cape. Only the natural arm overlaps its shoulder; blade never crosses the torso or other arm in the ready pose. Cape hangs behind the body and arms, no thin cloth strand weaving through hands. Keep good negative space between upper arm and torso where possible. No magical aura background.

Subject:
IRONWALL SENTINEL: stout heavily plated silver-blue infantry guard. Broad enclosed flat-topped helmet with narrow warm amber visor, chipped blue-gray cuirass and large angular pauldrons, faded teal cloth under armor. HUGE rectangular tower shield with worn brass cross and central boss, in the nearer anatomical LEFT hand, planted forward at screen-left. Anatomical RIGHT sword arm farther away: bent elbow raised beside/right of shoulder, ONE long worn silver straight sword held upward/back toward screen-right ABOVE the helmet, ready for a heavy overhead cut. Sword and forearm stay entirely clear of shield/head/cape. No spear. Stable low heavy stance. Different silhouette from rusty knight: much blockier, taller tower shield, short dark teal tabard, no plume.
```
