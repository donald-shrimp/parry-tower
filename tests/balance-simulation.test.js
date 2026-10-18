'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../scripts/balance-simulation.js'),P=require('../assets/encounters.js');
test('elite checkpoint bosses use real current enemy stats and second movement exists',()=>{
 for(const f of S.FLOORS){
  const e=S.foeAt(f),real=P.encounterForFloor(f,()=>.5);
  assert.equal(e.id,real.id);assert.equal(e.elite,true);assert.equal(e.boss,true);
  assert.deepEqual({maxHp:e.maxHp,atk:e.atk},P.baseStats(real,f));
 }
 assert.deepEqual(S.foeAt(80).phaseRhythm,[1.5,1.5,2,1,2,2]);
});
test('profiles preserve actual permanent stats and initial ward assumptions',()=>{
 const p=S.PROFILES[2];
 assert.equal(S.gear(p,80,'bossOnly',false).hp,185);
 assert.equal(S.gear(p,80,'bossOnly',false).shield,55);
 assert.equal(S.gear(p,80,'full',false).shield,151);
 assert.equal(S.gear(p,80,'bossOnly').hp,275);
 assert.equal(S.gear(p,80).attack,46);
 assert.equal(S.gear(p,80).regen,55);
 assert.equal(S.gear(p,80).soulMultiplier,1.25);
});
test('guard is capped at 40 percent of max HP, and death on zero is not counted as survived',()=>{
 assert.deepEqual(S.guardSurvival(325,275,55),{damage:98,survived:3});
 assert.deepEqual(S.guardSurvival(1000,100,0),{damage:40,survived:2});
 assert.deepEqual(S.guardSurvival(100,100,0),{damage:30,survived:3});
});
test('simulated fixed-seed combat is deterministic and more than a single strike at 80F',()=>{
 const p=S.PROFILES[2];
 const a=S.simulate(p,80,'allJust'),b=S.simulate(p,80,'allJust');
 assert.deepEqual(a,b);assert.ok(a.won);assert.ok(a.step>10);
 const defeated=S.simulate(S.PROFILES[0],80,{just:0,parry:0,guard:0,miss:1},123);
 assert.equal(defeated.won,false);assert.equal(defeated.step,1);
});
test('report covers every profile and stage and probabilities have valid denominators',()=>{
 const out=S.results();
 assert.equal(out.length,15);
 for(const r of out){
  assert.ok(r.bossHp>0);assert.ok(r.bossAtk>0);assert.ok(r.hp>=65);
  assert.ok(r.guardDamage<=Math.ceil(r.hp*.4));
  for(const style of S.STYLES){
   assert.equal(r[style.id+'Trials'],S.TRIALS);
   assert.ok(r[style.id+'Wins']>=0&&r[style.id+'Wins']<=S.TRIALS);
  }
 }
 assert.match(S.markdown(out),/80\|最大強化/);
});
