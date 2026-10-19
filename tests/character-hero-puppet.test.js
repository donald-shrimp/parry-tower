'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters'),combat=require('../assets/combat-art');
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
const plain=x=>JSON.parse(JSON.stringify(x)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function load(fail=''){
 const calls=[],urls=[],ctx=()=>new Proxy({globalAlpha:1},{
  get:(o,k)=>k in o?o[k]:(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),k);calls.push({key:k,args});},
  set:(o,k,v)=>{o[k]=v;return true}
 });
 const window={URL,console:{warn(){}},location:{search:''},document:{createElement:()=>({getContext:()=>ctx()})},
  ParryCombatArt:{...combat,readyFor:()=>true,drawEnemy:()=>true}};
 window.Image=class {set src(url){urls.push(url);queueMicrotask(()=>fail&&url.includes(fail)?this.onerror?.():this.onload?.());}};
 for(const name of ['character-hero-puppet','character-knight-puppet']){
  window.document.currentScript={src:'https://example.org/assets/'+name+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,console});
 }
 return {api:window.ParryHeroPuppet,knight:window.ParryKnightPuppet,window,calls,urls,ctx};
}
const local=(a,p)=>({x:(p[0]-a.ORIGIN[0])*a.SCALE,y:(p[1]-a.ORIGIN[1])*a.SCALE});
test('adopted hero source and cutout manifest agree; all entrypoints load it before the illustrated compositor',()=>{
 const {api}=load(),png=fs.readFileSync('assets/'+api.SOURCE),m=JSON.parse(fs.readFileSync('assets/character-art/rework/hero/puppet-manifest.json','utf8'));
 assert.equal(png.readUInt32BE(16),api.WIDTH);assert.equal(png.readUInt32BE(20),api.HEIGHT);assert.equal(png[25],6);
 for(const key of ['pivots','masks','crops','priority','order'])assert.deepEqual(m[key],plain(api[key.toUpperCase()]));
 assert.equal(m.counterDurationMs,240);assert.match(m.spin,/forward/);
 for(const file of ['index.html','dev.html','art-preview.html']){
  const html=fs.readFileSync(file,'utf8');assert.ok(html.indexOf('character-hero-puppet.js')<html.indexOf('character-knight-puppet.js'));
 }
});
test('source loads once and a failed hero never mixes partial characters or contact layouts',async()=>{
 const r=load();assert.equal(await r.knight.preload(),true);await r.api.preload();assert.equal(r.urls.length,3);
 assert.equal(r.urls.filter(u=>u.includes('/hero/')).length,1);
 assert.equal(r.api.sourceUrl(),'https://example.org/assets/character-art/rework/hero/hero-ready-candidate.png');
 const bad=load('/hero/');assert.equal(await bad.knight.preload(),false);bad.calls.length=0;
 for(const e of P.all){
  assert.equal(bad.knight.readyFor(e),false);
  assert.equal(bad.knight.drawHero(bad.ctx(),{e,width:360,height:320,pose:{}}),false);
  assert.equal(bad.knight.drawEnemy(bad.ctx(),{e,width:360,height:320}),false);
 }
 assert.equal(bad.calls.length,0);
});
test('idle restores every original layer and source joint without inventing another pose',()=>{
 const {api}=load(),q=api.pose(),p=api.placements(q);
 for(const [key,pivot] of [['shoulder','shoulder'],['elbow','elbow'],['hand','grip'],['tip','tip']]){
  const v=local(api,api.PIVOTS[pivot]);near(q[key].x,v.x);near(q[key].y,v.y);
 }
 for(const t of Object.values(p)){
  near(t.angle,0);const v=local(api,[900,500]);
  near(t.at.x+(900-t.pivot[0])*api.SCALE,v.x);near(t.at.y+(500-t.pivot[1])*api.SCALE,v.y);
 }
});
test('counter turns forward one revolution in the existing 240ms, with anticipation and a faster release',()=>{
 const {api}=load();near(api.armAngles(1).shoulder,0);near(api.armAngles(1e-8).shoulder,Math.PI*2);
 assert.deepEqual(plain(api.armAngles(0)),{shoulder:0,elbow:0,wrist:0});
 assert.ok(api.armAngles(.9).shoulder<0,'short backward anticipation');
 const speed=t=>Math.abs(api.armAngles(1-t-.001).shoulder-api.armAngles(1-t).shoulder);
 assert.ok(speed(.38)>speed(.08)*3);
 const initial=api.pose({action:1}),end=api.pose({action:1e-8});
 near(initial.tip.x,end.tip.x);near(initial.tip.y,end.tip.y);
});
test('shoulder, elbow, gauntlet and blade stay rigidly attached through every millisecond of a counter',()=>{
 const {api}=load(),initial=api.pose();
 for(let ms=0;ms<=240;ms++){
  const q=api.pose({action:ms<240?1-ms/240:0,lift:1,push:.5}),p=api.placements(q);
  assert.ok(Math.abs(q.slide)<=2,'the hero stays at the original position');
  near(dist(q.shoulder,q.elbow),dist(initial.shoulder,initial.elbow));
  near(dist(q.elbow,q.wrist),dist(initial.elbow,initial.wrist));
  near(dist(q.wrist,q.hand),dist(initial.wrist,initial.hand));
  near(dist(q.hand,q.tip),dist(initial.hand,initial.tip));
  assert.ok(q.tip.y<2,'the lower arc clears the floor');
  for(const key of ['frontFoot','rearFoot'])assert.deepEqual(plain(q[key]),plain(initial[key]));
  assert.deepEqual(plain(p.legs),plain(api.placements(initial).legs));
  // World slide is compensated at the shield face: contact stays put while guarding.
  const contact=local(api,api.PIVOTS.shieldContact);
  near(p.shield.at.x+q.slide,contact.x);near(p.shield.at.y,contact.y);
 }
});
test('the cut fully straightens both arm links, then folds back to the original idle pose',()=>{
 const {api}=load(),idle=api.pose(),length=dist(idle.shoulder,idle.elbow)+dist(idle.elbow,idle.wrist);
 assert.ok(dist(idle.shoulder,idle.wrist)<length*.8,'idle is naturally bent');
 for(const phase of [.34,.36,.38,.40,.42]){
  const q=api.pose({action:1-phase,lift:1,push:.5});near(q.extension,1);
  near(dist(q.shoulder,q.wrist),length);
  const a={x:q.elbow.x-q.shoulder.x,y:q.elbow.y-q.shoulder.y},b={x:q.wrist.x-q.elbow.x,y:q.wrist.y-q.elbow.y};
  near(a.x*b.y-a.y*b.x,0);assert.ok(a.x*b.x+a.y*b.y>0,'forearm extends beyond elbow');
 }
 assert.ok(api.pose({action:.2}).extension<.01);
 assert.deepEqual(plain(api.pose().hand),plain(idle.hand));
});

test('video reference loop extends forward, passes below and behind, then folds high with an independent wrist',()=>{
 const {api}=load(),at=t=>api.pose({action:1-t});
 const front=at(.4),low=at(.5),rear=at(.7),raised=at(.9);
 assert.ok(front.hand.x>front.shoulder.x+35,'extend toward the opponent');
 assert.ok(low.hand.y>low.shoulder.y+25,'follow through below the shoulder');
 assert.ok(rear.hand.x<rear.shoulder.x-20,'recover behind instead of reversing the slash');
 assert.ok(raised.hand.y<raised.shoulder.y-10,'fold back toward the high guard');
 assert.ok(Math.abs(front.angles.wrist)>.4,'the blade can lag separately from the forearm');
 let previous=-Infinity;
 for(let ms=24;ms<240;ms++){
  const q=at(ms/240),p=api.placements(q),turn=q.swordAngle-q.lean;
  assert.ok(turn>=previous-1e-8,'blade continues forward through the loop');previous=turn;
  const map=(placement,source)=>({x:placement.at.x+(source[0]-placement.pivot[0])*api.SCALE*Math.cos(placement.angle)-(source[1]-placement.pivot[1])*api.SCALE*Math.sin(placement.angle),
   y:placement.at.y+(source[0]-placement.pivot[0])*api.SCALE*Math.sin(placement.angle)+(source[1]-placement.pivot[1])*api.SCALE*Math.cos(placement.angle)});
  for(const [part,joint,point]of [['forearm','wrist','wrist'],['weapon','hand','grip'],['weapon','tip','tip']]){
   const pixel=map(p[part],api.PIVOTS[point]);near(pixel.x,q[joint].x);near(pixel.y,q[joint].y);
  }
 }
 near(api.pose({action:1e-8}).swordAngle,Math.PI*2);
});
test('full hero sweep fits desktop and phone stages against all roster layouts and knight contact still meets the new shield',async()=>{
 const r=load();await r.knight.preload();
 for(const [width,height] of [[320,280],[360,320],[560,440],[880,550],[1180,440]])
  for(const e of P.all){
   const m=combat.profile(e),l=r.knight.layout(width,height,e,m);
   for(let ms=0;ms<=240;ms+=2){
    const q=r.api.pose({action:ms<240?1-ms/240:0,lift:1,push:.5}),b=r.api.bounds(q);
    assert.ok(l.heroX+b.minX*l.heroScale>=0,e.id+' left '+width+'/'+ms);
    assert.ok(l.heroX+b.maxX*l.heroScale<=width,e.id+' right '+width+'/'+ms);
    assert.ok(l.ground+b.minY*l.heroScale>=0,e.id+' top '+width+'/'+ms);
    assert.ok(l.ground+b.maxY*l.heroScale<=height,e.id+' bottom '+width+'/'+ms);
   }
   if(r.knight.supports(e)){
    const s=r.knight.sample({e,m,width,height,now:11500,attackAt:14500,lastImpactAt:11500,attackSpan:3000});
    near(s.x+s.q.tip.x*l.enemyScale,l.hitX,.01);near(l.ground+s.q.tip.y*l.enemyScale,l.hitY,.01);
   }
  }
});
test('draw order keeps the right sword arm near the viewer, far shield behind the torso, and canvas state balanced',async()=>{
 const r=load();await r.knight.preload();
 for(const action of [0,1,.9,.625,.35,.1]){
  r.calls.length=0;const input=Object.freeze({action,lift:1,guardHeld:true,heldLift:1});
  assert.equal(r.knight.drawHero(r.ctx(),{e:P.byId.knight,width:880,height:440,now:10000,pose:input}),true);
  const names=r.calls.filter(c=>c.key==='drawImage').map(c=>Object.entries(r.api.CROPS).find(([,v])=>v[2]===c.args[0].width&&v[3]===c.args[0].height)?.[0]);
  assert.deepEqual(names,plain(r.api.ORDER));
  assert.equal(names.at(-1),'weapon');assert.ok(names.indexOf('shield')<names.indexOf('body'));
  assert.equal(r.calls.filter(c=>c.key==='save').length,r.calls.filter(c=>c.key==='restore').length);
 }
});
test('unreworked opponents retain their anticipation travel while sharing the illustrated hero contact layout',async()=>{
 const r=load();await r.knight.preload();let received;
 r.window.ParryCombatArt.drawEnemy=(ctx,data)=>{received=data;return true;};
 const e=P.byId.slime,m=combat.profile(e),l=r.knight.layout(880,550,e,m);
 assert.ok(l.restX>l.contactX);assert.ok(l.stageX>l.restX);
 assert.equal(r.knight.drawEnemy(r.ctx(),{e,m,width:880,height:550,now:10000,attackAt:11500}),true);
 near(received.layout.hitX,l.hitX);near(received.layout.hitY,l.hitY);near(received.layout.restX,l.restX);
});
