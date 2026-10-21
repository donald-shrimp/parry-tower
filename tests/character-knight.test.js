'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const SOURCE='assets/character-knight.js';
const SVG='assets/character-art/tracing/knight/knight-static.svg';
const script=fs.readFileSync(SOURCE,'utf8');
const art=require('../assets/character-knight.js');
const approx=(a,b,tolerance=.001)=>Math.abs(a-b)<=tolerance;

test('approved knight static SVG is vector artwork, not a reillustrated sprite',()=>{
 const s=fs.readFileSync(SVG,'utf8');
 assert.match(s,/viewBox="0 0 760 760"/);
 assert.ok((s.match(/<path\b/g)||[]).length>=8);
 assert.match(s,/#a55334/i);
 assert.doesNotMatch(s,/<(?:image|script|foreignObject)\b/i);
 const m=JSON.parse(fs.readFileSync('assets/character-art/tracing/knight/knight-manifest.json','utf8'));
 assert.equal(m.id,'knight');assert.equal(m.parts.length,6);
 assert.deepEqual(m.gameLocal,{feetY:0,reach:110,impactY:-58});
});
test('only art=knight-trace selects knight art; existing art modes and hitboxes stay intact',()=>{
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.match(game,/CHARACTER_KNIGHT_ENABLED&&CHARACTER_KNIGHT\?\.drawEnemy/);
 assert.match(game,/art=knight-trace/);
 assert.match(game,/CHARACTER_READY_ENABLED&&CHARACTER_READY\?\.drawHero/);
 assert.match(game,/CHARACTER_ART_ENABLED&&CHARACTER_ART\?\.drawEnemy/);
 assert.match(game,/knight:\{swing:270,prepare:850,reach:110,stage:130,recovery:380/);
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  assert.ok(html.includes('assets/character-knight.js?v=v0.9.5-preview-1'));
  assert.ok(html.indexOf('assets/character-ready.js')<html.indexOf('assets/character-knight.js'));
  assert.ok(html.indexOf('assets/character-knight.js')<html.indexOf('assets/game.js'));
 }
});
test('one SVG is loaded and partitioned into fixed body plus five unique masked parts',async()=>{
 const calls=[],urls=[];
 const ctx=()=>new Proxy({},{
  get:(object,key)=>key in object?object[key]:((...args)=>calls.push({key,args})),
  set:(object,key,value)=>{object[key]=value;return true}
 });
 class ImageMock{set src(url){urls.push(url);queueMicrotask(()=>this.onload?.())}}
 const window={Image:ImageMock,URL,console,location:{search:'?art=knight-trace'},
   document:{currentScript:{src:'https://example.org/assets/character-knight.js'},
    createElement:()=>({getContext:()=>ctx()})}};
 vm.runInNewContext(script,{window,URL,console});
 const api=window.ParryKnightTrace;
 assert.equal(await api.preload(),true);
 assert.equal(api.ready(),true);assert.equal(urls.length,1);
 assert.ok(urls[0].endsWith('/assets/character-art/tracing/knight/knight-static.svg'));
 assert.equal(await api.preload(),true);
 assert.equal(urls.length,1,'SVG is loaded exactly once');
 for(const [charge,action] of [[0,0],[.8,0],[0,.5],[0,1],[0,.3]]){
  calls.length=0;
  assert.equal(api.drawEnemy(ctx(),{e:{kind:'knight'},charge,action}),true);
  assert.equal(calls.filter(c=>c.key==='drawImage').length,6);
  assert.equal(calls.filter(c=>c.key==='save').length,calls.filter(c=>c.key==='restore').length);
 }
 calls.length=0;
 assert.equal(api.drawEnemy(ctx(),{e:{kind:'slime'},charge:1,action:.7}),false);
 assert.equal(calls.length,0);
});
test('sword rotates as a shoulder-elbow hierarchy; impact tip nears the existing shield point',()=>{
 assert.match(script,/turn\(ctx,PIVOTS\.swordShoulder,a\.swordShoulder\)/);
 assert.match(script,/turn\(ctx,PIVOTS\.swordElbow,a\.swordElbow\)/);
 assert.match(script,/drawImage\(layers\.sword,0,0,SIZE,SIZE\)/);
 const idle=art.angles(0,0),contact=art.angles(0,1);
 assert.ok(approx(idle.swordShoulder,0));
 assert.ok(approx(contact.swordShoulder,-1.2));
 assert.ok(approx(contact.swordElbow,0));
 const [sx,sy]=art.PIVOTS.swordShoulder;
 const angle=contact.swordShoulder;
 const dx=28-sx,dy=28-sy;
 const tipX=sx+Math.cos(angle)*dx-Math.sin(angle)*dy;
 const tipY=sy+Math.sin(angle)*dx+Math.cos(angle)*dy;
 const gameX=(454-tipX)*.20,gameY=(tipY-739)*.20;
 assert.ok(Math.abs(gameX-110)<8,'sword tip x reaches parry shield ('+gameX+')');
 assert.ok(Math.abs(gameY+58)<7,'sword tip y reaches parry shield ('+gameY+')');
 assert.ok(art.angles(0,.5).swordElbow!==0,'elbow bends during swing');
 assert.ok(approx(art.angles(1,0).swordShoulder,.17),'windup begins at shoulder');
});
test('SVG loading error leaves the previous enemy renderer available',async()=>{
 class ImageError{set src(_){queueMicrotask(()=>this.onerror?.())}}
 const window={Image:ImageError,URL,console:{warn(){}},location:{search:'?art=knight-trace'},
 document:{currentScript:{src:'https://example.org/assets/character-knight.js'},createElement:()=>({})}};
 vm.runInNewContext(script,{window,URL,console});
 const api=window.ParryKnightTrace;
 assert.equal(await api.preload(),false);
 assert.equal(api.status(),'failed');
 assert.equal(api.drawEnemy({}, {e:{kind:'knight'},charge:0,action:0}),false);
});
test('standalone preview offers the five key poses plus a continuous animation',()=>{
 const page=fs.readFileSync('assets/character-art/tracing/knight/preview.html','utf8');
 for(const name of ['idle','windup','strike','impact','recover','play'])assert.ok(page.includes('data-pose="'+name+'"'));
 assert.ok(page.includes('art.drawEnemy('));
 assert.match(page,/requestAnimationFrame/);
});
