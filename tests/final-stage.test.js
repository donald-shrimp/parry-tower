'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../assets/encounters.js');
const R=require('../assets/routes.js');
const sprites=require('../assets/enemy-motions.js');
const fs=require('node:fs');

const regular=['star_cantor','orbital_clockwork','void_knight','last_assassin'];
const finalBosses=['star_warden','endking'];

test('61–80F contain two ten-floor zones, with ending at 80F and endless loop at 81F',()=>{
 assert.equal(E.ZONES.length,8);
 assert.equal(E.zoneForFloor(61).name,'星詠みの観測所');
 assert.equal(E.zoneForFloor(70).scene,'astral');
 assert.equal(E.zoneForFloor(71).name,'虚無の天蓋');
 assert.equal(E.zoneForFloor(80).scene,'void');
 assert.equal(E.zoneForFloor(81).name,E.zoneForFloor(1).name);
 assert.equal(E.zoneForFloor(141).name,E.zoneForFloor(61).name);
 assert.equal(E.zoneForFloor(151).name,E.zoneForFloor(71).name);
 assert.equal(E.zoneForFloor(161).name,E.zoneForFloor(1).name);
 for(const [start,boss] of [[61,'star_warden'],[71,'endking']]){
  assert.equal(E.encounterForFloor(start+4,()=>.99).id,boss);
  assert.equal(E.encounterForFloor(start+9,()=>.99).id,boss);
  assert.equal(E.encounterForFloor(start+9,()=>.99).elite,true);
  assert.equal(E.encounterForFloor(start+8,()=>.99).elite,true);
  assert.equal(R.branchKind(start+3),'first');
  assert.equal(R.branchKind(start+7),'second');
  assert.equal(R.branchKind(start+4),null);
  assert.equal(R.branchKind(start+9),null);
 }
});
test('all late-game monsters are visually derived from original sprites but have new score patterns',()=>{
 assert.equal(E.monsters.length,16);assert.equal(E.bosses.length,8);
 assert.equal(E.codexEntries().length,50);
 for(const id of [...regular,...finalBosses]){
  const e=E.byId[id],base=E.byId[e.sprite];
  assert.ok(base&&e.palette,id+' must have color variant');
  assert.equal(e.kind,base.kind);
  assert.notDeepEqual(e.rhythm,base.rhythm,id+' keeps a fresh rhythm');
  assert.ok(e.rhythm.every(n=>n>=1&&Number.isInteger(n*2)));
  assert.equal(E.findByKey(id+':normal').id,id);
  assert.equal(E.findByKey(id+':elite').elite,true);
 }
 for(const id of ['star_cantor','orbital_clockwork'])
  assert.ok(sprites.SUPPORTED.includes(E.byId[id].sprite),id+' draws dedicated sprite');
 assert.equal(E.byId.endking.finalBoss,true);
 assert.deepEqual(E.byId.endking.phaseRhythm,[1.5,1.5,2,1,2,2]);
 const a=E.buildEnemy(E.byId.endking);
 a.phaseRhythm.push(99);
 assert.equal(E.byId.endking.phaseRhythm.length,6,'individual fights never mutate source phrase');
});
test('bestiary migrates unchanged, 80F enemies unlock dojo on encounter',()=>{
 const book=E.normalizeBook({version:2,seen:{'silver_duelist:normal':{encounters:2,firstFloor:52}},defeated:{}});
 assert.equal(book.seen['silver_duelist:normal'].encounters,2);
 const e=E.encounterForFloor(80);
 assert.equal(e.bookKey,'endking:elite');
 E.recordEncounter(book,e,80);
 assert.equal(book.seen[e.bookKey].firstFloor,80);
 assert.equal(E.findByKey('endking:elite').id,'endking');
});
test('61F high-floor difficulty grows slower than the old exponential, without changing 1–60F stats',()=>{
 function hpOld(f){return Math.pow(1.18,Math.min(f-1,9))*Math.pow(1.075,Math.max(0,f-10));}
 function atkOld(f){return Math.pow(1.09,Math.min(f-1,9))*Math.pow(1.045,Math.max(0,f-10));}
 const def=E.buildEnemy(E.byId.knight);
 for(const f of [1,10,11,40,41,51,60]){
  assert.equal(E.baseStats(def,f).maxHp,Math.round(49*hpOld(f)),String(f)+' HP preserved');
  assert.equal(E.baseStats(def,f).atk,Math.max(13,Math.round(14*atkOld(f))),String(f)+' attack preserved');
 }
 const h60=E.baseStats(def,60);
 const h61=E.baseStats(def,61);
 const h80=E.baseStats(def,80);
 assert.equal(h61.maxHp,Math.round(49*hpOld(60)*1.035));
 assert.equal(h61.atk,Math.round(14*atkOld(60)*1.012));
 assert.ok(h80.maxHp<h60.maxHp*2,'soft HP ramp');
 assert.ok(h80.atk<h60.atk*1.4,'soft attack ramp');
 assert.ok(h80.maxHp>h60.maxHp,'still increases at 80F');
});
test('new backgrounds are cosmetic, and the finale count-in restarts its shared Web Audio clock safely',()=>{
 const js=fs.readFileSync('assets/game.js','utf8');
 assert.match(js,/scene==='astral'/);
 assert.match(js,/scene==='void'/);
 assert.match(js,/e\.phase===1&&e\.phaseRhythm&&e\.hp>0/);
 assert.match(js,/e\.rhythm=\[\.\.\.e\.phaseRhythm\];e\.index=0/);
 assert.match(js,/game\.attackBeat\+=beats;game\.attackSpan=beats\*score\.beat\*1000;syncAttackClock\(\)/);
 assert.match(js,/game\.mode==='phase'/);
 assert.match(js,/for\(let i=0;i<FINAL_PHASE_COUNT_BEATS;i\+\+\)/);
 assert.match(js,/scoreTone\(i===0\?784:523/);
 assert.match(js,/game\.attackBeat=FINAL_PHASE_COUNT_BEATS\*2/);
 assert.match(js,/game\.finalClear=!game\.practice&&game\.floor===80&&defeated\.id==='endking'/);
});

test('only the 80F Endking has 35% extra HP; the 75F foe and other 80F enemies are unchanged',()=>{
 const e=E.encounterForFloor(80);
 const normal=E.encounterForFloor(75);
 const oldProfile={...e,finalBoss:false};
 const baseline=E.baseStats(oldProfile,80),enhanced=E.baseStats(e,80);
 assert.equal(e.id,'endking');assert.equal(e.elite,true);
 assert.ok(enhanced.maxHp>=Math.floor(baseline.maxHp*1.349));
 assert.ok(enhanced.maxHp<=Math.ceil(baseline.maxHp*1.351));
 assert.equal(enhanced.atk,baseline.atk);
 assert.equal(E.baseStats(normal,75).maxHp,E.baseStats({...normal,finalBoss:false},75).maxHp);
 assert.equal(E.baseStats(E.buildEnemy(E.byId.star_warden),80).maxHp,
  E.baseStats({...E.buildEnemy(E.byId.star_warden),finalBoss:false},80).maxHp);
 assert.equal(E.baseStats(e,80,true).maxHp,E.baseStats(oldProfile,80,true).maxHp,
  'practice stats remain unscaled');
});

test('interlude canvas is effect-only, then a single title over 4 beats, never a full-screen prompt',()=>{
 const js=fs.readFileSync('assets/game.js','utf8');
 const visual=js.split('function drawFinalPhase(now){')[1]?.split('function drawScreen(now){')[0];
 assert.ok(visual,'visual transition renderer exists');
 assert.doesNotMatch(visual,/ゴゴゴゴ|リズムを取れ|count>0\?String\(count\)|textDraw\(count/);
 assert.doesNotMatch(visual,/ctx\.fillStyle=rumble\?|ctx\.fillStyle='#120c29/);
 assert.match(visual,/if\(game\.phaseStage==='rumble'\)/);
 assert.match(visual,/else if\(game\.phaseStage==='countin'\)/);
 assert.equal((visual.match(/textDraw\('/g)||[]).length,1,'only the second-movement title is rendered');
 assert.match(visual,/textDraw\('第二楽章',w\*\.5,h\*\.35/);
 assert.match(js,/game\.nextFloorHint='';\s*game\.nextFloorHintAt=-99999;/);
});
