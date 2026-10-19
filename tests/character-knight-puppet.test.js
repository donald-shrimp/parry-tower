'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js'),combat=require('../assets/combat-art.js');
const source=fs.readFileSync('assets/character-knight-puppet.js','utf8');
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,a+' differs from '+b);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function load(fail=false){
 const calls=[],urls=[],fallback=[];
 const ctx=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push({key:k,args}),set:(o,k,v)=>{o[k]=v;return true}});
 const window={URL,console,location:{search:''},document:{
  currentScript:{src:'https://example.org/assets/character-knight-puppet.js'},createElement:()=>({getContext:()=>ctx()})},
  ParryCombatArt:{...combat,readyFor:()=>true,preload:()=>Promise.resolve([true,true]),
   drawHero:()=>{fallback.push('hero');return true},drawEnemy:()=>{fallback.push('enemy');return true}}};
 window.Image=class{
  constructor(){this.naturalWidth=1445;this.naturalHeight=1088;}
  set src(url){urls.push(url);queueMicrotask(()=>(fail===true||url.includes(fail||'__no_failure__'))?this.onerror?.():this.onload?.());}
 };
 vm.runInNewContext(source,{window,URL,console});
 return {api:window.ParryKnightPuppet,window,calls,urls,ctx,fallback};
}
function data(time=100,width=880,height=440,e=P.byId.knight,result='just'){
 return {e,m:combat.profile(e),now:10000+time,width,height,attackAt:time<1500?11500:14500,attackSpan:3000,
  lastImpactAt:time>=1500?11500:-99999,lastDeflectAt:time>=1500?11500:-99999,lastStrikeKind:result};
}
const plain=x=>JSON.parse(JSON.stringify(x));
function local(api,p){return {x:(p[0]-api.ORIGIN[0])*api.SCALE,y:(p[1]-api.ORIGIN[1])*api.SCALE};}

test('the renderer uses the original v3 PNG and recorded mask/pivot data, not the rejected assembly',()=>{
 const {api}=load(),png=fs.readFileSync('assets/'+api.SOURCE);
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),api.WIDTH);assert.equal(png.readUInt32BE(20),api.HEIGHT);assert.equal(png[25],6);
 assert.ok(api.sourceUrl().endsWith('/knight-ready-candidate-v3.png'));
 const m=JSON.parse(fs.readFileSync('assets/character-art/rework/knight/puppet-manifest.json','utf8'));
 for(const key of ['pivots','masks','crops','priority','order'])assert.deepEqual(m[key],plain(api[key.toUpperCase()]));
 for(const [x,y,w,h] of Object.values(api.CROPS))assert.ok(x>=0&&y>=0&&x+w<=api.WIDTH&&y+h<=api.HEIGHT);
 assert.deepEqual(m.plume,plain(api.PLUME));
 const plume=fs.readFileSync('assets/'+api.PLUME.source);assert.equal(plume[25],6);
 assert.equal(plume.readUInt32BE(16),1445);assert.equal(plume.readUInt32BE(20),1088);
});
test('both PNGs load once and either failure leaves both characters on the existing fallback',async()=>{
 const success=load();assert.equal(await success.api.preload(),true);await success.api.preload();
 assert.equal(success.urls.length,2);assert.ok(success.urls[1].endsWith('/assets/character-art/rework/knight/knight-plume-repaired.png'));
 for(const fail of ['candidate-v3','plume-repaired']){
  const r=load(fail);assert.equal(await r.api.preload(),false);assert.equal(await r.api.preload(),false);
  assert.equal(r.urls.length,2);assert.equal(r.api.status(),'failed');r.calls.length=0;
  assert.equal(r.api.drawEnemy(r.ctx(),data()),false);assert.equal(r.api.drawHero(r.ctx(),data()),false);
  assert.equal(r.calls.length,0);
 }
});
test('title frames without an enemy fall back before sampling a combat profile',async()=>{
 const r=load();await r.api.preload();r.calls.length=0;
 for(const e of [undefined,null]){
  assert.equal(r.api.readyFor(e),false);
  assert.equal(r.api.drawHero(r.ctx(),{width:880,height:440,e,now:10000,pose:{}}),false);
 }
 assert.equal(r.calls.length,0);
});
test('neutral cutout positions reproduce the source illustration instead of an invented ready stance',()=>{
 const {api}=load(),q=api.pose(),p=api.placements(q);
 for(const [actual,name] of [[q.swordArm.start,'swordShoulder'],[q.swordArm.elbow,'swordElbow'],
  [q.swordArm.end,'grip'],[q.tip,'tip'],[q.shieldArm.start,'shieldShoulder'],
  [q.shieldArm.elbow,'shieldElbow'],[q.shieldArm.end,'shieldHand']]){
  const expected=local(api,api.PIVOTS[name]);near(actual.x,expected.x);near(actual.y,expected.y);
 }
 // Every layer's neutral mapping must be the SAME source-to-game transform.
 for(const t of Object.values(p)){
  near(t.angle,0);
  const src=[1050,400],dx=(src[0]-t.pivot[0])*api.SCALE,dy=(src[1]-t.pivot[1])*api.SCALE;
  const expected=local(api,src);near(t.at.x+dx,expected.x);near(t.at.y+dy,expected.y);
 }
});
test('the actual canvas draws the far sword first, torso in between, and near shield last',async()=>{
 const r=load();assert.equal(await r.api.preload(),true);
 for(const time of [100,1160,1440,1500,1590,1780]){
  r.calls.length=0;r.api.drawEnemy(r.ctx(),data(time));
  const names=r.calls.filter(c=>c.key==='drawImage').map(c=>Object.entries(r.api.CROPS)
   .find(([,v])=>v[2]===c.args[0].width&&v[3]===c.args[0].height)?.[0]);
  assert.equal(names.length,8);assert.equal(names[0],'weapon');assert.equal(names.at(-1),'shield');
  assert.ok(names.indexOf('swordUpper')<names.indexOf('body'));
  assert.ok(names.indexOf('body')<names.indexOf('shieldUpper'));
  assert.ok(names.indexOf('shieldFore')<names.indexOf('shield'));
  assert.equal(r.calls.filter(c=>c.key==='save').length,r.calls.filter(c=>c.key==='restore').length);
 }
});
test('the original stance slides backward in anticipation then forward in the cut without moving individual feet',()=>{
 const {api}=load();
 for(const [w,h] of [[320,280],[360,320],[560,440],[880,550],[1180,440]]){
  const rest=api.sample(data(0,w,h));
  for(let time=0;time<=2200;time+=5){
   const s=api.sample(data(time,w,h)),p=api.placements(s.q),rp=api.placements(rest.q);
   near(s.l.ground,rest.l.ground);
   assert.deepEqual(plain(p.legs),plain(rp.legs));
   for(const key of ['frontFoot','rearFoot','frontLeg','rearLeg'])assert.deepEqual(plain(s.q[key]),plain(rest.q[key]));
  }
  const charge=api.sample(data(1200,w,h)),hit=api.sample(data(1500,w,h));
  assert.ok(charge.x>rest.x+20*rest.l.enemyScale,'anticipation clearly withdraws before the lunge');
  assert.ok(hit.x<rest.x-5*rest.l.enemyScale,'cut slides forward');
  near(api.sample(data(2200,w,h)).x,rest.x);
 }
 assert.ok(api.sample(data(1500)).q.lean<-.15,'the upper body still drives the cut');
});
test('the gripped sword reaches the shield on the original timestamp, including deflection and variants',()=>{
 const {api}=load();
 const upper=dist(local(api,api.PIVOTS.swordShoulder),local(api,api.PIVOTS.swordElbow));
 const fore=dist(local(api,api.PIVOTS.swordElbow),local(api,api.PIVOTS.grip));
 for(const [w,h] of [[320,280],[360,320],[560,440],[880,550],[1180,440]])
  for(const e of P.all.filter(api.supports))for(const result of ['just','parry','guard','miss'])
   for(const time of [1499.999,1500,1515,1537]){
    const s=api.sample(data(time,w,h,e,result));
    near(s.x+s.q.tip.x*s.l.enemyScale,s.l.hitX,.01);
    near(s.l.ground+s.q.tip.y*s.l.enemyScale,s.l.hitY,.01);
    near(dist(s.q.swordArm.start,s.q.swordArm.elbow),upper);
    near(dist(s.q.swordArm.elbow,s.q.swordArm.end),fore);
   }
});
test('faces, torso and the impact stay readable while phone motion can cross the screen edge',()=>{
 const {api}=load();
 let crossesEdge=false;
 for(const [w,h] of [[320,448],[360,448],[560,440],[880,550],[1180,440]])
  for(const e of P.all.filter(api.supports))for(let time=0;time<=2200;time+=10){
   const s=api.sample(data(time,w,h,e)),b=api.bounds(s.q);
   for(const p of [s.q.head,s.q.chest]){
    const x=s.x+p.x*s.l.enemyScale,y=s.l.ground+p.y*s.l.enemyScale;
    assert.ok(x>0&&x<w&&y>0&&y<h,'body clipped '+e.id+'/'+w+'/'+time);
   }
   assert.ok(s.l.hitX>0&&s.l.hitX<w&&s.l.hitY>0&&s.l.hitY<h);
   if(w<=360&&s.x+b.maxX*s.l.enemyScale>w)crossesEdge=true;
  }
 assert.ok(crossesEdge,'do not shrink every pose just to fit the cape or blade');
});

test('the main-like stage restores approach distance and keeps the old staging available only for comparison',()=>{
 const {api}=load();
 for(const [w,h] of [[323.33,448],[889.02,550]]){
  const e=P.byId.knight,m=combat.profile(e),l=api.layout(w,h,e,m);
  near(l.heroX,w*.28);near(l.restX,w*.73);near(l.ground,h*.8);
  const originalTravel=m.stage*Math.min(w/550,h/470)*1.23;
  const charge=api.sample(data(1230,w,h)),hit=api.sample(data(1500,w,h));
  assert.ok(charge.x-hit.x>originalTravel*.9&&charge.x-hit.x<originalTravel*1.35);
  const old=api.sample({...data(0,w,h),staging:'previous'});
  near(old.x,old.l.contactX);near(old.l.stageX,old.l.contactX);
  assert.ok(l.restX-l.contactX>30,'idle has space before contact');
  if(w>800)assert.ok(l.enemyScale<old.l.enemyScale*.7);
 }
});

test('deflection holds contact for 38ms then pushes the entire stance away without changing the combat clock',()=>{
 const {api}=load();
 for(const [w,h] of [[323.33,448],[889.02,550]]){
  for(const time of [1500,1515,1537,1538,1580,1623,1708,1880,2200]){
   const just=api.sample(data(time,w,h)),guard=api.sample(data(time,w,h,P.byId.knight,'guard'));
   const age=time-1538,expected=age>=0&&age<170?24*Math.sin(Math.PI*age/170)*just.l.enemyScale:0;
   near(just.x-guard.x,expected);
   assert.deepEqual(plain(just.t),plain(guard.t),'same attack/recovery timeline');
   near(just.l.ground,guard.l.ground);
  }
  near(api.sample(data(2200,w,h)).x,w*.73);
 }
});
test('other enemies delegate to the earlier renderer without mutating encounter data',async()=>{
 const r=load();await r.api.preload();const d=Object.freeze(data(100,880,440,Object.freeze({...P.byId.slime})));
 assert.equal(r.api.drawEnemy(r.ctx(),d),true);assert.deepEqual(r.fallback,['enemy']);
});
