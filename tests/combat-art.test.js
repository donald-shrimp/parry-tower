'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const art=require('../assets/combat-art.js');
const P=require('../assets/encounters.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('white counter crescent flashes at the enemy front, with the former just size for parry and a larger just',()=>{
 const calls=[],stack=[],state={globalAlpha:.8,fillStyle:'old',strokeStyle:'old',lineWidth:7,lineCap:'butt',shadowColor:'old',shadowBlur:0};
 const ctx=new Proxy(state,{get:(s,k)=>k in s?s[k]:(...args)=>{
  if(k==='save')stack.push({...state});else if(k==='restore')Object.assign(state,stack.pop());
  else{for(const n of args.filter(v=>typeof v==='number'))assert.ok(Number.isFinite(n));calls.push([k,args,{...state}]);}
 }});
 const origin={x:120,y:230},target={x:360,y:190},before={...state};
 for(const kind of ['guard','miss',''])for(const phase of [.2,.45,.8])assert.equal(art.counterSlash(ctx,{kind,phase,origin,target}),false);
 for(const phase of [-.1,0,.30,272/240,2])assert.equal(art.counterSlash(ctx,{kind:'just',phase,origin,target}),false);
 assert.equal(calls.length,0);
 const parry=art.counterSlash(ctx,{kind:'parry',phase:.45,origin,target}),just=art.counterSlash(ctx,{kind:'just',phase:.45,origin,target});
 assert.ok(just.opacity>parry.opacity&&just.opacity<=.72);
 assert.deepEqual(parry.size,{height:49,depth:18},'normal parry adopts the former just size');
 assert.ok(just.size.height>parry.size.height*1.5&&just.size.depth>parry.size.depth*1.5);
 close(just.tip.x,target.x);close(just.tip.y,target.y);
 const early=art.counterSlash(ctx,{kind:'just',phase:.305,origin,target}),late=art.counterSlash(ctx,{kind:'just',phase:.60,origin,target});
 assert.ok(Math.hypot(early.position.x-target.x,early.position.y-target.y)<40,'starts at enemy front, never by the player');
 assert.ok(Math.hypot(early.position.x-late.position.x,early.position.y-late.position.y)<=8,'only a tiny cutting motion instead of a slow flight');
 assert.ok(calls.some(c=>c[0]==='fill'&&c[2].fillStyle==='#efffff'),'white face');
 assert.ok(calls.some(c=>c[0]==='stroke'&&c[2].strokeStyle==='#89b9ff'),'soft blue rim');
 assert.ok(calls.some(c=>c[0]==='lineTo'&&c[1][0]===target.x+12&&c[1][1]===target.y+22),'hit streak is on the enemy, not at the shield');
 calls.length=0;art.counterSlash(ctx,{kind:'just',phase:.45,origin,target});const shape=calls.filter(c=>c[0]==='bezierCurveTo').map(c=>c[1]);
 calls.length=0;art.counterSlash(ctx,{kind:'just',phase:.45,origin,target:{x:900,y:190}});
 assert.deepEqual(calls.filter(c=>c[0]==='bezierCurveTo').map(c=>c[1]),shape,'distance does not stretch the crescent');
 assert.ok(calls.filter(c=>c[0]==='fill'||c[0]==='stroke').every(c=>c[2].globalAlpha<.8),'all strokes stay translucent');
 assert.ok(art.counterSlash(ctx,{kind:'just',phase:1.10,origin,target}).opacity<just.opacity);
 close((272/240-.30)*240,200); // Exactly 0.2 seconds.
 assert.deepEqual(state,before);assert.equal(stack.length,0);assert.deepEqual(origin,{x:120,y:230});assert.deepEqual(target,{x:360,y:190});
});

test('rare aura sparkles only for rares, animates deterministically and restores canvas state',()=>{
 const draw=(e,now)=>{
  const calls=[],stack=[],state={globalAlpha:.5,shadowColor:'old',shadowBlur:0,fillStyle:'old'};
  const ctx=new Proxy(state,{get:(o,k)=>k in o?o[k]:(...args)=>{
   if(k==='save')stack.push({...state});else if(k==='restore')Object.assign(state,stack.pop());
   else {for(const v of args.filter(x=>typeof x==='number'))assert.ok(Number.isFinite(v));calls.push({key:k,args,style:state.fillStyle,opacity:state.globalAlpha});}
  }});
  const data={e,now,x:250,y:400,scale:1.2,height:120,width:40},before=JSON.stringify(data);
  art.rareAura(ctx,data);art.rareAura(ctx,data,true);
  assert.equal(JSON.stringify(data),before);assert.equal(stack.length,0);assert.deepEqual(state,{globalAlpha:.5,shadowColor:'old',shadowBlur:0,fillStyle:'old'});
  assert.ok(calls.filter(c=>c.key==='fill').every(c=>c.opacity<=.5*.86),'respects caller opacity');return calls;
 };
 for(const e of [P.byId.knight,P.findByKey('guardian:elite')])assert.deepEqual(draw(e,10200),[]);
 for(const e of [P.byId.golden_tone,P.byId.gem_slime]){
  const a=draw(e,10200);assert.deepEqual(a,draw(e,10200));assert.notDeepEqual(a,draw(e,10550));
  assert.ok(a.some(c=>c.key==='fill'&&['#fff1c3','#d8fbff'].includes(c.style)),'white/gold or cyan stars');
  assert.ok(a.some(c=>c.key==='lineTo'),'four-point sparkle shapes');
 }
});

test('elite aura is ambient and deterministic, skips regular/rare enemies and restores canvas state',()=>{
 const render=(e,time)=>{
  const calls=[],stack=[],state={globalAlpha:.6,fillStyle:'original',shadowColor:'none',shadowBlur:0};
  const ctx=new Proxy(state,{get:(s,k)=>k in s?s[k]:(...args)=>{
   if(k==='save')stack.push({...state});else if(k==='restore')Object.assign(state,stack.pop());
   else {for(const n of args.filter(v=>typeof v==='number'))assert.ok(Number.isFinite(n));calls.push([k,args,{...state}]);}
  }});
  const data={e,now:time,x:170,y:230,scale:.8,height:140,width:46},before=JSON.stringify(data);
  const back=art.eliteAura(ctx,data),front=art.eliteAura(ctx,data,true);
  assert.equal(JSON.stringify(data),before);assert.equal(stack.length,0);
  assert.deepEqual(state,{globalAlpha:.6,fillStyle:'original',shadowColor:'none',shadowBlur:0});
  return {calls,back,front};
 };
 for(const e of [P.byId.knight,P.byId.gem_slime,P.byId.guardian])assert.deepEqual(render(e,1234),{calls:[],back:false,front:false});
 const elite=P.findByKey('knight:elite'),one=render(elite,1234),again=render(elite,1234),later=render(elite,1450);
 assert.equal(one.back,true);assert.equal(one.front,true);assert.deepEqual(one,again);assert.notDeepEqual(one.calls,later.calls);
 assert.ok(one.calls.some(c=>c[0]==='fill'&&c[2].fillStyle==='#170811'),'dark inner wisps');
 assert.ok(one.calls.some(c=>c[0]==='fill'&&c[2].fillStyle==='#ec3755'),'sparse red embers');
 assert.ok(one.calls.filter(c=>c[0]==='fill').every(c=>c[2].globalAlpha>0&&c[2].globalAlpha<=.72));
});

test('sword phrasing holds contact, leads with the shoulder, and distinguishes deflection from followthrough',()=>{
 const m=art.profile(P.byId.guardian),phrase=(p,after=-99999,result='just')=>art.swordPhrase(art.timeline(m,m.swing*(1-p),after,3000),m,after,result);
 const release=phrase(.84);assert.ok(release.upper>release.hilt&&release.hilt>release.blade);
 for(const after of [0,15,37.999,38])for(const result of ['just','parry','guard','miss']){
  const q=phrase(0,after,result);close(q.upper,1);close(q.blade,1);close(q.hilt,1);close(q.charge,0);
 }
 const at=38+(m.recovery-38)*.2;
 assert.ok(phrase(0,at,'just').blade<phrase(0,at,'parry').blade);
 assert.ok(phrase(0,at,'parry').blade<phrase(0,at,'guard').blade);
 assert.ok(phrase(0,at,'miss').blade>1);
 const recovery=phrase(0,38+(m.recovery-38)*.48);
 assert.ok(recovery.blade-recovery.upper>.25,'hilt retracts while the blade stays forward');
 for(const result of ['just','parry','guard','miss'])for(const u of [0,.2,.48,.72,1]){
  const a=phrase(0,38+(m.recovery-38)*u-.000001,result),b=phrase(0,38+(m.recovery-38)*u+.000001,result);
  for(const key of ['upper','blade','hilt'])assert.ok(Math.abs(a[key]-b[key])<1e-6,key+' jumps at '+u);
 }
});

test('blade smear covers the sampled sword surface and skips stationary segments',()=>{
 const calls=[],ctx=new Proxy({},{get:(_,k)=>(...args)=>calls.push([k,...args])});
 const frames=[{hand:{x:5,y:6},tip:{x:10,y:40}},{hand:{x:6,y:6},tip:{x:35,y:12}}];
 art.bladeRibbon(ctx,frames);assert.equal(calls.filter(x=>x[0]==='fill').length,1);
 assert.ok(calls.some(x=>x[0]==='lineTo'&&x[1]===10&&x[2]===40));
 calls.length=0;art.bladeRibbon(ctx,[frames[0],frames[0]]);assert.equal(calls.filter(x=>x[0]==='fill').length,0);
});

function loadRenderers(failImages=false){
 const calls=[];
 function context(){return new Proxy({globalAlpha:1},{
  get:(obj,key)=>key in obj?obj[key]:(...args)=>{
   for(const n of args.filter(x=>typeof x==='number'))assert.ok(Number.isFinite(n),key+' received '+n);
   calls.push({key,args});
  },set:(obj,key,value)=>{obj[key]=value;return true;}
 });}
 class Image{set src(url){queueMicrotask(()=>(typeof failImages==='function'?failImages(url):failImages)?this.onerror?.():this.onload?.());}}
 const window={URL,Image,console:{warn(){}},location:{search:''},document:{
  currentScript:null,createElement:()=>({getContext:()=>context()})
 }};
 for(const name of ['character-art','character-ready','character-knight','combat-art']){
  window.document.currentScript={src:'http://localhost/assets/'+name+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,console});
 }
 window.document.currentScript=null;
 return {window,calls,context,api:window.ParryCombatArt};
}

test('enlarged staging reserves the hero sweep and enemy recoil on narrow and wide screens',()=>{
 for(const [width,height] of [[320,355],[360,400],[390,420],[768,460],[880,550],[1160,550]]){
  for(const e of P.all){
   const m=art.profile(e),l=art.layout(width,height,e,m);
   assert.ok(l.base>0&&Number.isFinite(l.base));
   assert.ok(l.heroX-72*l.heroScale>=0,'hero sword clips left: '+e.id+' / '+width);
   assert.ok(l.stageX+59*l.enemyScale<=width,'enemy staging clips right: '+e.id+' / '+width);
   assert.ok(l.contactX+(e.boss?8:14)*l.enemyScale+52*l.enemyScale<=width,'recoil clips right: '+e.id+' / '+width);
   close(l.contactX-m.reach*l.enemyScale,l.hitX);
   close(l.ground+l.impactY*l.enemyScale,l.hitY);
  }
 }
 const e=P.byId.knight,l=art.layout(880,550,e);
 const previous=Math.min(880/550,550/470)*1.23;
 assert.ok(l.heroScale/previous>1.5,'desktop hero should be visibly larger');
});

test('traced knight reaches the shield exactly for regular, elite-sized and palette variants',()=>{
 for(const e of [P.byId.knight,P.byId.void_knight])for(const [w,h] of [[320,355],[880,550]]){
  const m=art.profile(e),l=art.layout(w,h,e,m);
  const j=art.knightJoints({charge:0,action:1},m,l.impactY);
  const tip=art.knightTip(j);
  close(tip[0],m.reach);close(tip[1],l.impactY);
  close(l.contactX-tip[0]*l.enemyScale,l.hitX);
  close(l.ground+tip[1]*l.enemyScale,l.hitY);
 }
});

test('new reverse counter retains a full turn and accelerates during the actual cut',()=>{
 close(art.heroJoints(1).shoulder,0);
 close(art.heroJoints(.0000001).shoulder,-Math.PI*2);
 assert.deepEqual(art.heroJoints(0),{shoulder:0,elbow:0});
 const phases=Array.from({length:100},(_,i)=>art.heroJoints(1-i/100).shoulder);
 for(let i=1;i<phases.length;i++)assert.ok(phases[i]<=phases[i-1]);
 const speed=t=>Math.abs(art.heroJoints(1-t-.001).shoulder-art.heroJoints(1-t).shoulder);
 assert.ok(speed(.38)>speed(.08)*3,'release must be much faster than anticipation');
 for(const a of [0,.1,.5,.9,1])assert.ok(art.heroTip(a).every(Number.isFinite));
});

test('enemy release starts in the held windup, contacts on schedule and settles before recovery',()=>{
 for(const m of Object.values(art.PROFILES)){
  const before=art.timeline(m,m.swing,-1000,2200);
  close(before.charge,1);close(before.drive,0);
  const near=art.timeline(m,0,-.001,2200);
  close(near.action,1);close(near.charge,0);
  const contact=art.timeline(m,2000,0,2200);
  close(contact.action,1);close(contact.rec,1);
  close(art.timeline(m,2000,37,2200).rec,1);
  assert.ok(art.timeline(m,2000,100,2200).rec<1);
  close(art.timeline(m,2000,m.recovery,2200).rec,0);
  assert.ok(art.timeline(m,m.swing*.5,-1000,2200).drive<.2,'save the speed for the last part of the cut');
 }
});

test('preview profiles match the real game and all reused weapon endpoints arrive on the shield',()=>{
 const source=fs.readFileSync('assets/game.js','utf8');
 const actual=vm.runInNewContext('('+source.match(/const MOTIONS=(\{[\s\S]*?\});/)[1]+')');
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),art.PROFILES);
 const sprites=require('../assets/character-art.js');
 for(const e of P.all.filter(e=>(e.sprite||e.id)!=='knight')){
  const m=art.profile(e),l=art.layout(360,400,e,m);
  const tip=sprites.attackTip({e,m,charge:0,action:1,p:1,rec:0,recoil:0,impactY:l.impactY});
  close(tip.x,m.reach);close(tip.y,l.impactY);
 }
});

test('all roster identities, palettes and five phases draw without mutating encounter or pose data',async()=>{
 const r=loadRenderers();
 assert.ok((await r.api.preload()).every(Boolean));
 for(const original of P.all){
  const e=Object.freeze({...original,index:3,elite:true});
  const m=Object.freeze({...art.profile(e)});
  for(const time of [100,1160,1440,1500,1590,1780]){
   r.calls.length=0;
   const pose=Object.freeze({e,m,width:360,height:400,now:10000+time,
    attackAt:time<1500?11500:14500,attackSpan:3000,
    lastImpactAt:time>=1500?11500:-99999,lastDeflectAt:time>=1500?11500:-99999,lastStrikeKind:'just'});
   assert.equal(r.api.drawEnemy(r.context(),pose),true,e.id+' at '+time);
   assert.equal(r.calls.filter(x=>x.key==='save').length,r.calls.filter(x=>x.key==='restore').length,e.id);
   assert.equal(e.index,3);
  }
 }
 for(const action of [0,.1,.5,.9,1]){
  r.calls.length=0;
  assert.equal(r.api.drawHero(r.context(),{width:880,height:550,e:P.byId.knight,now:10000,
   pose:Object.freeze({action,lift:1,heldLift:1,push:.5,guardHeld:true,lastStrikeKind:'just'})}),true);
  assert.equal(r.calls.filter(x=>x.key==='save').length,r.calls.filter(x=>x.key==='restore').length);
 }
});

test('deferred preloading resolves SVGs relative to their scripts, including the standalone preview',async()=>{
 const r=loadRenderers();
 assert.equal(r.window.ParryKnightTrace.sourceUrl(),'http://localhost/assets/character-art/tracing/knight/knight-static.svg');
 assert.ok((await r.api.preload()).every(Boolean));
 assert.ok((await r.api.preload()).every(Boolean));
});

test('slime holds its extended attack surface across impact instead of snapping to its idle shape',async()=>{
 const r=loadRenderers();await r.api.preload();
 const original=r.window.ParryCharacterArt;let captured;
 r.window.ParryCharacterArt={...original,drawEnemy(ctx,pose){captured=pose;return original.drawEnemy(ctx,pose);}};
 const e=P.byId.slime,m=art.profile(e),l=art.layout(360,320,e,m);
 for(const after of [-.001,0,20,37]){
  r.api.drawEnemy(r.context(),{e,m,width:360,height:320,now:11500+after,
   attackAt:after<0?11500:14500,lastImpactAt:after<0?-99999:11500,attackSpan:3000});
  const tip=original.attackTip(captured);
  assert.ok(Math.abs(tip.x-m.reach)<.001);
  assert.ok(Math.abs(tip.y-l.impactY)<.001);
 }
});

test('a failed adopted SVG returns to the existing game renderer without drawing partial characters',async()=>{
 const r=loadRenderers(true);
 assert.ok((await r.api.preload()).every(x=>!x));
 r.calls.length=0;
 assert.equal(r.api.drawHero(r.context(),{width:880,height:550,pose:{}}),false);
 assert.equal(r.api.drawEnemy(r.context(),{e:P.byId.knight,width:880,height:550,now:10000,attackAt:11000}),false);
 assert.equal(r.calls.length,0);
});

test('a single missing adopted asset keeps both characters and the contact coordinate on the same fallback',async()=>{
 for(const missing of ['hero','knight']){
  const r=loadRenderers(url=>url.includes('/'+missing+'/'));
  await r.api.preload();r.calls.length=0;
  assert.equal(r.api.readyFor(P.byId.knight),false);
  assert.equal(r.api.drawHero(r.context(),{width:880,height:550,e:P.byId.knight,pose:{}}),false);
  assert.equal(r.api.drawEnemy(r.context(),{width:880,height:550,e:P.byId.knight,now:10000,attackAt:11000}),false);
  assert.equal(r.calls.length,0);
  assert.equal(r.api.readyFor(P.byId.slime),missing==='knight');
 }
});

test('preview and opt-in game share real renderers, locally available assets, and a fixed review entrypoint',()=>{
 for(const file of ['index.html','dev.html']){
  const html=fs.readFileSync(file,'utf8');
  assert.ok(html.indexOf('assets/combat-art.js')>html.indexOf('assets/character-knight.js'));
  assert.ok(html.indexOf('assets/combat-art.js')<html.indexOf('assets/game.js'));
 }
 const html=fs.readFileSync('art-preview.html','utf8');
 for(const [,link] of html.matchAll(/(?:src|href)="(\.\/assets\/[^"?]+)[^"]*"/g))assert.ok(fs.existsSync(link));
 const preview=fs.readFileSync('assets/art-preview.js','utf8');
 assert.match(preview,/art\.drawEnemy\(ctx,d\)/);
 assert.match(preview,/art\.drawHero\(ctx/);
 assert.match(preview,/prefers-reduced-motion/);
 assert.doesNotMatch(preview,/localStorage|AudioContext|fetch\(/);
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.match(game,/COMBAT_ART_ENABLED&&COMBAT_ART\?\.drawEnemy/);
 assert.match(game,/COMBAT_ART_ENABLED&&COMBAT_ART\?\.drawHero/);
});


test('purchased crescent colors preserve size, timing, geometry and canvas state',()=>{
 const P=require('../assets/progression'),state={globalAlpha:.8,fillStyle:'before',strokeStyle:'before',shadowColor:'before',shadowBlur:0,lineWidth:1,lineCap:'butt'},stack=[],paints=[];
 const ctx=new Proxy(state,{get:(s,k)=>k in s?s[k]:(...args)=>{if(k==='save')stack.push({...state});else if(k==='restore')Object.assign(state,stack.pop());else if(['fill','stroke'].includes(k))paints.push({...state});}});
 const before={...state},input={kind:'just',phase:.6,origin:{x:100,y:250},target:{x:350,y:190},scale:1},base=art.counterSlash(ctx,input);
 for(const tint of P.EXTRAS.find(item=>item.id==='slashTint').choices){
  paints.length=0;assert.deepEqual(art.counterSlash(ctx,{...input,tint}),base);assert.ok(paints.some(p=>p.fillStyle===tint.fill));assert.ok(paints.some(p=>p.strokeStyle===tint.edge));
  assert.deepEqual(state,before);assert.equal(stack.length,0);
 }
});

test('combo glow grows at 10/25/50, stays bounded and deterministic, and respects incoming opacity',()=>{
 const render=(combo,now=1234)=>{
  const state={globalAlpha:.5,fillStyle:'old',strokeStyle:'old',shadowColor:'old',shadowBlur:0,lineWidth:1},before={...state},stack=[],calls=[];
  const ctx=new Proxy(state,{get:(s,k)=>k in s?s[k]:(...args)=>{if(k==='save')stack.push({...state});else if(k==='restore')Object.assign(state,stack.pop());else{for(const n of args.filter(a=>typeof a==='number'))assert.ok(Number.isFinite(n));calls.push({k,args,alpha:state.globalAlpha});}}});
  const result=art.comboAura(ctx,{now,combo,x:200,y:350,scale:.8});assert.deepEqual(state,before);assert.equal(stack.length,0);assert.ok(calls.length<90);assert.ok(calls.every(c=>c.alpha<=.5));return {result,calls};
 };
 for(const count of [0,9,-1])assert.deepEqual(render(count),{result:false,calls:[]});
 for(const [count,tier]of [[10,1],[24,1],[25,2],[49,2],[50,3],[999,3]]){assert.equal(render(count).result.tier,tier);assert.deepEqual(render(count),render(count));}
 assert.notDeepEqual(render(25).calls,render(25,1600).calls);
 assert.equal(art.comboAura({}, {combo:50,now:NaN}),false);
});
