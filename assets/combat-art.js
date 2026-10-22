/* Optional presentation for art=impact. Uses the existing artwork and score timestamps.
 * No timers, audio, input, damage, persistence, or simulation state belong in this module.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryCombatArt=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
 const reverseTurn=-Math.PI*2;
 // A brief white crescent flashes at the enemy's front, suggesting an instant
 // ranged cut without a slowly travelling projectile. Uses the counter phase.
 function counterSlash(ctx,{kind,phase,origin,target,scale=1,tint=null}){
  if(!['parry','just'].includes(kind)||!origin||!target||!(phase>.30&&phase<272/240))return false;
  const just=kind==='just',fade=smooth((phase-.30)/.045)*(1-smooth((phase-212/240)/.25));
  const dx=target.x-origin.x,dy=target.y-origin.y,distance=Math.hypot(dx,dy);
  if(distance<1)return false;
  const angle=Math.atan2(dy,dx)-.35,height=(just?78:49)*scale,depth=(just?29:18)*scale,opacity=(just?.72:.64)*fade;
  const offset=depth+8*scale*(1-smooth((phase-.30)/.12));
  const position={x:target.x-Math.cos(angle)*offset,y:target.y-Math.sin(angle)*offset};
  ctx.save();ctx.translate(position.x,position.y);ctx.rotate(angle);ctx.lineCap='round';
  ctx.globalAlpha*=opacity;ctx.fillStyle=tint?.fill||'#efffff';ctx.shadowColor=tint?.glow||'#528dff';ctx.shadowBlur=(just?12:8)*scale;
  ctx.beginPath();ctx.moveTo(-depth,-height);
  ctx.bezierCurveTo(depth*1.65,-height*.64,depth*1.65,height*.64,-depth,height);
  ctx.bezierCurveTo(depth*.55,height*.53,depth*.55,-height*.53,-depth,-height);ctx.closePath();ctx.fill();
  ctx.strokeStyle=tint?.edge||'#89b9ff';ctx.lineWidth=(just?2:1.4)*scale;ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle=tint?.core||'#f7ffff';ctx.lineWidth=(just?1.6:1)*scale;
  ctx.beginPath();ctx.moveTo(-depth,-height);ctx.bezierCurveTo(depth*1.65,-height*.64,depth*1.65,height*.64,-depth,height);ctx.stroke();
  ctx.restore();
  const hit=smooth((phase-.33)/.045)*(1-smooth((phase-.50)/.18));
  if(hit>0){
   ctx.save();ctx.globalAlpha*=(just?.65:.45)*hit;ctx.strokeStyle=tint?.edge||(just?'#d4fcff':'#c2dcff');ctx.lineWidth=(just?3:2)*scale;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(target.x-12*scale,target.y-22*scale);ctx.lineTo(target.x+12*scale,target.y+22*scale);ctx.stroke();ctx.restore();
  }
  return {position,tip:{x:position.x+Math.cos(angle)*depth,y:position.y+Math.sin(angle)*depth},target,opacity,size:{height,depth}};
 }
 // Pure cosmetic drawing: fixed counts and time-based paths keep combat RNG untouched.
 function comboAura(ctx,{now=0,combo=0,x=0,y=0,scale=1}){
  if(![now,combo,x,y,scale].every(Number.isFinite)||scale<=0)return false;
  const tier=combo>=50?3:combo>=25?2:combo>=10?1:0;if(!tier)return false;
  const alpha=ctx.globalAlpha,color=['','#92dfff','#bc9dff','#ffe49b'][tier],pulse=.5+.5*Math.sin(now/220);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=5;
  ctx.globalAlpha*=.18+tier*.035;ctx.lineWidth=1.1+tier*.3;ctx.beginPath();ctx.ellipse(0,1,37+tier*6+pulse*2,5+tier,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<4+tier*3;i++){
   const phase=((now/1700+i*.618)%1+1)%1,px=Math.sin(i*2.4+now/900)*(20+tier*6),py=-phase*(75+tier*15);
   ctx.globalAlpha=alpha*(.13+tier*.035)*Math.sin(Math.PI*phase);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(px,py+9);ctx.quadraticCurveTo(px-4,py+4,px+2,py-4);ctx.stroke();
   ctx.fillRect(px-1,py-2,2,2);
  }
  ctx.restore();return {tier,count:4+tier*3};
 }
 function rareAura(ctx,{e,now=0,x=0,y=0,scale=1,height=140,width=46},front=false){
  if(!e?.rare)return false;
  const phase=now/1000,alpha=ctx.globalAlpha;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  if(!front){
   ctx.shadowColor='#ffe2a0';ctx.shadowBlur=16*scale;ctx.fillStyle='#ffe3a1';ctx.globalAlpha=alpha*(.12+.025*Math.sin(phase*2));
   ctx.beginPath();ctx.ellipse(0,0,width*1.20,7,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=alpha*.055;ctx.beginPath();ctx.ellipse(0,-height*.48,width*1.22,height*.60,0,0,Math.PI*2);ctx.fill();
  }
  for(let i=front?1:0;i<14;i+=2){
   const twinkle=Math.pow(Math.max(0,Math.sin(phase*2.7+i*2.399)),4);
   if(twinkle<.015)continue;
   const side=i%4<2?-1:1,px=side*width*(.64+(i%3)*.22)+Math.sin(phase*.65+i)*width*.13;
   const py=-height*(.10+(i*.173)%1.05)+Math.sin(phase*.75+i*1.3)*3,r=(2.2+i%3*.75)*(.65+twinkle*.35);
   ctx.globalAlpha=alpha*(.18+.68*twinkle);ctx.fillStyle=i%3?'#fff1c3':'#d8fbff';ctx.shadowColor=i%3?'#ffd078':'#a6f3ff';ctx.shadowBlur=6*scale;
   ctx.beginPath();ctx.moveTo(px,py-r*2);ctx.lineTo(px+r*.23,py-r*.23);ctx.lineTo(px+r,py);ctx.lineTo(px+r*.23,py+r*.23);
   ctx.lineTo(px,py+r*2);ctx.lineTo(px-r*.23,py+r*.23);ctx.lineTo(px-r,py);ctx.lineTo(px-r*.23,py-r*.23);ctx.closePath();ctx.fill();
  }
  ctx.restore();return true;
 }
 // Ambient rank identity only: deterministic, independent of attack/score clocks.
 // Draw the dark wisps behind the art and sparse embers after it.
 function eliteAura(ctx,{e,now=0,x=0,y=0,scale=1,height=140,width=46},front=false){
  if(!e?.elite)return false;
  const phase=now/1000,pulse=.88+.12*Math.sin(phase*2.4);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  if(!front){
   ctx.fillStyle='#8e1231';ctx.globalAlpha=.22*pulse;ctx.shadowColor='#b51c40';ctx.shadowBlur=14*scale;
   ctx.beginPath();ctx.ellipse(0,0,width*1.22,8,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=.075*pulse;ctx.beginPath();ctx.ellipse(0,-height*.46,width*1.08,height*.52,0,0,Math.PI*2);ctx.fill();
   for(let i=0;i<6;i++){
    const side=i%2?1:-1,lane=Math.floor(i/2),base=side*width*(.43+lane*.24);
    const rise=height*(.66+lane*.15+.055*Math.sin(phase*2.1+i*1.8));
    const sway=Math.sin(phase*2.6+i*1.9)*width*.26,thickness=width*(.40-lane*.045);
    const shape=inset=>{
     const r=thickness*inset;ctx.beginPath();ctx.moveTo(base-r,0);
     ctx.bezierCurveTo(base-r*1.6,-rise*.34,base+side*r+sway,-rise*.62,base+sway-side*r*.5,-rise);
     ctx.bezierCurveTo(base+sway+r*.75,-rise*.73,base+r*1.5,-rise*.28,base+r,0);ctx.closePath();ctx.fill();
    };
    ctx.fillStyle='#b51b3b';ctx.globalAlpha=(.19+lane*.025)*pulse;shape(1);
    ctx.shadowBlur=0;ctx.fillStyle='#170811';ctx.globalAlpha=.72;shape(.72);
   }
  }else{
   ctx.shadowColor='#f33b58';ctx.shadowBlur=4*scale;ctx.fillStyle='#ec3755';
   for(let i=0;i<9;i++){
    const age=(phase*(.30+i%3*.035)+i*.137)%1,side=i%2?1:-1;
    const px=side*width*(.68+.22*Math.sin(i*2.3+age*3)),py=-height*age;
    ctx.globalAlpha=Math.sin(age*Math.PI)*(.32+i%3*.07);const r=1.05+i%2*.4;
    ctx.beginPath();ctx.moveTo(px,py-r*2);ctx.lineTo(px+r,py);ctx.lineTo(px,py+r*2);ctx.lineTo(px-r,py);ctx.closePath();ctx.fill();
   }
  }
  ctx.restore();return true;
 }
 const PROFILES=Object.freeze({
  slime:{swing:315,prepare:830,reach:49,stage:110,recovery:410,accent:'#8ef9de'},
  knight:{swing:270,prepare:850,reach:110,stage:130,recovery:380,accent:'#eee0ff'},
  rogue:{swing:175,prepare:635,reach:110,stage:155,recovery:330,accent:'#ffc0d2'},
  wraith:{swing:300,prepare:790,reach:108,stage:110,recovery:440,accent:'#a2dbff'},
  guardian:{swing:360,prepare:980,reach:130,stage:145,recovery:520,accent:'#ffdb92'}
 });
 const sprite=e=>e.sprite||e.id;
 function profile(e){return PROFILES[e.kind]||PROFILES.knight;}
 function layout(width,height,e={},m=profile(e)){
  const boss=e.boss?1.22:1;
  // Reserve both the counter-sweep on the left and shield/recoil on the right.
  // The width bound matters on phones; the height bound prevents clipping overhead swings.
  const base=Math.min((width-20)/(88+64+(m.reach+74)*boss),height*.60/(145*boss));
  const heroScale=base*1.10,enemyScale=base*boss;
  const heroX=Math.max(width*.24,78*heroScale+8),ground=height*.80;
  const hitX=heroX+58*heroScale,hitY=ground-50*heroScale;
  const contactX=hitX+m.reach*enemyScale;
  const restX=width-66*enemyScale-10;
  return {base,heroScale,enemyScale,heroX,ground,hitX,hitY,contactX,
   restX:Math.max(contactX,restX),stageX:Math.max(contactX,restX+4*enemyScale),
   impactY:(hitY-ground)/enemyScale};
 }
 function timeline(m,untilImpact,sinceImpact,span=2000){
  const prepare=m.cuePrepare??Math.min(m.prepare,Math.max(m.swing+120,span-130));
  const prep=m.noWindup?0:smooth((prepare-untilImpact)/(prepare-m.swing));
  const p=clamp((m.swing-untilImpact)/m.swing);
  // The first part of the swing stores energy; its final third releases it.
  const drive=p*p*p;
  // A short, physical settle at contact, then a longer recovery. Game time continues.
  const rec=sinceImpact>=0&&sinceImpact<m.recovery
   ?1-smooth((sinceImpact-38)/(m.recovery-38)):0;
  return {prep,p,drive,rec,action:Math.max(drive,rec),charge:prep*(1-drive)*(1-rec)};
 }
 // Authored pose channels for sword cutouts, independent of approach/game time.
 // Shoulder leads the blade. Recovery retracts the hilt before reorienting it;
 // it does not play the attack backwards. Values above one mean followthrough.
 function swordPhrase(t,m,sinceImpact,result='just'){
  const key=(u,keys)=>{
   for(let i=1;i<keys.length;i++)if(u<=keys[i][0]){
    const [x,a]=keys[i-1],[y,b]=keys[i];return mix(a,b,smooth((u-x)/(y-x)));
   }
   return keys[keys.length-1][1];
  };
  if(sinceImpact>=0&&sinceImpact<m.recovery){
   const u=clamp((sinceImpact-38)/(m.recovery-38)),deflected=['just','parry'].includes(result);
   const stop=result==='guard',peak=deflected?(result==='just'?.84:.90):stop?.97:1.10;
   return {upper:key(u,[[0,1],[.20,.88],[.48,.62],[1,0]]),
    blade:key(u,[[0,1],[.20,peak],[.48,deflected?.93:stop?1:1.06],[.72,.55],[1,0]]),
    hilt:key(u,[[0,1],[.20,.78],[.48,.56],[1,0]]),charge:0,phase:u===0?'contact':u<.48?'rebound':'return'};
  }
  const raw=Math.pow(clamp((t.p-.16)/.84),3),end=(raw-.9)/.1;
  const a=raw>.9?.9+.1*(end+end*end-end*end*end):raw,overlap=Math.sin(a*Math.PI);
  return {upper:a+.16*overlap,blade:a-.12*overlap,hilt:a-.05*overlap,
   charge:t.prep*(1-a),phase:t.p>0?'release':t.prep>0?'anticipation':'idle'};
 }
 // A short swept blade surface, rather than a line following only its tip.
 // Sampled points are world coordinates, so body travel is included correctly.
 function bladeRibbon(ctx,frames,color='#e9d9b5'){
  if(frames.length<2)return;
  ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#fff6dc';ctx.lineWidth=1.1;
  for(let i=1;i<frames.length;i++){
   const a=frames[i-1],b=frames[i],inner=f=>[mix(f.hand.x,f.tip.x,.28),mix(f.hand.y,f.tip.y,.28)];
   if(Math.hypot(b.tip.x-a.tip.x,b.tip.y-a.tip.y)<1)continue;
   const p=inner(a),q=inner(b);ctx.globalAlpha=.035+.12*i/(frames.length-1);
   ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(a.tip.x,a.tip.y);ctx.lineTo(b.tip.x,b.tip.y);ctx.lineTo(...q);ctx.closePath();ctx.fill();
   ctx.globalAlpha=.06+.23*i/(frames.length-1);ctx.beginPath();ctx.moveTo(a.tip.x,a.tip.y);ctx.lineTo(b.tip.x,b.tip.y);ctx.stroke();
  }
  ctx.restore();
 }
 function heroJoints(action){
  const a=clamp(action);if(a===0)return {shoulder:0,elbow:0};
  const t=1-a;
  const shoulder=t<.16?mix(0,-.16,smooth(t/.16))
   :t<.62?mix(-.16,-5.40,smooth((t-.16)/.46))
   :mix(-5.40,reverseTurn,smooth((t-.62)/.38));
  return {shoulder,elbow:-.32*Math.sin(-shoulder)};
 }
 function rotate(point,pivot,angle){
  const x=point[0]-pivot[0],y=point[1]-pivot[1];
  return [pivot[0]+x*Math.cos(angle)-y*Math.sin(angle),pivot[1]+x*Math.sin(angle)+y*Math.cos(angle)];
 }
 function heroTip(action){
  const a=heroJoints(action);
  const tip=rotate(rotate([27,73],[179,166],a.elbow),[211,166],a.shoulder);
  return [(tip[0]-211)*.34,(tip[1]-320)*.34];
 }
 // Two rigid links from the adopted SVG. Solve the endpoint, not a guessed wrist angle.
 function knightContact(reach,impactY){
  const shoulder=[268,337],elbow=[220,322],tip=[28,28];
  const v1=[elbow[0]-shoulder[0],elbow[1]-shoulder[1]];
  const v2=[tip[0]-elbow[0],tip[1]-elbow[1]];
  const l1=Math.hypot(...v1),l2=Math.hypot(...v2);
  const tx=454-reach/.20-shoulder[0],ty=739+impactY/.20-shoulder[1];
  const relative=Math.acos(Math.max(-1,Math.min(1,(tx*tx+ty*ty-l1*l1-l2*l2)/(2*l1*l2))));
  const start1=Math.atan2(v1[1],v1[0]),start2=Math.atan2(v2[1],v2[0]);
  const angle=Math.atan2(ty,tx)-Math.atan2(l2*Math.sin(relative),l1+l2*Math.cos(relative))-start1;
  return {shoulder:Math.atan2(Math.sin(angle),Math.cos(angle)),elbow:relative-(start2-start1)};
 }
 function knightJoints(pose,m,impactY){
  const contact=knightContact(m.reach,impactY),a=clamp(pose.action),c=clamp(pose.charge);
  return {
   swordShoulder:.30*c+contact.shoulder*a,
   swordElbow:.10*c+contact.elbow*a-.18*Math.sin(a*Math.PI),
   shieldShoulder:-.12*c+.14*a,shieldElbow:.10*c-.09*a,head:-.035*c+.04*a
  };
 }
 function knightTip(joints){
  const tip=rotate(rotate([28,28],[220,322],joints.swordElbow),[268,337],joints.swordShoulder);
  return [(454-tip[0])*.20,(tip[1]-739)*.20];
 }
 function stroke(ctx,points,color,width,alpha=1){
  ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();
 }
 function shadow(ctx,x,y,s,wide=1){
  ctx.save();ctx.fillStyle='#030914a8';ctx.beginPath();
  ctx.ellipse(x,y+2,39*s*wide,7*s,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function trail(ctx,points,color){
  for(let i=1;i<points.length;i++){
   const t=i/(points.length-1);
   stroke(ctx,[points[i-1],points[i]],color,3+9*t,.04+.21*t);
   stroke(ctx,[points[i-1],points[i]],'#f5faff',.8+1.4*t,.06+.38*t);
  }
 }
 function preload(){return Promise.all([root.ParryHeroReady?.preload(),root.ParryKnightTrace?.preload()]);}
 function readyFor(e={}){
  if(!e)return false;
  return !!root.ParryHeroReady?.ready()&&
   (sprite(e)==='knight'?!!root.ParryKnightTrace?.ready():!!root.ParryCharacterArt?.drawEnemy);
 }
 function drawHero(ctx,data){
  const {now=0,pose={},width,height,e={}}=data;
  const art=root.ParryHeroReady;if(!readyFor(e))return false;
  const l=data.layout||layout(width,height,e,data.m||profile(e));
  const action=clamp(pose.action),phase=1-action;
  const weight=action>0?Math.sin(phase*Math.PI):0;
  const settle=clamp(pose.push),hurt=clamp(pose.hurt)*(pose.lastStrikeKind==='guard'?.35:1);
  shadow(ctx,l.heroX,l.ground,l.heroScale,1.16);
  ctx.save();ctx.translate(l.heroX+(weight*8-settle*3-hurt*6)*l.heroScale,l.ground);
  ctx.scale(l.heroScale,l.heroScale);
  // Weight shifts through the whole silhouette; the feet stay on their baseline.
  ctx.rotate(weight*.035-settle*.025-hurt*.065);
  ctx.scale(1+hurt*.02,1-hurt*.035);
  if(action>.10&&action<.83){
   const points=[];
   for(let i=0;i<7;i++)points.push(heroTip(clamp(action+.18*(1-i/6))));
   trail(ctx,points,pose.lastStrikeKind==='just'?'#92efff':'#c1dfff');
  }
  const ok=art.drawHero(ctx,{...pose,now,joints:heroJoints(action)});
  ctx.restore();return ok;
 }
 function drawEnemy(ctx,data){
  const {e,m=profile(e),now,width,height,attackAt,attackSpan,lastImpactAt=-99999,
   lastDeflectAt=-99999,lastStrikeKind=''}=data;
  if(!e)return false;
  if(!readyFor(e))return false;
  const traced=sprite(e)==='knight';
  // On loading failure return control to game.js's existing renderer.
  const art=traced?root.ParryKnightTrace:root.ParryCharacterArt;
  if(!art?.drawEnemy||(traced&&!art.ready()))return false;
  const l=data.layout||layout(width,height,e,m),after=now-lastImpactAt;
  const t=timeline(m,attackAt-now,after,attackSpan);
  const prepared=mix(l.restX,l.stageX,t.prep);
  const x=mix(mix(prepared,l.contactX,t.drive),l.contactX,t.rec);
  const deflectAge=now-lastDeflectAt;
  const recoil=deflectAge>=0&&deflectAge<170&&['just','parry'].includes(lastStrikeKind)
   ?Math.sin(Math.PI*deflectAge/170)*(lastStrikeKind==='just'?1:.55):0;
  const hitRecoil=recoil*(e.boss?8:14);
  shadow(ctx,x,l.ground,l.enemyScale,e.boss?1.2:1);
  ctx.save();ctx.translate(x+hitRecoil*l.enemyScale,l.ground);
  ctx.scale(-l.enemyScale,l.enemyScale);
  if(e.palette&&'filter' in ctx)ctx.filter='hue-rotate('+(Number(e.palette.hueRotate)||0)+'deg) saturate('+(Number(e.palette.saturation)||100)+'%)';
  const drawPose={e,m,now,weighted:true,charge:t.charge,action:t.action,p:e.kind==='slime'?t.action:t.drive,rec:t.rec,
   recoil,impact:after>=0&&after<175,impactY:l.impactY};
  if(traced)drawPose.joints=knightJoints(drawPose,m,l.impactY);
  if(t.p>.27&&t.rec===0){
   const points=[];
   for(let i=0;i<7;i++){
    const p=clamp(t.p-.19*(1-i/6)),drive=p*p*p;
    const c=t.prep*(1-drive),a=drive;
    if(traced)points.push(knightTip(knightJoints({charge:c,action:a},m,l.impactY)));
    else {
     const tip=art.attackTip({...drawPose,p:drive,action:a,charge:c,rec:0,recoil:0});
     points.push([tip.x,tip.y]);
    }
   }
   trail(ctx,points,e.color||m.accent);
  }
  // Heel dust under the push-off emphasizes motion without obscuring the weapon.
  if(t.p>.30&&t.p<.90){
   for(let i=0;i<3;i++)stroke(ctx,[[-13-i*9,-2-i%2*4],[-23-i*12,-3-i%2*5]],'#adadbf',2,.16*(1-t.p));
  }
  const ok=art.drawEnemy(ctx,drawPose);
  if(ok&&(e.elite||e.rare)){
   // Preserve variant identity after leaving game.js's legacy drawing branch.
   const color=e.rare?'#f3d084':'#ec929f';
   ctx.save();ctx.globalAlpha=.65;ctx.strokeStyle=color;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.ellipse(0,-67,e.kind==='slime'?52:47,e.kind==='slime'?45:76,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.restore();return ok;
 }
 if(root?.document&&/(?:^|[?&])art=impact(?:&|$)/.test(root.location?.search||''))preload();
 return Object.freeze({PROFILES,profile,layout,timeline,swordPhrase,bladeRibbon,counterSlash,comboAura,eliteAura,rareAura,heroJoints,heroTip,knightContact,knightJoints,knightTip,preload,readyFor,drawHero,drawEnemy});
});
