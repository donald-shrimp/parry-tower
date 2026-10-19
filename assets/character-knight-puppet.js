/* Original-PNG knight cutout. Idle reproduces the reference composition.
 * Far sword -> body -> near shield. Lower body is one fixed source layer:
 * no stepping, boot lifts or knee pumping; the stance slides as one piece.
 * Pure presentation, sampled from the existing combat timestamps.
 */
(function(root,factory){
 'use strict';const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryKnightPuppet=api;
})(typeof window!=='undefined'?window:globalThis,function create(root,assetEnemy,ownershipSource,sourceScript){
 'use strict';
 const SOURCE='character-art/rework/knight/knight-ready-candidate-v3.png';
 const PLUME=Object.freeze({source:'character-art/rework/knight/knight-plume-repaired.png',destination:Object.freeze([250,27.5,1156,924.8])});
 const scriptUrl=sourceScript||root?.document?.currentScript?.src;
 const variants=new Map();
 function variantFor(e){
  const key=root.ParryPixelArt?.cacheKey?.(e);
  if(assetEnemy||!e||!supports(e)||!key||key==='knight')return null;
  if(!variants.has(key))variants.set(key,create(root,{id:e.id,sprite:e.sprite},()=>image,scriptUrl));
  return variants.get(key);
 }
 const WIDTH=1445,HEIGHT=1088,SCALE=.18,ORIGIN=Object.freeze([650,1056]);
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0)),mix=(a,b,t)=>a+(b-a)*t;
 const point=(x,y)=>({x,y}),add=(a,b)=>point(a.x+b.x,a.y+b.y);
 const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
 const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 const polar=(a,r)=>point(Math.cos(a)*r,Math.sin(a)*r);
 const rotate=(p,a)=>point(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));
 const blendAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 const local=([x,y])=>point((x-ORIGIN[0])*SCALE,(y-ORIGIN[1])*SCALE);
 const PIVOTS=Object.freeze(Object.fromEntries(Object.entries({
  waist:[650,620],swordShoulder:[744,409],swordElbow:[848,443],grip:[865,302],tip:[1398,37],
  shieldShoulder:[562,437],shieldElbow:[487,512],shieldHand:[418,547],
  frontHip:[583,657],frontKnee:[480,770],frontFoot:[490,1054],
  rearHip:[727,667],rearKnee:[942,846],rearFoot:[1100,1054]
 }).map(([k,v])=>[k,Object.freeze(v)])));
 const freezePoly=polys=>Object.freeze(polys.map(p=>Object.freeze(p.map(v=>Object.freeze(v)))));
 // All masks operate on the SAME source PNG, not a redraw or a parts atlas.
 // Ownership is assigned before draw order, so the neutral pose recomposes it.
 const MASKS=Object.freeze({
  weapon:freezePoly([
   [[755,270],[810,230],[840,185],[930,150],[WIDTH,0],[WIDTH,150],[990,375],[945,365],[906,329],[832,350],[755,345]],
   [[839,314],[893,319],[902,371],[906,413],[890,451],[867,477],[833,478],[800,456],[799,432],[823,391]]
  ]),
  swordUpper:freezePoly([[[718,362],[750,367],[774,383],[781,382],[821,398],[858,418],[872,450],[853,478],[824,479],[796,461],[752,452],[714,428],[736,407]]]),
  shield:freezePoly([[[366,425],[402,466],[456,487],[451,548],[428,635],[394,709],[348,774],[289,835],[247,815],[210,774],[184,719],[178,657],[191,590],[215,532],[261,496],[310,475]]]),
  shieldFore:freezePoly([[[386,495],[449,476],[505,490],[542,526],[526,565],[493,601],[448,613],[407,590],[379,550]]]),
  shieldUpper:freezePoly([[[450,391],[491,369],[544,365],[601,382],[646,407],[667,441],[649,480],[607,513],[548,545],[500,534],[457,491],[443,443]]]),
  plumeTail:freezePoly([
   [[547,244],[547,187],[604,161],[651,161],[685,193],[741,211],[717,220],[763,218],[812,249],[782,266],[836,270],[850,318],[817,332],[835,352],[816,385],[775,365],[737,333],[708,345],[675,315],[645,285],[614,235],[585,228],[581,244]],
   [[880,330],[1375,330],[1375,545],[880,545]]]),
  legs:freezePoly([[[0,620],[WIDTH,620],[WIDTH,HEIGHT],[0,HEIGHT]]])
 });
 const ORDER=Object.freeze(['weapon','swordUpper','legs','plumeTail','body','shieldUpper','shieldFore','shield']);
 const PRIORITY=Object.freeze(['weapon','swordUpper','shield','shieldFore','shieldUpper','plumeTail','legs']);
 const crop=(x,y,w,h)=>Object.freeze([x,y,w,h]);
 const CROPS=Object.freeze({weapon:crop(750,0,695,490),swordUpper:crop(700,350,180,140),
  shield:crop(170,420,295,425),shieldFore:crop(370,470,180,150),shieldUpper:crop(435,355,240,200),
  plumeTail:crop(540,140,850,440),legs:crop(0,620,WIDTH,HEIGHT-620),body:crop(0,0,WIDTH,630)});
 const HULLS=Object.freeze({...MASKS,body:freezePoly([[[435,150],[1350,150],[1350,630],[435,630]]])});
 const P=Object.freeze(Object.fromEntries(Object.entries(PIVOTS).map(([k,v])=>[k,Object.freeze(local(v))])));
 const UPPER=distance(P.swordShoulder,P.swordElbow),FORE=distance(P.swordElbow,P.grip),BLADE=distance(P.grip,P.tip);
 const IDLE_UPPER=angle(P.swordShoulder,P.swordElbow),IDLE_FORE=angle(P.swordElbow,P.grip);
 const IDLE_BLADE=angle(P.grip,P.tip),WRIST_OFFSET=IDLE_BLADE-IDLE_FORE;
 const compositeLength=distance(P.swordElbow,P.tip),compositeOffset=angle(P.swordElbow,P.tip)-IDLE_FORE;
 let image=null,layers=null,repairMask=null,status='idle',pending=null,plumeSource=null,maskStamp='',layerCrops={};
 function sourceUrl(){return new URL(root.ParryPixelArt?.source(SOURCE,assetEnemy)||SOURCE,scriptUrl||'https://invalid.local/assets/character-knight-puppet.js').href;}
 function canvas(w=WIDTH,h=HEIGHT){const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}
 function polygon(ctx,polys){for(const poly of polys){ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}}
 function clothMask(img){
  const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(img,0,0,WIDTH,HEIGHT);
  const pixels=ctx.getImageData?.(0,0,WIDTH,HEIGHT)?.data;
  if(!pixels)return null;
  const mask=ctx.createImageData(WIDTH,HEIGHT),out=mask.data,red=new Uint8Array(WIDTH*HEIGHT);
  // Colour only chooses pixel ownership. All colour and outlines still come
  // directly from the reference; red cloth must not ride on the far arm.
  for(let y=147;y<503;y++)for(let x=677;x<1103;x++){
   const i=(y*WIDTH+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   if(pixels[i+3]&&r>60&&r>g*1.6&&b>g*1.08)red[y*WIDTH+x]=1;
  }
  for(let y=150;y<500;y++)for(let x=680;x<1100;x++)if(red[y*WIDTH+x]){
   let count=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)count+=red[(y+dy)*WIDTH+x+dx];
   if(count>=14)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)out[((y+dy)*WIDTH+x+dx)*4+3]=255;
  }
  ctx.putImageData(mask,0,0);return c;
 }
 function prepare(img,plumeImage){
  const used=canvas(),uc=used.getContext('2d'),result={},cloth=clothMask(ownershipSource?.()||img);
  for(const name of [...PRIORITY,'body']){
   const mask=canvas(),mc=mask.getContext('2d');mc.fillStyle='#fff';
   const custom=root.ParryArtEdits?.maskFor('knight',name,MASKS[name]);
   if(name==='body')mc.fillRect(0,0,WIDTH,HEIGHT);else polygon(mc,custom||MASKS[name]);
   if(cloth&&(name==='weapon'||name==='swordUpper')){mc.globalCompositeOperation='destination-out';mc.drawImage(cloth,0,0);}
   if(name==='shieldUpper'){
    mc.globalCompositeOperation='destination-out';
    polygon(mc,freezePoly([[[440,250],[635,250],[635,370],[575,407],[480,408],[435,370]]]));
   }
   mc.globalCompositeOperation='destination-out';mc.drawImage(used,0,0);
   mc.globalCompositeOperation='source-over';uc.drawImage(mask,0,0);
   const crop=custom&&custom!==MASKS[name]?root.ParryArtEdits.sourceCrop(custom,WIDTH,HEIGHT,CROPS[name]):CROPS[name];
   layerCrops[name]=crop;const [x,y,w,h]=crop,part=canvas(w,h),pc=part.getContext('2d');
   pc.drawImage(img,-x,-y,WIDTH,HEIGHT);
   pc.globalCompositeOperation='destination-in';pc.drawImage(mask,-x,-y);
   if(name==='plumeTail'){
    pc.globalCompositeOperation='source-over';pc.clearRect(0,0,w,h);
    const [px,py,pw,ph]=PLUME.destination;pc.drawImage(plumeImage,px-x,py-y,pw,ph);
    repairMask=canvas();const repair=repairMask.getContext('2d');
    repair.drawImage(mask,0,0);repair.drawImage(plumeImage,px,py,pw,ph);
   }
   pc.globalCompositeOperation='source-over';result[name]=part;
  }
  return result;
 }
 function preload(e){
  if(e&&!assetEnemy)return preload().then(ok=>{
   if(!ok)return false;const variant=variantFor(e);
   return variant?variant.preload():root.ParryEnemyPuppet?.supports(e)?root.ParryEnemyPuppet.preload(e):true;
  });
  if(pending)return pending;
  if(typeof root?.Image!=='function'||!root?.document?.createElement)return Promise.resolve(false);
  status='loading';
  const load=url=>new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
  pending=Promise.all([load(sourceUrl()),load(new URL(root.ParryPixelArt?.source(PLUME.source,assetEnemy)||PLUME.source,scriptUrl||'https://invalid.local/assets/character-knight-puppet.js').href),root.ParryHeroPuppet?.preload()??true,root.ParryPixelArt?.adopted?true:root.ParryEnemyPuppet?.preload()??true,root.ParryArtEdits?.ready])
   .then(([img,plumeImage,heroLoaded])=>{if(!heroLoaded)throw Error('Illustrated hero unavailable');layers=prepare(img,plumeImage);image=img;plumeSource=plumeImage;maskStamp=root.ParryArtEdits?.maskStamp('knight')||'';status='ready';return true;})
   .catch(error=>{status='failed';if(error)root.console?.warn?.('[knight cutout]',error);return false;});
  return pending;
 }
 const supports=e=>(e?.sprite||e?.id)==='knight';
 function readyFor(e){const variant=variantFor(e);if(variant)return variant.readyFor(e);
  return !!e&&(root.ParryPixelArt?.adopted?!!root.ParryCombatArt:!!root.ParryCombatArt?.readyFor(e))&&(!root.ParryHeroPuppet||root.ParryHeroPuppet.ready())&&(!supports(e)||status==='ready')&&(!root.ParryEnemyPuppet?.supports(e)||root.ParryEnemyPuppet.ready(e));}
 function layout(w,h,e={},m={reach:110},staging='wide'){
  const illustratedHero=!!root.ParryHeroPuppet?.ready();
  if(staging!=='previous'&&illustratedHero&&root.ParryEnemyPuppet?.supports(e))return root.ParryEnemyPuppet.layout(w,h,e,m);
  if(!supports(e)&&!illustratedHero)return root.ParryCombatArt.layout(w,h,e,m);
  if(supports(e)&&staging!=='previous'){
   // Match main's helmet-to-feet height and ground, rather than fitting the
   // entire cape/blade rectangle. Motion may deliberately leave phone edges.
   const base=Math.min(w/550,h/470)*1.23,boss=e.boss?1.22:1;
   const heroScale=base*(illustratedHero ? .85 : 1),enemyScale=base*.76*boss;
   const heroX=w*.28,ground=h*.80;
   const hitX=heroX+(illustratedHero?72.96:58)*heroScale;
   const hitY=ground-(illustratedHero?72.8:50)*heroScale;
   const contactX=hitX+m.reach*enemyScale,restX=w*.73;
   return {base,heroScale,enemyScale,heroX,ground,hitX,hitY,contactX,restX,
    // A clearer withdrawal makes the coming lunge readable before release.
    stageX:Math.max(restX+8*enemyScale,contactX+(m.stage||130)*base*boss)+18*enemyScale,impactY:(hitY-ground)/enemyScale};
  }
  const ratio=illustratedHero?1.05:1.10,left=illustratedHero?134:80,hit=illustratedHero?72.96:58;
  const boss=e.boss?1.22:1,base=Math.min((w-20)/((illustratedHero?207:138)*ratio+(m.reach+146)*boss),h*.80/(238*boss));
  const heroScale=base*ratio,enemyScale=base*boss,ground=h*.80;
  const heroX=Math.max(w*.22,left*heroScale+8),hitX=heroX+hit*heroScale,hitY=ground-(illustratedHero?72.8:50)*heroScale;
  const contactX=hitX+m.reach*enemyScale;
  const restX=supports(e)?contactX:Math.max(contactX,w-66*enemyScale-10);
  return {base,heroScale,enemyScale,heroX,ground,hitX,hitY,contactX,restX,stageX:supports(e)?contactX:Math.max(contactX,restX+4*enemyScale),
   impactY:(hitY-ground)/enemyScale};
 }
 function twoBone(start,target,upper,lower,bend=1){
  const dir=angle(start,target),d=Math.max(Math.abs(upper-lower)+.0001,Math.min(upper+lower-.0001,distance(start,target)));
  const offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
  return {start,elbow:add(start,polar(dir+bend*offset,upper)),end:add(start,polar(dir,d))};
 }
 function contactAngles(shoulder,target){
  const b=twoBone(shoulder,target,UPPER,compositeLength,-1);
  return {upper:angle(b.start,b.elbow),fore:angle(b.elbow,b.end)-compositeOffset};
 }
 const about=(p,pivot,a)=>add(pivot,rotate(point(p.x-pivot.x,p.y-pivot.y),a));
 function pose({charge=0,action=0,recoil=0,reach=110,impactY=-55,sword}={}){
  const c=clamp(charge),a=clamp(action),r=clamp(recoil),lean=.045*c-.17*a+.035*r;
  const hip=P.waist,chest=about(local([625,445]),hip,lean),head=about(local([520,392]),hip,lean);
  const shoulder=about(P.swordShoulder,hip,lean);
  const target=contactAngles(shoulder,point(-reach,impactY));
  const upper=blendAngle(IDLE_UPPER+lean-.055*c,target.upper,sword?.upper??a);
  const fore=blendAngle(IDLE_FORE+lean-.075*c,target.fore,sword?.blade??a);
  const elbow=add(shoulder,polar(upper,UPPER)),hand=add(elbow,polar(fore,FORE));
  const bladeAngle=fore+WRIST_OFFSET,tip=add(hand,polar(bladeAngle,BLADE));
  const shieldShoulder=about(P.shieldShoulder,hip,lean),guardAngle=lean+.025*c+.035*a;
  const nearPoint=p=>add(shieldShoulder,rotate(point(p.x-P.shieldShoulder.x,p.y-P.shieldShoulder.y),guardAngle));
  return {hip,chest,head,lean,swordArm:{start:shoulder,elbow,end:hand},
   shieldArm:{start:shieldShoulder,elbow:nearPoint(P.shieldElbow),end:nearPoint(P.shieldHand)},
   frontLeg:{start:P.frontHip,elbow:P.frontKnee,end:P.frontFoot},
   rearLeg:{start:P.rearHip,elbow:P.rearKnee,end:P.rearFoot},
   frontFoot:P.frontFoot,rearFoot:P.rearFoot,bladeAngle,tip,upperAngle:upper,foreAngle:fore,guardAngle,
   charge:c,action:a,recoil:r};
 }
 function sample(data){
  const {e,m=root.ParryCombatArt.profile(e),now=0,width,height,attackAt=now+3000,attackSpan=3000,
   lastImpactAt=-99999,lastDeflectAt=-99999,lastStrikeKind=''}=data;
  const previous=data.staging==='previous';
  const l=layout(width,height,e,m,data.staging),t=root.ParryCombatArt.timeline(m,attackAt-now,now-lastImpactAt,attackSpan);
  // Preserve the existing 38ms contact hold; then knock the whole stance away.
  const age=now-lastDeflectAt-(previous?0:38),r=age>=0&&age<170&&['just','parry'].includes(lastStrikeKind)
   ?Math.sin(Math.PI*age/170)*(lastStrikeKind==='just'?1:.55):0;
  const slide=8*t.charge-6*t.action;
  const prepared=mix(l.restX,l.stageX,t.prep);
  const approach=mix(mix(prepared,l.contactX,t.drive),l.contactX,t.rec);
  const x=previous?l.restX+slide*l.enemyScale:approach+24*r*l.enemyScale;
  const sword=!previous&&data.motionVersion!=='v4'?root.ParryCombatArt.swordPhrase(t,m,now-lastImpactAt,lastStrikeKind):null;
  const q=pose({...t,charge:sword?.charge??t.charge,sword,recoil:r,reach:m.reach+(previous?slide:0),impactY:l.impactY});
  q.sword=sword;
  q.editTime=root.ParryArtEdits?.timeFor(data)||0;return {l,t,q,x};
 }
 function placements(q){
  const fixed={at:point(0,0),pivot:ORIGIN,angle:0};
  const body={at:q.hip,pivot:PIVOTS.waist,angle:q.lean};
  const near={at:q.shieldArm.start,pivot:PIVOTS.shieldShoulder,angle:q.guardAngle};
  return {weapon:{at:q.swordArm.elbow,pivot:PIVOTS.swordElbow,angle:q.foreAngle-IDLE_FORE},
   swordUpper:{at:q.swordArm.start,pivot:PIVOTS.swordShoulder,angle:q.upperAngle-IDLE_UPPER},
   legs:fixed,plumeTail:body,body,shieldUpper:near,shieldFore:near,shield:near};
 }
 function drawPart(ctx,name,p){
  if(p.visible===false)return;
  const [x,y]=layerCrops[name]||CROPS[name];
  ctx.save();if(root.ParryPixelArt?.enabled)ctx.imageSmoothingEnabled=false;if(p.opacity!==undefined)ctx.globalAlpha*=p.opacity;ctx.translate(p.at.x,p.at.y);ctx.rotate(p.angle);ctx.scale(SCALE*(p.sx||1),SCALE*(p.sy||1));
  ctx.translate(-p.pivot[0],-p.pivot[1]);ctx.drawImage(layers[name],x,y);ctx.restore();
 }
 function debugDraw(ctx,q){
  ctx.save();ctx.lineWidth=.8;ctx.strokeStyle='#7affec';ctx.fillStyle='#f4d68c';
  for(const b of [q.swordArm,q.shieldArm,q.frontLeg,q.rearLeg]){
   ctx.beginPath();ctx.moveTo(b.start.x,b.start.y);ctx.lineTo(b.elbow.x,b.elbow.y);ctx.lineTo(b.end.x,b.end.y);ctx.stroke();
   for(const p of [b.start,b.elbow,b.end]){ctx.beginPath();ctx.arc(p.x,p.y,1.6,0,7);ctx.fill();}
  }
  ctx.beginPath();ctx.moveTo(q.swordArm.end.x,q.swordArm.end.y);ctx.lineTo(q.tip.x,q.tip.y);ctx.stroke();ctx.restore();
 }
 function drawCutout(ctx,q,{debug=false,editTime=q.editTime||0}={}){
  if(status!=='ready')return false;
  syncLayers();const edits=root.ParryArtEdits,p=placements(q),rest=edits?placements(pose()):null;
  const adjusted=edits?.placements('knight',p,rest,editTime,SCALE)||p;
  edits?.begin(ctx,'knight',SCALE);
  (edits?.orderFor('knight',ORDER)||ORDER).forEach(name=>drawPart(ctx,name,adjusted[name]));
  if(debug)debugDraw(ctx,q);edits?.end(ctx);return true;
 }
 function syncLayers(){const stamp=root.ParryArtEdits?.maskStamp('knight')||'';if(status==='ready'&&maskStamp!==stamp){layers=prepare(image,plumeSource);maskStamp=stamp;}}
 function editModel(){
  if(status!=='ready')return null;syncLayers();
  const labels={weapon:'剣・手・前腕',swordUpper:'剣腕の肩鎧・上腕',legs:'下半身',plumeTail:'赤い飾り布',body:'胴・兜',shieldUpper:'盾腕の上腕',shieldFore:'盾腕の前腕',shield:'盾'};
  return {id:'knight',name:'錆びた騎士',width:WIDTH,height:HEIGHT,origin:ORIGIN,unit:SCALE,source:image,order:ORDER,
   parts:Object.fromEntries(ORDER.map(key=>[key,{image:layers[key],crop:layerCrops[key]||CROPS[key],mask:key==='plumeTail'?null:MASKS[key]||null,label:labels[key]}]))};
 }
 function drawReference(ctx,{x,ground,scale}){
  if(status!=='ready')return false;
  ctx.drawImage(image,x-ORIGIN[0]*SCALE*scale,ground-ORIGIN[1]*SCALE*scale,WIDTH*SCALE*scale,HEIGHT*SCALE*scale);
  return true;
 }
 function compareIdle(){
  if(status!=='ready')return null;
  const ref=canvas(),out=canvas(),rc=ref.getContext('2d'),oc=out.getContext('2d');
  rc.drawImage(image,0,0,WIDTH,HEIGHT);
  oc.translate(ORIGIN[0],ORIGIN[1]);oc.scale(1/SCALE,1/SCALE);drawCutout(oc,pose());
  const a=rc.getImageData(0,0,WIDTH,HEIGHT).data,b=oc.getImageData(0,0,WIDTH,HEIGHT).data;
  const repaired=repairMask.getContext('2d').getImageData(0,0,WIDTH,HEIGHT).data;
  let total=0,error=0,different=0;
  for(let i=0;i<a.length;i+=4){
   // The intentionally rebuilt plume is excluded from the source-pose metric.
   if(repaired[i+3])continue;
   if(a[i+3]||b[i+3]){total++;let delta=0;
    for(let k=0;k<4;k++)delta+=Math.abs(a[i+k]-b[i+k]);
    error+=delta;if(delta>20)different++;
   }
  }
  return {pixels:total,different,ratio:different/Math.max(1,total),mean:error/Math.max(1,total)/4};
 }
 function drawParts(ctx,width,height){
  if(status!=='ready')return false;
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#182536';ctx.fillRect(0,0,width,height);
  const labels={weapon:'奥：剣・握り手・前腕',swordUpper:'奥：肩鎧ごと回る剣上腕',legs:'構えを保つ原画の下半身',plumeTail:'一本につないだ赤い飾り布',
   body:'胴・頭・赤布',shieldUpper:'手前：盾腕の上腕',shieldFore:'手前：盾腕の前腕',shield:'最前面：盾'};
  ORDER.forEach((name,i)=>{
   const x=i%4*width/4,y=Math.floor(i/4)*height/2,c=layers[name],cellW=width/4,cellH=height/2;
   const s=Math.min((cellW-28)/c.width,(cellH-52)/c.height);
   ctx.drawImage(c,x+(cellW-c.width*s)/2,y+36,c.width*s,c.height*s);
   ctx.fillStyle='#e3d4b8';ctx.font='12px system-ui';ctx.fillText(labels[name],x+12,y+21);
  });return true;
 }
 function drawEnemy(ctx,data){
  const variant=variantFor(data.e);if(variant)return variant.drawEnemy(ctx,data);
  if(!readyFor(data.e))return false;
  if(!supports(data.e)){
   if(data.staging!=='previous'&&root.ParryEnemyPuppet?.supports(data.e))return root.ParryEnemyPuppet.drawEnemy(ctx,data);
   return root.ParryCombatArt.drawEnemy(ctx,{...data,layout:layout(data.width,data.height,data.e,data.m,data.staging)});
  }
  const {l,t,q,x}=sample(data);
  ctx.save();ctx.fillStyle='#040910a0';ctx.beginPath();ctx.ellipse(x+15*l.enemyScale,l.ground+2,70*l.enemyScale,5*l.enemyScale,0,0,7);ctx.fill();ctx.restore();
  const whole=root.ParryArtEdits?.whole('knight')||{x:0,y:0,scale:1},aura={e:data.e,now:data.now,
   x:x+whole.x*SCALE*l.enemyScale,y:l.ground+whole.y*SCALE*l.enemyScale,
   scale:l.enemyScale*whole.scale,height:174,width:48};
  root.ParryCombatArt.eliteAura?.(ctx,aura);
  const customized=root.ParryArtEdits?.character('knight');
  if(q.sword&&t.p>.68&&t.rec===0&&!customized){
   const frames=[];
   for(let i=0;i<=6;i++){
    const old=sample({...data,now:data.now-(6-i)*6}),world=p=>({x:old.x+p.x*l.enemyScale,y:l.ground+p.y*l.enemyScale});
    frames.push({hand:world(old.q.swordArm.end),tip:world(old.q.tip)});
   }
   root.ParryCombatArt.bladeRibbon(ctx,frames,'#ffe3b5');
  }
  else if(!q.sword&&t.p>.40&&t.rec===0&&!customized){
   ctx.save();ctx.lineCap='round';
   for(let i=0;i<6;i++){
    const a=sample({...data,now:data.now-(6-i)*8}),b=sample({...data,now:data.now-(5-i)*8});
    ctx.strokeStyle='#ffe3b5';ctx.globalAlpha=.04+i*.025;ctx.lineWidth=2+i*1.2;
    ctx.beginPath();ctx.moveTo(a.x+a.q.tip.x*l.enemyScale,l.ground+a.q.tip.y*l.enemyScale);
    ctx.lineTo(b.x+b.q.tip.x*l.enemyScale,l.ground+b.q.tip.y*l.enemyScale);ctx.stroke();
   }ctx.restore();
  }
  ctx.save();ctx.translate(x,l.ground);ctx.scale(l.enemyScale,l.enemyScale);
  if(data.e.palette&&!root.ParryPixelArt?.paletteApplied(data.e))ctx.filter='hue-rotate('+(Number(data.e.palette.hueRotate)||0)+'deg) saturate('+(Number(data.e.palette.saturation)||100)+'%)';
  if(data.e.elite){ctx.shadowColor='#a91537';ctx.shadowBlur=7*l.enemyScale*whole.scale;}
  const ok=drawCutout(ctx,q,{debug:data.debug});ctx.restore();
  root.ParryCombatArt.eliteAura?.(ctx,aura,true);return ok;
 }
 function counterTarget(data){
  if(!readyFor(data.e))return null;
  if(!supports(data.e))return root.ParryEnemyPuppet?.counterTarget(data)||null;
  const {q,l,x}=sample(data),edits=root.ParryArtEdits,base=placements(q);
  const p=(edits?.placements('knight',base,placements(pose()),q.editTime,SCALE)||base).body;
  const v=rotate(point((625-p.pivot[0])*SCALE*(p.sx||1),(445-p.pivot[1])*SCALE*(p.sy||1)),p.angle),whole=edits?.whole('knight')||{x:0,y:0,scale:1};
  return {x:x+((p.at.x+v.x)*whole.scale+whole.x*SCALE)*l.enemyScale,y:l.ground+((p.at.y+v.y)*whole.scale+whole.y*SCALE)*l.enemyScale};
 }
 function drawHero(ctx,data){
  if(!readyFor(data.e))return false;
  const impactAt=data.pose?.lastImpactAt??data.lastImpactAt;
  const counterPhase=Number.isFinite(impactAt)&&Number.isFinite(data.now)?(data.now-impactAt)/240:data.pose?.action>0?1-data.pose.action:-1;
  const active=counterPhase>.30&&counterPhase<272/240&&['parry','just'].includes(data.pose?.lastStrikeKind);
  return (root.ParryHeroPuppet||root.ParryCombatArt).drawHero(ctx,{...data,counterPhase,counterTarget:active?counterTarget(data):null,
   layout:layout(data.width,data.height,data.e,data.m||root.ParryCombatArt.profile(data.e),data.staging)});
 }
 function bounds(q){
  const p=placements(q),out=[];
  for(const name of ORDER)for(const poly of HULLS[name])for(const [x,y] of poly){
   const t=p[name];out.push(add(t.at,rotate(point((x-t.pivot[0])*SCALE,(y-t.pivot[1])*SCALE),t.angle)));
  }
  return {minX:Math.min(...out.map(v=>v.x)),maxX:Math.max(...out.map(v=>v.x)),
   minY:Math.min(...out.map(v=>v.y)),maxY:Math.max(...out.map(v=>v.y))};
 }
 if(!assetEnemy&&root?.document&&(root.ParryPixelArt?.adopted||/(?:^|[?&])art=illustrated(?:&|$)/.test(root.location?.search||''))){
  if(!root.ParryPixelArt?.adopted)root.ParryCombatArt?.preload();preload();
 }
 return Object.freeze({SOURCE,PLUME,WIDTH,HEIGHT,SCALE,ORIGIN,PIVOTS,MASKS,CROPS,ORDER,PRIORITY,
  sourceUrl,preload,status:()=>status,ready:()=>status==='ready',supports,readyFor,layout,twoBone,
  contactAngles,pose,sample,placements,bounds,drawCutout,drawReference,compareIdle,drawParts,counterTarget,drawEnemy,drawHero,editModel});
});
