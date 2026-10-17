'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const variant=require('../assets/enemy-motions.js');
const E=require('../assets/encounters.js');
test('four new normal monsters each have a dedicated renderer',()=>{
 assert.deepEqual([...variant.SUPPORTED].sort(),['cantor','clockwork','duelist','sentinel']);
 for(const name of variant.SUPPORTED)assert.ok(E.byId[name],name);
 assert.equal(variant.attackPoint('rogue',110,1,0),null);
});
test('all dedicated attacks share the shield-contact point at full swing, not a timer bar',()=>{
 for(const name of variant.SUPPORTED){
  const type=E.byId[name],reach=type.kind==='rogue'?110:type.kind==='wraith'?108:110;
  for(const handed of [0,1]){
   const point=variant.attackPoint(name,reach,1,0,handed);
   assert.equal(point.x,reach,name+' x');
   assert.equal(point.y,-58,name+' y');
   const waiting=variant.attackPoint(name,reach,0,1,handed);
   assert.ok(waiting.x<point.x-40,name+' must visibly approach the shield');
   assert.notEqual(waiting.y,point.y,name+' must show a readable windup');
  }
 }
});
test('all unique enemy sprites render a full silhouette and weapon for windup/impact/recoil',()=>{
 for(const id of variant.SUPPORTED){
  for(const phase of [{t:0,charge:1,recoil:0},{t:1,charge:0,recoil:0},{t:1,charge:0,recoil:.6}]){
   const calls=[];
   const context=new Proxy({}, {get(target,p){return target[p]||((...args)=>calls.push([p,...args]))},set(target,p,value){target[p]=value;return true}});
   const stroke=(type)=>(...args)=>calls.push([type,...args]);
   const result=variant.draw(id,context,{
    e:{id,index:1},m:{reach:id==='cantor'?108:110},now:12000,
    p:phase.t,action:phase.t,charge:phase.charge,recoil:phase.recoil,rec:0,impact:phase.t,
    round:stroke('round'),line:stroke('line'),fillPoly:stroke('poly')
   });
   assert.equal(result,true,id+' render should be used');
   assert.ok(calls.filter(v=>v[0]==='poly').length>=3,id+' must have own silhouette');
   assert.ok(calls.filter(v=>v[0]==='line').length>=4,id+' must have weapon/cue lines');
   assert.ok(calls.some(v=>v[0]==='save'),id+' must isolate transforms');
   assert.ok(calls.some(v=>v[0]==='restore'),id+' must restore transforms');
  }
 }
});
test('unsupported existing enemies fall back to original v0.5.3 renderer',()=>{
 const c={};
 assert.equal(variant.draw('slime',c,{}),false);
 assert.equal(variant.draw('guardian',c,{}),false);
});
