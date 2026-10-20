'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../assets/progression.js');

const skills=[
 {id:'blood',rarity:'common',name:'吸血'},
 {id:'blade',rarity:'common',name:'剛剣'},
 {id:'rune',rarity:'epic',name:'奥義紋'},
 {id:'future_rare',rarity:'rare',name:'追加予定レア'},
 {id:'future_epic',rarity:'epic',name:'追加予定エピック'},
 {id:'future_discount',rarity:'epic',startCost:155,name:'限定スキル'}
];
test('skill prices are registry-driven, epic defaults to 300 and future skills need no shop changes',()=>{
 assert.equal(P.skillPrice(skills[0]),25);
 assert.equal(P.skillPrice(skills[1]),15);
 assert.equal(P.skillPrice(skills[2]),300);
 assert.equal(P.skillPrice(skills[3]),90);
 assert.equal(P.skillPrice(skills[4]),300);
 assert.equal(P.skillPrice(skills[5]),155);
 assert.equal(P.skillPrice({id:'unknown_common',rarity:'common'}),25);
 assert.equal(P.skillPrice({id:'unknown_rarity',rarity:'mythic'}),35);
});
test('normalizer rejects malformed progress, forged levels, invalid slots and duplicate equipment',()=>{
 const p=P.normalize({slots:99,unlockedSkills:['blood','blade','blood','future_epic',false],
  equipped:['blood','blood'],regen:Infinity,bossWard:999,revive:-5,choice4:1.9},skills);
 assert.equal(p.version,1);
 assert.equal(p.slots,2);
 assert.deepEqual(p.unlockedSkills,['blood','blade','future_epic']);
 assert.deepEqual(p.equipped,['blood',null]);
 assert.equal(p.regen,0);
 assert.equal(p.bossWard,6);
 assert.equal(p.revive,0);
 assert.equal(p.choice4,1);
 assert.deepEqual(P.normalize(null,skills),P.defaults());
 assert.deepEqual(P.normalize(['garbage'],skills),P.defaults());
});
test('equipment requires both unlocked slot and purchased skill; duplicate and ghost IDs cannot be equipped',()=>{
 const start=P.normalize({slots:1,unlockedSkills:['blood','blade']},skills);
 const equipped=P.equip(start,0,'blood',skills);
 assert.deepEqual(equipped.equipped,['blood',null]);
 assert.deepEqual(P.initialLevels(equipped,skills),{blood:1});
 assert.equal(P.equip(equipped,1,'blade',skills),null,'slot 2 is locked');
 assert.equal(P.equip(equipped,0,'rune',skills),null,'rune has not been purchased');
 assert.equal(P.equip(equipped,0,'missing',skills),null,'unknown skill cannot be equipped');
 const two=P.normalize({...equipped,slots:2},skills);
 assert.equal(P.equip(two,1,'blood',skills),null,'duplicate is rejected');
 assert.deepEqual(P.equip(two,1,'blade',skills).equipped,['blood','blade']);
 assert.deepEqual(P.equip(two,0,null,skills).equipped,[null,null]);
});
test('unknown unlocked IDs survive updates but only become equipable when catalog adds them',()=>{
 const raw={slots:1,unlockedSkills:['future_skill'],equipped:['future_skill',null]};
 const old=P.normalize(raw,skills);
 assert.deepEqual(old.unlockedSkills,['future_skill']);
 assert.deepEqual(old.equipped,[null,null]);
 const added=[...skills,{id:'future_skill',rarity:'epic',name:'未来スキル'}];
 const restored=P.normalize(raw,added);
 assert.deepEqual(P.initialLevels(restored,added),{future_skill:1});
 assert.equal(P.skillPrice(added.at(-1)),300);
});
test('permanent modifiers have explicit level caps and price steps',()=>{
 const p=P.normalize({regen:3,bossWard:2,soulGain:3,extraReroll:1,choice4:1,revive:1},skills);
 assert.equal(P.value(p,'regen'),15);
 assert.equal(P.value(p,'bossWard'),10);
 assert.equal(P.value(p,'soulGain'),15);
 assert.equal(P.value(p,'extraReroll'),1);
 assert.equal(P.value(p,'choice4'),4);
 assert.equal(P.value(p,'revive'),30);
 assert.equal(P.costNext(p,'regen'),80,'former max level now unlocks fourth tier');
 assert.equal(P.costNext(P.defaults(),'regen'),12);
 assert.equal(P.costNext({regen:1},'regen'),24);
 assert.equal(P.costNext({regen:2},'regen'),45);
 assert.equal(P.costNext({revive:0},'revive'),150);
 assert.equal(P.costNext({revive:1},'revive'),Infinity);
 assert.equal(P.costNext({},'nonexistent'),Infinity);
 assert.equal(P.SLOT_COSTS.length,2);
 assert.equal(P.UPGRADES.length,7);
});

test('v0.5.8 seal upgrade uses four priced levels and preserves pre-v0.5.8 saves',()=>{
 const old=P.normalize({version:1,slots:1,unlockedSkills:['blood'],equipped:['blood',null],regen:2},skills);
 assert.equal(old.version,1);
 assert.deepEqual(old.sealedSkills,[]);
 assert.equal(old.sealSlots,0);
 assert.equal(P.value(old,'sealSlots'),0);
 assert.equal(P.costNext(old,'sealSlots'),25);
 assert.deepEqual([0,1,2,3].map(sealSlots=>P.costNext({sealSlots},'sealSlots')),[25,60,120,220]);
 assert.equal(P.costNext({sealSlots:4},'sealSlots'),Infinity);
 assert.equal(P.value({sealSlots:4},'sealSlots'),4);
 assert.equal(P.normalize({sealSlots:999},skills).sealSlots,4);
 assert.equal(P.normalize({sealSlots:NaN},skills).sealSlots,0);
});
test('Fate Seal is free to set or clear but cannot exceed purchased capacity or include equipped skills',()=>{
 const base=P.normalize({sealSlots:2,slots:1,unlockedSkills:['blood'],equipped:['blood',null]},skills);
 assert.equal(P.seal(base,'blood',true,skills),null,'equipped skills may not be sealed');
 assert.equal(P.seal(base,'phantom',true,skills),null,'unknown skills cannot occupy a slot');
 let one=P.seal(base,'blade',true,skills);
 assert.deepEqual(one.sealedSkills,['blade']);
 let two=P.seal(one,'rune',true,skills);
 assert.deepEqual(two.sealedSkills,['blade','rune']);
 assert.equal(P.seal(two,'future_rare',true,skills),null,'two purchased slots means a two-skill cap');
 assert.equal(P.seal(two,'blade',true,skills),null,'duplicate seal blocked');
 assert.equal(P.equip(two,0,'blade',skills),null,'a sealed skill cannot be equipped');
 assert.equal(P.seal(two,'future_rare',false,skills),null,'cannot unseal an unsealed skill');
 const removed=P.seal(two,'blade',false,skills);
 assert.deepEqual(removed.sealedSkills,['rune']);
 assert.deepEqual(P.seal(removed,'future_rare',true,skills).sealedSkills,['rune','future_rare']);
 assert.deepEqual(P.activeSeals(removed,skills),['rune']);
});
test('Fate Seal load normalizes duplicates, malformed IDs, future removals and equipped conflicts',()=>{
 const p=P.normalize({version:1,sealSlots:3,slots:1,unlockedSkills:['blood'],equipped:['blood',null],
  sealedSkills:['blood','blade','blade','removed_skill',23,'rune','future_rare','future_epic']},skills);
 assert.deepEqual(p.sealedSkills,['blade','rune','future_rare']);
 assert.deepEqual(P.normalize({...p,sealSlots:1},skills).sealedSkills,['blade']);
 assert.deepEqual(P.normalize({sealSlots:4,sealedSkills:'wrong'},skills).sealedSkills,[]);
 assert.deepEqual(P.normalize({sealSlots:0,sealedSkills:['blade']},skills).sealedSkills,[]);
 const restored=P.normalize({sealSlots:1,sealedSkills:['future_new']},[...skills,{id:'future_new',rarity:'rare'}]);
 assert.deepEqual(restored.sealedSkills,['future_new'],'newly registered skill IDs need no hard-coded lists');
});

test('v0.9.3 baseline stat tiers retain all five original prices and effects',()=>{
 const defs=Object.fromEntries(P.BASE_UPGRADES.map(x=>[x.id,x]));
 assert.equal(P.BASE_UPGRADES.length,3);
 assert.deepEqual(P.BASE_UPGRADES.map(x=>x.max),[12,8,12]);
 for(const id of ['life','attack','ward']){
  assert.deepEqual([...defs[id].costs.slice(0,5)],[8,21,40,65,96]);
  for(let level=0;level<5;level++)
   assert.equal(P.baseCostNext({[id]:level},id),defs[id].costs[level]);
 }
 assert.deepEqual(Array.from({length:6},(_,i)=>P.baseValue({life:i},'life')),[0,10,20,30,40,50]);
 assert.deepEqual(Array.from({length:6},(_,i)=>P.baseValue({attack:i},'attack')),[0,3,6,9,12,15]);
 assert.deepEqual(Array.from({length:6},(_,i)=>P.baseValue({ward:i},'ward')),[0,8,16,24,32,40]);
 assert.equal([8,21,40,65,96].reduce((a,b)=>a+b),230);
});
test('new survivability levels, slowed attack growth, prices and upgrade caps are exact',()=>{
 for(const id of ['life','ward'])
  assert.deepEqual(Array.from({length:7},(_,i)=>P.baseCostNext({[id]:i+5},id)),[100,130,165,205,250,300,360]);
 assert.deepEqual(Array.from({length:3},(_,i)=>P.baseCostNext({attack:i+5},'attack')),[150,210,285]);
 assert.equal(P.baseCostNext({attack:8},'attack'),Infinity);
 assert.equal(P.baseCostNext({life:12},'life'),Infinity);
 assert.equal(P.baseCostNext({ward:12},'ward'),Infinity);
 assert.equal(P.baseValue({life:12},'life'),120);
 assert.equal(P.baseValue({ward:12},'ward'),96);
 assert.deepEqual([5,6,7,8].map(l=>P.baseValue({attack:l},'attack')),[15,17,19,21]);
 assert.equal(P.BASE_UPGRADES[0].costs.reduce((a,b)=>a+b),1740);
 assert.equal(P.BASE_UPGRADES[1].costs.reduce((a,b)=>a+b),875);
});
test('base-stat reads normalize legacy, malformed and forged levels without changing permanent-save v1',()=>{
 for(const id of ['life','attack','ward']){
  const max=P.BASE_UPGRADES.find(x=>x.id===id).max;
  assert.equal(P.baseLevel({[id]:Number.MAX_SAFE_INTEGER},id),max);
  assert.equal(P.baseLevel({[id]:max+9},id),max);
  assert.equal(P.baseLevel({[id]:-13},id),0);
  assert.equal(P.baseLevel({[id]:3.8},id),3);
  assert.equal(P.baseLevel({[id]:Infinity},id),0);
  assert.equal(P.baseLevel({[id]:'5'},id),0);
  assert.equal(P.baseLevel({[id]:NaN},id),0);
  assert.equal(P.baseCostNext({[id]:max+9},id),Infinity);
 }
 assert.equal(P.baseValue(null,'life'),0);
 assert.equal(P.baseCostNext({},'typo'),Infinity);
 assert.equal(P.baseValue({life:3},'typo'),0);
 assert.equal(P.VERSION,1);
});

test('v0.9.3 phase 2 expands regen, boss ward, and soul reward without changing old tiers',()=>{
 const expectations={
  regen:{costs:[12,24,45,80,140],values:[5,10,15,18,20]},
  bossWard:{costs:[15,30,55,90,155,235],values:[5,10,15,25,40,55]},
  soulGain:{costs:[30,60,100,150,225],values:[5,10,15,20,25]}
 };
 for(const [id,exp] of Object.entries(expectations)){
  const def=P.UPGRADES.find(x=>x.id===id);
  assert.deepEqual([...def.costs],exp.costs,id+' costs');
  assert.deepEqual([...def.values],exp.values,id+' bonuses');
  for(let lvl=0;lvl<exp.costs.length;lvl++){
   assert.equal(P.costNext({[id]:lvl},id),exp.costs[lvl]);
   assert.equal(P.value({[id]:lvl},id),lvl?exp.values[lvl-1]:0);
  }
  assert.equal(P.costNext({[id]:exp.costs.length},id),Infinity);
  assert.equal(P.normalize({[id]:999},skills)[id],exp.costs.length);
  assert.equal(P.normalize({[id]:3},skills)[id],3,'old owned tier persists');
 }
});
test('one-time rescue milestones are deterministic, bounded and never pay twice',()=>{
 assert.deepEqual(P.RUN_RESCUE_MILESTONES.map(x=>[x.runs,x.bonus]),[[3,20],[8,35],[15,60]]);
 assert.deepEqual(P.rescueReward(2,0),{bonus:0,mask:0,atRuns:[]});
 assert.deepEqual(P.rescueReward(3,0),{bonus:20,mask:1,atRuns:[3]});
 assert.deepEqual(P.rescueReward(8,1),{bonus:35,mask:3,atRuns:[8]});
 assert.deepEqual(P.rescueReward(15,3),{bonus:60,mask:7,atRuns:[15]});
 assert.deepEqual(P.rescueReward(25,0),{bonus:115,mask:7,atRuns:[3,8,15]});
 assert.deepEqual(P.rescueReward(99,7),{bonus:0,mask:7,atRuns:[]});
 assert.deepEqual(P.rescueReward(5,9),{bonus:0,mask:1,atRuns:[]});
 for(const bad of [-1,NaN,Infinity,'15',null]){
  assert.deepEqual(P.rescueReward(bad,0),{bonus:0,mask:0,atRuns:[]});
  assert.equal(P.rescueMask(bad),0);
 }
 assert.equal(P.rescueMask(255),7,'reserved bits cannot accidentally unlock future rewards');
});


test('bonus ownership migrates old saves, rejects unknown or unowned activation and survives equipment normalization',()=>{
 const old=P.normalize({slots:1,unlockedSkills:['blood']},skills);assert.deepEqual(old.unlockedExtras,[]);assert.deepEqual(old.enabledExtras,[]);
 const forged=P.normalize({unlockedExtras:['legacyVisual','legacyVisual','__proto__',null],enabledExtras:['legacyVisual','legacyVisual','missing']},skills);
 assert.deepEqual(forged.unlockedExtras,['legacyVisual']);assert.deepEqual(forged.enabledExtras,['legacyVisual']);assert.equal(P.extraEnabled(forged,'legacyVisual'),true);
 assert.deepEqual(P.normalize({enabledExtras:['legacyVisual']},skills).enabledExtras,[]);
 assert.equal(P.extraEnabled({unlockedExtras:'legacyVisual',enabledExtras:'legacyVisual'},'legacyVisual'),false);
 assert.equal(P.toggleExtra(old,'legacyVisual',true,skills),null);assert.equal(P.toggleExtra(forged,'missing',true,skills),null);
 assert.equal(P.toggleExtra(forged,'legacyVisual','yes',skills),null);
 const off=P.toggleExtra(forged,'legacyVisual',false,skills);assert.equal(P.extraEnabled(off,'legacyVisual'),false);assert.equal(P.extraEnabled(forged,'legacyVisual'),true,'immutable');
 const equipped=P.equip({...forged,slots:1,unlockedSkills:['blood']},0,'blood',skills);assert.equal(P.extraEnabled(equipped,'legacyVisual'),true);
 assert.equal(P.EXTRAS[0].cost,1000);assert.equal(Object.isFrozen(P.EXTRAS[0]),true);
});
