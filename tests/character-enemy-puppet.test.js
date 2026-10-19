'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const P=require('../assets/encounters'),combat=require('../assets/combat-art'),specs=require('../assets/character-enemy-data');
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,a+' != '+b),plain=x=>JSON.parse(JSON.stringify(x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function load(fail=''){
 const calls=[],urls=[];
 const ctx=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>{
  for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),k+' has a non-finite coordinate');calls.push({key:k,args});
 },set:(o,k,v)=>{o[k]=v;return true;}});
 const host={URL,console:{warn(){}},location:{search:''},document:{createElement:()=>({getContext:()=>ctx()})},
  ParryCombatArt:{...combat,readyFor:()=>true,drawHero:()=>true,drawEnemy:()=>true}};
 host.Image=class{set src(url){urls.push(url);queueMicrotask(()=>fail&&url.includes(fail)?this.onerror?.():this.onload?.());}};
 for(const file of ['character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']){
  host.document.currentScript={src:'https://example.org/assets/'+file+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+file+'.js','utf8'),{window:host,URL,console});
 }
 return {api:host.ParryEnemyPuppet,knight:host.ParryKnightPuppet,hero:host.ParryHeroPuppet,host,ctx,calls,urls};
}
function data(e,time=100,width=900,height=550,result='just',index=0){
 return {e:{...e,index:index+(time>=1500?1:0)},m:combat.profile(e),width,height,now:10000+time,attackAt:time<1500?11500:14500,
  attackSpan:3000,lastImpactAt:time>=1500?11500:-99999,lastDeflectAt:time>=1500?11500:-99999,lastStrikeKind:result};
}
test('both rare characters paint sparkle passes around the real moving and floating root',async()=>{
 const {api,host,ctx}=load();await api.preload();const passes=[];
 host.ParryCombatArt.rareAura=(c,value,front=false)=>{passes.push({...value,front});return combat.rareAura(c,value,front);};
 for(const e of [P.byId.golden_tone,P.byId.gem_slime])for(const time of [100,1390,1500,1608,2050])for(const [w,h]of [[900,550],[360,640]]){
  const input=data(e,time,w,h),before=JSON.stringify(input),sample=api.sample(input);passes.length=0;
  assert.equal(api.drawEnemy(ctx(),input),true);assert.equal(passes.length,2);assert.equal(passes[0].front,false);assert.equal(passes[1].front,true);
  near(passes[0].x,sample.x);near(passes[0].y,sample.l.ground+sample.q.float*sample.l.enemyScale);assert.equal(JSON.stringify(input),before);
  assert.equal(JSON.stringify(api.sample({...input,e:{...input.e,rare:false}})),JSON.stringify(sample),'sparkles do not affect the pose');
 }
});

test('all illustrated elite variants share the aura and follow their sampled root without changing poses',async()=>{
 const {api,knight,host,ctx}=load();await api.preload();await knight.preload();const aura=[];
 host.ParryCombatArt.eliteAura=(c,value,front=false)=>{if(value.e.elite)aura.push({...value,front});return combat.eliteAura(c,value,front);};
 for(const base of P.all.filter(e=>!e.rare))for(const time of [100,1390,1500,1623,2050]){
  const renderer=knight.supports(base)?knight:api,input=data(base,time),eliteInput={...input,e:{...input.e,elite:true}},before=JSON.stringify(eliteInput);
  assert.equal(JSON.stringify(renderer.sample(input)),JSON.stringify(renderer.sample(eliteInput)),'rank does not change the attack pose');
  aura.length=0;assert.equal(renderer.drawEnemy(ctx(),eliteInput),true);assert.equal(aura.length,2);
  assert.equal(aura[0].front,false);assert.equal(aura[1].front,true);
  const sampled=renderer.sample(eliteInput);near(aura[0].x,sampled.x);near(aura[0].y,sampled.l.ground+(sampled.q.float||0)*sampled.l.enemyScale);
  assert.ok(aura[0].height>0&&aura[0].width>0);assert.equal(JSON.stringify(eliteInput),before);
 }
 const edits=require('../assets/character-edit');host.ParryArtEdits=edits;
 try{
  edits.setProject({schema:edits.SCHEMA,version:1,characters:Object.fromEntries(['knight','guardian'].map(id=>[id,{placement:{x:-32,y:18,scale:1.3},layers:{}}]))});
  for(const id of ['knight','guardian']){
   const renderer=id==='knight'?knight:api,input=data(P.findByKey(id+':elite'),1440,360,640),sample=renderer.sample(input),u=id==='knight'?.18:api.unit(api.specs.guardian);
   aura.length=0;renderer.drawEnemy(ctx(),input);
   near(aura[0].x,sample.x-32*u*sample.l.enemyScale);near(aura[0].y,sample.l.ground+((sample.q.float||0)+18*u)*sample.l.enemyScale);
   near(aura[0].scale,sample.l.enemyScale*1.3);
  }
 }finally{edits.setProject(edits.empty());}
});
function alphaStats(b){
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20),chunks=[];
 assert.equal(b[24],8);assert.equal(b[25],6);assert.equal(b[28],0);
 for(let o=8;o<b.length;){const n=b.readUInt32BE(o);if(b.toString('ascii',o+4,o+8)==='IDAT')chunks.push(b.subarray(o+8,o+8+n));o+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(chunks)),alpha=new Uint8Array(w*h),stride=w*4+1;
 const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
 let transparent=0,minX=w,minY=h,maxX=-1,maxY=-1;
 for(let y=0;y<h;y++){const filter=raw[y*stride];assert.ok(filter<=4);
  for(let x=0;x<w;x++){
   const i=y*w+x,a=x?alpha[i-1]:0,up=y?alpha[i-w]:0,c=x&&y?alpha[i-w-1]:0;
   const n=(raw[y*stride+x*4+4]+(filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):filter===4?paeth(a,up,c):0))&255;alpha[i]=n;
   if(n===0)transparent++;if(n>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
 }
 return {w,h,transparent,minX,minY,maxX,maxY,alpha};
}

test('thirteen original enemy PNGs have real transparency, full silhouettes, and valid source masks',()=>{
 assert.equal(Object.keys(specs).length,13);
 for(const [id,s] of Object.entries(specs)){
  const bytes=fs.readFileSync('assets/'+s.source),a=alphaStats(bytes);
  assert.equal(a.w,s.width,id);assert.equal(a.h,s.sourceHeight,id);
  assert.ok(a.transparent>a.w*a.h*.1,id+' is opaque');
  assert.ok(a.minX>0&&a.minY>0&&a.maxX<a.w-1&&a.maxY<a.h-1,id+' is cropped at a source edge');
  assert.deepEqual([...s.order].sort(),[...Object.keys(s.parts),'body'].sort());
  assert.deepEqual([...s.priority].sort(),Object.keys(s.parts).sort());
  for(const p of Object.values(s.parts))for(const poly of p.mask)for(const [x,y] of poly)assert.ok(x>=0&&y>=0&&x<=s.width&&y<=s.sourceHeight,id+' mask outside PNG');
  assert.ok(fs.existsSync('assets/character-art/rework/'+id+'/GENERATION.md'));
 }
});

test('all 26 identities use the illustrated pair and preload each original only once',async()=>{
 const r=load();assert.equal(await r.knight.preload(),true);assert.equal(await r.api.preload(),true);
 assert.equal(r.urls.length,20);assert.equal(new Set(r.urls).size,r.urls.length);
 for(const e of P.all){assert.equal(r.knight.readyFor(e),true,e.id);assert.ok(r.knight.supports(e)||r.api.supports(e),e.id);}
 assert.equal(r.api.supports(undefined),false);assert.equal(r.api.supports({id:'unknown'}),false);
 assert.equal(r.knight.readyFor(undefined),false);
});

test('every neutral layer maps back to exactly its original pixels and articulated joints',()=>{
 const {api}=load();
 for(const s of Object.values(specs)){
  const q=api.pose(s),u=api.unit(s);
  for(const p of Object.values(q.placements)){
   if(p.phaseVisible===false)continue; // Alternate PNG has its own registered source pivot.
   near(p.angle,0);near(p.sx||1,1);near(p.sy||1,1);
   const source=[s.width*.6,s.sourceHeight*.4];
   near(p.at.x+(source[0]-p.pivot[0])*u,(source[0]-s.origin[0])*u);
   near(p.at.y+(source[1]-p.pivot[1])*u,(source[1]-s.origin[1])*u);
  }
 }
});

test('every attack and both alternating blades reach the same shield on schedule, including the 38ms hold',()=>{
 const {api}=load();
 for(const e of P.all.filter(api.supports))for(const [w,h] of [[320,448],[360,448],[560,440],[889,550],[1180,440]])
  for(const result of ['just','parry','guard','miss'])for(const index of [0,1])for(const time of [1499.999,1500,1515,1537]){
   const s=api.sample(data(e,time,w,h,result,index));
   near(s.x+s.q.tip.x*s.l.enemyScale,s.l.hitX,.01);
   near(s.l.ground+(s.q.tip.y+s.q.float)*s.l.enemyScale,s.l.hitY,.01);
  }
});

test('all rigid arms stay attached, feet keep their source stance, and the important body stays visible',()=>{
 const {api}=load();
 for(const e of P.all.filter(api.supports))for(const [w,h] of [[320,448],[889,550]]){
  const initial=api.sample(data(e,100,w,h));
  assert.ok(initial.l.stageX>initial.l.restX,'telegraph must withdraw '+e.id);
  for(let time=0;time<=2200;time+=10){
   const d=api.sample(data(e,time,w,h));
   for(const arm of d.q.arms){near(distance(arm.start,arm.elbow),arm.upperLength);near(distance(arm.elbow,arm.tip),arm.foreLength);}
   if(d.q.placements.legs)assert.deepEqual(plain(d.q.placements.legs),plain(initial.q.placements.legs));
   for(const p of [d.q.face,d.q.chest]){
    const x=d.x+p.x*d.l.enemyScale,y=d.l.ground+(p.y+d.q.float)*d.l.enemyScale;
    assert.ok(x>0&&x<w&&y>0&&y<h,e.id+' important body clipped '+w+'/'+time);
   }
   if(d.s.grip)assert.ok(d.x+(d.q.face.x+14)*d.l.enemyScale<w,e.id+' helmet needs room at the right edge');
  }
  near(api.sample(data(e,2200,w,h)).x,initial.x);
 }
});

test('slime compresses, ghosts rise, swords alternate, and the mechanical lance actually retracts',()=>{
 const {api}=load(),rest=api.sample(data(P.byId.slime)),coil=api.sample(data(P.byId.slime,1200));
 assert.ok(coil.q.placements.body.sy<rest.q.placements.body.sy*.85);
 assert.ok(coil.q.placements.body.sx>rest.q.placements.body.sx);
 const ghost=api.sample(data(P.byId.wraith,1200)),ghostIdle=api.sample(data(P.byId.wraith));assert.ok(ghost.q.float<ghostIdle.q.float-2);
 const one=api.sample(data(P.byId.duelist,1500,900,550,'just',0)),two=api.sample(data(P.byId.duelist,1500,900,550,'just',1));
 assert.equal(one.q.active,0);assert.equal(two.q.active,1);near(one.q.arms[0].weight,1);near(one.q.arms[1].weight,0);
 assert.ok(distance(one.q.arms[0].tip,one.q.arms[1].tip)>30);
 const mechanical=api.sample(data(P.byId.clockwork,1200)),g=api.armGeometry(mechanical.s,mechanical.s.arms[0]);
 assert.ok(distance(mechanical.q.tip,mechanical.q.arms[0].tip)>8,'independent shaft retracts inside its barrel');
 near(distance(mechanical.q.arms[0].start,mechanical.q.arms[0].elbow),g.upper);
});

test('draw calls use every actual cutout in the recorded order, preserve palettes, and balance canvas state',async()=>{
 const r=load();await r.knight.preload();
 for(const e of P.all.filter(r.api.supports))for(const time of [100,1160,1440,1500,1623,1880]){
  r.calls.length=0;const d=data(e,time),snapshot=JSON.stringify(d);
  assert.equal(r.knight.drawEnemy(r.ctx(),d),true,e.id);
  const s=r.api.specs[r.api.idFor(e)];
  const q=r.api.sample(d).q;
  assert.equal(r.calls.filter(c=>c.key==='drawImage').length,s.order.filter(k=>q.placements[k].phaseVisible!==false).length+(s.repairs?.length&&q.placements.body.phaseVisible!==false?1:0)+(q.bladeGhost?1:0),e.id);
  assert.equal(r.calls.filter(c=>c.key==='save').length,r.calls.filter(c=>c.key==='restore').length);
  assert.equal(JSON.stringify(d),snapshot);
 }
});

test('a missing original falls back as a pair for that enemy, while every other character remains usable',async()=>{
 const r=load('/rogue/');assert.equal(await r.knight.preload(),true);
 assert.equal(r.api.ready(P.byId.rogue),false);assert.equal(r.knight.readyFor(P.byId.rogue),false);
 r.calls.length=0;assert.equal(r.knight.drawEnemy(r.ctx(),data(P.byId.rogue)),false);
 assert.equal(r.knight.drawHero(r.ctx(),{...data(P.byId.rogue),pose:{}}),false);assert.equal(r.calls.length,0);
 for(const e of P.all.filter(e=>(e.sprite||e.id)!=='rogue'))assert.equal(r.knight.readyFor(e),true,e.id);
});

test('all sword outcomes keep both wrists attached and return continuously, while v4 remains reproducible',()=>{
 const {api}=load();
 const swordIds=['sentinel','duelist','guardian','ironwarden','dirgekeeper','timewarden'];
 for(const id of swordIds)for(const result of ['just','parry','guard','miss'])for(const index of [0,1]){
  for(let time=1490;time<=2100;time+=11){
   const {s,q}=api.sample(data(P.byId[id],time,360,448,result,index));
   for(const a of q.arms){near(distance(a.start,a.elbow),a.upperLength);near(distance(a.elbow,a.tip),a.foreLength);}
   if(s.grip&&!q.keyFrame)for(const [i,arm]of s.arms.entries()){
    const at=q.placements[arm.fore],u=api.unit(s),x=(arm.hand[0]-at.pivot[0])*u,y=(arm.hand[1]-at.pivot[1])*u;
    near(distance(q.arms[i].hand,{x:at.at.x+x*Math.cos(at.angle)-y*Math.sin(at.angle),y:at.at.y+x*Math.sin(at.angle)+y*Math.cos(at.angle)}),0,.0001);
   }
  }
  const d=data(P.byId[id],1720,900,550,result,index),old=api.sample({...d,motionVersion:'v4'});
  const expected=api.pose(old.s,{...old.t,recoil:old.q.recoil,reach:old.l.reach,impactY:old.l.impactY,index});
  assert.deepEqual(plain(old.q.placements),plain(expected.placements));assert.equal(old.q.sword,null);
  const fresh=api.sample(d);assert.ok(fresh.q.sword);assert.notDeepEqual(plain(fresh.q.placements),plain(old.q.placements));
 }
});

test('game and review load the same roster modules before the illustrated compositor',()=>{
 for(const file of ['index.html','dev.html','art-preview.html']){
  const s=fs.readFileSync(file,'utf8');
  assert.ok(s.indexOf('character-enemy-data.js')<s.indexOf('character-enemy-puppet.js'));
  assert.ok(s.indexOf('character-enemy-puppet.js')<s.indexOf('character-knight-puppet.js'));
 }
});

test('guardian advances with its downstroke and recovers away from the shield on wide and tall stages',()=>{
 const {api}=load(),e=P.byId.guardian,k=specs.guardian.keyPose;
 const start=1500-(1-k.releaseStart)*combat.profile(e).swing;
 for(const [w,h]of [[320,448],[360,448],[765,380],[1030,900],[900,550]]){
  const {l,s}=api.sample(data(e,start,w,h,'guard'));
  assert.ok(l.stageX>l.restX&&l.restX>l.contactX,'idle and windup stay behind contact at '+w+'x'+h);
  assert.ok(l.stageX-l.contactX>=specs.guardian.advanceRoom*l.enemyScale-.01,'visible room for the forward step');
  let previousX=Infinity,previousAngle=Infinity;
  for(const fraction of [0,.2,.4,.6,.8,1]){
   const d=api.sample(data(e,start+(1500-start)*fraction,w,h,'guard'));
   const angle=d.q.placements.strikePose.angle,target=api.keyTarget(s,l.impactY).angle;
   const travel=fraction*fraction*(3-2*fraction);
   near((l.stageX-d.x)/(l.stageX-l.contactX),travel,.000001);
   if(d.q.keyFrame==='contact'){
    near(travel,1-(angle-target)/k.releaseTurn,.000001);
    assert.ok(angle<=previousAngle+.000001,'the contact blade keeps descending');previousAngle=angle;
   }
   assert.ok(d.x<=previousX+.000001,'the step continues through the intermediate pose');previousX=d.x;
  }
  previousX=l.contactX;
  for(const time of [1500,1538,1600,1720,1900,2200]){
   const d=api.sample(data(e,time,w,h,'guard'));
   assert.ok(d.x>=previousX-.000001,'recovery cannot slide toward the hero at '+time);
   previousX=d.x;
  }
 }
});

test('guardian middle starts from the same windup arm shape and keeps every original joint connected',()=>{
 const {api}=load(),e=P.byId.guardian,s=specs.guardian,k=s.keyPose,u=api.unit(s)*k.readyScale;
 const map=(p,at)=>{const x=(p[0]-at.pivot[0])*u,y=(p[1]-at.pivot[1])*u;
  return {x:at.at.x+x*Math.cos(at.angle)-y*Math.sin(at.angle),y:at.at.y+x*Math.sin(at.angle)+y*Math.cos(at.angle)};};
 for(let time=1276;time<=1420;time+=2){
  const q=api.sample(data(e,time)).q,weapon=q.placements.weapon;
  const turn=weapon.angle-q.placements.body.angle;
  near(turn,0);
  assert.equal(q.keyFrame,'ready');assert.equal(q.placements.strikePose.phaseVisible,false);
  for(const [i,arm]of s.arms.entries()){
   const a=q.arms[i];near(distance(map(arm.shoulder,q.placements.body),a.start),0,.0001);
   near(distance(map(arm.hand,weapon),a.hand),0,.0001);
   near(distance(map(arm.elbow,q.placements[arm.fore]),a.elbow),0,.0001);
   near(distance(map(arm.hand,q.placements[arm.fore]),a.hand),0,.0001);
   near(distance(a.start,a.elbow),a.upperLength,.0001);near(distance(a.elbow,a.hand),a.foreLength,.0001);
  }
  near(distance(map(s.grip.tip,weapon),q.tip),0,.0001);
  assert.deepEqual(plain(q.placements.legs),plain(api.sample(data(e,1200)).q.placements.legs));
 }
 for(const time of [1378,1390,1420]){
  const q=api.sample(data(e,time)).q;near(q.inbetween,1);near(q.placements.weapon.angle-q.placements.body.angle,0);
 }
 assert.equal(api.sample(data(e,1421)).q.keyFrame,'contact');
 assert.equal(api.sample({...data(e,1390),motionVersion:'v4'}).q.inbetween,undefined);
 for(const id of ['ironwarden','dirgekeeper','timewarden'])assert.equal(api.sample(data(P.byId[id],1390)).q.inbetween,undefined);
});

test('guardian middle and windup have identical arm and sword geometry after removing torso lean',()=>{
 const {api}=load(),e=P.byId.guardian,windup=api.sample(data(e,1200)).q;
 const unlean=(p,q)=>{const at=q.placements.body.at,x=p.x-at.x,y=p.y-at.y,a=-q.placements.body.angle;
  return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};};
 for(const time of [1277,1320,1378,1390,1420]){
  const q=api.sample(data(e,time)).q;
  for(let i=0;i<2;i++)for(const joint of ['start','elbow','hand'])near(distance(unlean(q.arms[i][joint],q),unlean(windup.arms[i][joint],windup)),0,.0001);
  near(distance(unlean(q.tip,q),unlean(windup.tip,windup)),0,.0001);
  for(const key of ['upper0','fore0','upper1','fore1','weapon'])near(q.placements[key].angle-q.lean,windup.placements[key].angle-windup.lean,.0001);
  assert.deepEqual(plain(q.placements.legs),plain(windup.placements.legs));
 }
});

test('guardian has one delayed sword that catches the real blade over 200ms and fades without leaking opacity',async()=>{
 const r=load();await r.api.preload();const e=P.byId.guardian,source=r.api.editModel(e).parts.strikePose.source;
 const start=1500-(1-specs.guardian.keyPose.ghost.start)*combat.profile(e).swing;
 for(const offset of [-1,0,25,72,120,160,199,200,300]){
  const time=start+offset,q=r.api.sample(data(e,time)).q,expected=offset>=0&&offset<200;
  assert.equal(!!q.bladeGhost,expected,'following blur at '+time);
  const paints=[],ctx=r.ctx();ctx.globalAlpha=1;
  const alphaStack=[];ctx.save=()=>alphaStack.push(ctx.globalAlpha);ctx.restore=()=>{ctx.globalAlpha=alphaStack.pop();};
  ctx.drawImage=(img)=>paints.push({img,opacity:ctx.globalAlpha});
  r.api.drawCutout(ctx,e,q);
  const ghosts=paints.filter(p=>p.img===source);assert.equal(ghosts.length,expected?1:0);
  if(expected){assert.ok(ghosts[0].opacity>0&&ghosts[0].opacity<=.5);if(offset<=120)near(ghosts[0].opacity,.5);}
  near(ctx.globalAlpha,1);assert.equal(alphaStack.length,0);
 }
 let lastAngle=Infinity,lastDistance=Infinity,lastOpacity=.5;
 for(const offset of [0,50,100,150,199]){
  const time=start+offset;
  const {q,s}=r.api.sample(data(e,time)),g=q.bladeGhost,p=q.placements.strikePose,u=r.api.unit(s);
  const dx=(g.pivot[0]-p.pivot[0])*u,dy=(g.pivot[1]-p.pivot[1])*u;
  const target={x:p.at.x+dx*Math.cos(p.angle)-dy*Math.sin(p.angle),y:p.at.y+dx*Math.sin(p.angle)+dy*Math.cos(p.angle)};
  const gap=distance(g.at,target),angleGap=Math.abs(g.angle-p.angle);
  assert.ok(gap<lastDistance,'blur moves toward the actual sword at '+time);
  if(offset>=100)assert.ok(angleGap<lastAngle,'blur catches the blade after the downstroke');
  assert.ok(g.angle>=p.angle-1e-7,'the blur trails behind the descending blade');
  assert.ok(g.opacity<=lastOpacity);lastAngle=angleGap;lastDistance=gap;lastOpacity=g.opacity;
 }
 assert.ok(lastAngle<.001&&lastDistance<.01&&lastOpacity<.001,'blur meets the actual blade as it disappears');
 for(const time of [start+32,start+72,start+112]){
  const {q,s}=r.api.sample(data(e,time)),g=q.bladeGhost;
  const dx=s.keyPose.tip[0]-g.pivot[0],dy=s.keyPose.tip[1]-g.pivot[1];
  assert.ok(dx*Math.sin(g.angle)+dy*Math.cos(g.angle)<0,'blur follows the overhead arc, not below the body');
 }
 for(const enemy of P.all.filter(r.api.supports))if(r.api.idFor(enemy)!=='guardian')
  assert.equal(r.api.sample(data(enemy,1428)).q.bladeGhost,undefined,enemy.id);
 assert.equal(r.api.sample({...data(e,1428),motionVersion:'v4'}).q.bladeGhost,undefined);
 // The extra drawing is clipped before painting the source: no second hands.
 const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;};
 const owns=p=>specs.guardian.keyPose.ghost.mask.some(poly=>inside(p,poly));
 assert.ok(owns([300,530]));assert.ok(owns([815,500]));
 for(const p of [...specs.guardian.keyPose.wrists,...specs.guardian.keyPose.elbows,specs.guardian.keyPose.face])assert.equal(owns(p),false);
});

test('guardian keeps both wrists above its face in the overhead windup and the near shoulder on the same side at contact',()=>{
 const s=specs.guardian,{api}=load(),a=alphaStats(fs.readFileSync('assets/'+s.source));
 for(const p of [s.face,s.grip.tip,...s.arms.flatMap(a=>[a.shoulder,a.elbow,a.hand])])
  assert.ok(a.alpha[p[1]*s.width+p[0]]>128,'overhead anchor is painted: '+p);
 for(const t of [100,1200,1270]){
  const {q}=api.sample(data(P.byId.guardian,t));assert.equal(q.keyFrame,'ready');
  for(const arm of q.arms)assert.ok(arm.hand.y<q.face.y-12,'both hands remain overhead');
  assert.ok(q.tip.x>Math.max(...q.arms.map(a=>a.hand.x))+80,'blade points behind the overhead grip');
 }
 for(const width of [320,360,900]){
  const d=api.sample(data(P.byId.guardian,1200,width,550));
  const right=d.x+(s.stageRight-s.origin[0])*api.unit(s)*d.l.enemyScale;
  assert.ok(right<=width-7,'raised shoulder stays within the view');
  const p=d.q.placements.body,u=api.unit(s),x=(730-p.pivot[0])*u*(p.sx||1),y=(305-p.pivot[1])*u*(p.sy||1);
  assert.ok(d.x+(p.at.x+x*Math.cos(p.angle)-y*Math.sin(p.angle))*d.l.enemyScale<width-8,'raised elbow remains visible after leaning');
 }
 for(const [face,shoulders]of [[s.face,s.arms.map(a=>a.shoulder)],[s.keyPose.face,s.keyPose.shoulders]]){
  assert.ok(shoulders[0][0]>face[0]&&shoulders[1][0]<face[0],'near/far shoulder order agrees across drawings');
 }
});

test('guardian overhead upper body matches contact proportions without scaling its feet or replacing palette filters',async()=>{
 const r=load();await r.api.preload();const e=P.byId.guardian;
 const before=r.api.sample(data(e,1420)).q,after=r.api.sample(data(e,1421)).q;
 const shoulderWidth=q=>distance(q.arms[0].start,q.arms[1].start);
 const torso=q=>{const a=q.arms[0].start,b=q.arms[1].start;return distance({x:(a.x+b.x)/2,y:(a.y+b.y)/2},q.placements[q.keyFrame==='ready'?'body':'strikePose'].at);};
 for(const metric of [shoulderWidth,torso])assert.ok(Math.abs(metric(before)/metric(after)-1)<.05,'upper-body proportions agree within 5%');
 assert.deepEqual(plain(before.placements.legs),plain(after.placements.legs));
 const model=r.api.editModel(e),ctx=r.ctx(),paints=[],stack=[];ctx.filter='hue-rotate(90deg)';
 ctx.save=()=>stack.push({filter:ctx.filter,alpha:ctx.globalAlpha});ctx.restore=()=>{const s=stack.pop();ctx.filter=s.filter;ctx.globalAlpha=s.alpha;};
 ctx.drawImage=img=>paints.push({img,filter:ctx.filter});
 r.api.drawCutout(ctx,e,before);
 const filter=paints.find(p=>p.img===model.parts.body.image).filter;
 assert.ok(filter.startsWith('hue-rotate(90deg) '),'ready correction retains the existing enemy palette');
 assert.ok(filter.includes('brightness(')&&filter.includes('saturate('),'ready armor receives its color match');
 assert.equal(paints.find(p=>p.img===model.parts.legs.image).filter,'hue-rotate(90deg)','fixed legs retain their colors');
 assert.equal(ctx.filter,'hue-rotate(90deg)');assert.equal(stack.length,0);
 paints.length=0;r.api.drawCutout(ctx,e,after);
 assert.equal(paints.find(p=>p.img===model.parts.strikePose.image).filter,'hue-rotate(90deg)','contact art is the color reference');
});

test('four contact PNGs have visible blade and wrist anchors and render one complete anatomical silhouette',async()=>{
 const r=load();await r.api.preload();
 for(const id of ['guardian','ironwarden','dirgekeeper','timewarden']){
  const s=specs[id],k=s.keyPose,stats=alphaStats(fs.readFileSync('assets/'+k.source));
  assert.equal(stats.w,s.width);assert.equal(stats.h,s.sourceHeight);assert.ok(stats.transparent>s.width*s.sourceHeight*.1);
  for(const [x,y]of [k.tip,...k.wrists,...k.elbows])assert.ok(stats.alpha[y*s.width+x]>128,id+' anchor must be on real painted pixels');
  const q=r.api.sample(data(P.byId[id],1500)).q,model=r.api.editModel(P.byId[id]);
  assert.equal(q.keyFrame,'contact');assert.equal(q.placements.body.phaseVisible,false);
  r.calls.length=0;r.api.drawCutout(r.ctx(),P.byId[id],q);
  const images=r.calls.filter(c=>c.key==='drawImage').map(c=>c.args[0]);
  assert.deepEqual(images,[...(q.bladeGhost?[model.parts.strikePose.source]:[]),...s.order.filter(k=>['cape','legs','strikePose'].includes(k)).map(k=>model.parts[k].image)]);
  assert.notEqual(model.parts.strikePose.source,model.source,'mask editing uses its own contact drawing');
 }
});

test('a missing contact drawing falls back as a pair without exposing a half-loaded rig',async()=>{
 const r=load(specs.guardian.keyPose.source);await r.knight.preload();assert.equal(r.api.ready(P.byId.guardian),false);
 assert.equal(r.knight.readyFor(P.byId.guardian),false);r.calls.length=0;
 assert.equal(r.knight.drawEnemy(r.ctx(),data(P.byId.guardian,1500)),false);assert.equal(r.calls.length,0);
 assert.equal(r.knight.readyFor(P.byId.ironwarden),true);
});

test('each authored arm and both wrist joints keep their painted positions on the active upper-body drawing',()=>{
 const {api}=load();
 const transform=(s,p,at)=>{const u=api.unit(s),x=(p[0]-at.pivot[0])*u*(at.sx||1),y=(p[1]-at.pivot[1])*u*(at.sy||1);
  return {x:at.at.x+x*Math.cos(at.angle)-y*Math.sin(at.angle),y:at.at.y+x*Math.sin(at.angle)+y*Math.cos(at.angle)};};
 for(const id of ['guardian','ironwarden','dirgekeeper','timewarden'])for(const [w,h]of [[324,448],[900,550]]){
  const s=specs[id];
  for(let time=0;time<=2200;time+=7){
   const {q}=api.sample(data(P.byId[id],time,w,h));
   const contact=q.keyFrame==='contact',source=s.keyPose;
   const at=contact?q.placements.strikePose:q.placements.body;
   const wrists=contact?source.wrists:s.arms.map(a=>a.hand);
   near(distance(q.arms[0].hand,q.arms[1].hand),distance(api.local(s,wrists[0]),api.local(s,wrists[1]))*(at.sx||1));
   for(let i=0;i<2;i++){
    const wrist=wrists[i],elbow=contact?source.elbows[i]:s.arms[i].elbow;
    near(distance(transform(s,wrist,q.inbetween!==undefined?q.placements[s.grip.part]:at),q.arms[i].hand),0,.0001);
    near(distance(transform(s,elbow,q.inbetween!==undefined?q.placements[s.arms[i].fore]:at),q.arms[i].elbow),0,.0001);
   }
   near(distance(transform(s,contact?source.tip:s.grip.tip,q.inbetween!==undefined?q.placements[s.grip.part]:at),q.tip),0,.0001);
  }
 }
});

test('low guards rise into contact while the high and shoulder guards descend, without changing the hit time',()=>{
 const {api}=load();
 const y=(id,t)=>{const d=api.sample(data(P.byId[id],t));return d.l.ground+d.q.tip.y*d.l.enemyScale;};
 for(const id of ['sentinel','dirgekeeper'])assert.ok(y(id,1490)<y(id,1470)-5,id+' must cut upward');
 for(const id of ['guardian','ironwarden'])assert.ok(y(id,1490)>y(id,1470)+20,id+' must cut downward');
 for(const id of ['sentinel','guardian','ironwarden','dirgekeeper','timewarden']){
  const d=api.sample(data(P.byId[id],1500));near(d.l.ground+d.q.tip.y*d.l.enemyScale,d.l.hitY,.01);
 }
});

test('curved sword edges outside the bodies belong to the moving weapon instead of leaving floating blade fragments',()=>{
 const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;};
 const regions={guardian:[740,0,1445,250],ironwarden:[0,0,515,300],dirgekeeper:[0,680,490,956],timewarden:[0,330,590,565]};
 for(const [id,[x0,y0,x1,y1]]of Object.entries(regions)){
  const s=specs[id],a=alphaStats(fs.readFileSync('assets/'+s.source));let checked=0;
  for(let y=y0;y<y1;y+=3)for(let x=x0;x<x1;x+=3)if(a.alpha[y*a.w+x]>64){
   assert.ok(s.parts.weapon.mask.some(poly=>inside([x,y],poly)),id+' stranded source pixel '+x+','+y);checked++;
  }
  assert.ok(checked>200,id+' must inspect the actual visible blade');
 }
});

test('visible sword pauldrons follow the upper arm while helmet pixels stay on the torso',()=>{
 const {api}=load();
 const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;};
 // Interior pixels from the actual plate and helmet, away from seam edges.
 const probes={sentinel:[[750,270],[520,215]],guardian:[[638,408],[485,377]],ironwarden:[[790,390],[606,335],1],
  dirgekeeper:[[615,350],[662,233]],timewarden:[[682,355],[747,261]],duelist:[[591,417],[550,300]]};
 for(const [id,[plate,helmet,armIndex=0]]of Object.entries(probes)){
  const s=specs[id],alpha=alphaStats(fs.readFileSync('assets/'+s.source)).alpha;
  const owner=p=>s.priority.find(key=>!s.parts[key].separateSource&&s.parts[key].mask.some(poly=>inside(p,poly)))||'body';
  for(const p of [plate,helmet])assert.ok(alpha[p[1]*s.width+p[0]]>128,id+' visible source pixel');
  assert.equal(owner(plate),s.arms[armIndex].upper,id+' plate belongs to the sword arm');
  assert.equal(owner(helmet),'body',id+' helmet must not rotate with the arm');
  const q=api.pose(s,{action:1});
  assert.ok(Math.abs(q.placements[owner(plate)].angle-q.placements.body.angle)>.02,id+' plate rotates independently of the torso');
 }
 const guardian=specs.guardian,alpha=alphaStats(fs.readFileSync('assets/'+guardian.source)).alpha;
 for(const [p,part]of [[[300,370],'fore1'],[[330,403],'fore1'],[[710,305],'fore0'],[[720,360],'upper0']]){
  assert.ok(alpha[p[1]*guardian.width+p[0]]>32,'probe lies on the original elbow/cuff outline');
  assert.equal(guardian.priority.find(key=>!guardian.parts[key].separateSource&&guardian.parts[key].mask.some(poly=>inside(p,poly))),part,'moving arms own the entire elbow/cuff outline');
 }
});
