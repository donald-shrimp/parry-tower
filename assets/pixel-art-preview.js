/* Candidate assets are opt-in on review pages; game entrypoints never load this. */
(function(root){
 'use strict';
 const profiles=['fine','balanced','retro'],query=new URLSearchParams(root.location?.search||''),requested=query.get('pixelStyle');
 const style=profiles.includes(requested)?requested:null;
 const requestedEnemy=query.get('paletteEnemy'),palette=query.get('embed')==='1'&&Object.hasOwn(root.ParryPaletteCandidates||{},requestedEnemy)?root.ParryPaletteCandidates[requestedEnemy]:null;
 function source(path){
  const recoloured=palette?.files.find(f=>f.source===path);
  if(recoloured)return recoloured.variants[style||'original'];
  return style&&path.startsWith('character-art/rework/')?path.replace('character-art/rework/','character-art/pixel-candidates/'+style+'/'):path;
 }
 const paletteApplied=e=>!!palette&&!palette.retainOriginalPalette&&e?.id===palette.id;
 root.ParryPixelArt=Object.freeze({enabled:!!style,style,source,paletteApplied,paletteEnemy:palette?.id||null});
})(typeof window!=='undefined'?window:globalThis);
