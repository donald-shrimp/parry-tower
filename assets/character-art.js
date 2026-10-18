/* Experimental opt-in character art, isolated from combat timing and saves.
 * SVG bodies are drawn onto the EXISTING Canvas; shields and blades stay animated in local coordinates.
 * No image or canvas work runs until ?art=preview selects this module in game.js.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryCharacterArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const paths=Object.freeze({
  hero:'./assets/characters/hero-body.svg',
  sentinel:'./assets/characters/sentinel-body.svg'
 });
 const cache=Object.create(null);
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
 const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
 function imageFor(key){
  if(!Object.prototype.hasOwnProperty.call(paths,key))return null;
  if(cache[key])return cache[key].ready?cache[key].image:null;
  if(typeof Image==='undefined')return null;
  const entry={image:new Image(),ready:false,failed:false};
  cache[key]=entry;
  entry.image.onload=()=>{entry.ready=true};
  entry.image.onerror=()=>{entry.failed=true};
  entry.image.src=paths[key];
  return entry.ready?entry.image:null;
 }
 function polygon(ctx,points,color,edge='#132034',lineWidth=2){
  ctx.beginPath();
  for(let i=0;i<points.length;i++){
   const p=points[i];if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);
  }
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
  if(edge){ctx.lineWidth=lineWidth;ctx.strokeStyle=edge;ctx.stroke()}
 }
 function stroke(ctx,points,color,width){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
 }
 function hero(ctx,state={}){
  const image=imageFor('hero');
  if(!image)return false; // Keep the legacy hero visible while loading or if SVG fails.
  const lift=clamp(state.lift),action=clamp(state.action),push=clamp(state.push);
  ctx.save();
  ctx.drawImage(image,-60,-136,120,140);
  // A jointed bracer and shield: the shield center lands at the existing guard position.
  stroke(ctx,[[10,-60],[22+12*lift,-49-9*lift]],'#1c3048',12);
  stroke(ctx,[[11,-61],[21+12*lift,-51-9*lift]],'#adc3d2',6);
  ctx.save();ctx.translate(22+18*lift-5*push,-48-10*lift+2*push);
  ctx.rotate(-.16+.18*lift-.23*push);
  if(state.guardHeld&&state.heldLift>=1){ctx.shadowColor='#85dcef';ctx.shadowBlur=13}
  polygon(ctx,[[-21,-29],[19,-27],[18,9],[0,29],[-20,8]],'#b8cbd5','#172739',3);
  polygon(ctx,[[-16,-22],[14,-21],[13,7],[0,21],[-15,6]],'#344b63','#89a5b4',1.5);
  polygon(ctx,[[-10,-16],[8,-15],[7,5],[0,14],[-9,4]],'#203448',null);
  stroke(ctx,[[0,-19],[0,15]],'#dfc18a',3.5);
  stroke(ctx,[[-11,-2],[11,-2]],'#9ce3e7',3);
  polygon(ctx,[[-6,-5],[0,-12],[6,-5],[0,5]],'#f0d59a','#173a50',1.5);
  if(state.lastStrikeKind==='just'&&state.lastImpactAge<170){
   ctx.shadowColor='#b7faff';ctx.shadowBlur=18;
   ctx.strokeStyle='#cbfaff';ctx.lineWidth=2.8;ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
  // Rotating blade remains a live Canvas part (not a baked animation frame).
  ctx.save();ctx.translate(12,-65);ctx.rotate(.07+.65*action-.1*lift);
  stroke(ctx,[[0,5],[11,-39]],'#24384f',11);
  polygon(ctx,[[6,-12],[11,-58],[15,-48],[16,-12]],'#e6f7fa','#597f9f',1.5);
  stroke(ctx,[[11,-46],[11,-12]],'#ffffff',2);
  stroke(ctx,[[-9,4],[17,9]],'#d7b67e',6);
  polygon(ctx,[[-2,8],[4,9],[0,22],[-5,22]],'#37526a','#122035',1);
  ctx.restore();ctx.restore();
  return true;
 }
 // Must end at the exact legacy attack contact coordinate (reach, -58).
 function sentinelAttackPoint(reach,action){
  const t=ease(action),r=Math.max(40,Number(reach)||110);
  return {x:34+(r-34)*t,y:-142+84*t};
 }
 function enemy(id,ctx,state={}){
  if(id!=='sentinel')return false;
  const image=imageFor('sentinel');
  if(!image)return false; // Other enemies, failed SVGs, and unloaded art use legacy drawing.
  const charge=clamp(state.charge),action=clamp(state.action),recoil=clamp(state.recoil);
  ctx.save();
  // Small weight shift. Position/dash/recoil are still supplied by game.js.
  ctx.save();ctx.translate(-3*charge+4*action,2*charge);ctx.rotate(-.025*charge+.035*action);
  ctx.drawImage(image,-60,-140,120,144);
  ctx.restore();
  // Animated tower shield keeps the attack silhouette recognizable at every phase.
  ctx.save();ctx.translate(39-10*action-6*recoil,-65+5*action);
  ctx.rotate(-.18*charge+.12*action-.16*recoil);
  polygon(ctx,[[-23,-46],[25,-43],[26,29],[1,43],[-25,27]],'#9bafc0','#101e2e',3.5);
  polygon(ctx,[[-18,-39],[19,-38],[20,23],[1,34],[-20,21]],'#354c62','#ced9dc',2);
  polygon(ctx,[[-13,-32],[13,-32],[14,18],[0,27],[-14,17]],'#23394a',null);
  stroke(ctx,[[0,-34],[0,30]],'#e3c48c',4.8);
  stroke(ctx,[[-17,-12],[17,-12]],'#e3c48c',4.8);
  polygon(ctx,[[-6,-19],[0,-26],[7,-19],[8,-6],[0,0],[-8,-6]],'#ecddba','#304355',1.3);
  ctx.restore();
  // The bright blade tip is derived from the old sentinel motion, never a new hitbox.
  const hand=[19,-80-28*charge+8*action],tip=sentinelAttackPoint(state.m?.reach,action);
  stroke(ctx,[[4,-69],hand],'#263b53',15);
  stroke(ctx,[[4,-69],hand],'#94aab9',8);
  const vx=tip.x-hand[0],vy=tip.y-hand[1],len=Math.max(1,Math.hypot(vx,vy));
  const nx=-vy/len,ny=vx/len;
  polygon(ctx,[
   [hand[0]+nx*6,hand[1]+ny*6],
   [tip.x,tip.y],
   [hand[0]-nx*6,hand[1]-ny*6]
  ],'#e9f7fd','#647e93',1.6);
  stroke(ctx,[[hand[0],hand[1]],[tip.x,tip.y]],'#ffffff',2);
  stroke(ctx,[[hand[0]-nx*13,hand[1]-ny*13],[hand[0]+nx*13,hand[1]+ny*13]],'#d5ad73',6);
  if(action>.14&&action<.95){
   ctx.save();ctx.globalAlpha=.13+.22*action;
   stroke(ctx,[[28,-136],[tip.x-8,tip.y-7]],'#96dafa',8);
   ctx.restore();
  }
  ctx.restore();
  return true;
 }
 return Object.freeze({SUPPORTED:Object.freeze(['hero','sentinel']),drawHero:hero,drawEnemy:enemy,sentinelAttackPoint});
});
