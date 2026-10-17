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
 assert.equal(p.bossWard,3);
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
 assert.equal(P.costNext(p,'regen'),Infinity);
 assert.equal(P.costNext(P.defaults(),'regen'),12);
 assert.equal(P.costNext({regen:1},'regen'),24);
 assert.equal(P.costNext({regen:2},'regen'),45);
 assert.equal(P.costNext({revive:0},'revive'),150);
 assert.equal(P.costNext({revive:1},'revive'),Infinity);
 assert.equal(P.costNext({},'nonexistent'),Infinity);
 assert.equal(P.SLOT_COSTS.length,2);
 assert.equal(P.UPGRADES.length,6);
});
