# 頭飾りの連続化（2026-10-18）

ユーザー依頼：右手の裏で途切れる赤い頭飾りを補修し、一本につなぎ、右腕を最奥へ置く。

- Tool: built-in image_gen / edit, transparent_background=true
- Input: knight-ready-candidate-v3.png (original retained)
- Output: knight-plume-repaired.png, 1445×1088 RGBA
- Generated source: C:/Users/EBIHARA/.codex/generated_images/01a14eca-fa97-7c20-969b-027e55d374eb/exec-e965a500-f903-45c3-a416-079656e6ac8f.png
- Placement: draw the whole image into original source coordinates [250,27.5,1156,924.8]. Generation did not retain the requested position, so runtime placement aligns the attachment and tail; also recorded in puppet-manifest.json.
- Old cloth fragments are masked out. One continuous body-linked cloth layer is drawn in front of the far sword arm. Other illustration parts retain original PNG pixels.

## Prompt

```text
Use case: precise-object-edit / background-extraction.
Reference/edit target: the attached original illustrated rusty knight. Make an animation repair asset: isolate ONLY the long wine-red HELMET PLUME, and reconstruct the red fabric that is hidden behind the raised sword hand and forearm, so it becomes ONE physically continuous piece from its helmet attachment to its ragged trailing end.

Keep the same bold irregular near-black ink outline, angular cloth folds, muted burgundy red, scarlet highlights and dark red shading as the source. Preserve the source plume's flowing silhouette: attachment at the top of the helmet near x=570,y=185, curled section extending right toward x=800,y=290, then an uninterrupted red fabric connection sloping down/right through the previously occluded region near x=865,y=350 and x=910,y=390 into the long ragged trailing section ending near x=1320,y=490. The strip must connect smoothly across that occluded middle section, with coherent folds and a strong outer contour. No gap, detached fragments, straight cut edge or arm-shaped hole.

Return ONLY this single COMPLETE red plume as a genuine transparent RGBA image on the SAME 1445 by 1088 canvas/composition as the reference. Preserve its original position and scale relative to that canvas; leave the rest transparent, including the large empty lower half. This is for precise compositing onto the existing sprite. Do not recenter, enlarge, or make a different vertical plume. Do not include the knight, helmet, body, sword, hand, arm, shield, neck scarf or waist cloth. No backdrop, shadows, checkerboard, text, numbers, labels, frames or grid. A clean, connected illustrated plume, in the exact source style.
```
