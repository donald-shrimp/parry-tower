'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters'),combat=require('../assets/combat-art');
const plain=x=>JSON.parse(JSON.stringify(x));
function load(adopted=true,fail=''){
 const urls=[],calls=[];
 const context=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push({key:k,args});},set:(o,k,v)=>{calls.push({set:k,value:v});o[k]=v;return true;}});
 const window={URL,location:{search:''},console:{warn(){}},document:{createElement:()=>({getContext:()=>context()})},
  ParryCombatArt:{...combat,readyFor:()=>true},ParryEncounters:P};
 window.Image=class{set src(url){this.url=url;urls.push(url);queueMicrotask(()=>fail&&url.includes(fail)?this.onerror?.():this.onload?.());}};
 const project=JSON.parse(fs.readFileSync('assets/character-art/studio-project.json','utf8'));
 for(const name of [...(adopted?['palette-candidates','character-style']:[]),'character-edit','character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']){
  window.document.currentScript={src:'https://example.org/subpath/assets/'+name+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,console});
 }
 window.ParryArtEdits.setProject(project);
 window.document.currentScript=null;
 return {w:window,urls,calls,ctx:context};
}
function input(e,time,width=900,height=550){return{e,m:combat.profile(e),width,height,now:10000+time,attackAt:time<1500?11500:14500,
 attackSpan:3000,lastImpactAt:time<1500?-99999:11500,lastDeflectAt:time<1500?-99999:11500,lastStrikeKind:'just',pose:{lastStrikeKind:'just',lastImpactAt:11500}};}

test('normal gameplay adopts fine pixel assets, preserves original review tools and resolves every palette by identity',()=>{
 const {w}=load(),style=w.ParryPixelArt;
 assert.equal(style.style,'fine');assert.equal(style.adopted,true);
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');assert.ok(html.indexOf('palette-candidates.js')<html.indexOf('character-style.js'));
  assert.ok(html.indexOf('character-style.js')<html.indexOf('character-hero-puppet.js'));
 }
 assert.doesNotMatch(fs.readFileSync('art-studio.html','utf8'),/character-style/);
 for(const e of P.all){
  const c=w.ParryPaletteCandidates[e.id];assert.equal(style.paletteApplied(e),!!c&&!c.retainOriginalPalette);
  assert.equal(style.cacheKey(e),c&&!c.retainOriginalPalette?e.id:e.sprite||e.id);
  if(c)for(const f of c.files){assert.equal(style.source(f.source,e),c.retainOriginalPalette?f.source.replace('/rework/','/pixel-candidates/fine/'):f.variants.fine);assert.ok(fs.existsSync('assets/'+style.source(f.source,e)));}
 }
 assert.equal(style.source('elsewhere.png',P.byId.endking),'elsewhere.png');
 assert.equal(style.paletteApplied({id:'toString'}),false);
});

test('successive encounters load the correct palette, keep the accepted motion and bounded enemy cache, without global hue stacking',async()=>{
 const r=load(),original=load(false),w=r.w,k=w.ParryKnightPuppet;
 await original.w.ParryKnightPuppet.preload();await k.preload();
 assert.ok(r.urls.length<=3,'only hero/knight/plume are eager, not the entire roster');
 for(const e of [...P.all,P.byId.guardian,P.byId.endking,P.byId.frost_priest,P.byId.forge_master,P.byId.guardian,P.byId.void_knight,P.byId.knight]){
  assert.equal(await k.preload(e),true,e.id+' preload');assert.equal(k.readyFor(e),true,e.id+' ready');
  const palette=w.ParryPaletteCandidates[e.id];
  if(palette&&!palette.retainOriginalPalette)for(const f of palette.files)assert.ok(r.urls.some(u=>u.endsWith('/assets/'+f.variants.fine)),e.id+' correct image');
  if(w.ParryEnemyPuppet.supports(e)){
   const model=w.ParryEnemyPuppet.editModel(e),path=w.ParryPixelArt.source(w.ParryEnemyPuppet.specs[e.sprite||e.id].source,e);
   assert.ok(model.source.url.endsWith('/assets/'+path),e.id+' cache collision');
  }
  assert.ok(P.all.filter(e=>w.ParryEnemyPuppet.ready(e)).length<=6,'four cached enemy drawings plus shared retained palette identities');
  for(const [width,height]of [[900,550],[360,640]])for(const time of [100,1340,1410,1421,1500,1608,1780]){
   const data=input(e,time,width,height),renderer=k.supports(e)?'ParryKnightPuppet':'ParryEnemyPuppet';
   assert.deepEqual(plain(w[renderer].sample(data)),plain(original.w[renderer].sample(data)),e.id+' accepted pose changed');
   r.calls.length=0;assert.equal(k.drawEnemy(r.ctx(),data),true);assert.equal(k.drawHero(r.ctx(),data),true);
   if(e.palette){const old='hue-rotate('+e.palette.hueRotate+'deg) saturate('+e.palette.saturation+'%)';assert.equal(r.calls.some(c=>c.set==='filter'&&c.value===old),!!palette?.retainOriginalPalette,e.id+' hue stacking');}
   assert.ok(r.calls.some(c=>c.set==='imageSmoothingEnabled'&&c.value===false));
  }
 }
});

test('one missing variant fails only that encounter and the next base enemy still renders',async()=>{
 const {w}=load(true,'palette-candidates/fine/endking/'),k=w.ParryKnightPuppet;
 assert.equal(await k.preload(P.byId.endking),false);assert.equal(k.readyFor(P.byId.endking),false);
 assert.equal(await k.preload(P.byId.guardian),true);assert.equal(k.readyFor(P.byId.guardian),true);
 assert.equal(await k.preload(P.byId.frost_priest),true);assert.equal(k.readyFor(P.byId.frost_priest),true);
});

test('accepted motion defaults work without fetch, ignore older active edits, and preserve newer manual edits',()=>{
 const accepted=JSON.parse(fs.readFileSync('assets/character-art/studio-project.json','utf8'));
 const edit=require('../assets/character-edit');
 for(const time of [0,accepted.updatedAt+1]){
  const local={...edit.empty(),updatedAt:time};
  const w={localStorage:{getItem:()=>JSON.stringify(local)}};
  vm.runInNewContext(fs.readFileSync('assets/character-art-defaults.js','utf8'),{window:w});
  assert.deepEqual(plain(w.ParryArtDefaults),edit.normalize(accepted));
  vm.runInNewContext(fs.readFileSync('assets/character-edit.js','utf8'),{window:w});
  assert.deepEqual(plain(w.ParryArtEdits.getProject()),edit.normalize(time?local:accepted));
 }
 for(const page of ['index.html','dev.html']){const html=fs.readFileSync(page,'utf8');assert.ok(html.indexOf('character-art-defaults.js')<html.indexOf('character-edit.js'));}
});
