/* Adopted fine pixel artwork. Loaded by gameplay only; review tools keep originals. */
(function(root,factory){
 'use strict';const api=factory(root.ParryPaletteCandidates||{});
 if(typeof module!=='undefined'&&module.exports)module.exports=factory;
 if(root)root.ParryPixelArt=api;
})(typeof window!=='undefined'?window:globalThis,function(palettes){
 'use strict';const style='fine';
 const paletteFor=e=>e&&Object.hasOwn(palettes,e.id)?palettes[e.id]:null;
 const paletteApplied=e=>!!paletteFor(e)&&!paletteFor(e).retainOriginalPalette;
 function source(path,e){
  const entry=paletteApplied(e)?paletteFor(e).files.find(f=>f.source===path):null;
  if(entry)return entry.variants.fine;
  return path.startsWith('character-art/rework/')?path.replace('character-art/rework/','character-art/pixel-candidates/fine/'):path;
 }
 function cacheKey(e){return paletteApplied(e)?e.id:e?.sprite||e?.id;}
 return Object.freeze({adopted:true,enabled:true,style,source,paletteApplied,cacheKey});
});
