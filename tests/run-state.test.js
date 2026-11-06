'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {create}=require('../assets/run-state.js');

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
