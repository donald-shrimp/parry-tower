# 騎士・剣手の指側を見せる修正

- 2026-10-18, built-in image generation edit, transparent alpha.
- Target: `knight-ready-candidate-v2.png`; output: `knight-ready-candidate-v3.png`. Previous versions preserved.
- User correction supersedes v2 handedness instructions: the current pose reads as LEFT shield / RIGHT sword. Preserve that natural pose; change only the sword hand to show curled fingers toward the viewer instead of the back of the hand.
- Inspected visually: sword grip now shows bent finger segments toward viewer; pose and equipment layout retained. No game integration or gameplay tests in this edit.
- Candidate until user accepts this exact revision.

## Prompt

+Use case: precise-object-edit.
EDIT TARGET: attached finished knight sprite. Make ONE tiny localized correction ONLY to the hand gripping the sword at the upper right, just below the crossguard. Everything else is approved.

That sword hand is the knight's anatomical RIGHT hand. Redraw only its glove/gauntlet grip so the curled FINGER SIDE faces the viewer, rather than the back-of-hand armor plate. Show the distinct bent finger segments wrapping around the sword hilt on the camera-facing side, with a naturally placed right thumb and a coherent wrist. The broad dorsal plate should be turned away and not shown facing us. Preserve hand size and position, grip location and wrist connection. Keep the sword in the RIGHT hand and shield in the LEFT hand as presently posed. DO NOT swap arms or weapons.

STRICT INVARIANTS: keep the exact existing body pose, torso and head orientation, shoulders, elbow positions, entire forearm armor, legs and feet, sword angle and sword design, shield, all red cloth shapes, plume, armor outlines, rust, linework, colors, framing, character scale and genuine alpha transparency unchanged. Do not reinterpret the entire knight. Only repaint the small sword-gripping hand region to show curled fingers toward the viewer. Same original beautiful illustrated finish; no labels, added objects, effects or background.
