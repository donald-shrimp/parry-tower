'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const math=require('../assets/combat-math.js');
const skills=require('../assets/skills.js');

test('attack conditions retain strict HP thresholds and the 120-combo ceiling',()=>{
 const values=Object.freeze({bladeLevel:0,furyLevel:0,gambleLevel:1,executeLevel:1,
  combo:0,hp:50,maxHp:100,enemyHp:35,enemyMaxHp:100});
 assert.equal(math.attackMultiplier(values),1);
 assert.equal(math.attackMultiplier({...values,hp:49}),1.3);
 assert.equal(math.attackMultiplier({...values,enemyHp:34}),1.23);
 assert.equal(math.attackMultiplier({...values,hp:49,enemyHp:34}),1.599);
 assert.equal(math.attackMultiplier({...values,combo:120}),2.44);
 assert.equal(math.attackMultiplier({...values,combo:10000}),2.44);
 assert.equal(math.attackMultiplier({...values,enemyHp:undefined,enemyMaxHp:undefined}),1);
});

test('base skill damage rounds once while HP and barrier scaling use their existing ceilings',()=>{
 assert.equal(math.scaleSkillDmg(22,46,1),51);
 assert.equal(math.scaleSkillDmg(0,25,0),1);
 assert.equal(math.baseAttackScale(undefined),1);
 assert.equal(math.runBaseHp(170),235);
 assert.ok(Math.abs(math.hpSkillScale(235,1)-2.89)<1e-12);
 assert.equal(math.shieldCap(60,10,3),540);
 assert.equal(math.shieldCap(1,0,1),122);
 assert.deepEqual([0,1,2,3,4,5,6].map(math.wardcraftBonus),[0,20,35,50,60,70,70]);
 assert.deepEqual([0,6,7,8,12].map(math.frostReduction),[15,75,80,85,85]);
 assert.deepEqual([-1,0,4,6,8,'4.9','invalid'].map(math.tempoReduction),[0,0,8,12,12,8,0]);
});

test('lifesteal has a minimum, a max-HP cap and an uncapped synergy combo contribution',()=>{
 assert.equal(math.bloodHealAmount(0,1,0,false,65),0);
 assert.equal(math.bloodHealAmount(10,0,0,false,65),0);
 assert.equal(math.bloodHealAmount(1,1,0,false,65),2);
 assert.equal(math.bloodHealAmount(10000,1,0,false,65),17);
 assert.equal(math.bloodHealAmount(10000,1,120,true,65),95);
 assert.equal(math.bloodHealAmount(10000,1,200,true,65),147);
});

test('skill descriptions use the supplied display context on every call, including broken limits',()=>{
 const base=Object.freeze({baseAtk:25,bladeLevel:0,baseHp:65});
 const trained=Object.freeze({baseAtk:46,bladeLevel:1,baseHp:235});
 assert.equal(skills.describe('thunder',1,base),'パリィで雷撃 22 ダメージ');
 assert.equal(skills.describe('thunder',1,trained),'パリィで雷撃 51 ダメージ');
 assert.equal(skills.describe('thunder',1,base),'パリィで雷撃 22 ダメージ');
 assert.equal(skills.describe('rune',1,trained),'奥義の基礎ダメージ +83');
 assert.equal(skills.describe('heal',1,trained),'最大HP +19、取得時にも回復');
 assert.equal(skills.describe('heal',2,trained),'最大HP +38、取得時にも回復');
 assert.equal(skills.describe('heal',1,base),'最大HP +15、取得時にも回復');
 for(const skill of skills.SKILLS){
  for(const level of [1,skill.max,skill.max+2]){
   const description=skills.describe(skill.id,level,trained);
   assert.ok(description.length>0);
   assert.doesNotMatch(description,/NaN|undefined|Infinity/,skill.id);
  }
 }
 for(const synergy of skills.SYNERGIES){
  assert.ok(skills.SKILLS.some(s=>s.id===synergy.a));
  assert.ok(skills.SKILLS.some(s=>s.id===synergy.b));
 }
});
