/* Combat-ready traced hero. Renders only in ?art=ready; does not change combat logic. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryHeroReady=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const SIZE=[420,336];
 // Optional comparisons: spin=360 (current direction), spin=-360 (reverse).
 // Neither changes the original ?art=ready motion or the game's combat clock.
 const SPIN360_ENABLED=/(?:^|[?&])spin=360(?:&|$)/.test(root?.location?.search||'');
 const REVERSE_SPIN_ENABLED=/(?:^|[?&])spin=-360(?:&|$)/.test(root?.location?.search||'');
 const parts={
  shield:[[327,121],[380,148],[388,171],[389,215],[374,253],[356,274],[335,277],[306,247],[277,211],[271,164],[298,142]],
  upperarm:[[179,136],[200,138],[218,153],[222,174],[205,193],[185,183],[174,167]],
  forearm:[[27,73],[75,81],[128,134],[144,130],[153,142],[160,143],[176,144],[187,155],[191,174],[175,192],[159,193],[141,193],[122,185],[103,180],[77,157],[43,118]]
 };
 const src=root?.document?.currentScript?.src;
 const url=src&&typeof root.URL==='function'
  ?new root.URL('./character-art/tracing/hero/hero-ready-static.svg',src).href
  :'./assets/character-art/tracing/hero/hero-ready-static.svg';
 let state='idle',loadPromise=null,images=null;
 function canvas(){const c=root.document.createElement('canvas');c.width=SIZE[0];c.height=SIZE[1];return c;}
 function shape(ctx,points){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();ctx.fill();
 }
 function prepare(img){
  const result={base:canvas()};
  const under=result.base.getContext('2d');
  if(!under)throw Error('Canvas2D unavailable');
  under.drawImage(img,0,0,...SIZE);
  under.globalCompositeOperation='destination-out';
  for(const points of Object.values(parts))shape(under,points);
  under.globalCompositeOperation='source-over';
  // Only small concealed areas are reconstructed. The SVG's actual shapes remain unchanged.
  under.fillStyle='#0766e8';
  shape(under,[[99,155],[143,151],[184,149],[201,164],[187,194],[171,208],[141,204],[115,191]]);
  under.fillStyle='#ffffff';
  shape(under,[[259,166],[284,165],[308,185],[297,208],[276,199]]);
  for(const [name,poly] of Object.entries(parts)){
   const layer=canvas(),ctx=layer.getContext('2d');
   if(!ctx)throw Error('Canvas2D unavailable');
   ctx.drawImage(img,0,0,...SIZE);
   ctx.globalCompositeOperation='destination-in';
   shape(ctx,poly);
   result[name]=layer;
  }
  return result;
 }
 function preload(){
  if(loadPromise)return loadPromise;
  if(!root?.document?.createElement||typeof root.Image!=='function')return Promise.resolve(false);
  state='loading';
  loadPromise=new Promise((resolve,reject)=>{
   const img=new root.Image();
   img.onload=()=>{try{images=prepare(img);state='ready';resolve(true);}catch(e){reject(e);}};
   img.onerror=()=>reject(Error('Hero ready SVG could not be loaded'));
   img.src=url;
  }).catch(e=>{state='failed';root.console?.warn?.('[hero ready] legacy art restored',e);return false;});
  return loadPromise;
 }
 const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
 // action = 1 immediately after counter-hit, decreases to 0 over 240 ms.
 // A complete shoulder turn naturally lands on the SAME resting pose (2π ≡ 0).
 // Ease both ends to avoid an abrupt angular-speed change at idle.
 function armAngles(action,fullSpin=false,reverseSpin=false){
  const a=clamp(action);
  const sweep=a>0?Math.sin((1-a)*Math.PI):0;
  if(!fullSpin)return {shoulder:.24*sweep,elbow:1.85*sweep};
  if(a===0)return {shoulder:0,elbow:0};
  const phase=1-a;
  const eased=phase*phase*(3-2*phase);
  const direction=reverseSpin?-1:1;
  // Exact opposite trajectory: keep joint hierarchy and duration, change only direction.
  return {
   shoulder:direction*2*Math.PI*eased,
   elbow:direction*.27*Math.sin(2*Math.PI*eased)
  };
 }
 function drawHero(ctx,pose){
  if(state!=='ready'||!pose||!ctx)return false;
  const now=pose.now||0,lift=clamp(pose.lift),push=clamp(pose.push),action=clamp(pose.action);
  // One full revolution in either direction. Arm and gripped sword remain linked.
  // Explicit pose flags let the preview compare every version without reloading.
  const fullSpin=pose.spin360===true||
   (pose.spin360!==false&&(SPIN360_ENABLED||REVERSE_SPIN_ENABLED));
  const reverseSpin=pose.reverseSpin===true||
   (pose.reverseSpin!==false&&REVERSE_SPIN_ENABLED);
  const {shoulder,elbow}=armAngles(action,fullSpin,reverseSpin);
  ctx.save();
  // Local coordinate game feet=(0,0). Full PNG/SVG traced pixel space is preserved.
  ctx.scale(.34,.34);
  ctx.translate(-211,-320);
  ctx.drawImage(images.base,0,0,...SIZE);
  ctx.save();
  ctx.translate(211,166);ctx.rotate(shoulder);ctx.translate(-211,-166);
  ctx.drawImage(images.upperarm,0,0,...SIZE);
  ctx.translate(179,166);ctx.rotate(elbow);ctx.translate(-179,-166);
  ctx.drawImage(images.forearm,0,0,...SIZE);
  ctx.restore();
  // Guard is already raised in the adopted idle pose: only a small shoulder-driven lift.
  if(lift>.01){
   ctx.save();
   ctx.strokeStyle='#08193d';ctx.lineWidth=17;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(275,167);ctx.lineTo(299+lift*5,171-lift*17);ctx.stroke();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=11;ctx.stroke();
   ctx.restore();
  }
  ctx.save();
  ctx.translate(lift*8-push*4,-lift*20+push*3);
  ctx.translate(283,162);ctx.rotate(-lift*.10-push*.05);ctx.translate(-283,-162);
  ctx.drawImage(images.shield,0,0,...SIZE);
  ctx.restore();
  if(pose.guardHeld&&clamp(pose.heldLift)>.98||pose.lastStrikeKind==='just'&&now-(pose.lastImpactAt||-99999)<170){
   ctx.save();ctx.strokeStyle='#b4f6ff';ctx.globalAlpha=.45;ctx.lineWidth=5;
   ctx.beginPath();ctx.ellipse(326+lift*8,198-lift*20,60,89,-.15,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.restore();return true;
 }
 if(root?.document&&/(?:^|[?&])art=ready(?:&|$)/.test(root.location?.search||''))preload();
 return Object.freeze({preload,ready:()=>state==='ready',status:()=>state,drawHero,armAngles});
});