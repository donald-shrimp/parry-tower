# 主人公の原画候補（2026-10-18）

- Status: user approved the illustration and requested direct cutout assembly, forward 360 counter, then a straightening elbow during the cut. Implemented in art=illustrated; motion review remains subjective.
- Tool: built-in image_gen, reference-guided generation, transparent_background=true.
- Project asset: hero-ready-candidate.png
- Dimensions: 1445×1088, 8-bit RGBA (PNG color type 6).
- SHA-256: 035ee4519b5590b4a6d878b29c99f3a1a90af395b5a474ac77a8fdbd0a75b91e
- Source output: C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-8375e03b-f97d-4857-9b85-ed64a8890bfa.png
- Reference 1: ../knight/knight-ready-candidate-v3.png (illustration style).
- Reference 2: test-results/character-art/knight-plume-idle.jpg (blue hero identity only, screenshot left character).

## Inspection

Full body, sword, shield and boots fit within the transparent canvas. Blue/silver/gold design and single diamond shield retained, with the knight reference's irregular dark contours, painted plate armor and angular cloth. Hero faces screen-right, near right sword arm raised behind, far left shield arm extended forward. Cape and helmet plume flow left; cloth is continuous behind the sword arm. This is one assembled illustration, not a parts atlas. No masks or motion have been implemented for this candidate. No runtime test claims are made for it.

Current: character-hero-puppet.js directly cuts this original PNG into six layers. The user changed the counter to forward +360 degrees; its 240ms window remains. Upper arm and forearm/gauntlet/sword unfold into a straight arm during the cut, then fold back into this original idle. The hero stays almost stationary while enemies approach. See puppet-manifest.json and docs/HERO_PUPPET_REVIEW.md. The older flat-vector target is superseded by the user's request for the accepted illustrated knight style.

## Prompt

```text
Use case: stylized-concept.
Asset type: one transparent full-body combat-ready illustration for the PLAYER HERO in the 2D game Parry Tower, designed for later cutout animation.

Input references:
Image 1 (rusty red knight PNG): PRIMARY STYLE REFERENCE. Match its precise visual language: bold irregular near-black ink contours, angular layered plate armor, hand-painted chipped metal, restrained dimensional cel shading, sharp cloth folds, convincing articulated joints, and the same illustration detail density. It is an enemy facing left; the new HERO must face RIGHT.
Image 2 (game preview screenshot): IDENTITY REFERENCE ONLY for the small blue-and-silver hero standing at the LEFT of that screenshot. Keep that hero's recognizable pointed closed helmet, silver armor, royal blue cloth and blue shield with gold rim and a single gold diamond emblem. Ignore the screenshot UI, background, other knight and old flat drawing style.

Create the next iteration of that BLUE HERO in exactly the illustrated visual family of image 1. One figure only. The hero is compact and sturdy, about 3.5 to 4 heads tall, with readable substantial armor; slightly more compact than the enemy, but equally rich and cool. Closed pointed silver helmet hides the face, a narrow dark visor with a tiny restrained cyan glint. Silver and blue-grey plate armor with clear angular highlights, deep navy-black joint undersuit, a few practical warm brass details, subtle scratches and edge wear; the armor remains predominantly bright silver, with no orange rust patches. Royal blue short cape flowing to the LEFT behind the body, blue waist cloth, a clean gold-rimmed BLUE heater/kite shield with ONE simple gold diamond. A practical straight one-handed silver sword with a modest gold crossguard; visibly shorter than the enemy's huge rusty sword.

Pose and orientation are critical: HERO STANDS ON THE LEFT SIDE OF THE GAME and looks/guards toward the RIGHT. Head, chest, pelvis, knees and feet consistently turn toward the RIGHT, a natural three-quarter right-facing view, not a torso square to camera with a sideways head. Firm broad staggered stance with both boots planted on a common horizontal ground line. The screen-right front knee is lightly bent, the screen-left rear leg braces naturally. No running, jumping or leg lifting.
Anatomically RIGHT hand holds the sword, LEFT hand holds the shield. We see mainly the hero's RIGHT flank, so the sword arm is the nearer arm, and the left shield arm is on the far side extending forward toward screen-right. The shield's front face angles partly toward the viewer so the gold diamond remains clearly legible. The sword-side elbow is bent and pulled back toward screen-left; the gauntleted right hand is near shoulder/head height and clearly grips the handle. The sword blade points diagonally UP-LEFT behind the hero, already poised for a forward countercut to the right. Do not let the blade pass through the helmet, shoulder or cloth. Leave a small clear negative-space gap between raised sword/forearm and head/cape, so the silhouette can be masked and animated. Hands, wrists, elbows and shoulder connections must be physically correct, with no reversed wrist or swapped hand. Shield held screen-right ahead of the chest in a ready-to-parry guard, rather than hanging down.

Cutout suitability: keep both arm paths understandable, clear boundaries at pauldrons, elbows and gauntlets, visible belt/waist and knees. The short cape stays in one continuous piece BEHIND the arms and never threads between sword hand and forearm. Do not make a separate parts sheet: this is ONE assembled, polished neutral ready pose with all joints connected.

Composition: single isolated character, full sword, shield, helmet and both boots completely visible, generous transparent safe margins on every side, balanced landscape-ish framing similar to the source. No ground shadow or ground line. Genuine transparent RGBA background. No text, labels, UI, other characters, swatches, contact sheet, frames, props or scenery. Do not copy the rusty enemy's damaged red costume, left-facing direction or oversized sword. Do not make flat icon art, simple geometric vector art, cute toy/chibi art, smooth 3D render or photorealism. Match the source illustration's forceful dark ink, hand-painted armor and angular cloth.
```
