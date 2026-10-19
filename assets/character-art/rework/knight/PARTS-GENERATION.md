# 騎士・可動部品アトラス

- Generated 2026-10-18 via built-in image generation, using `knight-ready-candidate-v3.png` as the actual image reference.
- Output: `knight-parts.png`, initial 4×4 transparent atlas; runtime uses `knight-parts-v2.png` with closed joint caps. Authored occluded joint surfaces and detached components; not a traced SVG and not the rejected procedural character art.
- User authorized articulation from v3 and correcting red fabric overlap with the sword arm.
- Atlas coordinates, pivots and dimensions are defined once in `assets/character-knight-puppet.js` and consumed directly by its renderer and diagnostic view.
- Art and animation remain a review candidate; the atlas itself is not a new user-approved design.

## Prompt

+Create a production 2D animation CUTOUT PARTS ATLAS from the attached approved knight. The image is the exact character/style reference. Preserve its bold irregular dark ink lines, layered chipped warm-gray iron armor with irregular orange rust patches, charcoal joints, wine-red ragged cloth and helmet design. Do NOT redesign, simplify into geometric primitives, change style or turn into 3D. Reconstruct hidden surfaces so the parts overlap cleanly when articulated.

OUTPUT: one SQUARE transparent PNG, with exactly 4 columns and 4 rows of equal square cells. 16 detached parts, ONE centered part per cell, in the EXACT row-major order below. Every part stays completely inside its own cell with at least 10% clear margin; no neighboring parts touching. NO visible grid, labels, text, numbers, shadows, background or assembled character. Real alpha transparency.

ROW 1:
Cell 1: the knight's armored TORSO only, neck to waist, facing LEFT in side/three-quarter view as reference; NO head, arms, shoulder pauldrons, weapons or loose scarf. Fully paint previously hidden side/back armor. Dark rounded shoulder sockets.
Cell 2: PELVIS only, belt and layered hip/tasset armor plus SHORT central red waist tabard, hip sockets painted, no thighs, no long trailing cloth.
Cell 3: HELMET and neck only facing LEFT, same slit visor, with short black plume attachment on top, but NO long red plume or scarf.
Cell 4: long red helmet PLUME only, attachment at LEFT end, trailing RIGHT, ragged shape of reference, detached.

ROW 2:
Cell 1: sword-arm UPPER ARM only, shoulder pauldron and upper arm down to rounded elbow, oriented VERTICALLY shoulder at top, elbow bottom. No forearm or sword.
Cell 2: sword-arm FOREARM plus RIGHT HAND only, oriented VERTICALLY elbow at bottom, fist at top. Fist grips an imaginary horizontal hilt, curled FINGER SIDE toward viewer as reference, NO sword. Rounded dark elbow overlap at bottom.
Cell 3: SWORD only, complete intact tip, blade, crossguard, hilt and pommel; oriented VERTICALLY blade tip UP, grip near bottom. Exact rusty broad sword from reference, no hand. Long enough and sharp.
Cell 4: SHIELD only, entire worn rusted heater shield from reference, point DOWN, no arm.

ROW 3:
Cell 1: shield-arm UPPER ARM only, shoulder pauldron and upper arm to rounded elbow, oriented VERTICALLY shoulder top, elbow bottom. No forearm or shield.
Cell 2: shield-arm FOREARM and LEFT gripping hand only, oriented VERTICALLY elbow top, hand bottom, no shield. Round dark elbow overlap.
Cell 3: front leg THIGH only, hip socket top to armored knee bottom, oriented VERTICALLY, no shin/foot. Match reference forward leg armor.
Cell 4: rear leg THIGH only, hip socket top to armored knee bottom, oriented VERTICALLY, no shin/foot. Match reference rear leg armor.

ROW 4:
Cell 1: front leg SHIN AND BOOT as one piece, knee top, planted boot bottom, boot toe points LEFT. Exact layered shin and segmented boot from reference, no thigh.
Cell 2: rear leg SHIN AND BOOT as one piece, knee top, planted boot bottom, toe points LEFT. Match reference, no thigh.
Cell 3: RED NECK SCARF only, short wrapped collar at LEFT attachment with one ragged tail trailing DOWN AND RIGHT (not horizontally through sword arm); same fabric shading and ink style.
Cell 4: trailing RED WAIST CLOTH only, attachment at TOP LEFT, flowing down and right, reference's ragged cloth; no belt or armor.

Important: all 16 are finished detailed painted game sprite pieces, not abstract silhouettes or concept sketches. Match original line thickness consistently. Dark rounded underlaps at elbows, shoulders, hips, knees hide articulation gaps. No connectors extending outside cells. True transparent background.
