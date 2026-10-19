/* Direct original-PNG cutouts for the illustrated roster.
 * Art, pivots and masks live in character-enemy-data.js. All motion is sampled
 * from the existing score timestamps; this module owns no simulation state.
 */
(function(root,factory){
 'use strict';const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryEnemyPuppet=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const scriptUrl=root?.document?.currentScript?.src;
 const specs=root.ParryEnemyData||{},cache=new Map();
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0)),mix=(a,b,t)=>a+(b-a)*t;
 const point=(x,y)=>({x,y}),add=(a,b)=>point(a.x+b.x,a.y+b.y),sub=(a,b)=>point(a.x-b.x,a.y-b.y);
 const polar=(a,r)=>point(Math.cos(a)*r,Math.sin(a)*r),angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
 const rotate=(p,a)=>point(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));
 const length=p=>Math.hypot(p.x,p.y),distance=(a,b)=>length(sub(a,b));
 const about=(p,pivot,a)=>add(pivot,rotate(sub(p,pivot),a));
 const blend=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 const identity=id=>specs[id]?id:null;
 function idFor(e){return e?identity(e.sprite||e.id):null;}
 const cacheKey=e=>root.ParryPixelArt?.cacheKey?.(e)||idFor(e);
 const stateFor=e=>cache.get(cacheKey(e));
 function trimCache(keep){
  if(!root.ParryPixelArt?.adopted)return;
  for(const [key,state]of cache){if(cache.size<=4)break;if(key!==keep&&state.status!=='loading')cache.delete(key);}
 }
 const supports=e=>!!idFor(e);
 const unit=s=>s.height/(s.origin[1]-s.top);
 const local=(s,p)=>point((p[0]-s.origin[0])*unit(s),(p[1]-s.origin[1])*unit(s));
 const get=e=>specs[idFor(e)];
 function hasPoseEdits(id){const c=root.ParryArtEdits?.character(id),p=c?.placement;
  return !!(c&&(Object.keys(c.layers||{}).length||c.groups?.length||c.order||p&&(p.x||p.y||p.scale!==1)));
 }
 function canvas(w,h){const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}
 function polygon(ctx,polys,seam=0){for(const p of polys){ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();if(seam){ctx.lineWidth=seam*2;ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.stroke();}}}
 function cropOf(s,polys,pad=3){
  if(!polys)return [0,0,s.width,s.sourceHeight];
  const p=polys.flat(),x=Math.max(0,Math.floor(Math.min(...p.map(p=>p[0])))-pad),y=Math.max(0,Math.floor(Math.min(...p.map(p=>p[1])))-pad);
  return [x,y,Math.min(s.width,Math.ceil(Math.max(...p.map(p=>p[0])))+pad)-x,Math.min(s.sourceHeight,Math.ceil(Math.max(...p.map(p=>p[1])))+pad)-y];
 }
 function prepare(s,img,keyImage){
  const used=canvas(s.width,s.sourceHeight),uc=used.getContext('2d'),layers={};
  const underpaint=s.repairs?.length?canvas(s.width,s.sourceHeight):null;
  for(const name of [...s.priority,'body']){
   const mask=canvas(s.width,s.sourceHeight),mc=mask.getContext('2d');mc.fillStyle='#fff';
   const polys=root.ParryArtEdits?.maskFor(s.editId,name,s.parts[name]?.mask)||s.parts[name]?.mask;
   const seam=s.parts[name]?.seam||0;
   if(polys)polygon(mc,polys,seam);else mc.fillRect(0,0,s.width,s.sourceHeight);
   if(s.parts[name]?.exclude){mc.globalCompositeOperation='destination-out';polygon(mc,s.parts[name].exclude);}
   if(!s.parts[name]?.separateSource){mc.globalCompositeOperation='destination-out';mc.drawImage(used,0,0);mc.globalCompositeOperation='source-over';}
   const crop=cropOf(s,polys,seam+3),[x,y,w,h]=crop,part=canvas(w,h),pc=part.getContext('2d');
   pc.drawImage(s.parts[name]?.separateSource?keyImage:img,-x,-y,s.width,s.sourceHeight);pc.globalCompositeOperation='destination-in';pc.drawImage(mask,-x,-y);
   pc.globalCompositeOperation='source-over';
   if(name==='body')for(const repair of s.repairs||[]){
    // Concealed cloth/plate comes from a neighbouring patch of the SAME PNG.
    // Restrict it to owned arm pixels, so the neutral reassembly is unchanged.
    const patch=canvas(s.width,s.sourceHeight),rc=patch.getContext('2d'),area=cropOf(s,[repair.mask]);
    rc.drawImage(img,...repair.source,...area);rc.globalCompositeOperation='destination-in';
    const rm=canvas(s.width,s.sourceHeight),rmc=rm.getContext('2d');rmc.fillStyle='#fff';polygon(rmc,[repair.mask]);
    rc.drawImage(rm,0,0);rc.globalCompositeOperation='destination-in';rc.drawImage(used,0,0);rc.drawImage(img,0,0);
    underpaint.getContext('2d').drawImage(patch,0,0);
   }
   if(!s.parts[name]?.separateSource)uc.drawImage(mask,0,0);layers[name]={image:part,crop};
  }
  if(underpaint)layers.underpaint={image:underpaint,crop:[0,0,s.width,s.sourceHeight]};return layers;
 }
 function sourceUrl(id,e={id}){return new URL(root.ParryPixelArt?.source(specs[id].source,e)||specs[id].source,scriptUrl||'https://invalid.local/assets/character-enemy-puppet.js').href;}
 function preloadOne(id,e={id}){
  const key=cacheKey(e);if(cache.has(key)){const state=cache.get(key);cache.delete(key);cache.set(key,state);return state.pending;}
  const state={status:'loading',image:null,layers:null,pending:null};cache.set(key,state);
  const s=specs[id],read=url=>new Promise((resolve,reject)=>{
   const img=new root.Image();img.onload=()=>img.naturalWidth&&(img.naturalWidth!==s.width||img.naturalHeight!==s.sourceHeight)?reject(Error('Source dimensions do not match '+id)):resolve(img);
   img.onerror=()=>reject(Error('Missing art '+id));img.src=url;
  });
  state.pending=Promise.all([read(sourceUrl(id,e)),s.keyPose?read(new URL(root.ParryPixelArt?.source(s.keyPose.source,e)||s.keyPose.source,scriptUrl||'https://invalid.local/assets/character-enemy-puppet.js').href):null]).then(([img,keyImage])=>{
   state.layers=prepare({...s,editId:id},img,keyImage);state.image=img;state.keyImage=keyImage;state.maskStamp=root.ParryArtEdits?.maskStamp(id)||'';state.status='ready';trimCache(key);return true;
  }).catch(error=>{state.status='failed';root.console?.warn?.('[enemy cutout]',id,error);return false;});return state.pending;
 }
 function preload(e){
  if(!root?.document?.createElement||typeof root.Image!=='function')return Promise.resolve(false);
  return Promise.resolve(root.ParryArtEdits?.ready).then(()=>{
   if(e)return supports(e)?preloadOne(idFor(e),e):false;
   return Promise.all(Object.keys(specs).map(id=>preloadOne(id))).then(results=>results.every(Boolean));
  });
 }
 const ready=e=>stateFor(e)?.status==='ready';
 function twoBone(start,target,upper,lower,bend){
  const dir=angle(start,target),d=Math.max(Math.abs(upper-lower)+.00001,Math.min(upper+lower-.00001,distance(start,target)));
  const offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
  const elbow=add(start,polar(dir+bend*offset,upper));return {elbow,upper:angle(start,elbow),fore:angle(elbow,target)};
 }
 function leanFor(s,c,a,r){return (s.lean?.[0]??.07)*c+(s.lean?.[1]??-.14)*a+(s.lean?.[2]??.06)*r;}
 function armGeometry(s,arm){
  const shoulder=local(s,arm.shoulder),elbow=local(s,arm.elbow),tip=local(s,arm.tip),hand=local(s,arm.hand||arm.tip);
  const upper=distance(shoulder,elbow),fore=distance(elbow,tip),v=sub(tip,shoulder),w=sub(elbow,shoulder);
  return {shoulder,elbow,tip,hand,upper,fore,upperAngle:angle(shoulder,elbow),foreAngle:angle(elbow,tip),
   bend:arm.bend||Math.sign(v.x*w.y-v.y*w.x)||-1};
 }
 // Two hands share one rigid hilt. Each shoulder/elbow solves to its own wrist;
 // the sword and both gauntlets never inherit two incompatible arm transforms.
 const gripPlans=new WeakMap();
 function gripGeometry(s){
  return s.arms.map(a=>{const g=armGeometry(s,a);return {...g,fore:distance(g.elbow,g.hand),foreAngle:angle(g.elbow,g.hand),
   bend:a.bend||Math.sign((g.hand.x-g.shoulder.x)*(g.elbow.y-g.shoulder.y)-(g.hand.y-g.shoulder.y)*(g.elbow.x-g.shoulder.x))||-1};});
 }
 function gripContact(s,impactY){
  let plans=gripPlans.get(s);if(!plans){plans=new Map();gripPlans.set(s,plans);}
  const key=impactY.toFixed(7);if(plans.has(key))return plans.get(key);
  const waist=local(s,s.waist),lean=leanFor(s,0,1,0),tip=local(s,s.grip.tip),geometries=gripGeometry(s);
  const aim=s.grip.contactAngle;let best=null;
  for(let step=0;step<=100;step++){
   const delta=step?Math.ceil(step/2)*.015*(step%2?1:-1):0,turn=aim+delta;
   let low=0,high=Infinity;
   for(const g of geometries){
    const start=about(g.shoulder,waist,lean),offset=rotate(sub(g.hand,tip),turn),dy=impactY+offset.y-start.y;
    const radius=(g.upper+g.fore)*.97;
    if(Math.abs(dy)>=radius){high=-1;break;}
    const span=Math.sqrt(radius*radius-dy*dy),center=offset.x-start.x;
    low=Math.max(low,center-span);high=Math.min(high,center+span);
   }
   if(high<=low)continue;
   const reach=mix(low,high,s.grip.contactBias??.15),score=Math.abs(delta)+(high-low<3?.5:0);
   if(!best||score<best.score)best={reach,turn,score};
   if(score===0)break;
  }
  if(!best)throw Error('No connected two-hand contact for '+s.name);
  plans.set(key,best);return best;
 }
 function gripPose(s,{charge=0,action=0,recoil=0,impactY=-61.88,reach,now=0,sword}={}){
  const c=clamp(charge),a=clamp(action),r=clamp(recoil),lean=leanFor(s,c,a,r),waist=local(s,s.waist);
  const geometries=gripGeometry(s),plan=gripContact(s,impactY),origin=local(s,s.grip.pivot),rawTip=local(s,s.grip.tip);
  const turn=plan.turn*(sword?.blade??a)+(s.grip.windup||0)*c,offsets=geometries.map(g=>rotate(sub(g.hand,origin),turn));
  const starts=geometries.map(g=>about(g.shoulder,waist,lean));
  const contact= sub(point(-(reach??plan.reach),impactY),rotate(sub(rawTip,origin),plan.turn));
  const rest=about(origin,waist,lean);
  const hilt=sword?.hilt??a;
  let grip=point(mix(rest.x,contact.x,hilt)+(s.grip.pull?.[0]||0)*c,mix(rest.y,contact.y,hilt)+(s.grip.pull?.[1]||0)*c);
  // Project the hilt into the intersection of the two arm reach discs. This
  // only adjusts the path between poses; contact and the source pose are exact.
  for(let iteration=0;iteration<20;iteration++)for(let i=0;i<geometries.length;i++){
   const g=geometries[i],center=sub(starts[i],offsets[i]),v=sub(grip,center),d=length(v);
   const min=Math.abs(g.upper-g.fore)+.0001,max=g.upper+g.fore-.0001;
   if(d>max||d<min)grip=add(center,polar(Math.atan2(v.y,v.x),Math.max(min,Math.min(max,d))));
  }
  const placements={body:{at:waist,pivot:s.waist,angle:lean}},arms=[];
  for(const [name,part]of Object.entries(s.parts)){
   const pivot=part.pivot||s.waist;
   placements[name]=part.follow==='fixed'?{at:point(0,0),pivot:s.origin,angle:0}
    :{at:about(local(s,pivot),waist,lean),pivot,angle:lean+(part.sway||0)*(c-.7*a+r)};
   if(part.separateSource)placements[name].phaseVisible=false;
  }
  placements.body={at:waist,pivot:s.waist,angle:lean};
  if(s.keyPose)placements.strikePose={at:waist,pivot:s.keyPose.waist,angle:0,phaseVisible:false};
  placements[s.grip.part]={at:grip,pivot:s.grip.pivot,angle:turn};
  for(let i=0;i<geometries.length;i++){
   const g=geometries[i],arm=s.arms[i],hand=add(grip,offsets[i]),solved=twoBone(starts[i],hand,g.upper,g.fore,g.bend);
   const elbow=solved.elbow;
   placements[arm.upper]={at:starts[i],pivot:arm.shoulder,angle:solved.upper-g.upperAngle};
   placements[arm.fore]={at:elbow,pivot:arm.elbow,angle:solved.fore-g.foreAngle};
   arms.push({start:starts[i],elbow,hand,tip:hand,upper:solved.upper,fore:solved.fore,weight:a,upperLength:g.upper,foreLength:g.fore});
  }
  return {placements,arms,active:0,tip:add(grip,rotate(sub(rawTip,origin),turn)),lean,charge:c,action:a,recoil:r,float:0,
   face:about(local(s,s.face),waist,lean),chest:about(local(s,s.chest||s.waist),waist,lean)};
 }
 function keyTarget(s,impactY){
  const k=s.keyPose,u=unit(s),waist=local(s,s.waist),v=point((k.tip[0]-k.waist[0])*u,(k.tip[1]-k.waist[1])*u);
  const y=Math.max(-1,Math.min(1,(impactY-waist.y)/length(v)));
  const turn=Math.atan2(Math.sin(Math.PI-Math.asin(y)-Math.atan2(v.y,v.x)),Math.cos(Math.PI-Math.asin(y)-Math.atan2(v.y,v.x)));
  return {angle:turn,tip:add(waist,rotate(v,turn))};
 }
 // Turn the ready sword and its two hands together, then solve the original
 // arm cutouts back to fixed shoulders. Torso, face and feet keep their pose.
 function readySwordPose(s,q,readyPoint,bodyTurn,progress){
  const scale=s.keyPose.readyScale||1,u=unit(s)*scale,turn=bodyTurn+s.keyPose.inbetween.turn*progress;
  const origin=s.grip.pivot,offset=p=>rotate(point((p[0]-origin[0])*u,(p[1]-origin[1])*u),turn);
  const arms=s.arms.map(a=>({a,start:readyPoint(a.shoulder),offset:offset(a.hand),
   upper:distance(local(s,a.shoulder),local(s,a.elbow))*scale,
   fore:distance(local(s,a.elbow),local(s,a.hand))*scale,
   upperAngle:angle(point(...a.shoulder),point(...a.elbow)),foreAngle:angle(point(...a.elbow),point(...a.hand)),
   bend:armGeometry(s,a).bend}));
  let grip=readyPoint(origin);
  // Keep the hilt within BOTH arms' reach while retaining one rigid sword.
  for(let n=0;n<24;n++)for(const a of arms){
   const center=sub(a.start,a.offset),v=sub(grip,center),d=length(v),lo=Math.abs(a.upper-a.fore)+.0001,hi=a.upper+a.fore-.0001;
   if(d>hi||d<lo)grip=add(center,polar(Math.atan2(v.y,v.x),Math.max(lo,Math.min(hi,d))));
  }
  const placement=(at,pivot,a)=>({at,pivot,angle:a,sx:scale,sy:scale,filter:s.keyPose.readyFilter});
  q.placements[s.grip.part]=placement(grip,origin,turn);
  q.arms=arms.map(a=>{
   const hand=add(grip,a.offset),solved=twoBone(a.start,hand,a.upper,a.fore,a.bend),elbow=solved.elbow;
   q.placements[a.a.upper]=placement(a.start,a.a.shoulder,solved.upper-a.upperAngle);
   q.placements[a.a.fore]=placement(elbow,a.a.elbow,solved.fore-a.foreAngle);
   return {start:a.start,elbow,hand,tip:hand,upper:solved.upper,fore:solved.fore,weight:progress,upperLength:a.upper,foreLength:a.fore};
  });
  q.tip=add(grip,offset(s.grip.tip));q.bladeHand=q.arms[0].hand;
  q.inbetween=progress;
  return q.placements[s.grip.part];
 }
 // The authored drawing owns anatomy, including both gauntlets and wrists.
 // Only the complete upper silhouette turns; no ready-pose plate is flipped
 // to invent a different view. Original legs remain on the ground throughout.
 function keyPose(s,{t,m,age,result,recoil,impactY,editId}){
  const q=pose(s),k=s.keyPose,waist=local(s,s.waist),u=unit(s),target=keyTarget(s,impactY);
  const ease=n=>{const x=clamp(n);return x*x*(3-2*x);};
  const recovery=clamp((age-38)/(m.recovery-38));
  const releaseStart=k.releaseStart??.80,releaseTurn=k.releaseTurn??.30;
  const active=t.p>=(k.inbetween?.end??releaseStart)-1e-7||(age>=0&&age<38+.64*(m.recovery-38));
  const impacted=age>=0&&age<m.recovery,release=impacted?1:ease((t.p-releaseStart)/(1-releaseStart)),direction=k.direction;
  const bounce=impacted&&age>38?Math.sin(Math.PI*clamp(recovery/.64)):0;
  const deflect=['just','parry'].includes(result),reaction=deflect?.10*(result==='just'?1:.55):result==='guard'?0:-.08;
  const turn=active?target.angle+direction*(releaseTurn*(1-release)+reaction*bounce)
   :age>=38&&age<m.recovery?-.06*(1-recovery)/.36:leanFor(s,t.charge,0,recoil);
  const readyScale=k.readyScale||1;
  const readyPoint=(p,a=turn)=>add(waist,rotate(point((p[0]-s.waist[0])*u*readyScale,(p[1]-s.waist[1])*u*readyScale),a));
  const map=p=>active?add(waist,rotate(point((p[0]-k.waist[0])*u,(p[1]-k.waist[1])*u),turn)):readyPoint(p);
  for(const [name,p]of Object.entries(q.placements)){
   if(name==='strikePose')q.placements[name]={at:waist,pivot:k.waist,angle:turn,phaseVisible:active};
   else if(name!=='legs'){
    const pivot=p.pivot;q.placements[name]={at:readyPoint(pivot),pivot,angle:turn,sx:readyScale,sy:readyScale,
     filter:!active||name==='cape'?k.readyFilter:undefined,phaseVisible:!active||name==='cape'};
   }
  }
  q.arms=s.arms.map((arm,i)=>{
   const shoulder=active?k.shoulders[i]:arm.shoulder,elbow=active?k.elbows[i]:arm.elbow,wrist=active?k.wrists[i]:arm.hand;
   const start=map(shoulder),bend=map(elbow),hand=map(wrist);
   return {start,elbow:bend,hand,tip:hand,upper:angle(start,bend),fore:angle(bend,hand),weight:t.action,
    upperLength:distance(start,bend),foreLength:distance(bend,hand)};
  });
  q.tip=map(active?k.tip:s.grip.tip);q.bladeHand=q.arms[0].hand;
  q.face=map(active?k.face:s.face);q.chest=map(active?k.chest:s.chest);q.lean=turn;
  q.charge=t.charge;q.action=t.action;q.recoil=recoil;q.keyFrame=active?'contact':'ready';
  if(k.inbetween&&!active&&(age<0||age>=m.recovery)&&t.p>=k.inbetween.start)
   readySwordPose(s,q,readyPoint,turn,ease((t.p-k.inbetween.start)/(k.inbetween.at-k.inbetween.start)));
  const ghost=k.ghost;
  const ghostDuration=ghost?(root.ParryArtEdits?.character(editId)?.effects?.swordBlurDuration??ghost.duration):0;
  const ghostAge=ghost?(impacted?age+(1-ghost.start)*m.swing:(t.p-ghost.start)*m.swing):-1;
  if(ghost&&active&&ghostAge>=-1e-7&&ghostAge<ghostDuration-1e-7){
   const progress=clamp(ghostAge/ghostDuration),catchUp=ease(progress),readyTurn=leanFor(s,1,0,0);
   let from=readyPoint(ghost.readyGuard,readyTurn);
   const to=map(ghost.pivot);
   const sourceAngle=angle(point(...ghost.pivot),point(...k.tip));
   let fromAngle=angle(point(...ghost.readyGuard),point(...s.grip.tip))+readyTurn;
   if(k.inbetween){
    const middle=readySwordPose(s,pose(s),p=>readyPoint(p,readyTurn),readyTurn,1);
    const v=point((ghost.readyGuard[0]-middle.pivot[0])*u*readyScale,(ghost.readyGuard[1]-middle.pivot[1])*u*readyScale);
    from=add(middle.at,rotate(v,middle.angle));fromAngle+=k.inbetween.turn;
   }
   // Follow the overhead arc even when the contact blade passes -PI. A
   // shortest-angle blend would send this heavy slash underneath the body.
   let toAngle=sourceAngle+turn;while(toAngle>fromAngle)toAngle-=Math.PI*2;
   q.bladeGhost={at:point(mix(from.x,to.x,catchUp),mix(from.y,to.y,catchUp)),
    pivot:ghost.pivot,angle:mix(fromAngle,toAngle,catchUp)-sourceAngle,
    opacity:ghost.opacity*(1-ease((progress-ghost.fadeAt)/(1-ghost.fadeAt)))};
  }
  return q;
 }
 function contactReach(s,impactY){
  if(s.keyPose)return -keyTarget(s,impactY).tip.x;
  if(s.grip)return gripContact(s,impactY).reach;
  const waist=local(s,s.waist),lean=leanFor(s,0,1,0),ranges=[];
  for(const arm of s.arms||[]){
   const g=armGeometry(s,arm),start=about(g.shoulder,waist,lean),dy=impactY-start.y;
   const max=(g.upper+g.fore)*.96,min=Math.abs(g.upper-g.fore)+.01;
   ranges.push({max:-start.x+Math.sqrt(Math.max(1,max*max-dy*dy)),min:-start.x+Math.sqrt(Math.max(0,min*min-dy*dy))});
  }
  if(s.motion==='slime'){
   const start=local(s,s.lobe.pivot),tip=local(s,s.lobe.tip),scaleY=.94;
   const radius=distance(start,tip),dy=impactY-start.y*scaleY;
   return -start.x*1.10+Math.sqrt(Math.max(1,radius*radius-dy*dy));
  }
  return Math.max(Math.max(...ranges.map(v=>v.min))+1,Math.min(s.reachCap||96,...ranges.map(v=>v.max)));
 }
 function layout(w,h,e,m=root.ParryCombatArt.profile(e)){
  const s=get(e);if(!s)return null;
  const base=Math.min(w/550,h/470)*1.23,heroScale=base*.85;let enemyScale=base*(e.boss?1.22:1);
  const ground=h*.8,heroX=w*.28,hitX=heroX+72.96*heroScale,hitY=ground-72.8*heroScale;
  // A long sword can put the contact position behind the default idle spot
  // on tall/narrow stages. Reserve actual room for a forward step and return.
  if(s.advanceRoom){
   const bodyRight=local(s,s.waist).x+(s.stageRight-s.waist[0])*unit(s)*(s.keyPose?.readyScale||1);
   for(let i=0;i<4;i++){const reach=contactReach(s,(hitY-ground)/enemyScale);enemyScale=Math.min(enemyScale,(w-8-hitX)/(reach+bodyRight+s.advanceRoom));}
  }
  const impactY=(hitY-ground)/enemyScale,reach=contactReach(s,impactY),contactX=hitX+reach*enemyScale;
  const restX=s.advanceRoom?Math.max(w*.73,contactX+8*enemyScale):w*.73;
  const face=local(s,s.face),chest=local(s,s.chest||s.waist);
  // Keep the face/body readable; trailing cloth and weapons may cross an edge.
  let rightLimit=s.grip
   ?Math.min(w-6-(face.x+18)*enemyScale,w-6-(chest.x+20)*enemyScale)
   :Math.min(w-12-face.x*enemyScale,w-10-chest.x*enemyScale);
  if(s.stageRight!==undefined){const right=local(s,s.waist).x+(s.stageRight-s.waist[0])*unit(s)*(s.keyPose?.readyScale||1);rightLimit=Math.min(rightLimit,w-8-right*enemyScale);}
  const desired=Math.max(restX+26*enemyScale,contactX+(m.stage||130)*base*(e.boss?1.15:1));
  const stageX=Math.min(desired,rightLimit);
  return {base,heroScale,enemyScale,ground,heroX,hitX,hitY,impactY,reach,contactX,restX,stageX};
 }
 function pose(s,{charge=0,action=0,recoil=0,impactY=-61.88,reach,index=0,now=0,sword}={}){
  if(s.grip)return gripPose(s,{charge,action,recoil,impactY,reach,index,now,sword});
  reach??=85;
  const c=clamp(charge),a=clamp(action),r=clamp(recoil),lean=leanFor(s,c,a,r),waist=local(s,s.waist);
  const fixed={at:point(0,0),pivot:s.origin,angle:0},body={at:waist,pivot:s.waist,angle:lean};
  const placements={body},arms=[],active=s.motion==='dual'?Math.abs(index)%2:0;
  for(const [name,part] of Object.entries(s.parts)){
   if(part.follow==='fixed')placements[name]=fixed;
   else {
    const pivot=part.pivot||s.waist,p=local(s,pivot);
    placements[name]={at:about(p,waist,lean),pivot,angle:lean+(part.sway||0)*(c-.7*a+r)+(part.actionTurn||0)*a};
   }
  }
  for(let i=0;i<(s.arms||[]).length;i++){
   const arm=s.arms[i],g=armGeometry(s,arm),start=about(g.shoulder,waist,lean),weight=i===active?a:0,load=i===active?c:0;
   const support=i===active?0:a;
   let upper=g.upperAngle+lean+(arm.windup?.[0]||0)*load+(arm.support?.[0]||0)*support;
   let fore=g.foreAngle+lean+(arm.windup?.[1]||0)*load+(arm.support?.[1]||0)*support;
   const target=point(-reach,impactY),solved=twoBone(start,target,g.upper,g.fore,g.bend);
   if(['thrust','piston','palm'].includes(s.motion)){
    const readyElbow=add(start,polar(upper,g.upper)),readyTip=add(readyElbow,polar(fore,g.fore));
    const end=point(mix(readyTip.x,target.x,weight),mix(readyTip.y,target.y,weight));
    if(weight>0){const k=twoBone(start,end,g.upper,g.fore,g.bend);upper=k.upper;fore=k.fore;}
   }else{
    upper=blend(upper,solved.upper,i===active?(sword?.upper??weight):weight);
    // A low rear guard rises through the lower arc rather than flipping over
    // the head along the shortest angular path.
    const blade=i===active?(sword?.blade??weight):weight;
    if(arm.sweep){let delta=solved.fore-fore;while(delta*arm.sweep<0)delta+=arm.sweep*Math.PI*2;fore+=delta*blade;}
    else fore=blend(fore,solved.fore,blade);
   }
   const elbow=add(start,polar(upper,g.upper)),tip=add(elbow,polar(fore,g.fore));
   const hand=add(elbow,rotate(sub(g.hand,g.elbow),fore-g.foreAngle));
   placements[arm.upper]={at:start,pivot:arm.shoulder,angle:upper-g.upperAngle};
   placements[arm.fore]={at:elbow,pivot:arm.elbow,angle:fore-g.foreAngle};
   arms.push({start,elbow,hand,tip,upper,fore,weight,upperLength:g.upper,foreLength:g.fore});
  }
  let tip=arms[active]?.tip;
  if(s.motion==='slime'){
   const sx=1+.10*c+.10*a+.14*r,sy=1-.22*c-.06*a-.17*r;
   placements.body={at:point(0,0),pivot:s.origin,angle:0,sx,sy};
   const pivot=local(s,s.lobe.pivot),rawTip=local(s,s.lobe.tip),start=point(pivot.x*sx,pivot.y*sy),radius=distance(pivot,rawTip);
   const idle=angle(pivot,rawTip),targetAngle=angle(start,point(-reach,impactY));
   const turn=blend(idle-.18*c,targetAngle,a);
   placements.lobe={at:start,pivot:s.lobe.pivot,angle:turn-idle};tip=add(start,polar(turn,radius));
  }
  if(s.gear){
   const pivot=s.gear.pivot,p=about(local(s,pivot),waist,lean);
   placements.gear={at:p,pivot,angle:lean+now*.0017+c*.65-a*.9};
  }
  if(s.lance){
   const arm=s.arms[0],g=armGeometry(s,arm),a0=arms[0],delta=a0.fore-g.foreAngle;
   const pivot=local(s,s.lance.pivot),axis=sub(pivot,local(s,s.lance.tip)),n=length(axis);
   const pull=s.lance.retract*unit(s)*c,offset=rotate(point(axis.x/n*pull,axis.y/n*pull),delta);
   placements[s.lance.part]={at:add(add(a0.elbow,rotate(sub(pivot,g.elbow),delta)),offset),pivot:s.lance.pivot,angle:delta};
   tip=add(tip,offset);
  }
  const float=s.float?Math.sin(now/320)*1.8*(1-a)-c*4:0;
  // At contact the float is zero, so the very same point meets the shield.
  return {placements,arms,active,tip,lean,charge:c,action:a,recoil:r,float,
   face:about(local(s,s.face),waist,lean),chest:about(local(s,s.chest||s.waist),waist,lean)};
 }
 function sample(data){
  const {e,width,height,now=0,m=root.ParryCombatArt.profile(e),attackAt=now+3000,attackSpan=3000,
   lastImpactAt=-99999,lastDeflectAt=-99999,lastStrikeKind=''}=data;
  const s=get(e);if(!s)return null;
  const l=layout(width,height,e,m),t=root.ParryCombatArt.timeline(m,attackAt-now,now-lastImpactAt,attackSpan);
  const age=now-lastDeflectAt-38,r=age>=0&&age<170&&['just','parry'].includes(lastStrikeKind)
   ?Math.sin(Math.PI*age/170)*(lastStrikeKind==='just'?1:.55):0;
  // Guardian's body advances with the descending blade, rather than spending
  // half its travel after the contact drawing has already appeared.
  const cut=s.keyPose,cutProgress=cut?.advanceWithCut&&data.motionVersion!=='v4'?clamp((t.p-cut.releaseStart)/(1-cut.releaseStart)):null;
  const travel=cutProgress===null?t.drive:cutProgress*cutProgress*(3-2*cutProgress);
  const prepared=mix(l.restX,l.stageX,t.prep),approach=mix(mix(prepared,l.contactX,travel),l.contactX,t.rec);
  const recoilDistance=s.motion==='slime'?36:e.kind==='rogue'?29:e.kind==='wraith'?22:e.boss?16:24;
  const x=approach+recoilDistance*r*l.enemyScale;
  const index=Math.max(0,(e.index||0)-(t.rec>0?1:0));
  const isSword=['rising','dual','twohand-cut','twohand-thrust'].includes(s.motion);
  const sword=isSword&&data.motionVersion!=='v4'?root.ParryCombatArt.swordPhrase(t,m,now-lastImpactAt,lastStrikeKind):null;
  const q=s.keyPose&&data.motionVersion!=='v4'
   ?keyPose(s,{t,m,age:now-lastImpactAt,result:lastStrikeKind,recoil:r,impactY:l.impactY,editId:idFor(e)})
   :pose(s,{...t,charge:sword?.charge??t.charge,sword,recoil:r,impactY:l.impactY,reach:l.reach,index,now});
  q.sword=sword;
  q.editTime=root.ParryArtEdits?.timeFor(data)||0;
  const d={id:idFor(e),s,l,t,q,x};
  if(!data._noGroupBlur&&d.id==='guardian'&&root.ParryArtEdits?.character(d.id)?.groups?.some(g=>g.parts.includes('weapon')))groupBlur(data,d);
  return d;
 }
 function groupBlur(data,d){
  const edits=root.ParryArtEdits,{s,q,l,x}=d,k=s.keyPose.ghost,u=unit(s),whole=edits.whole(d.id);
  const duration=edits.character(d.id)?.effects?.swordBlurDuration??k.duration;
  const adjusted=old=>edits.placements(d.id,old.q.placements,pose(s).placements,old.q.editTime,u);
  const historical=back=>{
   const old={...data,now:data.now-back,_noGroupBlur:true};
   if(data.lastImpactAt>=0&&old.now<data.lastImpactAt&&data.now>=data.lastImpactAt){old.attackAt=data.lastImpactAt;old.lastImpactAt=old.lastDeflectAt=-99999;}
   return sample(old);
  };
  const sourcePoint=(p,src)=>{const v=rotate(point((src[0]-p.pivot[0])*u*(p.sx||1),(src[1]-p.pivot[1])*u*(p.sy||1)),p.angle);return add(p.at,v);};
  const actual=adjusted(d);q.groupBlur=true;
  if(q.keyFrame==='ready'){
   const old=historical(Math.min(90,duration*.45));if(old.q.keyFrame!=='ready')return;
   const p=adjusted(old).weapon,current=actual.weapon;
   const strength=clamp((Math.abs(p.angle-current.angle)+distance(p.at,current.at)/50)/.12);
   if(strength>.001)q.readyBladeGhost={...p,at:add(p.at,point((old.x-x)/(l.enemyScale*whole.scale),0)),opacity:.5*strength};
  }else if(q.bladeGhost){
   const m=data.m||root.ParryCombatArt.profile(data.e),age=data.now-data.lastImpactAt,impacted=age>=0&&age<m.recovery;
   const ghostAge=impacted?age+(1-k.start)*m.swing:(d.t.p-k.start)*m.swing;
   const old=historical(ghostAge+.01),ready=adjusted(old).weapon,target=actual.strikePose;
   const from=add(sourcePoint(ready,k.readyGuard),point((old.x-x)/(l.enemyScale*whole.scale),0)),to=sourcePoint(target,k.pivot);
   const sourceAngle=angle(point(...k.pivot),point(...s.keyPose.tip)),fromAngle=angle(point(...k.readyGuard),point(...s.grip.tip))+ready.angle;
   let toAngle=sourceAngle+target.angle;while(toAngle>fromAngle)toAngle-=Math.PI*2;
   const p=clamp(ghostAge/duration),catchUp=p*p*(3-2*p);
   q.bladeGhost={...q.bladeGhost,at:point(mix(from.x,to.x,catchUp),mix(from.y,to.y,catchUp)),angle:mix(fromAngle,toAngle,catchUp)-sourceAngle,edited:true};
  }
 }
 function drawPart(ctx,s,layer,p){
  if(p.visible===false||p.phaseVisible===false)return;
  const [x,y]=layer.crop;
  ctx.save();if(root.ParryPixelArt?.enabled)ctx.imageSmoothingEnabled=false;if(p.opacity!==undefined)ctx.globalAlpha*=p.opacity;
  if(p.filter)ctx.filter=(ctx.filter&&ctx.filter!=='none'?ctx.filter+' ':'')+p.filter;
  ctx.translate(p.at.x,p.at.y);ctx.rotate(p.angle);ctx.scale(unit(s)*(p.sx||1),unit(s)*(p.sy||1));
  ctx.translate(-p.pivot[0],-p.pivot[1]);ctx.drawImage(layer.image,x,y);ctx.restore();
 }
 function drawCutout(ctx,e,q,{debug=false,editTime=q.editTime||0}={}){
  if(!ready(e))return false;
  const s=get(e),id=idFor(e),state=stateFor(e),edits=root.ParryArtEdits;
  syncLayers(e);const rest=edits?pose(s).placements:null;
  const adjusted=edits?.placements(id,q.placements,rest,editTime,unit(s))||q.placements;
  edits?.begin(ctx,id,unit(s));
  const strike=q.placements.strikePose,editedStrike=adjusted.strikePose;
  if(q.readyBladeGhost){
   const p=q.readyBladeGhost;ctx.save();ctx.globalAlpha*=p.opacity;
   if(s.keyPose.readyFilter)ctx.filter=(ctx.filter&&ctx.filter!=='none'?ctx.filter+' ':'')+s.keyPose.readyFilter;
   ctx.translate(p.at.x,p.at.y);ctx.rotate(p.angle);ctx.scale(unit(s)*(p.sx||1),unit(s)*(p.sy||1));ctx.translate(-p.pivot[0],-p.pivot[1]);
   ctx.beginPath();for(const poly of s.keyPose.ghost.readyMask){poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.clip();ctx.drawImage(state.image,0,0);ctx.restore();
  }
  if(q.bladeGhost&&editedStrike?.visible!==false){
   const p=q.bladeGhost;ctx.save();ctx.globalAlpha*=p.opacity*(editedStrike.opacity??1);
   // Follow manual contact-pose transforms as well as the whole-character edit.
   if(editedStrike!==strike&&!p.edited){ctx.translate(editedStrike.at.x,editedStrike.at.y);ctx.rotate(editedStrike.angle);ctx.scale(editedStrike.sx||1,editedStrike.sy||1);ctx.rotate(-strike.angle);ctx.translate(-strike.at.x,-strike.at.y);}
   ctx.translate(p.at.x,p.at.y);ctx.rotate(p.angle);ctx.scale(unit(s),unit(s));ctx.translate(-p.pivot[0],-p.pivot[1]);
   ctx.beginPath();for(const poly of s.keyPose.ghost.mask){poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
   ctx.clip();ctx.drawImage(state.keyImage,0,0);ctx.restore();
  }
  if(state.layers.underpaint&&q.placements.body.phaseVisible!==false)drawPart(ctx,s,state.layers.underpaint,adjusted.body);
  for(const name of edits?.orderFor(id,s.order)||s.order){
   const p=adjusted[name];
   drawPart(ctx,s,state.layers[name],p);
  }
  if(debug){
   ctx.save();ctx.lineWidth=.9;ctx.strokeStyle='#71ffdf';ctx.fillStyle='#fff1ae';
   for(const arm of q.arms){
    ctx.beginPath();ctx.moveTo(arm.start.x,arm.start.y);ctx.lineTo(arm.elbow.x,arm.elbow.y);ctx.lineTo(arm.tip.x,arm.tip.y);ctx.stroke();
    for(const p of [arm.start,arm.elbow,arm.hand,arm.tip]){ctx.beginPath();ctx.arc(p.x,p.y,1.4,0,7);ctx.fill();}
   }
   if(q.tip){ctx.beginPath();ctx.arc(q.tip.x,q.tip.y,2,0,7);ctx.fill();}ctx.restore();
  }
  edits?.end(ctx);return true;
 }
 function syncLayers(e){
  const id=idFor(e),state=stateFor(e),stamp=root.ParryArtEdits?.maskStamp(id)||'';
  if(state?.status==='ready'&&state.maskStamp!==stamp){state.layers=prepare({...specs[id],editId:id},state.image,state.keyImage);state.maskStamp=stamp;state.match=null;}
 }
 function editModel(e){
  const id=idFor(e);if(!ready(e))return null;syncLayers(e);const s=specs[id],state=stateFor(e);
  return {id,name:s.name,width:s.width,height:s.sourceHeight,origin:s.origin,unit:unit(s),source:state.image,order:s.order,
   effects:s.keyPose?.ghost?{swordBlurDuration:s.keyPose.ghost.duration}:null,
   parts:Object.fromEntries(s.order.map(key=>[key,{...state.layers[key],source:s.parts[key]?.separateSource?state.keyImage:state.image,label:s.parts[key]?.label||'胴・頭',mask:s.parts[key]?.mask||null}]))};
 }
 function counterTarget(data){
  if(!ready(data.e))return null;
  const {id,s,l,q,x}=sample({...data,_noGroupBlur:true}),edits=root.ParryArtEdits,u=unit(s);
  const parts=edits?.placements(id,q.placements,pose(s).placements,q.editTime,u)||q.placements;
  const contact=q.keyFrame==='contact',p=parts[contact?'strikePose':'body'],src=contact?s.keyPose.chest:s.chest||s.waist;
  const v=rotate(point((src[0]-p.pivot[0])*u*(p.sx||1),(src[1]-p.pivot[1])*u*(p.sy||1)),p.angle);
  const whole=edits?.whole(id)||{x:0,y:0,scale:1};
  return {x:x+((p.at.x+v.x)*whole.scale+whole.x*u)*l.enemyScale,
   y:l.ground+(q.float+(p.at.y+v.y)*whole.scale+whole.y*u)*l.enemyScale};
 }
 function drawEnemy(ctx,data){
  if(!ready(data.e))return false;
  const d=sample(data),{s,l,t,q,x}=d;
  ctx.save();ctx.fillStyle='#03081199';ctx.beginPath();ctx.ellipse(x,l.ground+2,(s.motion==='slime'?53:39)*l.enemyScale,5*l.enemyScale,0,0,7);ctx.fill();ctx.restore();
  const whole=root.ParryArtEdits?.whole(idFor(data.e))||{x:0,y:0,scale:1},aura={e:data.e,now:data.now,
   x:x+whole.x*unit(s)*l.enemyScale,y:l.ground+(q.float+whole.y*unit(s))*l.enemyScale,
   scale:l.enemyScale*whole.scale,height:s.height,width:s.height*(s.motion==='slime'?.57:.29)};
  root.ParryCombatArt.eliteAura?.(ctx,aura);
  root.ParryCombatArt.rareAura?.(ctx,aura);
  const customized=hasPoseEdits(idFor(data.e));
  if(q.sword&&t.p>.68&&t.rec===0&&!customized&&!q.bladeGhost){
   const frames=[];
   for(let i=0;i<=6;i++){
    const old=sample({...data,now:data.now-(6-i)*6}),a=old.q.arms[old.q.active];
    const hand=old.q.bladeHand||(old.s.grip?old.q.placements[old.s.grip.part].at:a.hand);
    const world=p=>({x:old.x+p.x*l.enemyScale,y:l.ground+(p.y+old.q.float)*l.enemyScale});
    frames.push({hand:world(hand),tip:world(old.q.tip)});
   }
   root.ParryCombatArt.bladeRibbon(ctx,frames,data.e.color||'#ebd4a5');
  }
  else if(!q.sword&&t.p>.40&&t.rec===0&&!customized){
   ctx.save();ctx.lineCap='round';
   for(let i=0;i<5;i++){
    const old=sample({...data,now:data.now-(5-i)*9}),next=sample({...data,now:data.now-(4-i)*9});
    ctx.strokeStyle=data.e.color||'#deebff';ctx.globalAlpha=.04+i*.035;ctx.lineWidth=2+i;
    ctx.beginPath();ctx.moveTo(old.x+old.q.tip.x*l.enemyScale,l.ground+(old.q.tip.y+old.q.float)*l.enemyScale);
    ctx.lineTo(next.x+next.q.tip.x*l.enemyScale,l.ground+(next.q.tip.y+next.q.float)*l.enemyScale);ctx.stroke();
   }ctx.restore();
  }
  ctx.save();ctx.translate(x,l.ground+q.float*l.enemyScale);ctx.scale(l.enemyScale,l.enemyScale);
  if(data.e.palette&&!root.ParryPixelArt?.paletteApplied(data.e))ctx.filter='hue-rotate('+(Number(data.e.palette.hueRotate)||0)+'deg) saturate('+(Number(data.e.palette.saturation)||100)+'%)';
  if(s.float)ctx.globalAlpha*=1-q.recoil*.20;
  if(s.effect&&q.charge>.1){
   // A spell gathers at the actual palm; no countdown ring or new hit timer.
   const p=q.arms[0].hand,r=5+q.charge*4,phase=data.now/730;
   ctx.save();ctx.strokeStyle=s.effect==='tone'?'#ffe6a0':'#b6ecff';ctx.fillStyle=ctx.strokeStyle;
   ctx.globalAlpha=.25+.35*q.charge;ctx.lineWidth=1.1;
   ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.closePath();ctx.stroke();
   for(let i=0;i<3;i++){const a=phase+i*Math.PI*2/3;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r*1.8,p.y+Math.sin(a)*r*1.5,1.2,0,7);ctx.fill();}ctx.restore();
  }
  if(data.e.elite||data.e.rare){ctx.shadowColor=data.e.rare?'#ffe3a1':'#a91537';ctx.shadowBlur=7*l.enemyScale*whole.scale;}
  const ok=drawCutout(ctx,data.e,q,{debug:data.debug});ctx.restore();
  root.ParryCombatArt.eliteAura?.(ctx,aura,true);root.ParryCombatArt.rareAura?.(ctx,aura,true);return ok;
 }
 function drawReference(ctx,e,{x,ground,scale}){
  if(!ready(e))return false;
  const s=get(e),u=unit(s)*scale;ctx.save();
  if(e.palette&&!root.ParryPixelArt?.paletteApplied(e))ctx.filter='hue-rotate('+(Number(e.palette.hueRotate)||0)+'deg) saturate('+(Number(e.palette.saturation)||100)+'%)';
  ctx.drawImage(stateFor(e).image,x-s.origin[0]*u,ground-s.origin[1]*u,s.width*u,s.sourceHeight*u);ctx.restore();return true;
 }
 function compareIdle(e){
  if(!ready(e))return null;
  const state=stateFor(e);if(state.match)return state.match;
  const s=get(e),ref=canvas(s.width,s.sourceHeight),out=canvas(s.width,s.sourceHeight),rc=ref.getContext('2d'),oc=out.getContext('2d');
  rc.drawImage(state.image,0,0);oc.translate(...s.origin);oc.scale(1/unit(s),1/unit(s));
  drawCutout(oc,e,pose(s));
  const a=rc.getImageData(0,0,s.width,s.sourceHeight).data,b=oc.getImageData(0,0,s.width,s.sourceHeight).data;
  let total=0,different=0;
  for(let i=0;i<a.length;i+=4)if(a[i+3]||b[i+3]){total++;let delta=0;for(let k=0;k<4;k++)delta+=Math.abs(a[i+k]-b[i+k]);if(delta>20)different++;}
  state.match=Object.freeze({pixels:total,different,ratio:different/Math.max(1,total)});return state.match;
 }
 function drawParts(ctx,e,w,h){
  if(!ready(e))return false;
  const s=get(e),layers=stateFor(e).layers,names=layers.underpaint?['underpaint',...s.order]:s.order,cols=4,rows=Math.ceil(names.length/cols);
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#182536';ctx.fillRect(0,0,w,h);
  names.forEach((name,i)=>{
   const {image}=layers[name],cw=w/cols,ch=h/rows,x=i%cols*cw,y=Math.floor(i/cols)*ch;
   const scale=Math.min((cw-20)/image.width,(ch-45)/image.height);
   ctx.drawImage(image,x+(cw-image.width*scale)/2,y+35,image.width*scale,image.height*scale);
   ctx.fillStyle='#e6d7bd';ctx.font='13px system-ui';ctx.fillText(name==='underpaint'?'腕の下に隠れる胴の補修':s.parts[name]?.label||'胴・頭',x+10,y+22);
  });return true;
 }
 return Object.freeze({specs,idFor,supports,sourceUrl,preload,ready,status:e=>stateFor(e)?.status||'idle',
  unit,local,armGeometry,gripContact,keyTarget,contactReach,layout,pose,sample,twoBone,drawCutout,counterTarget,drawEnemy,drawReference,drawParts,compareIdle,editModel});
});
