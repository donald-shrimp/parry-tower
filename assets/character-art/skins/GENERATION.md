# Hero skin artwork, 2026-10-20

Local artwork and motion review. The accepted normal hero, enemies and saved
motion project are unchanged. All variants use the production seven-part rig.

The user also requested a chick roughly the size of the hero's helmet. Its
existing pixel motif is enlarged 3× (6px → 18px cells), with resting origin
(838,34) so its feet sit on the helmet crown. It is drawn last, above all
character parts, using the edited torso's anchor. During a successful sword
counter it hops 150 source pixels upward, drifts slightly back and stretches,
then lands within the existing 240ms counter. The hop uses counter phase only;
guard/hit/idle remain seated, and pause/scrubbing are deterministic. No raster
regeneration or accepted motion-key changes are needed.

## Hand correction v2

User correction: the sword hand must show its dorsal surface. The built-in
imagegen edit of `fundoshi/hero-fundoshi-v1.png` is saved as
`fundoshi/hero-fundoshi-hand-edit-v2.png`. The builder adopts only source region
`(606,246)-(714,354)` after applying the existing v1 palette and 6px grid.
`fundoshi/hero-fundoshi-fine-v2.png` is the active runtime asset; every pixel
outside that hand region is identical to fine-v1. No motion/mask/joint changes.
SHA256 fine-v2: `1fcf6fb6f2c9495fbfc76df4c69d0f2aa36d5fbb4ebee3d336457933c1b9255b`.

Built-in edit prompt:

> Precise local anatomy correction. Edit target is this transparent 1445x1088
> game hero sprite. Change ONLY the sword-gripping right hand in the small area
> x=610..712, y=245..350. The visible surface MUST be the BACK OF THE HAND
> (dorsal surface), with knuckles and the backs of curled fingers facing the
> viewer, rather than palm, thumb pad, palm creases or finger pads. The fingers
> wrap naturally around the existing black sword grip. Wrist connects to the
> existing bare forearm without changing its position. This is a pronated sword
> grip: viewer sees a broad dorsal hand plane, subtle tendons leading from wrist
> to four knuckles, curled finger backs across the grip; palm and thumb mostly
> on far side, no large visible fleshy thumb pad. Preserve exact sword angle and
> grip location. Preserve EVERYTHING outside the hand: same full 1445x1088
> canvas and transparent alpha, same sword blade/guard/pommel, same limb geometry
> and joint locations, helmet, shield, adult warrior torso, red opaque fundoshi,
> legs and feet. No change to pose, frame, style, color palette, body size or
> weapon. Keep hand faceted shading and dark ink outlines matching the original.
> Do not mirror the image or rotate/translate any part. Only fix the visible
> side of the hand.

## Initial costumes v1

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
