'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../assets/relics.js');
const expectedNames=['錆びた盾章','星屑の砥石','雷導石','余燼の小瓶','巡礼者の鐘','欠けた歯車',
 '静謐の水晶','雷帝の導線','蒼銀の鏡','王の戦旗','血盟の杯','黄金の祭鐘',
 '止まった秒針','死神の盟約','二重奏の仮面'];

test('fifteen immutable and uniquely identified relics: 6 common, 6 rare and 3 legendary',()=>{
 assert.equal(R.MAX_HELD,3);
 assert.equal(R.RELICS.length,15);
 assert.deepEqual(R.RELICS.map(r=>r.name),expectedNames);
 assert.equal(new Set(R.RELICS.map(r=>r.id)).size,15);
 for(const rarity of ['common','rare','legendary']){
  assert.equal(R.RELICS.filter(r=>r.rarity===rarity).length,rarity==='legendary'?3:6);
 }
 for(const r of R.RELICS){
  assert.ok(r.desc&&r.affinity&&r.icon);
  assert.equal(R.BY_ID[r.id],r);
  assert.equal(Object.isFrozen(r),true);
 }
});
test('relic discovery triggers at 3F, bosses and eligible elite/rare kills',()=>{
 const rng=x=>()=>x;
 assert.equal(R.rewardType(1,{}),null);
 assert.equal(R.rewardType(2,{boss:true}), 'boss10');
 assert.equal(R.rewardType(3,{}),'first');
 assert.equal(R.rewardType(5,{boss:true}),'boss5');
 assert.equal(R.rewardType(10,{boss:true}),'boss10');
 assert.equal(R.rewardType(15,{boss:true}),'boss10');
 assert.equal(R.rewardType(3,{elite:true},rng(.99)),'first','guaranteed floor cannot roll twice');
 assert.equal(R.rewardType(8,{rare:true},rng(.34)),'special');
 assert.equal(R.rewardType(8,{rare:true},rng(.35)),null);
 assert.equal(R.rewardType(8,{elite:true},rng(.19)),'special');
 assert.equal(R.rewardType(8,{elite:true},rng(.20)),null);
 assert.equal(R.rewardType(8,{},rng(0)),null);
});
test('offer is a three-choice unique pool using site-specific rarity weights',()=>{
 assert.deepEqual(R.WEIGHTS.first,{common:80,rare:20,legendary:0});
 assert.deepEqual(R.WEIGHTS.boss5,{common:65,rare:35,legendary:0});
 assert.deepEqual(R.WEIGHTS.boss10,{common:45,rare:45,legendary:10});
 assert.deepEqual(R.WEIGHTS.special,{common:60,rare:40,legendary:0});
 for(const kind of ['first','boss5','boss10','special']){
  const result=R.offer(kind,[],[],()=>0.8);
  assert.equal(result.length,3);
  assert.equal(new Set(result.map(r=>r.id)).size,3);
  if(kind!=='boss10')assert.equal(result.some(r=>r.rarity==='legendary'),false);
 }
 assert.equal(R.offer('first',[],[],()=>0).every(r=>r.rarity==='common'),true);
 assert.equal(R.offer('boss10',[],[],()=>.999).every(r=>r.rarity==='legendary'),true);
 assert.equal(R.offer('first',[],[],()=>.999).every(r=>r.rarity==='rare'),true);
 assert.deepEqual(R.offer('unlisted'),[]);
});
test('removed relics never reappear in one run; exhausted rarities redistribute remaining weight',()=>{
 const owned=['rusty_crest','stardust_whetstone','conduit_stone'];
 const discarded=['ember_vial','pilgrim_bell','broken_gear'];
 const result=R.offer('first',owned,discarded,()=>0);
 assert.equal(result.length,3);
 assert.equal(result.every(r=>r.rarity==='rare'),true,'all commons excluded, rare rerolled');
 assert.equal(result.some(r=>owned.includes(r.id)||discarded.includes(r.id)),false);
 const almost=R.RELICS.filter(r=>r.id!=='royal_banner').map(r=>r.id);
 assert.deepEqual(R.offer('boss10',almost,[],()=>.7).map(r=>r.id),['royal_banner']);
 assert.deepEqual(R.offer('boss10',R.RELICS.map(r=>r.id)),[]);
 assert.deepEqual(R.offer('boss10',[],[],()=>.4,0),[]);
});
test('unexpected IDs and malformed stored values cannot affect available pool',()=>{
 assert.deepEqual(R.validIds(['duet_mask','duet_mask','ghost',null,10,'stopped_hand']),['duet_mask','stopped_hand']);
 assert.deepEqual(R.validIds({length:3}),[]);
 assert.equal(R.available(['ghost','duet_mask'],['stopped_hand']).length,13);
 assert.equal(R.offer('first',null,null,()=>Number.NaN).length,3);
});
