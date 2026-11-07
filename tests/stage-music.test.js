'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const music=require('../assets/stage-music'),P=require('../assets/encounters');
const catalog=require('../assets/music'),royal=require('../assets/final-boss-music');
test('eight stage scores match the tower zones, retain the original first-half scores and load before the game in both entrypoints',()=>{
 assert.equal(music.themes.length,8);assert.equal(music.bars,8);assert.equal(music.stepsPerBar,8);
 music.themes.forEach((s,i)=>{
  assert.equal(s.from,i*10+1);assert.equal(s.to,i*10+10);assert.equal(s.zone,P.zoneForFloor(s.from).name);
  assert.ok(s.name&&s.description&&s.instruments);assert.equal(Object.isFrozen(s),true);
 });
 assert.equal(music.get('crypt').original,true);assert.deepEqual(music.step('crypt',0,60/112),[]);
 assert.equal(music.get('__proto__'),null);assert.equal(music.get('toString'),null);
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/devMusic/);
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  const entry=html.indexOf('assets/music.js');
  for(const asset of ['encounters','stage-music','final-boss-music']){
   const dependency=html.indexOf('assets/'+asset+'.js');
   assert.ok(dependency>=0&&dependency<entry);
  }
  assert.ok(entry<html.indexOf('assets/game.js'));
 }
});
test('shared catalog lists both score families and gives the royal encounters priority',()=>{
 assert.deepEqual(catalog.list(),[...music.themes,...royal.pieces]);
 for(const theme of music.themes){
  assert.equal(catalog.get(theme.id),theme);
  assert.equal(catalog.forEncounter(theme.from+80),theme);
 }
 for(const [floor,movement,id] of [[75,1,'king-march'],[80,1,'king-awakening'],[80,2,'king-finale']]){
  const enemy={...P.encounterForFloor(floor+80),phase:movement};
  assert.equal(catalog.forEncounter(floor+80,enemy),catalog.get(id));
 }
 assert.equal(catalog.get('__proto__'),null);
});
test('every candidate loops deterministically on the same beat grid with finite safe voices at all gameplay tempos',()=>{
 const fingerprints=[];
 for(const s of music.themes.filter(s=>!s.original))for(const bpm of [88,100,112,124,136,148])for(const boss of [false,true])for(const latter of [false,true]){
  const events=[];
  for(let n=0;n<64;n++){
   const row=music.step(s.id,n,60/bpm,boss,latter);assert.deepEqual(row,music.step(s.id,n+64,60/bpm,boss,latter));assert.ok(row.length<=16);
   let volume=0;
   for(const e of row){
    assert.ok(['tone','bell','noise'].includes(e.kind));assert.ok(Number.isFinite(e.duration)&&e.duration>0&&e.duration<3);
    assert.ok(e.volume>0&&e.volume<.4);assert.ok(e.offset>=0&&Number.isFinite(e.offset));
    assert.ok(e.offset===0||Math.abs(e.offset-30/bpm)<1e-10,'echo lands on the eighth-note grid');
    if(e.kind!=='noise')assert.ok(e.frequency>=25&&e.frequency<=2000);
    else assert.ok(e.cutoff>=100&&e.cutoff<=8000);
    volume+=e.volume*(e.kind==='bell'?1.265:1);
   }
   assert.ok(volume<1.25,'headroom before the existing .35 BGM master');events.push(row);
  }
  assert.ok(events.every((row,i)=>i%2||row.length>0),'the quarter-note pulse remains audible, with rests allowed between beats');
  if(bpm===112&&!boss&&!latter)fingerprints.push(JSON.stringify(events));
 }
 assert.equal(new Set(fingerprints).size,7,'all seven new arrangements differ');
 for(const input of [['missing',0,.5],['forge',-1,.5],['forge',.5,.5],['forge',0,NaN],['forge',0,0]])assert.deepEqual(music.step(...input),[]);
});

// Imported score: 35d8494; unchanged main score: 0764238. These hashes cover
// every note/envelope/offset at four tempos, not the implementation's source text.
test('adopted notes match the audition and preserve every original score and the final area bosses',()=>{
 const {createHash}=require('node:crypto');
 const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 const rows=latter=>music.themes.flatMap(t=>[100,112,136,142].flatMap(bpm=>[false,true].map(boss=>
  Array.from({length:64},(_,n)=>music.step(t.id,n,60/bpm,boss,latter)))));
 assert.equal(hash(rows(false)),'3ae672c11b7655b1f07488a4e287bb0caeadbc8017e8a7b54e6afc6c984627a1');
 assert.equal(hash(rows(true)),'ee432c7006d858ca50300b1243e123ac85f57233aea3f7bc8c6314f37a72f293');
 for(const id of ['astral','void'])for(let n=0;n<64;n++)assert.deepEqual(music.step(id,n,.5,true,true),music.step(id,n,.5,true,false));
});

test('crypt latter backing renders once and royal synthesis ignores the area arrangement flag',()=>{
 const render=(id,latter)=>{
  const calls=[],param=()=>({setValueAtTime(...a){calls.push(['set',...a])},linearRampToValueAtTime(...a){calls.push(['linear',...a])},exponentialRampToValueAtTime(...a){calls.push(['exponential',...a])}});
  const ac={};
  for(const method of ['createOscillator','createGain','createBiquadFilter','createBufferSource','createStereoPanner'])ac[method]=()=>{
   calls.push([method]);return {frequency:param(),gain:param(),pan:{},Q:{},connect(){},disconnect(){},start(...a){calls.push(['start',...a])},stop(...a){calls.push(['stop',...a])}};
  };
  for(let step=0;step<128;step++)catalog.playStep(ac,{id,latter,step,at:2+step*.25,beat:.5,boss:true,destination:{},noiseBuffer:{},arrangement:true});
  return calls;
 };
 for(const id of ['astral','void','king-march','king-awakening','king-finale'])assert.deepEqual(render(id,true),render(id,false),id);
 const calls=render('crypt',true),starts=calls.filter(c=>c[0]==='start').length;
 const expected=Array.from({length:128},(_,n)=>music.step('crypt',n,.5,true,true).reduce((sum,e)=>sum+(e.kind==='bell'?3:1),0)+(n%2?1:0)+(n%8===0?2:0)).reduce((a,b)=>a+b,0);
 assert.equal(starts,expected,'do not layer the old crypt backing on top of the full latter score');
});
