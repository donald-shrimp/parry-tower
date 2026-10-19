'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../assets/encounters'),specs=require('../assets/character-enemy-data'),combat=require('../assets/combat-art');
const manifest=JSON.parse(fs.readFileSync('assets/character-art/pixel-candidates/manifest.json','utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');

test('all 20 original assets and 60 pixel candidates have recorded hashes and unchanged source dimensions',()=>{
 const expected=[require('../assets/character-hero-puppet').SOURCE,require('../assets/character-knight-puppet').SOURCE,require('../assets/character-knight-puppet').PLUME.source,
  ...Object.values(specs).flatMap(s=>[s.source,...s.keyPose?[s.keyPose.source]:[]])].sort();
 assert.deepEqual(manifest.files.map(f=>f.source).sort(),expected);assert.equal(manifest.status,'fine-adopted');assert.equal(manifest.adoptedStyle,'fine');
 for(const f of manifest.files){
  const original=fs.readFileSync('assets/'+f.source);assert.equal(hash(original),f.sha256,f.source+' original changed');
  for(const [style,settings]of Object.entries(manifest.profiles)){
   const v=f.variants[style],png=fs.readFileSync('assets/'+v.source);assert.equal(hash(png),v.sha256);assert.notEqual(v.sha256,f.sha256);
   assert.equal(png.readUInt32BE(16),f.width);assert.equal(png.readUInt32BE(20),f.height);assert.equal(png[25],6,'RGBA PNG');
   assert.ok(v.visibleColors<=settings.colors);assert.deepEqual(v.grid,[Math.ceil(f.width/settings.block),Math.ceil(f.height/settings.block)]);
  }
 }
 for(const e of P.all)assert.ok(manifest.files.some(f=>f.id===(e.sprite||e.id)&&f.role==='ready'),e.id+' has a processed ready drawing');
});

function load(style=''){
 const urls=[],calls=[];
 const ctx=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push({key:k,args});},set:(o,k,v)=>{calls.push({set:k,value:v});o[k]=v;return true;}});
 const window={URL,location:{search:style?'?pixelStyle='+encodeURIComponent(style):''},console:{warn(){}},document:{createElement:()=>({getContext:()=>ctx()})},
  ParryCombatArt:{...combat,readyFor:()=>true,drawEnemy:()=>true},ParryEncounters:P};
 window.Image=class{set src(url){urls.push(url);queueMicrotask(()=>this.onload?.());}};
 for(const name of ['pixel-art-preview','character-edit','character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']){
  window.document.currentScript={src:'https://example.org/assets/'+name+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,URLSearchParams,console});
 }return {window,urls,ctx,calls};
}

test('pixel candidates are opt-in, strictly allowlisted and absent from game entrypoints',()=>{
 for(const style of ['', 'unapproved','../retro','balanced/../../rework']){
  const {window:w}=load(style);assert.equal(w.ParryPixelArt.enabled,false);assert.equal(w.ParryPixelArt.source('character-art/rework/hero/a.png'),'character-art/rework/hero/a.png');
 }
 for(const page of ['index.html','dev.html','art-studio.html'])assert.doesNotMatch(fs.readFileSync(page,'utf8'),/pixel-art-preview|pixel-candidates/);
 for(const style of Object.keys(manifest.profiles)){
  const {window:w}=load(style);assert.equal(w.ParryPixelArt.enabled,true);assert.equal(w.ParryPixelArt.source('other/image.png'),'other/image.png');
 }
});

test('each pixel profile loads every processed source, preserves all enemy poses and uses nearest-neighbour drawing',async()=>{
 const original=load();await original.window.ParryKnightPuppet.preload();
 for(const style of Object.keys(manifest.profiles)){
  const r=load(style),w=r.window;assert.equal(await w.ParryKnightPuppet.preload(),true);
  const paths=r.urls.map(url=>new URL(url).pathname.replace('/assets/',''));
  assert.deepEqual([...new Set(paths)].sort(),manifest.files.map(f=>f.variants[style].source).sort());
  for(const e of P.all)for(const time of [100,1410,1500,1608,1730]){
   const data={e,m:combat.profile(e),width:900,height:550,now:10000+time,attackAt:time<1500?11500:14500,attackSpan:3000,
    lastImpactAt:time<1500?-99999:11500,lastDeflectAt:time<1500?-99999:11500,lastStrikeKind:'just'};
   const renderer=w.ParryKnightPuppet.supports(e)?'ParryKnightPuppet':'ParryEnemyPuppet';
   assert.equal(JSON.stringify(w[renderer].sample(data)),JSON.stringify(original.window[renderer].sample(data)),e.id+' pose changed');
   assert.equal(w.ParryKnightPuppet.drawEnemy(r.ctx(),data),true);
   assert.equal(w.ParryKnightPuppet.drawHero(r.ctx(),{...data,pose:{action:time>1500&&time<1740?1-(time-1500)/240:0,lastStrikeKind:'just',lastImpactAt:data.lastImpactAt}}),true);
  }
  assert.ok(r.calls.some(c=>c.set==='imageSmoothingEnabled'&&c.value===false));
 }
});
