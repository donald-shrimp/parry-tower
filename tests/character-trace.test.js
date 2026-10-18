'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('assets/character-trace.js','utf8');

test('traced hero stays opt-in and leaves all previous art modes intact',()=>{
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.match(game,/art=trace/);
 assert.match(game,/CHARACTER_TRACE_ENABLED&&CHARACTER_TRACE\?\.drawHero/);
 for(const opt of ['CHARACTER_FLAT_ENABLED','CHARACTER_SVG_ENABLED','CHARACTER_ART_ENABLED'])
  assert.ok(game.includes(opt));
 for(const file of ['index.html','dev.html']){
  const html=fs.readFileSync(file,'utf8');
  assert.ok(html.indexOf('assets/character-trace.js')>html.indexOf('assets/character-flat.js'));
  assert.ok(html.indexOf('assets/character-trace.js')<html.indexOf('assets/game.js'));
 }
});

test('trace module loads one original SVG, separates three masks, and renders all poses',async()=>{
 const calls=[],loaded=[];
 const spy=()=>new Proxy({},{
  get(target,key){if(key in target)return target[key];
   return (...args)=>calls.push({key,args});
  },
  set(target,key,value){target[key]=value;return true;}
 });
 class MockImage{
  set src(s){loaded.push(s);queueMicrotask(()=>this.onload?.());}
 }
 const mock={
  document:{currentScript:{src:'https://example.test/assets/character-trace.js'},
   createElement:()=>({width:0,height:0,getContext:()=>spy()})},
  URL,Image:MockImage,location:{search:'?art=trace'},console
 };
 mock.window=mock;
 vm.runInNewContext(src,{window:mock});
 const art=mock.ParryHeroTrace;
 assert.equal(await art.preload(),true);
 assert.equal(art.status(),'ready');
 assert.equal(loaded.length,1);
 assert.match(loaded[0],/hero-static\.svg$/);
 for(const pose of [
  {lift:0,action:0},{lift:1,action:0,guardHeld:true},
  {lift:0,action:1},{lift:1,action:.5,lastStrikeKind:'just',now:500,lastImpactAt:440}
 ]){
  calls.length=0;
  assert.equal(art.drawHero(spy(),pose),true);
  assert.equal(calls.filter(x=>x.key==='drawImage').length,3);
  assert.equal(calls.filter(x=>x.key==='save').length,calls.filter(x=>x.key==='restore').length);
 }
});
