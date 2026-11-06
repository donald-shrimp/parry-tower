'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const health=require('../assets/combat-health.js');

test('shield gain preserves overflow and healing shares one conversion budget in the original effect order',()=>{
 const state={hp:95,maxHp:100,shield:250};
 assert.equal(health.addShield(state,3,{combat:true,cap:100,wardcraftLevel:2}),0);
 assert.equal(state.shield,250);
 state.shield=98;
 assert.equal(health.addShield(state,3,{combat:true,cap:100,wardcraftLevel:2}),2);
 state.shield=0;
 const recovery={converted:0},events=[];
 const rules={cap:100,overflow:{ratio:.5,budgetRatio:.1,polished:false}};
 const effects={hp:n=>events.push(['hp',n,state.hp,state.shield,recovery.converted]),
  shield:n=>events.push(['shield',n,state.hp,state.shield,recovery.converted])};
 assert.equal(health.heal(state,25,rules,recovery,effects),5);
 assert.deepEqual(events,[['hp',5,100,0,0],['shield',10,100,10,10]]);
 assert.equal(health.heal(state,40,rules,recovery,effects),0);
 assert.equal(state.shield,10);
 health.heal(state,40,rules,null,effects);
 assert.equal(state.shield,10,'outside healing does not convert excess');
});

test('successful-parry recovery settles exactly once and stores only actual recovery after all four sources',()=>{
 const state={hp:40,maxHp:100,shield:0,baseAtk:25,combo:0,practice:false,
  parryDamageActive:true,parryRecoveryActive:true,parryDamage:100,relicBellDue:true,relicPactReady:true};
 const rules={bloodLevel:1,bloodSynergy:false,bloodlustLevel:1,bloodlustSynergy:true,
  bellOwned:true,bellAmount:10,pactOwned:true,pactAmount:8};
 const calls=[];
 const heal=(amount,recovery)=>{
  calls.push([amount,state.parryDamageActive,state.relicBellDue,state.relicPactReady]);
  return health.heal(state,amount,{cap:100,overflow:null},recovery,{hp(){},shield(){}});
 };
 health.finishParryRecovery(state,rules,heal);
 assert.deepEqual(calls,[[8,false,true,true],[3,false,true,true],[10,false,true,true],[8,false,false,true]]);
 assert.equal(state.hp,69);
 assert.equal(state.bloodlustPending,65);
 assert.equal(state.relicPactReady,false);
 health.finishParryRecovery(state,rules,heal);
 assert.equal(calls.length,4);
});

test('incoming damage updates health before each effect and suppresses reflection after death',()=>{
 const initial={mode:'combat',hp:12,maxHp:100,shield:10,frostWard:true,practice:false,tutorial:false};
 const rules={frostLevel:1,frostMirror:true,sigilRatio:.5,silver:{cap:5,ratio:.2},
  rustyReduction:10,pactOwned:true,fortitudeLevel:1,fortitudeSynergy:true,revivePercent:25};
 for(const reviveUsed of [false,true]){
  const state={...initial,reviveUsed},events=[];
  const record=(name,n)=>events.push([name,n,state.hp,state.shield,state.mode]);
  health.applyDamage(state,200,'GUARD',rules,{
   frost:n=>record('frost',n),sigil:n=>record('sigil',n),hit:n=>record('hit',n),
   revive:()=>record('revive',null),die:()=>{state.mode='gameover';record('die',null);},
   reflect:n=>record('reflect',n),sync:()=>record('sync',null)
  });
  const prefix=[['frost',50,12,10,'combat'],['sigil',70,12,0,'combat'],['hit',55,0,0,'combat']];
  assert.deepEqual(events,reviveUsed?
   [...prefix,['die',null,0,0,'gameover'],['sync',null,0,0,'gameover']]:
   [...prefix,['revive',null,25,0,'combat'],['reflect',25,25,0,'combat'],['sync',null,25,0,'combat']]);
  assert.equal(state.relicPactReady,true);
  assert.equal(state.fortitudeReady,true);
 }
});
