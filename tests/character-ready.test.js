'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('combat-ready source preserves the original traced vector geometry',()=>{
 const src=fs.readFileSync('assets/character-art/tracing/hero/hero-ready-static.svg','utf8');
 assert.match(src,/viewBox="0 0 420 336"/);
 assert.ok((src.match(/<path /g)||[]).length>=6);
 assert.match(src,/#0766e8/);assert.match(src,/#ffca41/);
 assert.doesNotMatch(src,/<(?:script|image|foreignObject)\b/);
});

test('ready mode is opt-in and retains all earlier modes',()=>{
 const src=fs.readFileSync('assets/game.js','utf8');
 assert.match(src,/art=ready/);
 assert.match(src,/CHARACTER_READY_ENABLED&&CHARACTER_READY\?\.drawHero/);
 for(const key of ['CHARACTER_TRACE_ENABLED','CHARACTER_FLAT_ENABLED','CHARACTER_SVG_ENABLED','CHARACTER_ART_ENABLED']){
  assert.ok(src.includes(key),key);
 }
 for(const name of ['index.html','dev.html']){
  const html=fs.readFileSync(name,'utf8');
  assert.ok(html.indexOf('assets/character-ready.js')>html.indexOf('assets/character-trace.js'));
  assert.ok(html.indexOf('assets/character-ready.js')<html.indexOf('assets/game.js'));
 }
});

test('body shield upper arm and forearm are separate, and drawing keeps ctx balanced',async()=>{
 const calls=[],loads=[];
 function mockCtx(){
  return new Proxy({},{
   get:(target,key)=>key in target?target[key]:((...args)=>calls.push({key,args})),
   set:(target,key,val)=>{target[key]=val;return true;}
  });
 }
 class MockImage{set src(path){loads.push(path);queueMicrotask(()=>this.onload?.());}}
 const w={
  Image:MockImage,URL,location:{search:'?art=ready'},console,
  document:{currentScript:{src:'https://example.test/assets/character-ready.js'},
   createElement:()=>({getContext:()=>mockCtx()})}
 };
 const ctx={window:w,URL,console};
 vm.runInNewContext(fs.readFileSync('assets/character-ready.js','utf8'),ctx);
 assert.equal(await w.ParryHeroReady.preload(),true);
 assert.equal(loads.length,1);
 assert.match(loads[0],/hero-ready-static\.svg$/);
 for(const p of [
  {now:100,action:0,lift:0},
  {now:150,action:.5,lift:0},
  {now:200,action:0,lift:1,heldLift:1,guardHeld:true},
  {now:250,action:.4,lift:1,lastStrikeKind:'just',lastImpactAt:200}
 ]){
  calls.length=0;
  assert.equal(w.ParryHeroReady.drawHero(mockCtx(),p),true);
  assert.equal(calls.filter(v=>v.key==='drawImage').length,4);
  assert.equal(calls.filter(v=>v.key==='save').length,calls.filter(v=>v.key==='restore').length);
 }
});
