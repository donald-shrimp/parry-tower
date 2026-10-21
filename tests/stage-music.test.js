'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const music=require('../assets/stage-music'),P=require('../assets/encounters');
test('eight stage scores match the tower zones, retain the original first ten floors and load before the game in both entrypoints',()=>{
 assert.equal(music.themes.length,8);assert.equal(music.bars,8);assert.equal(music.stepsPerBar,8);
 music.themes.forEach((s,i)=>{
  assert.equal(s.from,i*10+1);assert.equal(s.to,i*10+10);assert.equal(s.zone,P.zoneForFloor(s.from).name);
  assert.ok(s.name&&s.description&&s.instruments);assert.equal(Object.isFrozen(s),true);
 });
 assert.equal(music.get('crypt').original,true);assert.deepEqual(music.step('crypt',0,60/112),[]);
 assert.equal(music.get('__proto__'),null);assert.equal(music.get('toString'),null);
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/devMusic/);
 for(const page of ['index.html','dev.html']){const html=fs.readFileSync(page,'utf8');assert.ok(html.indexOf('assets/stage-music.js')>=0);assert.ok(html.indexOf('assets/stage-music.js')<html.indexOf('assets/game.js'));}
});
test('every candidate loops deterministically on the same beat grid with finite safe voices at all gameplay tempos',()=>{
 const fingerprints=[];
 for(const s of music.themes.filter(s=>!s.original))for(const bpm of [88,100,112,124,136,148])for(const boss of [false,true]){
  const events=[];
  for(let n=0;n<64;n++){
   const row=music.step(s.id,n,60/bpm,boss);assert.deepEqual(row,music.step(s.id,n+64,60/bpm,boss));assert.ok(row.length<=12);
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
  if(bpm===112&&!boss)fingerprints.push(JSON.stringify(events));
 }
 assert.equal(new Set(fingerprints).size,7,'all seven new arrangements differ');
 for(const input of [['missing',0,.5],['forge',-1,.5],['forge',.5,.5],['forge',0,NaN],['forge',0,0]])assert.deepEqual(music.step(...input),[]);
});
