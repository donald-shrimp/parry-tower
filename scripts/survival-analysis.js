'use strict';
// Execute current combat code in the smoke-test VM; never touch real browser saves.
// The original pre-implementation study is recorded in SURVIVAL_DESIGN_REVIEW.md.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const assert=require('node:assert/strict');
process.chdir(path.join(__dirname,'..'));
const B=require('./balance-simulation.js');
const harnessPath=path.resolve('tests/game-smoke.test.js');
let source=fs.readFileSync(harnessPath,'utf8').split(/\r?\ntest\(/)[0];
const marker='window.__parryBloodTest={';assert.equal(source.split(marker).length,2);
source=source.replace(marker,marker+'\n analysis:expression=>eval(expression),');
const sandbox={require:createRequire(harnessPath),module:{exports:{}},console,setImmediate};
vm.runInNewContext(source+'\nmodule.exports={makeHarness};',sandbox,{filename:harnessPath});
const {makeHarness}=sandbox.module.exports;
function setup(floor,candidate='baseline'){
 const g=makeHarness();g.random(.5);g.press('startBtn');const d=g.bloodTest();d.jumpFloor(floor);
 const skills={...B.SKILLS[floor]},maxHp=185+15*(skills.heal||0),relics=[];
 if(['overflow','all'].includes(candidate))relics.push('overflow_chalice');
 if(['sigil','all'].includes(candidate))relics.push('unbroken_sigil');
 if(['wardcraft','all'].includes(candidate))skills.wardcraft=3;
 const wardInheritance=['inheritance','all'].includes(candidate)?10:0;
 d.analysis(`Object.assign(game,${JSON.stringify({lv:skills,maxHp,hp:maxHp,rawMaxHp:maxHp,shield:55,baseAtk:46,combo:0,charge:0,reviveUsed:true,relics})});game.bonuses={regen:0,revive:0,bossWard:0,wardInheritance:${wardInheritance}};`);
 return {g,d,run:x=>d.analysis(x)};
}
function fixtures(){
 const {g,d,run}=setup(80);d.setSkill('aegis',1);d.setShield(151);
 run("strikeResult('just',performance.now())");assert.equal(g.state().shield,151);
 d.setSkill('aegis',0);run('relicShield(20)');assert.equal(g.state().shield,151);
 const chalice=setup(80,'overflow');chalice.d.setShield(0);chalice.d.setBaseAttack(10000);
 chalice.run("strikeResult('parry',performance.now())");assert.equal(chalice.g.state().shield,14);
 return {overCapShield:g.state().shield,overflowFirstParry:chalice.g.state().shield};
}
function trials(floor,style,candidate,trials=400){
 const {run}=setup(floor,candidate);
 return JSON.parse(run(`(()=>{
  // Suppress presentation and scheduling only; retain actual combat ordering.
  showText=()=>{};puff=()=>{};feedback=()=>{};syncHUD=()=>{};musicParry=()=>{};triggerClashFX=()=>{};sound=()=>{};chord=()=>{};nextStrike=()=>{};checkpoint=()=>{};
  die=()=>{game.mode='gameover';};
  const template=JSON.stringify(game),style=${JSON.stringify(style)},seedBase=${floor}*100003;
  const totals={floor:${floor},style:style.id,candidate:${JSON.stringify(candidate)},trials:${trials},wins:0,missDeaths:0,guardDeaths:0,attacks:0};
  for(let t=0;t<${trials};t++){
   game=JSON.parse(template);game.mode='combat';
   let seed=(seedBase+t*7919)>>>0;
   const random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let v=Math.imul(seed^seed>>>15,1|seed);v=v+Math.imul(v^v>>>7,61|v)^v;return ((v^v>>>14)>>>0)/4294967296;};
   for(let i=1;i<=2400;i++){
    const r=random(),kind=r<style.just?'just':r<style.just+style.parry?'parry':r<style.just+style.parry+style.guard?'guard':'miss';
    strikeResult(kind,performance.now());totals.attacks++;
    if(game.mode==='phase'){game.mode='combat';game.enemy.phase=2;}
    if(game.mode==='gameover'){totals[kind==='miss'?'missDeaths':'guardDeaths']++;break;}
    if(game.mode==='victory'){totals.wins++;break;}
   }
  }
  return JSON.stringify(totals);
 })()`));
}
const report={revision:require('node:child_process').execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),
 method:'Current real combat functions. Fixed paired input traces; full HP, max permanent base stats, assumed skills, boss shield 55. No loot, timing, route or opportunity-cost model. Inheritance has no added boss shield because the existing 55 exceeds its minimum. Unpolished relics, Wardcraft Lv3.',
 fixtures:fixtures(),comparisons:[]};
for(const floor of [40,60,80])for(const style of B.STYLES)for(const candidate of ['baseline','overflow','wardcraft','inheritance','sigil','all'])report.comparisons.push(trials(floor,style,candidate));
process.stdout.write(JSON.stringify(report,null,2)+'\n');
