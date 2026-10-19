/* Opt-in articulated SVG character sprite: render-only, no combat state. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryCharacterSvg=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const base='./assets/character-art/svg/hero/';
 let status='idle',loadPromise=null,parts=[];
 const view=[-100,-150,200,165];
 function preload(){
  if(loadPromise)return loadPromise;
  if(!root||typeof root.fetch!=='function'||typeof root.Image!=='function')return Promise.resolve(false);
  status='loading';
  loadPromise=root.fetch(base+'manifest.json').then(r=>{
   if(!r.ok)throw Error('Manifest HTTP '+r.status);
   return r.json();
  }).then(manifest=>{
   if(!manifest||manifest.id!=='hero'||!Array.isArray(manifest.parts)||!manifest.parts.length)throw Error('Invalid hero SVG manifest');
   if(manifest.viewBox?.join(',')!==view.join(','))throw Error('Unexpected hero viewBox');
   return Promise.all(manifest.parts.map(spec=>new Promise((resolve,reject)=>{
    if(!/^[a-z][a-z0-9-]*\.svg$/.test(spec.file))return reject(Error('Unexpected SVG filename'));
    const img=new root.Image();
    img.onload=()=>resolve({spec,img});
    img.onerror=()=>reject(Error('Cannot load '+spec.file));
    img.src=base+spec.file;
   })));
  }).then(loaded=>{parts=loaded.sort((a,b)=>a.spec.z-b.spec.z);status='ready';return true;})
  .catch(err=>{status='failed';if(root.console?.warn)root.console.warn('[character-svg] SVG pilot unavailable; retaining old renderer',err);return false;});
  return loadPromise;
 }
 const ready=()=>status==='ready';
 const getStatus=()=>status;
 function drawHero(ctx,pose){
  if(!ctx||!pose||status!=='ready')return false;
  const {now=0,lift=0,push=0,action=0,guardHeld=false,heldLift=0,lastStrikeKind='',lastImpactAt=-99999}=pose;
  const flutter=Math.sin(now/290)*.025+push*.075;
  // drawImage works in the game's existing local coordinate system.
  // All SVGs share a fixed viewBox, keeping pivots independent of path bounds.
  ctx.save();
  for(const {spec,img} of parts){
   ctx.save();
   switch(spec.transform){
    case 'cape':
     ctx.translate(-17,-84);ctx.rotate(flutter);ctx.translate(17,84);break;
    case 'head':
     ctx.translate(0,Math.sin(now/450)*.5);break;
    case 'shieldArm':
     ctx.translate(lift*9-push*3,-lift*5+push);break;
    case 'shield':
     ctx.translate(21+lift*18-push*5,-48-lift*10+push*2);
     ctx.rotate(-.16+lift*.18-push*.23);break;
    case 'weapon':
     ctx.translate(12,-65);ctx.rotate(action*.65+.07-lift*.1);break;
   }
   ctx.drawImage(img,...view);
   ctx.restore();
  }
  if(guardHeld&&heldLift>=1){
   ctx.save();ctx.strokeStyle='#9febf5';ctx.shadowColor='#85e6f7';ctx.shadowBlur=14;ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(21+lift*18,-48-lift*10,25,41,-.1,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(lastStrikeKind==='just'&&now-lastImpactAt<170){
   ctx.save();ctx.strokeStyle='#dcfaff';ctx.shadowColor='#8ef4ff';ctx.shadowBlur=18;ctx.lineWidth=2.5;
   ctx.beginPath();ctx.arc(21+lift*18,-48-lift*10,31,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.restore();return true;
 }
 if(root&&typeof root.document!=='undefined')preload();
 return Object.freeze({preload,ready,getStatus,drawHero});
});
