/* Knight SVG rig preview. Rendering-only; legacy art remains default. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryKnightTrace=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const SIZE=760;
 const SOURCE='character-art/tracing/knight/knight-static.svg';
 const scriptUrl=root?.document?.currentScript?.src;
 const MASKS=Object.freeze({
  sword:[
   [0,0],[84,0],[323,205],[305,259],[294,304],[304,342],
   [269,396],[204,399],[160,343],[153,270]
  ],
  swordUpper:[[282,246],[336,241],[356,278],[345,355],[313,390],[274,366],[268,338],[268,287]],
  shield:[[587,301],[627,316],[663,331],[693,350],[704,418],[705,490],[699,558],
          [689,601],[661,625],[612,608],[571,566],[545,501],[519,423],[519,365],[548,333]],
  shieldUpper:[[449,231],[505,223],[568,259],[580,309],[555,380],[505,406],
               [460,368],[439,314],[442,262]],
  head:[[320,219],[343,167],[386,144],[430,157],[457,203],[451,256],
        [426,292],[365,298],[324,264]]
 });
 const ORDER=['sword','shield','head','swordUpper','shieldUpper'];
 const PIVOTS=Object.freeze({
  swordShoulder:[268,337],swordElbow:[220,322],
  shieldShoulder:[477,277],shieldElbow:[536,368],head:[386,265]
 });
 let status='idle',layers=null,pending=null;
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
 const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
 function sourceUrl(){
  const script=scriptUrl||'';
  return new URL(SOURCE,script||'https://invalid.local/assets/character-knight.js').href;
 }
 function canvas(){
  const c=root.document.createElement('canvas');c.width=SIZE;c.height=SIZE;return c;
 }
 function polygon(ctx,coords){
  ctx.beginPath();coords.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fill();
 }
 function prepare(img){
  const mask={}, result={},used=[];
  // Every pixel belongs to at most one moving piece. Fixed body is the remainder.
  for(const name of ORDER){
   const m=canvas(),c=m.getContext('2d');
   c.fillStyle='#fff';polygon(c,MASKS[name]);
   c.globalCompositeOperation='destination-out';
   for(const previous of used)c.drawImage(previous,0,0);
   c.globalCompositeOperation='source-over';mask[name]=m;used.push(m);
  }
  for(const name of ORDER){
   const layer=canvas(),c=layer.getContext('2d');
   c.drawImage(img,0,0,SIZE,SIZE);
   c.globalCompositeOperation='destination-in';c.drawImage(mask[name],0,0);
   c.globalCompositeOperation='source-over';result[name]=layer;
  }
  const base=canvas(),ctx=base.getContext('2d');
  ctx.drawImage(img,0,0,SIZE,SIZE);
  ctx.globalCompositeOperation='destination-out';
  for(const name of ORDER)ctx.drawImage(mask[name],0,0);
  ctx.globalCompositeOperation='source-over';
  result.body=base;
  return result;
 }
 function preload(){
  if(pending)return pending;
  if(!root?.document?.createElement||typeof root.Image!=='function')return Promise.resolve(false);
  status='loading';
  pending=new Promise((resolve,reject)=>{
   const img=new root.Image();
   img.onload=()=>{try{layers=prepare(img);status='ready';resolve(true)}catch(e){reject(e)}};
   img.onerror=()=>reject(Error('knight SVG load failed'));
   img.src=sourceUrl();
  }).catch(err=>{status='failed';root.console?.warn?.('[knight trace] using legacy art',err);return false});
  return pending;
 }
 function angles(charge,action){
  const c=clamp(charge),p=smooth(action);
  return {
   swordShoulder:.17*c-1.20*p,
   swordElbow:-.20*Math.sin(Math.PI*p)-.08*c,
   shieldShoulder:-.09*c+.12*p,
   shieldElbow:.08*c-.07*p,
   head:-.018*c+.022*p
  };
 }
 function turn(ctx,pivot,angle){
  ctx.translate(pivot[0],pivot[1]);ctx.rotate(angle);
  ctx.translate(-pivot[0],-pivot[1]);
 }
 function joint(ctx,point,r){
  ctx.fillStyle='#34292f';ctx.beginPath();
  ctx.arc(point[0],point[1],r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#241b20';ctx.lineWidth=6;ctx.stroke();
 }
 function drawEnemy(ctx,pose){
  if(status!=='ready'||!layers||!ctx||!pose||pose.e?.kind!=='knight')return false;
  const a=pose.joints||angles(pose.charge,pose.action);
  ctx.save();
  // game.js has already mirrored the enemy. Local negative X restores art-facing left.
  // Image tip at impact: approx (reach=110, y=-58), with foot baseline y=739.
  ctx.scale(-.20,.20);ctx.translate(-454,-739);
  // Only newly exposed joint surfaces are filled. They sit BEHIND intact body pixels
  // to avoid the white cutout gaps seen in early animation prototypes.
  if(Math.abs(a.swordShoulder)>0.001||Math.abs(a.swordElbow)>0.001){
   ctx.fillStyle='#34292f';
   polygon(ctx,[[212,249],[293,242],[349,294],[339,371],[267,401],[208,366]]);
   joint(ctx,PIVOTS.swordShoulder,27);joint(ctx,PIVOTS.swordElbow,22);
  }
  if(Math.abs(a.shieldShoulder)>0.001||Math.abs(a.shieldElbow)>0.001){
   ctx.fillStyle='#34292f';
   polygon(ctx,[[446,246],[517,251],[579,301],[596,410],[535,454],[470,409]]);
   joint(ctx,PIVOTS.shieldShoulder,31);joint(ctx,PIVOTS.shieldElbow,21);
  }
  ctx.drawImage(layers.body,0,0,SIZE,SIZE);
  // Shoulder -> elbow -> the gripped sword (never rotate the blade alone).
  ctx.save();turn(ctx,PIVOTS.swordShoulder,a.swordShoulder);
  ctx.drawImage(layers.swordUpper,0,0,SIZE,SIZE);
  ctx.save();turn(ctx,PIVOTS.swordElbow,a.swordElbow);
  ctx.drawImage(layers.sword,0,0,SIZE,SIZE);ctx.restore();ctx.restore();
  ctx.save();turn(ctx,PIVOTS.shieldShoulder,a.shieldShoulder);
  ctx.drawImage(layers.shieldUpper,0,0,SIZE,SIZE);
  ctx.save();turn(ctx,PIVOTS.shieldElbow,a.shieldElbow);
  ctx.drawImage(layers.shield,0,0,SIZE,SIZE);ctx.restore();ctx.restore();
  ctx.save();turn(ctx,PIVOTS.head,a.head);
  ctx.drawImage(layers.head,0,0,SIZE,SIZE);ctx.restore();
  ctx.restore();
  return true;
 }
 if(root?.document&&/(?:^|[?&])art=knight-trace(?:&|$)/.test(root.location?.search||''))preload();
 return Object.freeze({preload,ready:()=>status==='ready',status:()=>status,
  drawEnemy,angles,sourceUrl,PIVOTS,MASKS,SIZE});
});
