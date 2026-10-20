'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../assets/encounters.js');
const sprites=require('../assets/enemy-motions.js');
const RT=require('../assets/routes.js');
const fs=require('node:fs');

const newMonsters=['ember_slime','molten_sentinel','frost_wraith','silver_duelist'];
const newBosses=['forge_master','frost_priest'];

test('41–60F are two distinct zones and 61F introduces the astral stage',()=>{
 assert.equal(E.ZONES.length,8);
 assert.equal(E.zoneForFloor(41).name,'熔鉄の工房');
 assert.equal(E.zoneForFloor(50).scene,'forge');
 assert.equal(E.zoneForFloor(51).name,'白霜の回廊');
 assert.equal(E.zoneForFloor(60).scene,'frost');
 assert.equal(E.zoneForFloor(61).name,'星詠みの観測所');
 assert.equal(E.zoneForFloor(121).name,E.zoneForFloor(41).name);
 for(const [start,boss] of [[41,'forge_master'],[51,'frost_priest']]){
  assert.equal(E.encounterForFloor(start+4,()=>.5).id,boss);
  assert.equal(E.encounterForFloor(start+9,()=>.5).id,boss);
  assert.equal(E.encounterForFloor(start+9,()=>.5).elite,true);
  assert.equal(E.encounterForFloor(start+8,()=>.5).elite,true);
  assert.equal(RT.branchKind(start+3),'first');
  assert.equal(RT.branchKind(start+7),'second');
  assert.equal(RT.branchKind(start+4),null);
 }
});
test('new monsters reuse proven silhouettes, color filters and half-beat score intervals',()=>{
 assert.equal(E.monsters.length,16);
 assert.equal(E.bosses.length,8);
 assert.equal(E.codexEntries().length,50);
 const oldKinds=new Set(['slime','knight','rogue','wraith','guardian']);
 for(const id of [...newMonsters,...newBosses]){
  const e=E.byId[id],sprite=E.byId[e.sprite];
  assert.ok(e,'new definition '+id);
  assert.ok(sprite,'reused silhouette '+id);
  assert.equal(e.kind,sprite.kind,id+' category must stay identical');
  assert.ok(oldKinds.has(e.kind));
  assert.ok(e.palette&&Number.isFinite(e.palette.hueRotate));
  assert.ok(e.palette.saturation>=50&&e.palette.saturation<=200);
  assert.ok(e.rhythm.length>=3&&e.rhythm.every(n=>n>=1&&Number.isInteger(n*2)));
  assert.equal(E.findByKey(id+':normal').id,id);
  assert.equal(E.findByKey(id+':elite').elite,true);
  assert.ok(E.baseStats(E.findByKey(id+':normal'),50).maxHp>0);
 }
 for(const id of ['molten_sentinel','silver_duelist'])
  assert.ok(sprites.SUPPORTED.includes(E.byId[id].sprite),'dedicated sprite is reused');
 for(const id of newMonsters)
  assert.notDeepEqual(E.byId[id].rhythm,E.byId[E.byId[id].sprite].rhythm);
});
test('new enemy ids preserve old bestiary records and extend practice unlocks',()=>{
 const old={version:2,seen:{'slime:normal':{encounters:7,firstFloor:1}},defeated:{}};
 const book=E.normalizeBook(old);
 assert.equal(book.seen['slime:normal'].encounters,7);
 const newEnemy=E.encounterForFloor(41,()=>.9);
 assert.equal(E.recordEncounter(book,newEnemy,41),true);
 assert.equal(book.seen['ember_slime:normal'].firstFloor,41);
 assert.equal(E.findByKey('ember_slime:normal').bookKey,'ember_slime:normal');
 assert.equal(E.findByKey('molten_sentinel:elite').bookKey,'molten_sentinel:elite');
});
test('source keeps fight timing unchanged, while deep atmosphere is decorative',()=>{
 const source=fs.readFileSync('assets/game.js','utf8');
 assert.match(source,/VARIANT_MOTIONS\?\.draw\(e\.sprite\|\|e\.id,ctx/);
 assert.match(source,/paintDeepZone\(now,P\.zoneForFloor\(game\.floor\|\|1\)\.scene\)/);
 assert.match(source,/ctx\.filter='hue-rotate\('/);
 assert.match(source,/const PARRY_STARTUP=100/);
 assert.match(source,/getPerfectWindow\(\)\{return \(11\+lvl\('focus'\)\*2\)\*runSkinRules\(\)\.just\}/);
});
