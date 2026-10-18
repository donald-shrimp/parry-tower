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
test('enemy pilot changes only the original knight, not the other enemies',()=>{
 const {ctx,calls}=context();
 assert.equal(art.drawEnemy(ctx,{e:{id:'slime',kind:'slime'}}),false);
 assert.equal(calls.length,0,'non-target sprites must use their existing renderer');
 const enemy=Object.freeze({id:'knight',kind:'knight'});
 const pose=Object.freeze({e:enemy,now:14500,charge:.4,p:.8,rec:0,recoil:.2});
 assert.equal(art.drawEnemy(ctx,pose),true);
 assert.ok(calls.filter(x=>x.method==='stroke').length>=8);
 assert.equal(calls.filter(x=>x.method==='save').length,calls.filter(x=>x.method==='restore').length);
 assert.equal(pose.p,.8);
 assert.equal(art.drawEnemy(ctx,{e:{id:'void_knight',kind:'knight'}}),false,'palette variants remain legacy');
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
