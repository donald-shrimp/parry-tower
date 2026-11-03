'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const EV=require('../assets/events.js');
test('eight merchant offers have unique IDs and agreed prices',()=>{
 assert.deepEqual(EV.ITEMS.map(x=>x.id),['reroll','barrier','skill','relic','training','breakthrough','elixir','polish']);
 assert.deepEqual(EV.ITEMS.map(x=>x.cost),[12,16,26,42,34,60,18,36]);
 for(const item of EV.ITEMS){
  assert.equal(EV.ITEMS_BY_ID[item.id],item);
  assert.equal(item.cost>0,true);
 }
});
test('seven event narratives offer the agreed mutually exclusive actions',()=>{
 assert.deepEqual(EV.EVENTS.map(x=>x.id),['altar','mirror','traveler','chest','sanctuary','forge','scales']);
 const actionMap={
  altar:['sacrifice','ward'],mirror:['swap','coins'],
  traveler:['coins','ward'],chest:['open','coins'],
  sanctuary:['resonate','train','pray'],forge:['polish','temper','scrap'],
  scales:['toSouls','toCoins','leave']
 };
 for(const event of EV.EVENTS){
  assert.deepEqual(event.actions.map(x=>x.id),actionMap[event.id]);
  assert.equal(EV.BY_ID[event.id],event);
  assert.ok(event.icon&&event.description&&event.name);
 }
});
test('event selector handles boundary values, draws all seven events and avoids consecutive repeats when excludeId is passed',()=>{
 assert.equal(EV.randomEvent(()=>0).id,'altar');
 assert.equal(EV.randomEvent(()=>.15).id,'mirror');
 assert.equal(EV.randomEvent(()=>.3).id,'traveler');
 assert.equal(EV.randomEvent(()=>.45).id,'chest');
 assert.equal(EV.randomEvent(()=>.6).id,'sanctuary');
 assert.equal(EV.randomEvent(()=>.75).id,'forge');
 assert.equal(EV.randomEvent(()=>.95).id,'scales');
 assert.equal(EV.randomEvent(()=>1).id,'scales');
 assert.equal(EV.randomEvent(()=>NaN).id,'altar');
 assert.equal(EV.randomEvent(()=>0,'altar').id,'mirror');
 for(const id of EV.EVENTS.map(x=>x.id)){
  for(let r=0;r<=1;r+=.1)assert.notEqual(EV.randomEvent(()=>r,id).id,id);
 }
});
test('altar cannot kill even at low max HP and offers rounded 12% sacrifice',()=>{
 assert.equal(EV.altarCost(65),8);
 assert.equal(EV.altarCost(100),12);
 assert.equal(EV.altarCost(1),1);
 assert.equal(EV.canSacrifice(8,65),false);
 assert.equal(EV.canSacrifice(9,65),true);
 assert.equal(EV.canSacrifice(1,1),false);
 assert.equal(EV.canSacrifice(NaN,65),false);
});
test('chest failure takes up to 20% of maximum HP but always leaves at least one HP',()=>{
 assert.equal(EV.chestDamage(65,65),13);
 assert.equal(EV.chestDamage(30,100),20);
 assert.equal(EV.chestDamage(8,100),7);
 assert.equal(EV.chestDamage(1,100),0);
 assert.equal(EV.chestDamage(0,100),0);
});
