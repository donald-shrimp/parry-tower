'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const art=require('../assets/character-art.js');

function context(){
 const calls=[],noop=()=>{};
 const ctx=new Proxy({},{
  get(target,key){
   if(key in target)return target[key];
   if(['save','restore','beginPath','closePath','fill','stroke','lineTo','moveTo','arc','ellipse','translate','rotate'].includes(key))
    return (...args)=>{calls.push({method:key,args})};
   return noop;
  },set(target,key,value){target[key]=value;return true;}
 });
 return {ctx,calls};
}
test('hero pilot is a pure drawing module and keeps save/restore balanced',()=>{
 const {ctx,calls}=context();
 const pose=Object.freeze({now:12345,lift:1,heldLift:1,push:0,action:.4,guardHeld:true,lastStrikeKind:'just',lastImpactAt:12270});
 assert.equal(art.drawHero(ctx,pose),true);
 assert.ok(calls.filter(x=>x.method==='fill').length>=20,'expected layered vector pieces');
 assert.equal(calls.filter(x=>x.method==='save').length,calls.filter(x=>x.method==='restore').length);
 assert.equal(pose.lift,1);
});
test('all major enemies use the visual pilot without altering pose data',()=>{
 const cases=[
  ['slime','slime'],['gem_slime','slime'],['knight','knight'],['void_knight','knight'],
  ['sentinel','knight'],['molten_sentinel','knight'],['clockwork','knight'],
  ['orbital_clockwork','knight'],['rogue','rogue'],['duelist','rogue'],
  ['silver_duelist','rogue'],['wraith','wraith'],['cantor','wraith'],
  ['star_cantor','wraith'],['guardian','guardian'],['endking','guardian']
 ];
 for(const [id,kind] of cases){
  const {ctx,calls}=context();
  const sprites={void_knight:'knight',molten_sentinel:'sentinel',
   orbital_clockwork:'clockwork',silver_duelist:'duelist',star_cantor:'cantor',endking:'guardian'};
  const e=Object.freeze({id,kind,...(sprites[id]?{sprite:sprites[id]}:{}),index:1});
  const pose=Object.freeze({e,m:{reach:kind==='slime'?49:kind==='guardian'?130:110},now:14500,charge:.4,
   p:.8,action:.8,rec:0,recoil:.2});
  assert.equal(art.drawEnemy(ctx,pose),true,id+' missing prototype');
  assert.ok(calls.some(x=>x.method==='fill'),id+' missing layered shapes');
  assert.equal(calls.filter(x=>x.method==='save').length,calls.filter(x=>x.method==='restore').length,id+' canvas context leaked');
  assert.equal(pose.p,.8);
  assert.equal(e.index,1);
 }
});
test('unsupported enemy falls back without touching canvas state',()=>{
 const {ctx,calls}=context();
 assert.equal(art.drawEnemy(ctx,{e:{id:'unknown',kind:'mystery'}}),false);
 assert.equal(art.drawEnemy(ctx,{e:null}),false);
 assert.equal(calls.length,0);
});
test('hero and enemy animation supports impact, wind-up, and recoil keyframes',()=>{
 for(const p of [0,.1,.5,1]){
  for(const charge of [0,1]){
   const {ctx,calls}=context();
   assert.equal(art.drawEnemy(ctx,{e:{id:'duelist',kind:'rogue',index:3},m:{reach:110},now:3000,charge,p,action:p,rec:p?0:1,recoil:.8}),true);
   assert.equal(calls.filter(x=>x.method==='save').length,calls.filter(x=>x.method==='restore').length);
  }
 }
});
test('prototype is opt-in on both HTML entrypoints and optional when module is absent',()=>{
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.match(game,/art=prototype/);
 assert.match(game,/CHARACTER_ART_ENABLED&&CHARACTER_ART\?\.drawHero/);
 assert.match(game,/CHARACTER_ART_ENABLED&&CHARACTER_ART\?\.drawEnemy/);
 assert.match(game,/else if\(VARIANT_MOTIONS\?\.draw/);
 for(const name of ['index.html','dev.html']){
  const html=fs.readFileSync(name,'utf8');
  assert.ok(html.indexOf('assets/character-art.js')>html.indexOf('assets/enemy-motions.js'));
  assert.ok(html.indexOf('assets/character-art.js')<html.indexOf('assets/game.js'));
 }
});


test('SVG hero has articulated files and an explicit reference manifest',()=>{
 const manifest=JSON.parse(fs.readFileSync('assets/character-art/svg/hero/manifest.json','utf8'));
 assert.equal(manifest.id,'hero');
 assert.equal(manifest.reference,'assets/character-art/references/hero/approved.png');
 assert.equal(manifest.parts.length,12);
 const png=fs.readFileSync(manifest.reference);
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),128);
 assert.equal(png.readUInt32BE(20),120);
 const roleNames=new Set(manifest.parts.map(x=>x.id));
 for(const id of ['cape','body','head','leg-back','leg-front','weapon','shield'])assert.ok(roleNames.has(id));
 for(const item of manifest.parts){
  assert.match(item.file,/^[a-z][a-z0-9-]*\.svg$/);
  assert.ok(fs.existsSync('assets/character-art/svg/hero/'+item.file));
  const data=fs.readFileSync('assets/character-art/svg/hero/'+item.file,'utf8');
  assert.match(data,/viewBox="-100 -150 200 165"/);
  assert.match(data,/<path /);
  assert.doesNotMatch(data,/<(?:script|foreignObject|image)\b/);
 }
});
test('SVG hero is opt-in; the original and Canvas pilots remain untouched',()=>{
 const src=fs.readFileSync('assets/game.js','utf8');
 assert.match(src,/art=svg/);
 assert.match(src,/CHARACTER_SVG_ENABLED&&CHARACTER_SVG\?\.drawHero/);
 for(const p of ['index.html','dev.html']){
  const html=fs.readFileSync(p,'utf8');
  assert.ok(html.indexOf('assets/character-svg.js')>html.indexOf('assets/character-art.js'));
  assert.ok(html.indexOf('assets/character-svg.js')<html.indexOf('assets/game.js'));
 }
 const svg=require('../assets/character-svg.js');
 assert.equal(svg.ready(),false);
 assert.equal(svg.drawHero({},{}),false);
});
