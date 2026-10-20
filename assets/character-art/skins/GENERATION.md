# Hero skin artwork, 2026-10-20

Local artwork and motion review. The accepted normal hero, enemies and saved
motion project are unchanged. All variants use the production seven-part rig.

- Chick: the existing fine-pixel parts receive a cached yellow HSL filter,
  preserving their lightness/alpha/contours. The 6px-grid chick is a code-native
  ornament drawn inside the helmet/body transform.
- Spacetime: the same cached filter with a bright purple hue; three deterministic
  clock outlines behind the character. No BPM effect in this phase.
- Fundoshi: built-in `image_gen.imagegen` edit, transparent background, using
  `../rework/hero/hero-ready-candidate.png` as the edit target. Copied from the
  built-in generated output into `fundoshi/hero-fundoshi-v1.png` (1445×1088).
  This is a new sibling; it does not replace the accepted source.
  `fundoshi/hero-fundoshi-fine-v1.png` applies the already-approved deterministic
  6px / 64-colour process. Run `python scripts/build-hero-skin-art.py` to rebuild
  only this new file. The original cape-under-arm patch is omitted because this
  costume has no cape. No gameplay or motion key changes.

SHA256:

- Original: `0725a5b9c4bc755a5b03d4822e55e84bd701b8d8b56a04d750b5822e7a4fb4ce`
- Fine: `d62732e8465a7e4fb741c34586f9e31706f2edb2fdb222090b7a3a79e32a6e18`

## Final built-in edit prompt

Use case: precise-object-edit. Edit target: the provided game hero sprite.
Create the FUNDOSHI costume variant for this same adult male warrior. Keep
EXACT same canvas, framing, pose, limb locations, sword grip, helmet, sword,
shield and character direction. Essential animation registration: sword tip
at about (212,68), shoulder (727,439), elbow (611,456), wrist (641,343), waist
(870,635), feet (480,1039) and (1153,1037) on the 1445x1088 original canvas.
Do not recenter or crop. Keep silver helmet with blue plume and cyan eye,
keep sword and shield exactly as reference. Remove all armor below helmet,
remove cape and blue neck/waist cloth, remove gloves and boots. Replace with
a clearly muscular bare adult male torso, bare arms/hands, bare legs/feet,
wearing an opaque vivid RED traditional fundoshi loincloth, fully covering
groin with front hanging cloth panel, nonsexual funny heroic battle skin.
Same stylized angular painted fantasy sprite with thick dark contours and
faceted shading. Raised sword arm keeps exact bent silhouette, the shield
arm stays behind shield. Legs stay in same wide lunge pose with knees and
feet at original positions. Visible bare skin golden warm tan. No additional
props. Do not move any joint, no armor on torso/arms/legs. Background must be
genuine transparent alpha, no floor, shadow or text. Output the complete single
character, full sword/shield/plume/feet all in frame.
