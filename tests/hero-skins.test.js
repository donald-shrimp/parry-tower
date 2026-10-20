'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(fail=false){
 const urls=[],calls=[];let canvases=0;
 const context=()=>new Proxy({globalAlpha:1,getImageData:()=>undefined},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push({key:k,args}),set:(o,k,v)=>{o[k]=v;calls.push({set:k,value:v});return true}});
 const w={URL,console:{warn(){}},document:{currentScript:{src:'https://example.org/tower/assets/character-hero-puppet.js'},createElement(){canvases++;return {getContext:()=>context()}}}};
 w.Image=class{set src(url){urls.push(url);queueMicrotask(()=>fail&&url.includes('/skins/')?this.onerror?.():this.onload?.())}};
 vm.runInNewContext(fs.readFileSync('assets/character-hero-puppet.js','utf8'),{window:w,URL,console});
 return {hero:w.ParryHeroPuppet,urls,calls,ctx:context,canvases:()=>canvases};
}
test('skin preparation shares the base source, lazily loads one fundoshi image, and caches the cutout canvases',async()=>{
 const r=load(),h=r.hero;await h.preload();assert.equal(r.urls.length,1);
 for(const id of h.SKIN_IDS){assert.equal(await h.preloadSkin(id),true);assert.equal(h.skinReady(id),true)}
 assert.equal(r.urls.length,2);assert.ok(r.urls[1].endsWith('/tower/assets/'+h.SKIN_SOURCE));assert.ok(fs.existsSync('assets/'+h.SKIN_SOURCE));
 const count=r.canvases();
 for(let frame=0;frame<30;frame++)for(const skin of h.SKIN_IDS){
  assert.equal(h.drawHero(r.ctx(),{skin,now:frame*16,pose:{action:.6,lastStrikeKind:'just'},layout:{heroX:200,ground:300,heroScale:1.4}}),true);
 }
 assert.equal(r.canvases(),count,'no per-frame recolouring, cutouts or canvas allocation');
 await h.preloadSkin('fundoshi');assert.equal(r.urls.length,2);
});
test('a missing fundoshi cannot draw an unready skin or break the other costumes',async()=>{
 const r=load(true),h=r.hero;
 assert.equal(await h.preloadSkin('fundoshi'),false);assert.equal(h.skinReady('fundoshi'),false);
 assert.equal(h.drawHero(r.ctx(),{skin:'fundoshi',layout:{}}),false);
 for(const id of ['normal','chick','spacetime'])assert.equal(await h.preloadSkin(id),true);
 assert.equal(h.skinId('__proto__'),'normal');assert.equal(h.skinId(null),'normal');
});
test('skin decorations are scoped, deterministic, and leave the accepted pose unchanged',async()=>{
 const r=load(),h=r.hero,input={action:.62,lift:1,lastStrikeKind:'just'};
 const before=JSON.stringify(h.pose(input));
 for(const skin of h.SKIN_IDS){await h.preloadSkin(skin);r.calls.length=0;
  h.drawCutout(r.ctx(),h.pose(input),{skin,now:600});
  assert.equal(r.calls.filter(c=>c.key==='save').length,r.calls.filter(c=>c.key==='restore').length);
  assert.equal(r.calls.filter(c=>c.key==='drawImage').length,7,skin+' uses the same seven accepted parts');
  if(skin==='chick')assert.ok(r.calls.some(c=>c.key==='translate'&&c.args[0]===884&&c.args[1]===151),'chick is attached inside body transform');
  if(skin==='spacetime')assert.equal(r.calls.filter(c=>c.key==='arc').length,3);
  assert.equal(JSON.stringify(h.pose(input)),before);
 }
});
