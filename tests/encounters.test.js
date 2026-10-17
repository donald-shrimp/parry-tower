'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../assets/encounters.js');

test('each 10-floor sector has a consistent name and fixed story encounters',()=>{
 const expected=[['slime','knight','knight','guardian'],['sentinel','knight','sentinel','ironwarden'],
  ['wraith','cantor','cantor','dirgekeeper'],['clockwork','duelist','clockwork','timewarden']];
 for(let z=0;z<4;z++){
  const start=1+10*z;
  assert.equal(P.encounterForFloor(start,()=>.99).id,expected[z][0]);
  assert.equal(P.encounterForFloor(start+1,()=>.99).id,expected[z][1]);
  const guardian=P.encounterForFloor(start+4,()=>.99);
  assert.equal(guardian.id,expected[z][3]);assert.equal(guardian.boss,true);assert.equal(guardian.elite,false);
  const elite=P.encounterForFloor(start+8,()=>.99);
  assert.equal(elite.id,expected[z][2]);assert.equal(elite.elite,true);
  const final=P.encounterForFloor(start+9,()=>.99);
  assert.equal(final.id,expected[z][3]);assert.equal(final.boss,true);assert.equal(final.elite,true);
  assert.equal(P.zoneForFloor(start),P.zoneForFloor(start+9));
 }
 assert.equal(P.zoneForFloor(41),P.zoneForFloor(1));
});
test('every floor picks a valid enemy and readable beat pattern',()=>{
 for(let f=1;f<=130;f++){
  const e=P.encounterForFloor(f,()=>.5);
  assert.ok(P.byId[e.id]);assert.ok(e.rhythm.length>=2);assert.ok(e.rhythm.every(n=>n>0&&Number.isInteger(n*2)));
 }
});
test('rare encounters never overwrite bosses, scripted floors, or cooldown',()=>{
 assert.equal(P.encounterForFloor(6,()=>0).rare,true);
 assert.equal(P.encounterForFloor(6,()=>0,4).rare,false);
 for(const f of [1,2,5,9,10,11,15,19,20,25,29,30,35,39,40])
  assert.equal(P.encounterForFloor(f,()=>0).rare,false,'floor '+f);
 assert.equal(P.encounterForFloor(8,()=>0,4).rare,true);
});
test('random elite spawn is separate from rare and is stronger than normal',()=>{
 const sequence=[.5,.5,.02];let i=0;
 const elite=P.encounterForFloor(18,()=>sequence[i++]);
 assert.equal(elite.elite,true);assert.equal(elite.rare,false);
 const basic=P.buildEnemy(P.byId[elite.id]);
 assert.ok(P.baseStats(elite,18).maxHp>P.baseStats(basic,18).maxHp);
 assert.ok(P.baseStats(elite,18).atk>P.baseStats(basic,18).atk);
});
test('practice sessions use baseline stats, not deep-floor exponential HP',()=>{
 const elite=P.buildEnemy(P.byId.clockwork,true);
 assert.ok(P.baseStats(elite,40).maxHp>P.baseStats(elite,40,true).maxHp);
 const boss=P.buildEnemy(P.byId.timewarden);
 assert.equal(P.baseStats(boss,99,true).maxHp,P.baseStats(boss,5).maxHp);
});
test('one encounter unlocks practice even without a defeat, while wins remain separate',()=>{
 const expected=8*2+4*2+2;
 assert.equal(P.codexEntries().length,expected);
 const book=P.emptyBook(),slime=P.encounterForFloor(1),key=slime.bookKey;
 assert.equal(Object.keys(book.seen).length,0);
 assert.equal(P.recordEncounter(book,slime,1),true);
 assert.equal(book.seen[key].encounters,1);
 assert.equal(book.defeated[key],undefined,'a mere encounter is not a victory');
 assert.equal(P.recordEncounter(book,slime,3),false);
 assert.equal(book.seen[key].encounters,2);
 assert.equal(book.seen[key].firstFloor,1);
 assert.equal(P.recordDefeat(book,slime,3),true);
 assert.equal(book.defeated[key].wins,1);
 assert.equal(book.seen[key].encounters,2,'defeating does not double-register an encounter');
 assert.equal(P.findByKey(key).id,'slime');
 assert.equal(P.findByKey('not_real:rare'),null);
});
test('codex v1 defeated-only saves migrate to an encounter unlock and invalid data is ignored',()=>{
 const old={version:1,defeated:{'knight:elite':{wins:3,firstFloor:9},'bogus:rare':{wins:12,firstFloor:1}}};
 const migrated=P.normalizeBook(old);
 assert.equal(migrated.version,2);
 assert.equal(migrated.seen['knight:elite'].firstFloor,9);
 assert.equal(migrated.seen['knight:elite'].encounters,3);
 assert.equal(migrated.defeated['knight:elite'].wins,3);
 assert.equal(migrated.seen['bogus:rare'],undefined);
 const newBook=P.normalizeBook({version:2,seen:{'slime:normal':{encounters:1,firstFloor:1},'rogue:elite':{encounters:-5}},defeated:{}});
 assert.equal(newBook.seen['slime:normal'].encounters,1);
 assert.equal(newBook.seen['rogue:elite'],undefined);
 assert.equal(newBook.defeated['slime:normal'],undefined);
});
test('rare enemy reward values are defined but not automatically written to persistent coins',()=>{
 const rare=P.encounterForFloor(6,()=>0);
 assert.equal(rare.soulBonus,8);assert.equal(rare.bookKey,'golden_tone:rare');
 assert.equal(P.byId.gem_slime.soulBonus,12);
 assert.equal(P.emptyBook().defeated[rare.bookKey],undefined);
});
