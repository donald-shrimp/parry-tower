'use strict';
// Execute current combat code in the smoke-test VM; never touch real browser saves.
// The original pre-implementation study is recorded in SURVIVAL_DESIGN_REVIEW.md.
const path=require('node:path');
const assert=require('node:assert/strict');
const {makeHarness}=require('../tests/helpers/game-harness.js');
const B=require('./balance-simulation.js');
function setup(floor,candidate='baseline'){
 const g=makeHarness();g.random(.5);g.press('startBtn');const d=g.bloodTest();d.jumpFloor(floor);
 const skills={...B.SKILLS[floor]},maxHp=185+15*(skills.heal||0),relics=[];
 if(['overflow','all'].includes(candidate))relics.push('overflow_chalice');
 if(['sigil','all'].includes(candidate))relics.push('unbroken_sigil');
 if(['wardcraft','all'].includes(candidate))skills.wardcraft=3;
 const wardInheritance=['inheritance','all'].includes(candidate)?10:0;
 const combat=d.survivalAnalysis;
 combat.configure({skills,maxHp,shield:55,baseAttack:46,relics,wardInheritance});
 return {g,d,combat};
}
function fixtures(){
 const {g,d,combat}=setup(80);d.setSkill('aegis',1);d.setShield(151);
 combat.strike('just');assert.equal(g.state().shield,151);
 d.setSkill('aegis',0);combat.replenishRelicShield(20);assert.equal(g.state().shield,151);
 const chalice=setup(80,'overflow');chalice.d.setShield(0);chalice.d.setBaseAttack(10000);
 chalice.combat.strike('parry');assert.equal(chalice.g.state().shield,14);
 return {overCapShield:g.state().shield,overflowFirstParry:chalice.g.state().shield};
}
function trials(floor,style,candidate,trials=400){
 const {reset,strike}=setup(floor,candidate).combat.beginTrials();
 const seedBase=floor*100003;
 const totals={floor,style:style.id,candidate,trials,wins:0,missDeaths:0,guardDeaths:0,attacks:0};
 for(let t=0;t<trials;t++){
  reset();
  let seed=(seedBase+t*7919)>>>0;
  const random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let v=Math.imul(seed^seed>>>15,1|seed);v=v+Math.imul(v^v>>>7,61|v)^v;return ((v^v>>>14)>>>0)/4294967296;};
  for(let i=1;i<=2400;i++){
   const r=random(),kind=r<style.just?'just':r<style.just+style.parry?'parry':r<style.just+style.parry+style.guard?'guard':'miss';
   const mode=strike(kind);totals.attacks++;
   if(mode==='gameover'){totals[kind==='miss'?'missDeaths':'guardDeaths']++;break;}
   if(mode==='victory'){totals.wins++;break;}
  }
 }
 return totals;
}
const report={revision:require('node:child_process').execFileSync('git',['rev-parse','--short','HEAD'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}).trim(),
 method:'Current real combat functions. Fixed paired input traces; full HP, max permanent base stats, assumed skills, boss shield 55. No loot, timing, route or opportunity-cost model. Inheritance has no added boss shield because the existing 55 exceeds its minimum. Unpolished relics, Wardcraft Lv3.',
 fixtures:fixtures(),comparisons:[]};
for(const floor of [40,60,80])for(const style of B.STYLES)for(const candidate of ['baseline','overflow','wardcraft','inheritance','sigil','all'])report.comparisons.push(trials(floor,style,candidate));
process.stdout.write(JSON.stringify(report,null,2)+'\n');
