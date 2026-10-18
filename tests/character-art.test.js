'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const art=require('../assets/character-art.js');
const legacy=require('../assets/enemy-motions.js');

test('art preview supports only the first hero and sentinel experiment',()=>{
 assert.deepEqual([...art.SUPPORTED],['hero','sentinel']);
 assert.equal(art.drawEnemy('slime',{},{}),false);
 assert.equal(art.drawEnemy('duelist',{},{}),false);
 assert.equal(art.drawEnemy('molten_sentinel' /* uses sprite: sentinel in game */,{},{}),false);
});

test("sentinel blade keeps the existing shield-contact geometry",()=>{
 for(const reach of [80,110,148]){
  const point=art.sentinelAttackPoint(reach,1);
  const old=legacy.attackPoint('sentinel',reach,1,0);
  assert.ok(Math.abs(point.x-old.x)<1e-8);
  assert.ok(Math.abs(point.y-old.y)<1e-8);
  const waiting=art.sentinelAttackPoint(reach,0);
  assert.ok(waiting.x<point.x);
  assert.ok(waiting.y<point.y);
 }
});

test('SVG loading failure or missing browser Image must fall back to old Canvas art',()=>{
 // A Node.js process has no HTMLImageElement; this must not throw or paint partial bodies.
 assert.equal(typeof Image,'undefined');
 const ctx={};
 assert.equal(art.drawHero(ctx,{lift:1}),false);
 assert.equal(art.drawEnemy('sentinel',ctx,{m:{reach:110},action:1}),false);
});

test('after loading SVG bodies, each layer renders with moving shields and blades',t=>{
 const original=global.Image,loaded=[];
 t.after(()=>{if(original===undefined)delete global.Image;else global.Image=original});
 global.Image=class FakeImage{
  set src(v){this._src=v;loaded.push(v);this.onload?.()}
  get src(){return this._src}
 };
 const calls=[];
 const ctx=new Proxy({},{
  get(target,key){return target[key]??((...args)=>calls.push([key,...args]))},
  set(target,key,value){target[key]=value;return true}
 });
 assert.equal(art.drawHero(ctx,{lift:1,heldLift:1,guardHeld:true,action:.6,push:.7}),true);
 assert.equal(art.drawEnemy('sentinel',ctx,{m:{reach:110},charge:.8,action:1,recoil:.4}),true);
 assert.ok(loaded.some(x=>x.endsWith('/hero-body.svg')));
 assert.ok(loaded.some(x=>x.endsWith('/sentinel-body.svg')));
 assert.equal(calls.filter(call=>call[0]==='drawImage').length,2);
 assert.ok(calls.some(call=>call[0]==='rotate'));
 assert.ok(calls.some(call=>call[0]==='lineTo'));
 assert.ok(calls.some(call=>call[0]==='stroke'));
 assert.equal(calls.filter(call=>call[0]==='save').length,
  calls.filter(call=>call[0]==='restore').length,'local Canvas transforms are balanced');
});

test('only an explicit preview URL can enable the new art; both HTML entrypoints load it safely',()=>{
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(game,{filename:'assets/game.js'}));
 assert.match(game,/ART_PREVIEW=\/\[\?&\]art=preview/);
 assert.match(game,/ART_PREVIEW\?window\.ParryCharacterArt:null/);
 assert.match(game,/CHARACTER_ART\?\.drawHero/);
 assert.match(game,/CHARACTER_ART\?\.drawEnemy/);
 for(const htmlName of ['index.html','dev.html']){
  const html=fs.readFileSync(htmlName,'utf8');
  const artIndex=html.indexOf('assets/character-art.js');
  assert.ok(artIndex>0,htmlName+' missing preview module');
  assert.ok(artIndex<html.indexOf('assets/game.js'),htmlName+' must load art before game.js');
 }
});
