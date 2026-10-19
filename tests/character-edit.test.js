'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../assets/character-edit'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const project=characters=>({...E.empty(),characters}),part=patch=>({...E.defaults(),...patch});
test('projects validate finite geometry, bounded masks, unique key times and safe identifiers',()=>{
 assert.deepEqual(E.normalize(E.empty()),E.empty());
 for(const p of [null,{}, {...E.empty(),version:2},project({sentinel:{layers:{upper:part({x:Infinity})}}}),
  project({sentinel:{layers:{upper:part({keys:[{time:10},{time:10}]})}}}),project({sentinel:{layers:{upper:part({mask:[[[0,0],[1,1]]]})}}}),
  project(JSON.parse('{"__proto__":{}}')),project({sentinel:{order:['body','body']}})])assert.throws(()=>E.normalize(p));
 const original=project({sentinel:{layers:{upper:part({mask:[[[0,0],[50,0],[50,50]]],keys:[{time:1200,rotation:360},{time:0}]})}}});
 const out=E.normalize(original);assert.equal(out.characters.sentinel.layers.upper.keys[0].time,0);
 out.characters.sentinel.layers.upper.mask[0][0][0]=22;assert.equal(original.characters.sentinel.layers.upper.mask[0][0][0],0);
});
test('keyframes preserve a complete turn, hold poses and interpolate scale without changing the input',()=>{
 const a={time:0,x:0,y:10,rotation:0,scaleX:1,scaleY:1,opacity:1,easing:'linear'},b={...a,time:100,x:20,rotation:360,scaleX:2};
 const k=E.sampleKeys([a,b],50);near(k.x,10);near(k.rotation,180);near(k.scaleX,1.5);assert.equal(a.rotation,0);
 near(E.sampleKeys([{...a,easing:'hold'},b],99).rotation,0);near(E.sampleKeys([{...a,easing:'smooth'},b],25).rotation,56.25);
 near(E.sampleKeys([a,b],-20).rotation,0);near(E.sampleKeys([a,b],200).rotation,360);near(E.sampleKeys([],30).scaleX,1);
});

test('pose-only windows survive normalization without altering keys, masks or other characters',()=>{
 const range=[1276.8,1377.6,1420.8,1421],p=project({guardian:{layers:{upper0:part({x:21,rotation:-38,poseWindow:range,
  mask:[[[600,300],[700,300],[700,500]]],keys:[{time:0},{time:1390,x:48},{time:3000}]})}},hero:{layers:{weapon:part({x:15})}}});
 const out=E.normalize(p),again=E.normalize(JSON.parse(JSON.stringify(out)));
 assert.deepEqual(again,out);assert.deepEqual(out.characters.guardian.layers.upper0.poseWindow,range);
 out.characters.guardian.layers.upper0.poseWindow[0]=20;assert.equal(range[0],1276.8);
 for(const bad of [null,[],[1,2,3],[1,2,3,4,5],[-1,2,3,4],[1,1,3,4],[1,3,2,4],[1,2,3,3],[1,2,3,3001],[undefined,2,3,4],[1,NaN,3,4],['1',2,3,4]])
  assert.throws(()=>E.normalize(project({guardian:{layers:{upper0:part({poseWindow:bad})}}})));
 assert.equal(E.normalize(project({guardian:{layers:{upper0:part({x:3})}}})).characters.guardian.layers.upper0.poseWindow,undefined);
});

test('pose-only position and rotation keep the edited middle exact and recover original motion outside its window',()=>{
 const range=[1276.8,1377.6,1420.8,1421],base={at:{x:12,y:-36},pivot:[50,80],angle:.2,sx:1.1,sy:.9,phaseVisible:true};
 const patch=part({x:21,y:83,rotation:11,pivotX:4,pivotY:-3,scaleX:1.2,scaleY:.8,opacity:.7,
  keys:[{time:0},{time:1390,x:-184,y:-66,rotation:28},{time:3000}]});
 const sample=(l,t)=>{E.setProject(project({guardian:{layers:{weapon:l}},hero:{layers:{weapon:part({x:50})}}}));return E.placement('guardian','weapon',base,base,t,.25);};
 const scoped={...patch,poseWindow:range},neutral={...patch,x:0,y:0,rotation:0,keys:patch.keys.map(k=>({...k,x:0,y:0,rotation:0}))};
 for(const t of [1377.6,1390,1420,1420.8])assert.deepEqual(sample(scoped,t),sample(patch,t),'edited middle remains exact at '+t);
 for(let t=0;t<=3000;t+=7)if(t<=range[0]||t>=range[3])assert.deepEqual(sample(scoped,t),sample(neutral,t),'original position/rotation outside the middle at '+t);
 for(const t of [range[0],(range[0]+range[1])/2,range[1],(range[2]+range[3])/2,range[3]]){
  const q=sample(scoped,t),before=sample(patch,t),zero=sample(neutral,t),weight=t===range[0]||t===range[3]?0:t===range[1]?1:.5;
  near(q.at.x,zero.at.x+(before.at.x-zero.at.x)*weight);near(q.at.y,zero.at.y+(before.at.y-zero.at.y)*weight);near(q.angle,zero.angle+(before.angle-zero.angle)*weight);
  assert.equal(q.sx,before.sx);assert.equal(q.sy,before.sy);assert.equal(q.opacity,before.opacity);assert.deepEqual(q.pivot,before.pivot);
 }
 assert.equal(E.placement('hero','weapon',base,base,1200,.25).at.x,base.at.x+12.5);
 assert.deepEqual(patch.keys,[{time:0},{time:1390,x:-184,y:-66,rotation:28},{time:3000}]);E.setProject(E.empty());
});

test('sword blur duration survives project normalization and rejects invalid or out-of-range speeds',()=>{
 const p=project({guardian:{effects:{swordBlurDuration:80}}});
 assert.equal(E.normalize(p).characters.guardian.effects.swordBlurDuration,80);
 assert.deepEqual(E.normalize(E.normalize(p)),E.normalize(p));
 for(const value of [0,39,401,Infinity,'80'])assert.throws(()=>E.normalize(project({guardian:{effects:{swordBlurDuration:value}}})));
 assert.throws(()=>E.normalize(project({guardian:{effects:[]}})));
 assert.equal(E.normalize(project({guardian:{}})).characters.guardian.effects,undefined,'old v1 projects remain unchanged');
});

test('linked parts rotate around one shared pivot and preserve all relative source points and lengths',()=>{
 const parts={upper:{at:{x:3,y:-30},pivot:[20,40],angle:.4,sx:1.1,sy:.8},fore:{at:{x:23,y:-37},pivot:[80,60],angle:-.6},
  weapon:{at:{x:48,y:-45},pivot:[110,20],angle:1.2}},snapshot=E.clone(parts),pivot={x:3,y:-30},u=.18;
 const map=(p,src)=>{const x=(src[0]-p.pivot[0])*u*(p.sx||1),y=(src[1]-p.pivot[1])*u*(p.sy||1);return {x:p.at.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.at.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)};};
 for(const rotation of [-170,-90,0,25,180,360]){
  const change={x:11,y:-9,rotation},d=E.groupDeltas(parts,pivot,change,u),a=rotation*Math.PI/180;
  for(const [key,p]of Object.entries(parts)){
   const moved={...p,at:{x:p.at.x+d[key].x*u,y:p.at.y+d[key].y*u},angle:p.angle+d[key].rotation*Math.PI/180};
   for(const src of [[0,0],[80,120],p.pivot]){
    const old=map(p,src),actual=map(moved,src),x=old.x-pivot.x,y=old.y-pivot.y;
    near(actual.x,pivot.x+x*Math.cos(a)-y*Math.sin(a)+change.x);near(actual.y,pivot.y+x*Math.sin(a)+y*Math.cos(a)+change.y);
   }
  }
 }
 assert.deepEqual(parts,snapshot);
 for(const unit of [0,-1,NaN])assert.throws(()=>E.groupDeltas(parts,pivot,{},unit));
 assert.throws(()=>E.groupDeltas(parts,pivot,{rotation:Infinity},u));
});

test('rotation drags accumulate small forward steps across both angle boundaries without adding a full turn',()=>{
 const rad=n=>n*Math.PI/180;near(E.rotationStep(rad(179),rad(-179)),rad(2));near(E.rotationStep(rad(-179),rad(179)),rad(-2));
 let total=0;for(const [a,b]of [[170,179],[179,-179],[-179,-150],[-150,-100]])total+=E.rotationStep(rad(a),rad(b));near(total,rad(90));
});

test('shared animation groups survive JSON and keep connected joints on circular paths at every interpolated frame',()=>{
 const group={parts:['upper','fore','weapon'],anchor:'upper',pivot:[0,0],x:0,y:0,rotation:-90,keys:[],poseWindow:[100,200,220,221]},
  base={upper:{at:{x:0,y:0},pivot:[0,0],angle:0},fore:{at:{x:20,y:0},pivot:[20,0],angle:0},weapon:{at:{x:40,y:0},pivot:[40,0],angle:0}};
 const p=project({guardian:{groups:[group]}}),out=E.normalize(JSON.parse(JSON.stringify(p)));assert.deepEqual(out.characters.guardian.groups[0],group);
 E.setProject(out);
 for(let t=0;t<=250;t+=.5){const q=E.placements('guardian',base,base,t,1),a=q.upper.angle;
  near(Math.hypot(q.fore.at.x,q.fore.at.y),20);near(Math.hypot(q.weapon.at.x-q.fore.at.x,q.weapon.at.y-q.fore.at.y),20);
  near(q.fore.at.x,20*Math.cos(a));near(q.fore.at.y,20*Math.sin(a));near(q.weapon.angle,a);
 }
 const baked=E.groupDeltas(base,{x:0,y:0},{rotation:-90},1);E.setProject(project({guardian:{layers:Object.fromEntries(Object.entries(baked).map(([k,v])=>[k,part({...v,poseWindow:group.poseWindow})]))}}));
 assert.ok(Math.abs(E.placements('guardian',base,base,150,1).fore.at.x-20/Math.sqrt(2))>4,'old per-part chord interpolation reproduces the reported bug');
 for(const g of [{...group,parts:['upper','upper']},{...group,anchor:'body'},{...group,pivot:[Infinity,0]},{...group,keys:[{time:1},{time:1}]}])assert.throws(()=>E.normalize(project({guardian:{groups:[g]}})));
 E.setProject(E.empty());
});

test('group gesture composition preserves its shared transform when editing around a different center',()=>{
 const g={parts:['upper','weapon'],anchor:'upper',pivot:[0,0],x:7,y:9,rotation:-40,keys:[]},base={upper:{at:{x:2,y:3},pivot:[0,0],angle:0},weapon:{at:{x:22,y:3},pivot:[20,0],angle:0}},u=.2;
 E.setProject(project({guardian:{groups:[g]}}));const before=E.placements('guardian',base,base,100,u),state=E.groupState(g,base,100,u),center={x:11,y:-7},d={x:3,y:8,rotation:-35},total=E.composeGroup(state,center,d,u);
 E.setProject(project({guardian:{groups:[{...g,...total}]}}));const after=E.placements('guardian',base,base,100,u),a=d.rotation*Math.PI/180;
 for(const key of g.parts){const x=before[key].at.x-center.x,y=before[key].at.y-center.y;near(after[key].at.x,center.x+x*Math.cos(a)-y*Math.sin(a)+d.x);near(after[key].at.y,center.y+x*Math.sin(a)+y*Math.cos(a)+d.y);}
 E.setProject(E.empty());
});

test('baked linked-part edits keep source pivots, existing keys and other parts intact and remain limited to the middle',()=>{
 const range=[1276.8,1377.6,1420.8,1421],u=.18,t=1390,base={upper0:{at:{x:5,y:-40},pivot:[630,413],angle:.2},
  fore0:{at:{x:14,y:-55},pivot:[672,319],angle:-.4},weapon:{at:{x:20,y:-65},pivot:[592,242],angle:-1.4}};
 const input=E.normalize(project({guardian:{placement:{x:-17,y:36,scale:1.3},layers:{upper0:part({x:12,rotation:8,poseWindow:range}),
  fore0:part({y:15,poseWindow:range,keys:[{time:0},{time:1390,x:20},{time:3000}]}),weapon:part({poseWindow:range}),body:part({x:3})}},hero:{layers:{weapon:part({rotation:9})}}}));
 E.setProject(input);const posed=Object.fromEntries(Object.entries(base).map(([k,p])=>[k,E.placement('guardian',k,p,p,t,u)]));
 const pivot=posed.upper0.at,deltas=E.groupDeltas(posed,pivot,{x:7,y:3,rotation:32},u),out=E.clone(input);
 for(const [key,d]of Object.entries(deltas)){const p=out.characters.guardian.layers[key];p.x+=d.x;p.y+=d.y;p.rotation+=d.rotation;}
 E.setProject(out);
 for(const [key,p]of Object.entries(base)){
  const result=E.placement('guardian',key,p,p,t,u),d=deltas[key];near(result.at.x,posed[key].at.x+d.x*u);near(result.at.y,posed[key].at.y+d.y*u);near(result.angle,posed[key].angle+32*Math.PI/180);
  assert.deepEqual(result.pivot,posed[key].pivot);assert.deepEqual(out.characters.guardian.layers[key].keys,input.characters.guardian.layers[key].keys);
  for(const time of [0,1200,1276.8,1421,1500,1700,2200,3000]){const actual=E.placement('guardian',key,p,p,time,u);near(actual.at.x,p.at.x);near(actual.at.y,p.at.y);near(actual.angle,p.angle);}
 }
 assert.deepEqual(out.characters.hero,input.characters.hero);assert.deepEqual(out.characters.guardian.layers.body,input.characters.guardian.layers.body);
 assert.deepEqual(out.characters.guardian.placement,input.characters.guardian.placement);E.setProject(E.empty());
});
test('changing a pivot alone preserves painted pixel positions; rotation and offsets use the new pivot',()=>{
 const base={at:{x:10,y:20},pivot:[100,200],angle:.4};
 E.setProject(project({sentinel:{layers:{upper:part({pivotX:30,pivotY:-12})}}}));
 const p=E.placement('sentinel','upper',base,base,0,.2);
 const transform=(p,source)=>({x:p.at.x+((source[0]-p.pivot[0])*Math.cos(p.angle)-(source[1]-p.pivot[1])*Math.sin(p.angle))*.2,
  y:p.at.y+((source[0]-p.pivot[0])*Math.sin(p.angle)+(source[1]-p.pivot[1])*Math.cos(p.angle))*.2});
 const first=transform(base,[150,230]),second=transform(p,[150,230]);near(first.x,second.x);near(first.y,second.y);
 E.setProject(project({sentinel:{layers:{upper:part({x:40,rotation:90,mode:'replace',keys:[{time:0,y:20},{time:100,y:60}]})}}}));
 const rest={at:{x:1,y:2},pivot:[0,0],angle:0},q=E.placement('sentinel','upper',base,rest,50,.5);
 near(q.at.x,21);near(q.at.y,22);near(q.angle,Math.PI/2);
 E.setProject(E.empty());assert.equal(E.placement('sentinel','upper',base,rest,50,.2),base);
});
test('order, visibility, original comparison and mask revisions remain scoped to the edited character',()=>{
 E.setProject(project({sentinel:{order:['weapon','body'],placement:{x:20,y:5,scale:1.5},layers:{weapon:part({visible:false,mask:[[[1,2],[20,2],[20,30]]]})}}}));
 assert.deepEqual(E.orderFor('sentinel',['body','upper','weapon']),['weapon','body','upper']);
 assert.deepEqual(E.orderFor('guardian',['body','upper','weapon']),['body','upper','weapon']);
 const stamp=E.maskStamp('sentinel');const p=E.getProject();p.characters.sentinel.placement.x=55;E.setProject(p);assert.equal(E.maskStamp('sentinel'),stamp);
 assert.equal(E.original(()=>E.character('sentinel')),undefined);assert.equal(E.character('sentinel').placement.x,55);
 assert.deepEqual(E.sourceCrop([[[600,300],[900,300],[900,560],[600,560]]],1445,1088,[0,0,1,1]),[582,282,336,296]);
 E.setProject(E.empty());
});
test('editing time is sampled from existing impact timestamps rather than owning a gameplay timer',()=>{
 near(E.timeFor({now:10000,attackAt:10050}),1450);near(E.timeFor({now:10010,lastImpactAt:10000,attackAt:12000}),1510);
 near(E.timeFor({now:10000,attackAt:15000}),0);
});
function load(){
 const calls=[],storage=new Map();
 const context=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push({key:k,args});},set:(o,k,v)=>{o[k]=v;return true;}});
 const window={URL,console:{warn(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},location:{search:''},
  document:{createElement:()=>({getContext:()=>context()})},ParryCombatArt:{profile:()=>({reach:110}),readyFor:()=>true}};
 window.Image=class{set src(url){queueMicrotask(()=>this.onload?.());}};
 for(const name of ['character-edit','character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']){
  window.document.currentScript={src:'https://example.org/assets/'+name+'.js'};vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,console});
 }
 return {window,calls,context};
}

test('guardian grouped playback keeps both arms and the hilt joined through the entire swing and paints a blade-only following blur',async()=>{
 const {window:w,calls,context}=load(),P=require('../assets/encounters');Object.assign(w.ParryCombatArt,require('../assets/combat-art'));
 const api=w.ParryEnemyPuppet,ed=w.ParryArtEdits;await api.preload();
 const k=api.specs.guardian.keyPose.inbetween,swing=w.ParryCombatArt.profile(P.byId.guardian).swing;
 const range=[1500-(1-k.groupStart)*swing,1500-(1-k.groupAt)*swing,1500-(1-k.end)*swing,1421];
 near(range[0],1340);near(range[1],1410);near(range[1]-range[0],70);near(range[2]-range[1],10.8);
 assert.equal(ed.poseWeight(range,1339),0,'windup holds until the short release');
 assert.equal(ed.poseWeight(range,1410),1,'edited silhouette is reached before switching drawings');
 const g={parts:['upper0','fore0','upper1','fore1','weapon'],anchor:'upper0',pivot:[0,0],x:0,y:0,rotation:-69.3164251765064,keys:[],poseWindow:range};
 ed.setProject(project({guardian:{groups:[g],effects:{swordBlurDuration:200}}}));const before=ed.getProject(),s=api.specs.guardian,u=api.unit(s);
 const input=time=>({e:P.byId.guardian,width:900,height:550,now:10000+time,attackAt:time<1500?11500:14500,lastImpactAt:time<1500?-99999:11500,lastDeflectAt:time<1500?-99999:11500,lastStrikeKind:'guard',attackSpan:3000});
 const sourcePoint=(p,v)=>{const x=(v[0]-p.pivot[0])*u*(p.sx||1),y=(v[1]-p.pivot[1])*u*(p.sy||1);return {x:p.at.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.at.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)};};
 const coincides=(a,b)=>{near(a.x,b.x);near(a.y,b.y);};
 for(let t=1140;t<1420.8;t+=1){
  const d=api.sample(input(t)),p=ed.placements('guardian',d.q.placements,api.pose(s).placements,t,u);
  for(const a of s.arms){coincides(sourcePoint(p[a.upper],a.elbow),sourcePoint(p[a.fore],a.elbow));coincides(sourcePoint(p[a.fore],a.hand),sourcePoint(p.weapon,a.hand));}
 }
 for(const t of [1350,1370,1390,1410]){
  const d=api.sample(input(t)),p=ed.placements('guardian',d.q.placements,api.pose(s).placements,t,u);
  assert.ok(d.q.readyBladeGhost);assert.ok(d.q.readyBladeGhost.angle>p.weapon.angle,'afterimage trails the forward swing');assert.ok(d.q.readyBladeGhost.opacity>0&&d.q.readyBladeGhost.opacity<=.5);
  calls.length=0;api.drawCutout(context(),P.byId.guardian,d.q);assert.equal(calls.filter(c=>c.key==='drawImage'&&c.args[0]===api.editModel(P.byId.guardian).source).length,1,'one old sword, without old arms');
 }
 for(const t of [1421,1480,1500,1550,1600]){const d=api.sample(input(t));assert.ok(d.q.bladeGhost?.edited,'contact blur follows the edited ready sword, including samples from before impact');assert.ok(Number.isFinite(d.q.bladeGhost.angle));assert.ok(Number.isFinite(d.q.bladeGhost.at.x));}
 assert.equal(api.sample(input(1621)).q.bladeGhost,undefined);assert.deepEqual(ed.getProject(),before,'sampling never mutates the saved group');
});
test('enemy-front counter crescent follows the actual edited chest with a stable edited sword direction',async()=>{
 const {window:w,calls,context}=load(),P=require('../assets/encounters');Object.assign(w.ParryCombatArt,require('../assets/combat-art'),{readyFor:()=>true});
 const knight=w.ParryKnightPuppet,enemies=w.ParryEnemyPuppet,hero=w.ParryHeroPuppet,ed=w.ParryArtEdits;await knight.preload();await enemies.preload();
 ed.setProject(project({hero:{placement:{x:17,y:-9,scale:1.1},layers:{weapon:part({x:12,rotation:13,keys:[{time:0},{time:108,y:-7},{time:240}]})}},
  knight:{placement:{x:-20,y:9,scale:1.2},layers:{body:part({x:15,rotation:7})}},guardian:{placement:{x:-14,y:5,scale:1.1},layers:{strikePose:part({x:13,rotation:6})}}}));
 const saved=ed.getProject(),original=w.ParryCombatArt.counterSlash,emitted=[];
 w.ParryCombatArt.counterSlash=(ctx,input)=>{const result=original(ctx,input);emitted.push({input,result});return result;};
 for(const [width,height]of [[900,550],[360,640]])for(const e of P.all)for(const kind of ['parry','just','guard','miss']){
  const m=w.ParryCombatArt.profile(e),d={e,m,width,height,now:11608,attackAt:14500,attackSpan:3000,lastImpactAt:11500,lastDeflectAt:11500,lastStrikeKind:kind,
   pose:{action:.55,lastStrikeKind:kind,lastImpactAt:11500}},before=JSON.stringify(d),l=knight.layout(width,height,e,m);
  emitted.length=0;calls.length=0;assert.equal(knight.drawHero(context(),d),true);
  if(['parry','just'].includes(kind)){
   assert.equal(emitted.length,1);const {input,result}=emitted[0];assert.ok(result);near(result.tip.x,input.target.x);near(result.tip.y,input.target.y);
   assert.ok(Math.hypot(result.position.x-input.target.x,result.position.y-input.target.y)<40*l.heroScale,'flash stays at the enemy front');
   const target=knight.counterTarget(d);near(input.target.x,target.x);near(input.target.y,target.y);
   const q=hero.pose({...d.pose,action:.78,lift:1,hurt:0,push:Math.sin(Math.PI*52.8/160)*(kind==='just'?1:.45)}),patch=ed.placements('hero',hero.placements(q),hero.placements(hero.pose()),52.8,hero.SCALE).weapon;
   const a=patch.angle,x=(hero.PIVOTS.grip[0]-patch.pivot[0])*hero.SCALE*(patch.sx||1),y=(hero.PIVOTS.grip[1]-patch.pivot[1])*hero.SCALE*(patch.sy||1),whole=ed.whole('hero');
   near(input.origin.x,l.heroX+(q.slide+(patch.at.x+x*Math.cos(a)-y*Math.sin(a))*whole.scale+whole.x*hero.SCALE)*l.heroScale);
   near(input.origin.y,l.ground+((patch.at.y+x*Math.sin(a)+y*Math.cos(a))*whole.scale+whole.y*hero.SCALE)*l.heroScale);
   const api=knight.supports(e)?knight:enemies,id=api===knight?'knight':enemies.idFor(e),sample=api.sample(d),u=api===knight?.18:enemies.unit(sample.s),src=api===knight?[625,445]:sample.q.keyFrame==='contact'?sample.s.keyPose.chest:sample.s.chest,
    raw=api===knight?knight.placements(sample.q):sample.q.placements,rest=api===knight?knight.placements(knight.pose()):enemies.pose(sample.s).placements,
    partId=api===knight||sample.q.keyFrame!=='contact'?'body':'strikePose',p=ed.placements(id,raw,rest,sample.q.editTime,u)[partId],ew=ed.whole(id),dx=(src[0]-p.pivot[0])*u*(p.sx||1),dy=(src[1]-p.pivot[1])*u*(p.sy||1);
   near(target.x,sample.x+((p.at.x+dx*Math.cos(p.angle)-dy*Math.sin(p.angle))*ew.scale+ew.x*u)*sample.l.enemyScale);
   near(target.y,sample.l.ground+((sample.q.float||0)+(p.at.y+dx*Math.sin(p.angle)+dy*Math.cos(p.angle))*ew.scale+ew.y*u)*sample.l.enemyScale);
   emitted.length=0;knight.drawHero(context(),{...d,pose:{...d.pose,action:.28}});near(emitted[0].input.origin.x,input.origin.x);near(emitted[0].input.origin.y,input.origin.y);
  }else assert.equal(emitted.length,0,'guard and miss must not show a counter cut');
  assert.equal(JSON.stringify(d),before);assert.deepEqual(ed.getProject(),saved);
 }
});

test('counter flash stays visible for 200ms even after the 240ms sword animation ends',async()=>{
 const {window:w,context}=load(),P=require('../assets/encounters');Object.assign(w.ParryCombatArt,require('../assets/combat-art'),{readyFor:()=>true});
 await w.ParryKnightPuppet.preload();let flashes=0;const original=w.ParryCombatArt.counterSlash;
 w.ParryCombatArt.counterSlash=(ctx,input)=>{assert.ok(original(ctx,input));flashes++;};
 for(const kind of ['just','parry'])for(const age of [71,72,73,239,240,271,272,300]){
  flashes=0;w.ParryKnightPuppet.drawHero(context(),{e:P.byId.knight,width:900,height:550,now:11500+age,attackAt:14500,lastImpactAt:11500,lastDeflectAt:11500,lastStrikeKind:kind,
   pose:{action:Math.max(0,1-age/240),lastStrikeKind:kind,lastImpactAt:11500}});
  assert.equal(flashes,age>72&&age<272?1:0,kind+' / '+age+'ms');
 }
});

test('saved blur speed changes the shared enemy sampler without hiding the effect or changing contact',async()=>{
 const {window:w,calls,context}=load();Object.assign(w.ParryCombatArt,require('../assets/combat-art'));
 const api=w.ParryEnemyPuppet,ed=w.ParryArtEdits,P=require('../assets/encounters');await api.preload();
 const input=time=>({e:P.byId.guardian,width:900,height:550,now:10000+time,attackAt:time<1500?11500:14500,
  lastImpactAt:time>=1500?11500:-99999,lastDeflectAt:time>=1500?11500:-99999,lastStrikeKind:'just',attackSpan:3000});
 const original=api.sample(input(1450)),contactBefore=api.sample(input(1500)),standard=api.sample(input(1520));assert.ok(standard.q.bladeGhost);
 ed.setProject(project({guardian:{effects:{swordBlurDuration:80}}}));
 const fast=api.sample(input(1450));assert.ok(fast.q.bladeGhost);
 assert.equal(api.sample(input(1520)).q.bladeGhost,undefined,'80ms catches before the default 200ms');
 assert.equal(JSON.stringify(api.sample(input(1500)).q.tip),JSON.stringify(contactBefore.q.tip),'real sword contact is unchanged');
 assert.ok(Math.abs(fast.q.bladeGhost.angle-fast.q.placements.strikePose.angle)<Math.abs(original.q.bladeGhost.angle-original.q.placements.strikePose.angle));
 calls.length=0;api.drawCutout(context(),P.byId.guardian,fast.q);
 const source=api.editModel(P.byId.guardian).parts.strikePose.source;
 assert.equal(calls.filter(c=>c.key==='drawImage'&&c.args[0]===source).length,1,'effect-only settings must not suppress the blur');
 assert.equal(api.editModel(P.byId.guardian).effects.swordBlurDuration,200,'model reports the reset default');
 ed.storeDraft(ed.getProject());assert.equal(ed.readDraft().characters.guardian.effects.swordBlurDuration,80);
 ed.setProject(ed.readDraft());assert.equal(api.sample(input(1520)).q.bladeGhost,undefined);
 ed.setProject(project({guardian:{effects:{swordBlurDuration:200},layers:{strikePose:part({x:50,opacity:.5})}}}));
 const q=api.sample(input(1450)).q,ctx=context(),paints=[];ctx.drawImage=img=>paints.push({img,opacity:ctx.globalAlpha});
 calls.length=0;api.drawCutout(ctx,P.byId.guardian,q);
 assert.equal(paints.filter(p=>p.img===source).length,1,'manual contact-pose edits keep the editable blur');
 near(paints.find(p=>p.img===source).opacity,.25);
 assert.ok(calls.some(c=>c.key==='translate'&&Math.abs(c.args[0]-q.placements.strikePose.at.x-50*api.editModel(P.byId.guardian).unit)<1e-6),'blur follows the edited contact pose');
 ed.setProject(ed.empty());assert.ok(api.sample(input(1520)).q.bladeGhost,'reset restores default duration');
});

test('actual three puppet renderers expose source layers, rebuild masks past old crop edges and apply order/visibility',async()=>{
 const {window:w,calls,context}=load();assert.equal(await w.ParryKnightPuppet.preload(),true);
 const h=w.ParryHeroPuppet,k=w.ParryKnightPuppet,e=w.ParryEnemyPuppet,ed=w.ParryArtEdits;
 for(const api of [h,k])assert.ok(api.editModel().parts.body.image);
 assert.equal(e.editModel({id:'sentinel'}).id,'sentinel');
 ed.setProject(project({hero:{order:['weapon','body','upperArm'],layers:{upperArm:part({mask:[[[600,300],[900,300],[900,560],[600,560]]]}),shield:part({visible:false})}},
  knight:{layers:{swordUpper:part({mask:[[[650,310],[920,310],[920,530],[650,530]]]})}},sentinel:{layers:{upper:part({mask:[[[650,200],[950,200],[950,480],[650,480]]]})}}}));
 assert.equal(h.editModel().parts.upperArm.crop[2],336);assert.equal(k.editModel().parts.swordUpper.crop[0],632);assert.equal(e.editModel({id:'sentinel'}).parts.upper.crop[0],644);
 calls.length=0;const model=h.editModel();h.drawCutout(context(),h.pose());
 const images=calls.filter(c=>c.key==='drawImage').map(c=>c.args[0]);assert.equal(images.length,h.ORDER.length-1);assert.ok(images.includes(model.parts.forearm.image));assert.equal(images[0],model.parts.weapon.image);assert.ok(!images.includes(model.parts.shield.image));
 assert.equal(h.CROPS.upperArm[2],235,'original crop manifest remains unchanged');
 ed.applyLocal(project({hero:{placement:{x:40,y:0,scale:1.2}}}));assert.equal(ed.readDraft(),null);assert.ok(ed.storeDraft(ed.getProject()));assert.equal(ed.readDraft().characters.hero.placement.x,40);
});

test('manual art adjustments suppress stale base sword trails in all three actual renderers',async()=>{
 const {window:w,context}=load(),P=require('../assets/encounters');
 Object.assign(w.ParryCombatArt,require('../assets/combat-art'),{readyFor:()=>true});let ribbons=0;w.ParryCombatArt.bladeRibbon=()=>ribbons++;
 assert.equal(await w.ParryKnightPuppet.preload(),true);
 const enemy=id=>({e:P.byId[id],width:900,height:550,now:11485,attackAt:11500,attackSpan:3000,lastImpactAt:-99999});
 const draw=()=>{
  assert.equal(w.ParryEnemyPuppet.drawEnemy(context(),enemy('sentinel')),true);
  assert.equal(w.ParryKnightPuppet.drawEnemy(context(),enemy('knight')),true);
  assert.equal(w.ParryHeroPuppet.drawHero(context(),{now:11590,layout:w.ParryKnightPuppet.layout(900,550,P.byId.knight),pose:{action:.6}}),true);
 };
 draw();assert.equal(ribbons,3);
 const saved=project({hero:{layers:{weapon:part({rotation:12})}},knight:{layers:{weapon:part({rotation:15})}},sentinel:{layers:{weapon:part({rotation:20})}}});
 w.ParryArtEdits.setProject(saved);const before=w.ParryArtEdits.getProject();ribbons=0;draw();assert.equal(ribbons,0);
 assert.deepEqual(w.ParryArtEdits.getProject(),before,'base motion never writes user settings');
});

test('replace-motion adjustments retain authored pose visibility instead of revealing the inactive drawing',()=>{
 const E=require('../assets/character-edit');
 E.setProject(project({guardian:{layers:{strikePose:part({mode:'replace',rotation:10})}}}));
 const rest={at:{x:0,y:0},pivot:[0,0],angle:0,phaseVisible:false};
 const active={...rest,at:{x:3,y:4},angle:.2,phaseVisible:true};
 assert.equal(E.placement('guardian','strikePose',active,rest,1500,.2).phaseVisible,true);
 assert.equal(E.placement('guardian','strikePose',rest,rest,100,.2).phaseVisible,false);
 E.setProject(E.empty());
});
