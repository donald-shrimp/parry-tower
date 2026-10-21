'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const S=require('../assets/player-settings'),CP=require('../assets/run-checkpoint'),E=require('../assets/ending-scene');

test('settings migrate safely, clamp gains and keep the approved 100% defaults',()=>{
 assert.deepEqual(S.normalize(null),{bgm:100,sfx:100,shake:true,flash:true});
 assert.deepEqual(S.normalize({bgm:500,sfx:-30,shake:false,flash:false}),{bgm:200,sfx:0,shake:false,flash:false});
 assert.equal(S.normalize({bgm:'200',sfx:Infinity}).bgm,100);assert.equal(S.normalize({sfx:Infinity}).sfx,100);
});
test('calibration requires eight consistent distinct taps, tolerates outliers and reports clamp',()=>{
 assert.equal(S.recommend([0,0,0]),null);
 assert.equal(S.recommend([-200,-150,-100,-50,0,50,100,150,200,230]),null);
 assert.equal(S.recommend([19,20,21,19,20,21,20,20,220,-200]).candidate,20);
 assert.equal(S.recommend(Array(8).fill(230)).candidate,180);assert.equal(S.recommend(Array(8).fill(230)).clamped,true);
 assert.equal(S.recommend(Array(8).fill(-110)).candidate,-110);
 assert.equal(S.recommend(Array(8).fill(0)).candidate,0,'no animation startup is included');
});
function fixture(){const game={legacyVisual:false,tutorial:false,tutorialStep:0,tutorialFinishing:false,mode:'combat',practice:false,floor:1,maxHp:65,hp:65,shield:0,baseAtk:25,skin:'normal',skinEffects:true,bonuses:{soulGain:0,bossWard:0,regen:0,revive:0,choice4:0},lifeBonus:0,lv:{blade:1},skillBreaks:{},relicCounters:{},relics:[],polishedRelics:[],relicDiscarded:[],relicOffer:[],sealedSkillIds:[],routeSkillSet:[],currentRoom:null,eventId:null,roomStage:null,roomLocked:false,relicRewardKind:null,relicReturn:null,relicSwapTarget:null,relicMirrorTarget:null,enemy:{bookKey:'slime:normal',hp:30,maxHp:30,atk:5,burn:0,index:0,phase:1,rhythm:[2,2]},attackAt:Infinity,artLoading:true};for(const key of ['towerCoins','towerCoinsEarned','combo','peakCombo','perfects','parries','damage','charge','bossKills','rerolls','bonusSouls','misses','whiffs','guards','rawMaxHp','relicStopUsed'])game[key]=0;return game;}
const context={skills:[{id:'blade',max:20}],relics:[{id:'rusty_crest'}],skins:['normal'],encounters:key=>key==='slime:normal'};
test('checkpoint rejects corrupt versions, invalid caps, slots, room states and nonfinite health',()=>{
 const valid=CP.capture(fixture());assert.ok(CP.validate(valid,context));const fractional=structuredClone(valid);fractional.game.hp=.25;fractional.game.enemy.hp=.125;assert.ok(CP.validate(fractional,context));assert.equal(valid.game.attackAt,undefined);assert.equal(valid.game.artLoading,undefined);
 for(const mutate of [x=>x.version=2,x=>x.game.hp=0,x=>x.game.hp=NaN,x=>x.game.lv.blade=23,x=>x.game.skillBreaks.blade=3,x=>x.game.roomStage='target:constructor',x=>x.game.relics=['rusty_crest','rusty_crest'],x=>x.game.polishedRelics=['rusty_crest'],x=>x.game.enemy.rhythm=[],x=>x.game.enemy.rhythm=[NaN],x=>x.game.enemy.bookKey='ghost:normal']){
  const bad=structuredClone(valid);mutate(bad);assert.equal(CP.validate(bad,context),null);
 }
 assert.equal(CP.capture({...fixture(),practice:true}),null);assert.equal(CP.capture({...fixture(),mode:'gameover'}),null);
});
test('ending scenes stay ordered and seek identically across low/high effects without touching global randomness',()=>{
 const marks=E.marks();assert.deepEqual(marks.map(m=>m.name),['勝利','花火','引き','過剰打上','塔爆発','生還','踏破']);
 assert.equal(E.sample(-20).time,0);assert.equal(E.sample(Infinity).time,0);assert.equal(E.sample(1000).time,E.sample(0).duration);
 assert.equal(E.sample(15).stage,'過剰打上');assert.equal(E.sample(25).title,0);assert.equal(E.sample(29).title,1);
 function render(t,p){const calls=[];const ctx=new Proxy({},{get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):(...args)=>calls.push([k,...args]),set:(o,k,v)=>{calls.push([k,v]);return true}});E.draw(ctx,960,600,t,p,()=>{});return calls;}
 for(const density of [.2,2]){const p={density};assert.deepEqual(render(17,p),render(17,p));for(const t of [0,3,9,15,19,21,25,29])assert.ok(render(t,p).length>0);}
 const source=fs.readFileSync('assets/ending-scene.js','utf8')+fs.readFileSync('assets/ending-preview.js','utf8');assert.doesNotMatch(source,/Math\.random|localStorage|__parryDev/);
 for(const page of ['index.html','dev.html']){const html=fs.readFileSync(page,'utf8');assert.ok(html.includes('assets/player-settings.js'));assert.ok(html.includes('assets/run-checkpoint.js'));assert.ok(!html.includes('assets/ending-scene.js'));}
});
