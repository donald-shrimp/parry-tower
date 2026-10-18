/* Animate the traced static SVG as an opt-in visual-only hero. ?art=trace */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryHeroTrace=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const path=(root?.document?.currentScript?.src && typeof root.URL==='function')
  ? new root.URL('./character-art/tracing/hero/hero-static.svg',root.document.currentScript.src).href
  : './assets/character-art/tracing/hero/hero-static.svg';
 // These polygons split the ORIGINAL SVG into body/shield/sword images at load time.
 // We do not redraw, reshape or move the original graphic's individual color paths.
 const shieldShape=[[497,240],[519,258],[581,291],[595,309],[599,347],[600,391],[594,429],[575,479],[543,530],[524,532],[485,501],[451,468],[422,424],[411,390],[396,327],[394,310],[432,292],[465,274]];
 const swordShape=[[37,575],[30,553],[63,497],[158,417],[166,399],[164,392],[181,374],[202,389],[215,393],[224,386],[239,393],[250,405],[268,410],[271,426],[269,441],[247,463],[215,482],[196,496],[109,559]];
 const SIZE=628;
 let state='idle',pending=null,images=Object.create(null);
 function makeCanvas(){
  const c=root.document.createElement('canvas');c.width=SIZE;c.height=SIZE;return c;
 }
 function polygon(ctx,pts){
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();ctx.fill();
 }
 function isolate(img){
  const base=makeCanvas(),shield=makeCanvas(),sword=makeCanvas();
  const ctx=base.getContext('2d');
  if(!ctx)throw Error('No 2D context');
  ctx.drawImage(img,0,0,SIZE,SIZE);
  ctx.globalCompositeOperation='destination-out';
  polygon(ctx,shieldShape);polygon(ctx,swordShape);
  for(const [key,layer,shape] of [['shield',shield,shieldShape],['sword',sword,swordShape]]){
   const c=layer.getContext('2d');
   if(!c)throw Error('No 2D context for '+key);
   c.drawImage(img,0,0,SIZE,SIZE);
   c.globalCompositeOperation='destination-in';
   polygon(c,shape);
  }
  return {base,shield,sword};
 }
 function preload(){
  if(pending)return pending;
  if(typeof root?.Image!=='function'||!root?.document?.createElement)return Promise.resolve(false);
  state='loading';
  pending=new Promise((resolve,reject)=>{
   const img=new root.Image();
   img.onload=()=>{try{images=isolate(img);state='ready';resolve(true);}catch(err){reject(err);}};
   img.onerror=()=>reject(Error('Cannot load traced hero SVG'));
   img.src=path;
  }).catch(err=>{
   state='failed';root?.console?.warn?.('[trace hero] using original graphics',err);
   return false;
  });
  return pending;
 }
 function clamp(x){return Math.max(0,Math.min(1,x||0));}
 function drawHero(ctx,pose){
  if(!ctx||!pose||state!=='ready')return false;
  const {now=0,guardHeld=false,lastStrikeKind='',lastImpactAt=-99999}=pose;
  const lift=clamp(pose.lift),action=clamp(pose.action),push=clamp(pose.push);
  ctx.save();
  // Keep all semantic layers in original 628px source coordinates.
  ctx.scale(.20,.20);
  ctx.translate(-340,-600);
  ctx.drawImage(images.base,0,0,SIZE,SIZE);
  if(lift>.03){
   // Bridge arm to shield when the arm is raised; sits behind the shield.
   ctx.save();
   ctx.beginPath();ctx.moveTo(402,313);ctx.lineTo(423,315-lift*7);
   ctx.lineTo(443+lift*18,348-lift*50);
   ctx.strokeStyle='#02123a';ctx.lineWidth=29;
   ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=20;ctx.stroke();
   ctx.restore();
  }
  ctx.save();
  ctx.translate(217,428);
  ctx.rotate(-2.45*action);
  ctx.translate(-217,-428);
  ctx.drawImage(images.sword,0,0,SIZE,SIZE);
  ctx.restore();
  ctx.save();
  ctx.translate(18*lift-7*push,-49*lift+4*push);
  ctx.translate(445,350);
  ctx.rotate(-.19*lift-.08*push);
  ctx.translate(-445,-350);
  ctx.drawImage(images.shield,0,0,SIZE,SIZE);
  ctx.restore();
  // Cosmetic only, with NO changes to Web Audio, collisions or timing.
  if((guardHeld&&lift>.95)||(lastStrikeKind==='just'&&now-lastImpactAt<170)){
   ctx.save();ctx.beginPath();
   ctx.ellipse(509+lift*18,379-lift*49,86,129,-.17,0,Math.PI*2);
   ctx.strokeStyle='#a8f2ff';ctx.globalAlpha=.48;ctx.lineWidth=8;ctx.stroke();
   ctx.restore();
  }
  ctx.restore();return true;
 }
 if(root?.document && /(?:^|[?&])art=trace(?:&|$)/.test(root.location?.search||''))preload();
 return Object.freeze({preload,ready:()=>state==='ready',status:()=>state,drawHero});
});
