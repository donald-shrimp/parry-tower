'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../assets/encounters'),combat=require('../assets/combat-art');
const manifest=JSON.parse(fs.readFileSync('assets/character-art/palette-candidates/manifest.json','utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');

function load(query=''){
 const urls=[],calls=[],ctx=()=>new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push({key:k,args}),set:(o,k,v)=>{calls.push({set:k,value:v});o[k]=v;return true;}});
 const window={URL,location:{search:query},console:{warn(){}},document:{createElement:()=>({getContext:()=>ctx()})},ParryCombatArt:{...combat,readyFor:()=>true,drawEnemy:()=>true},ParryEncounters:P};
 window.Image=class{set src(url){urls.push(url);queueMicrotask(()=>this.onload?.());}};
 for(const name of ['palette-candidates','pixel-art-preview','character-edit','character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']){
  window.document.currentScript={src:'https://example.org/assets/'+name+'.js'};
  vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),{window,URL,URLSearchParams,console});
 }return {window,urls,ctx,calls};
}

test('all 12 palette variants have 68 recorded candidates, full-size coordinates and unmodified originals',()=>{
 assert.deepEqual(manifest.characters.map(c=>c.id).sort(),P.all.filter(e=>e.palette).map(e=>e.id).sort());
 assert.equal(manifest.status,'fine-adopted');assert.equal(manifest.adoptedStyle,'fine');let count=0;
 for(const c of manifest.characters)for(const f of c.files){
  assert.equal(c.base,P.byId[c.id].sprite);assert.equal(hash(fs.readFileSync('assets/'+f.source)),f.sourceSha256);
  assert.deepEqual(Object.keys(f.variants),['original','fine','balanced','retro']);
  for(const v of Object.values(f.variants)){
   const png=fs.readFileSync('assets/'+v.source);assert.equal(hash(png),v.sha256);assert.equal(png.readUInt32BE(16),f.width);assert.equal(png.readUInt32BE(20),f.height);count++;
  }
 }assert.equal(count,68);
});

test('material palettes only activate for an allowlisted fixed enemy in an embedded review',()=>{
 for(const query of ['?paletteEnemy=endking','?embed=1&paletteEnemy=../endking','?embed=1&paletteEnemy=toString','?embed=1&paletteEnemy=hero'])assert.equal(load(query).window.ParryPixelArt.paletteEnemy,null);
 for(const page of ['index.html','dev.html'])assert.match(fs.readFileSync(page,'utf8'),/character-style\.js/);
 assert.doesNotMatch(fs.readFileSync('art-studio.html','utf8'),/palette-candidates|pixel-art-preview|character-style/);
 const w=load('?embed=1&paletteEnemy=endking&pixelStyle=balanced').window;
 assert.equal(w.ParryPixelArt.paletteApplied(P.byId.endking),true);assert.equal(w.ParryPixelArt.paletteApplied(P.byId.guardian),false);
 const file=manifest.characters.find(c=>c.id==='endking').files[0];assert.equal(w.ParryPixelArt.source(file.source),file.variants.balanced.source);
 assert.match(w.ParryPixelArt.source(require('../assets/character-hero-puppet').SOURCE),/pixel-candidates\/balanced\/hero\//);
});

test('all new palettes preserve sampled motion and per-frame image draw counts while avoiding the old global hue filter',async()=>{
 for(const style of ['original','fine','balanced','retro']){
  const before=load(style==='original'?'':'?pixelStyle='+style);await before.window.ParryKnightPuppet.preload();
  for(const c of manifest.characters){
   const after=load('?embed=1&paletteEnemy='+c.id+(style==='original'?'':'&pixelStyle='+style)),e=P.byId[c.id];
   assert.equal(await after.window.ParryKnightPuppet.preload(),true);
   const loaded=new Set(after.urls.map(u=>new URL(u).pathname.replace('/assets/','')));
   for(const f of c.files)assert.ok(loaded.has(f.variants[style].source));
   for(const at of [100,1340,1410,1500,1608]){
    const data={e,m:combat.profile(e),width:900,height:550,now:10000+at,attackAt:at<1500?11500:14500,attackSpan:3000,lastImpactAt:at<1500?-99999:11500,lastDeflectAt:at<1500?-99999:11500,lastStrikeKind:'just'};
    const renderer=before.window.ParryKnightPuppet.supports(e)?'ParryKnightPuppet':'ParryEnemyPuppet';
    assert.equal(JSON.stringify(before.window[renderer].sample(data)),JSON.stringify(after.window[renderer].sample(data)),c.id+' pose');
    before.calls.length=0;after.calls.length=0;
    assert.equal(before.window.ParryKnightPuppet.drawEnemy(before.ctx(),data),true);assert.equal(after.window.ParryKnightPuppet.drawEnemy(after.ctx(),data),true);
    assert.equal(after.calls.filter(c=>c.key==='drawImage').length,before.calls.filter(c=>c.key==='drawImage').length,c.id+' draw count');
    const oldFilter='hue-rotate('+e.palette.hueRotate+'deg) saturate('+e.palette.saturation+'%)';
    assert.ok(before.calls.some(c=>c.set==='filter'&&c.value===oldFilter));
    assert.equal(after.calls.some(call=>call.set==='filter'&&call.value===oldFilter),!!c.retainOriginalPalette,'only the retained forge palette keeps its original filter');
   }
  }
 }
});

test('forge-master review restores the exact original assets and original palette filter',()=>{
 const c=manifest.characters.find(c=>c.id==='forge_master'),pixels=JSON.parse(fs.readFileSync('assets/character-art/pixel-candidates/manifest.json','utf8'));
 assert.equal(c.retainOriginalPalette,true);assert.equal(c.reviewStatus,'original-approved');
 const w=load('?embed=1&paletteEnemy=forge_master&pixelStyle=balanced').window;
 assert.equal(w.ParryPixelArt.paletteApplied(P.byId.forge_master),false);
 for(const f of c.files)for(const [style,v]of Object.entries(f.variants)){
  const source=pixels.files.find(p=>p.source===f.source),path=style==='original'?f.source:source.variants[style].source;
  assert.equal(hash(fs.readFileSync('assets/'+v.source)),hash(fs.readFileSync('assets/'+path)));
 }
 assert.equal(manifest.characters.filter(c=>c.reviewStatus==='approved').length,11);
 assert.deepEqual(manifest.characters.filter(c=>c.reviewStatus==='revised-review').map(c=>c.id),[]);
});

test('the accepted king project and both painted inputs are recorded instead of reverting to the automatic material guess',()=>{
 const c=manifest.characters.find(c=>c.id==='endking'),project=manifest.approvedKingProject;
 assert.equal(hash(fs.readFileSync('assets/'+project.source)),project.sha256);
 const painting=require('../assets/filter-paint-core').unpack(JSON.parse(fs.readFileSync('assets/'+project.source,'utf8')));
 for(const f of c.files){assert.equal(hash(fs.readFileSync('assets/'+f.approvedSource.source)),f.approvedSource.sha256);
  const im=painting.images.find(im=>im.id===f.role),points=f.role==='ready'?[[480,310,1],[560,850,2],[459,530,3]]:[[814,220,1],[900,850,2],[880,450,3],[1160,855,1]];
  for(const[x,y,id]of points)assert.equal(im.mask[y*im.width+x],id,f.role+' '+x+','+y);
 }
});
