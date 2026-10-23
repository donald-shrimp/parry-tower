# dirgekeeper 立ち絵修整候補 v2

> 2026-10-23 整理：この制作記録の旧案PNGは `.local-only/archive/old-art-2026-10-23/` 内へ元の相対パスで保管。現在の採用画像は `pixel-candidates/manifest.json` を参照。過去の入力・出力名は制作履歴として残す。

- 2026-10-19、ユーザーのGoogleスライド内メモをもとに内蔵image_genで編集。
- 対象：左手の剣の握り、掌・親指・手首と腕のつながりを部分修整。
- 採否：ユーザーレビュー待ち。モーション未変更、ゲーム参照は旧原画のまま。
- 元原画：C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/dirgekeeper/dirgekeeper-ready-candidate.png
- 元原画SHA-256：9c0cb3224bea047c687390684100cd2b9e41a31a66298d42cea02912e2eafedb
- 修整候補：C:/Users/EBIHARA/Downloads/parry-tower/parry-tower/assets/character-art/rework/dirgekeeper/dirgekeeper-ready-anatomy-v2.png
- 候補SHA-256：3d4dae8d42db2ea2fa53a1a3d3fdc55b9120edb668f9dcaa2c374b9d939bb8c2
- 元出力：C:\Users\EBIHARA\.codex\generated_images\01a14eca-fa97-7c20-969b-027e55d374eb\exec-e7b0ef04-d92a-48af-a317-2ff46d0211cd.png
- 寸法：1445 × 1088
- 透明背景：true
- 比較ページID：repair_dirgekeeper_v2

## 完全な編集プロンプト

```text
Use case: precise-object-edit. Input image 1 is the EDIT TARGET, an already approved design, not a loose style reference. Make a SMALL anatomical correction to this exact full-body game character illustration. Preserve the thick irregular black ink contour, angular weathered painted shading, exact character identity, palette, armor, helmet, weapon design, cloth details, planted legs, silhouette, framing and leftward facing battle-ready pose.
Correct the raised sword-gripping hand at upper screen-right: it must read unmistakably as the character's ANATOMICAL LEFT HAND, connected through a believable left wrist, forearm, elbow and shoulder. The existing image mistakenly uses a right-hand-looking grip. Redraw the small gauntlet/grip region so the curled PALM-SIDE finger segments and natural opposed thumb face the viewer in this bent left-arm pose, rather than a right-handed dorsal knuckle/back-of-hand plate. Four fingers wrap around the hilt and the thumb closes naturally on the opposite side. Make any very small wrist/forearm rotation or shoulder/upper-chest perspective adjustment needed so there is ONE left sword arm and ONE right forward arm, no doubled right hands. The head/upper chest/pelvis should coherently face three-quarter screen-left, with the far shoulder receding; preserve the existing cool pose rather than invent a new pose. Keep sword position/angle, elbow height, feet and all equipment nearly identical. Do NOT mirror the whole picture, swap weapon placement, add fingers/limbs, add objects, redesign the costume or replace the illustration style.
Output ONE complete assembled full-body character PNG on truly transparent RGBA background, preserve clean edges and adequate padding for sword/cape/feet. No scenery, floor, cast shadow, text, labels, before-after collage or separated parts. Preserve transparency.
Character-specific invariants: Keep the forward open ANATOMICAL RIGHT gauntlet at screen-left exactly as is; the farther raised sword arm is the ANATOMICAL LEFT arm. Preserve purple hood and ragged priest cloth, ivory chipped plate, hanging brass bells, narrow visor and the one silver straight sword with bell at its guard.
```
