'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {modes,create}=require('../assets/character-renderer.js');

test('draw modes retain the default, explicit pilots and duplicate-query precedence',()=>{
 assert.equal(modes('').illustrated,true);
 assert.equal(modes('?art=unknown').illustrated,false);
 assert.equal(modes('?art=prototype#hash').prototype,false);
 const both=modes('?art=impact&art=prototype');
 assert.equal(both.impact,true);assert.equal(both.prototype,true);assert.equal(both.illustrated,false);
});

test('world draw fallback keeps aura layering and does not mutate the supplied frame',()=>{
 const calls=[],sample=Object.freeze({x:120}),frame=Object.freeze({e:Object.freeze({id:'guardian'}),now:40,width:390,height:500});
 const draw=create({modes:modes('?art=rework&art=impact'),
  illustrated:{readyFor:()=>true,sample:f=>{assert.equal(f,frame);calls.push('sample');return sample;},
   drawEnemy(_ctx,f){assert.equal(f,frame);calls.push('illustrated');return false;}},
  rig:{drawEnemy(){calls.push('rig');return false;}},
  impact:{drawEnemy(){calls.push('impact');return true;}}
 });
 const aura=(s,e,now,front)=>{assert.equal(s,sample);assert.equal(e,frame.e);assert.equal(now,40);calls.push(front?'front':'behind');};
 assert.equal(draw.enemyWorld({}, {illustrated:true,legacy:false,heavy:true},frame,aura),true);
 assert.deepEqual(calls,['sample','behind','illustrated','rig','impact']);
 calls.length=0;
 const adopted=create({modes:modes(''),illustrated:{readyFor:()=>true,drawEnemy(){calls.push('draw');return true;}},
  enemyPuppet:{supports:()=>true,sample:()=>sample}});
 assert.equal(adopted.enemyWorld({}, {illustrated:true,legacy:false,heavy:true},frame,aura),true);
 assert.deepEqual(calls,['behind','draw','front']);
});
