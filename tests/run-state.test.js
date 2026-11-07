'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {create,prepareRestore}=require('../assets/run-state.js');

const options={
 practice:false,practiceKey:null,skin:'chick',skinEffects:true,floor:1,devOverride:null,
 initialLevels:{heal:1},sealedSkillIds:['king'],lifeBonus:170,initialShield:112,baseAtk:46,
 extraRerolls:1,bonuses:{wardCapacity:60},legacyVisual:false,tutorial:false
};

test('fresh runs apply Life Vessel before skin HP, with the resolved practice and tutorial settings',()=>{
 const cases=[
  [{},254,381,2],
  [{skinEffects:false,tutorial:true},254,254,2],
  [{practice:true,practiceKey:'slime:normal',initialLevels:{},sealedSkillIds:[],extraRerolls:0},235,353,1]
 ];
 for(const [overrides,rawHp,hp,rerolls] of cases){
  const run=create({...options,...overrides},12345);
  assert.deepEqual(
   [run.rawMaxHp,run.hp,run.maxHp,run.shield,run.baseAtk,run.rerolls,run.playStartedAt,run.enemy],
   [rawHp,hp,hp,112,46,rerolls,12345,null]
  );
  assert.equal(run.practiceKey,overrides.practiceKey??null);
  assert.equal(run.tutorial,overrides.tutorial??false);
 }
});

test('mutating one run leaves its inputs and the next run intact',()=>{
 const run=create(options,0);
 run.lv.heal=8;
 run.sealedSkillIds.push('thorns');
 run.bonuses.wardCapacity=0;
 run.relics.push('unbroken_sigil');
 run.skillBreaks.heal=1;
 const next=create(options,0);
 assert.deepEqual(options.initialLevels,{heal:1});
 assert.deepEqual(options.sealedSkillIds,['king']);
 assert.deepEqual(options.bonuses,{wardCapacity:60});
 assert.deepEqual(next.lv,{heal:1});
 assert.deepEqual(next.sealedSkillIds,['king']);
 assert.deepEqual(next.bonuses,{wardCapacity:60});
 assert.deepEqual(next.relics,[]);
 assert.deepEqual(next.skillBreaks,{});
});

test('old Life Vessel restores the frozen maximum with skin rounding before Reaper Pact',()=>{
 for(const [skin,skinEffects,legacyMaxHp,expectedMaxHp] of [
  ['normal',true,192,194],
  ['chick',true,288,292],
  ['chick',false,192,194],
  ['fundoshi',true,192,194],
  ['spacetime',true,192,194]
 ]){
  const run=create({...options,lifeBonus:160,skin,skinEffects},0);
  Object.assign(run,{rawMaxHp:240,maxHp:legacyMaxHp,hp:100,relics:['reaper_pact']});
  prepareRestore(run,12345);
  assert.deepEqual([run.rawMaxHp,run.maxHp,run.hp],[243,expectedMaxHp,100],skin);
  prepareRestore(run,12346);
  assert.deepEqual([run.rawMaxHp,run.maxHp,run.hp],[243,expectedMaxHp,100],'the migration runs once');
 }
 const clamp=create({...options,lifeBonus:160,skin:'normal'},0);
 Object.assign(clamp,{rawMaxHp:240,maxHp:240,hp:230,relics:['reaper_pact']});
 prepareRestore(clamp,12345);
 assert.deepEqual([clamp.maxHp,clamp.hp],[194,194],'a saved HP above the corrected maximum is clamped');
});

test('restoration refreshes input and drawing state while keeping a current save and its pending choice',()=>{
 const run=create({...options,lifeBonus:160},0);
 Object.assign(run,{
  mode:'relic',hp:121,maxHp:300,relics:['reaper_pact','unbroken_sigil'],
  relicOffer:['rusty_crest'],relicBulwarkUsed:true,skinTempoOffset:12,
  guardHeld:true,guardAtImpact:true,pendingKind:'just',inputLocked:true,parryReadyAt:300,
  guardReleasedAt:100,parryBlockedAt:100,parryAnimAt:100,artLoading:true
 });
 const offer=run.relicOffer;
 prepareRestore(run,12345);
 assert.equal(run.mode,'relic');
 assert.equal(run.relicOffer,offer);
 assert.deepEqual([run.hp,run.maxHp,run.shield,run.relicBulwarkUsed,run.skinTempoOffset],[121,300,112,true,12]);
 assert.deepEqual([run.guardHeld,run.guardAtImpact,run.pendingKind,run.inputLocked],[false,null,null,false]);
 assert.deepEqual([run.parryReadyAt,run.guardReleasedAt,run.parryBlockedAt],[0,-99999,-99999]);
 assert.deepEqual([run.parryAnimAt,run.artLoading,run.playStartedAt],[-99999,false,12345]);
});
