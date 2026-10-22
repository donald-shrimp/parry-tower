'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../assets/encounters.js');

test('each 10-floor sector has a consistent name and fixed story encounters',()=>{
 const expected=[['slime','knight','knight','guardian'],['sentinel','knight','sentinel','ironwarden'],
  ['wraith','cantor','cantor','dirgekeeper'],['clockwork','duelist','clockwork','timewarden'],
  ['ember_slime','molten_sentinel','molten_sentinel','forge_master'],
  ['frost_wraith','silver_duelist','silver_duelist','frost_priest'],
  ['star_cantor','orbital_clockwork','orbital_clockwork','star_warden'],
  ['void_knight','last_assassin','void_knight','endking']];
 for(let z=0;z<expected.length;z++){
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
 assert.equal(P.zoneForFloor(81),P.zoneForFloor(1));
 assert.notEqual(P.zoneForFloor(61),P.zoneForFloor(1));
 assert.notEqual(P.zoneForFloor(41),P.zoneForFloor(1));
 assert.notEqual(P.zoneForFloor(51),P.zoneForFloor(41));
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
 const expected=16*2+8*2+2;
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


test('v0.5.4 enemy multipliers match the agreed individual balance',()=>{
 const expected={
  slime:[1,1],knight:[1,1],wraith:[1,1],
  rogue:[.90,.80],duelist:[.90,.80],sentinel:[1.10,1.00],
  cantor:[1,.90],clockwork:[1.10,.95],
  ember_slime:[1,1],molten_sentinel:[1.10,1],frost_wraith:[1,.90],silver_duelist:[.90,.80],
  star_cantor:[1,.90],orbital_clockwork:[1.10,.95],void_knight:[1.10,.95],last_assassin:[.90,.80],
  guardian:[1.50,1],ironwarden:[1.50,1],dirgekeeper:[1.50,1],timewarden:[1.50,1],
  forge_master:[1.50,1],frost_priest:[1.50,1],star_warden:[1.50,1],endking:[1.50,1],
  golden_tone:[1,1],gem_slime:[1,1]
 };
 assert.equal(Object.keys(expected).length,P.all.length);
 for(const [id,[hp,attack]] of Object.entries(expected)){
  assert.equal(P.byId[id].hpMultiplier??1,hp,id+' HP');
  assert.equal(P.byId[id].atkMultiplier??1,attack,id+' attack');
 }
});
test('damage reductions remain effective on the first floor despite the old minimum attack',()=>{
 const rogue=P.baseStats(P.buildEnemy(P.byId.rogue),1);
 const duelist=P.baseStats(P.buildEnemy(P.byId.duelist),1);
 const base=P.baseStats(P.buildEnemy(P.byId.knight),1);
 assert.equal(base.atk,14);
 assert.equal(rogue.atk,11);
 assert.equal(duelist.atk,11);
 assert.ok(rogue.atk<13,'old Math.max(13,...) must not wipe out the 0.80 factor');
 assert.equal(P.baseStats(P.buildEnemy(P.byId.sentinel),1).atk,14);
});
test('boss HP uses 1.50 times the PREVIOUS boss HP and leaves attack unchanged',()=>{
 const hpCurve=f=>Math.pow(1.18,Math.min(f-1,9))*Math.pow(1.075,Math.max(0,f-10));
 const atkCurve=f=>Math.pow(1.09,Math.min(f-1,9))*Math.pow(1.045,Math.max(0,Math.min(f,30)-10))*Math.pow(1.03,Math.max(0,f-30));
 for(const boss of P.bosses)for(const floor of [5,10,15,20,30,40]){
  for(const elite of [false,true]){
   const enc=P.buildEnemy(boss,elite);
   const oldHp=Math.round(49*hpCurve(floor)*2.15*(elite?1.3:1));
   const oldAtk=Math.max(13,Math.round(14*atkCurve(floor)*1.25*(elite?1.15:1)));
   const current=P.baseStats(enc,floor);
   assert.equal(current.maxHp,Math.round(oldHp*1.5),boss.id+' HP at '+floor+' elite '+elite);
   assert.equal(current.atk,oldAtk,boss.id+' atk at '+floor+' elite '+elite);
  }
 }
});
test('floor/elite/rare multipliers compose in existing order and standard enemies stay unchanged',()=>{
 const hpGrowth=f=>Math.pow(1.18,Math.min(f-1,9))*Math.pow(1.075,Math.max(0,f-10));
 const atkGrowth=f=>Math.pow(1.09,Math.min(f-1,9))*Math.pow(1.045,Math.max(0,Math.min(f,30)-10))*Math.pow(1.03,Math.max(0,f-30));
 for(const id of ['slime','knight','wraith','rogue','duelist','sentinel','cantor','clockwork','golden_tone','gem_slime']){
  const def=P.byId[id];
  for(const floor of [1,11,19,31,41]){
   for(const elite of [false,true]){
    // Rare entries remain rare and must not accidentally gain other class modifiers.
    const enc=P.buildEnemy(def,elite&&!def.rare);
    const oldHp=Math.max(1,Math.round(49*hpGrowth(floor)*(elite&&!def.rare?1.30:1)*(def.rare?1.12:1)));
    const oldAtk=Math.max(13,Math.round(14*atkGrowth(floor)*(elite&&!def.rare?1.15:1)*(def.rare?.95:1)));
    const out=P.baseStats(enc,floor);
    assert.equal(out.maxHp,Math.max(1,Math.round(oldHp*(def.hpMultiplier??1))),id+' HP at '+floor);
    assert.equal(out.atk,Math.max(1,Math.round(oldAtk*(def.atkMultiplier??1))),id+' atk at '+floor);
   }
  }
 }
});

test('blood trials sometimes tease signature enemies from exactly two zones ahead',()=>{
 const samples=[
  [4,'cantor'],[8,'cantor'],[14,'clockwork'],[18,'clockwork'],
  [24,'ember_slime'],[34,'frost_wraith'],
  [44,'star_cantor'],[54,'void_knight']
 ];
 for(const [f,id] of samples){
  const enemy=P.foreshadowTrialForFloor(f,()=>0);
  assert.equal(enemy.id,id,'future guest at '+f);
  assert.equal(enemy.displayName,'？？？');
  assert.equal(enemy.name,'？？？');
  assert.equal(enemy.preview,true);
  assert.equal(enemy.elite,true);
  assert.equal(enemy.boss,false);assert.equal(enemy.rare,false);
  assert.equal(enemy.bookKey,id+':elite','underlying combat identity is not re-keyed');
  assert.deepEqual(enemy.rhythm,P.byId[id].rhythm);
  assert.deepEqual(P.baseStats(enemy,f),P.baseStats(P.buildEnemy(P.byId[id],true),f),
   'future guest uses current-floor scaling only');
 }
 for(const [f,id] of [[24,'molten_sentinel'],[34,'silver_duelist'],
  [44,'orbital_clockwork'],[54,'last_assassin']]){
  let count=0;
  assert.equal(P.foreshadowTrialForFloor(f,()=>++count===1?.1:.99).id,id);
 }
 assert.equal(P.FORESHADOW_RATE,.5);
 assert.equal(P.foreshadowTrialForFloor(4,()=>.5),null);
});
test('foreshadow guest is absent from late stages, bosses, normal encounters and future-cycle rooms',()=>{
 for(const f of [0,1,3,5,9,10,12,19,55,59,60,64,68,74,78,84,88,104,108])
  assert.equal(P.foreshadowTrialForFloor(f,()=>0),null,'must not preview at floor '+f);
 for(const bad of [NaN,Infinity,2.5,'4',null,-1])
  assert.equal(P.foreshadowTrialForFloor(bad,()=>0),null);
});
test('masked trial appearances never write bestiary records, including defeat or practice unlocks',()=>{
 const book=P.emptyBook(),preview=P.foreshadowTrialForFloor(24,()=>0);
 assert.equal(P.recordEncounter(book,preview,24),false);
 assert.equal(P.recordDefeat(book,preview,24),false);
 assert.equal(Object.keys(book.seen).length,0);
 assert.equal(Object.keys(book.defeated).length,0);
 assert.equal(P.codexEntries().length,50,'guest is not a new book entry');
 assert.equal(P.byId.ember_slime.name,'灼熱スライム','source name stays intact');
 assert.equal(P.findByKey('ember_slime:elite').preview,undefined);
 const reveal=P.encounterForFloor(41,()=>.99);
 assert.equal(reveal.id,'ember_slime');
 assert.equal(P.recordEncounter(book,reveal,41),true,'real encounter triggers first discovery');
 assert.equal(book.seen[reveal.bookKey].firstFloor,41);
});

test('enemy attacks preserve 1-30F strength and ease to about 325 at 80F without HP changes',()=>{
 function oldAtk(f){return Math.round(14*Math.pow(1.09,Math.min(f-1,9))*
  Math.pow(1.045,Math.max(0,Math.min(f,60)-10))*Math.pow(1.012,Math.max(0,f-60)));}
 const normal=P.buildEnemy(P.byId.endking,true);
 const expected=[[30,105],[40,142],[50,190],[60,256],[70,288],[80,325]];
 for(const [f,atk] of expected){
  assert.equal(P.baseStats(normal,f).atk,atk,String(f)+'F elite boss attack');
  if(f>=40)assert.ok(P.baseStats(normal,f).atk<Math.round(oldAtk(f)*1.25*1.15));
 }
 assert.equal(P.baseStats(normal,80).maxHp,91028,'80F boss HP unchanged');
});

test('attack notation classifies 1 and 1.5 beat follow-ups and keeps openings and second movement explicit',()=>{
 for(const e of P.all){
  const copy=P.buildEnemy(e);copy.index=0;
  assert.deepEqual(P.attackPhrase(copy),{beats:4,windup:true});
  for(const [phase,rhythm] of [[1,e.rhythm],...(e.phaseRhythm?[[2,e.phaseRhythm]]:[])]){
   copy.phase=phase;copy.rhythm=[...rhythm];
   const score=phase===2?P.ATTACK_SCORES[e.id].second:P.ATTACK_SCORES[e.id].normal;
   assert.ok(Object.isFrozen(score));
   for(let i=1;i<=rhythm.length*2;i++){
    const beats=rhythm[(i-1)%rhythm.length];copy.index=i;
    assert.deepEqual(P.attackPhrase(copy),{beats,windup:beats>1.5});
    assert.deepEqual(P.attackPhrase(copy,i,true),{beats:4,windup:true});
   }
  }
 }
 assert.deepEqual(P.ATTACK_SCORES.rogue.normal.map(n=>n.windup),[false,false,true,true]);
 assert.deepEqual(P.ATTACK_SCORES.knight.normal.map(n=>n.windup),[true,true,true,false]);
});
