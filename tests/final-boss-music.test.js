'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),music=require('../assets/final-boss-music');
const score=(id,beat=60/142,movement=1)=>Array.from({length:128},(_,n)=>music.step(id,n,beat,movement));

test('royal scores share the march motif, expand its orchestration, and resolve a deterministic 16-bar loop',()=>{
 assert.deepEqual(music.pieces.map(p=>[p.floor,p.bpm,p.bars]),[[75,136,16],[80,142,16],[80,142,16]]);
 const march=score('king-march'),full=score('king-awakening'),finale=score('king-finale');
 let fragments=0;
 for(let n=0;n<128;n++)for(const e of march[n].filter(e=>e.preset==='brass')){
  assert.ok(full[n].some(f=>f.preset==='brass'&&f.frequency===e.frequency));fragments++;
 }
 assert.ok(fragments>=16);
 assert.ok(full.flat().filter(e=>e.preset==='brass').length>fragments*2);
 assert.ok(finale.flat().filter(e=>e.preset==='strings').length>full.flat().filter(e=>e.preset==='strings').length*1.9);
 assert.deepEqual(score('king-awakening',60/142,2),finale,'second movement changes arrangement on the same clock');
 assert.deepEqual(score('king-march',60/142,2),march,'75F march does not acquire a second movement');
 for(const p of music.pieces)for(let n=0;n<128;n++)assert.deepEqual(music.step(p.id,n,60/p.bpm),music.step(p.id,n+128,60/p.bpm));
 assert.equal(Object.isFrozen(music.pieces[0]),true);
});

test('all score events stay inside their eighth-note cells over the full encounter tempo range',()=>{
 for(const p of music.pieces)for(const bpm of [100,124,136,142,154]){
  const beat=60/bpm;
  for(const events of score(p.id,beat))for(const e of events){
   assert.ok(e.offset>=0&&e.offset<beat/2);
   assert.ok(Number.isFinite(e.duration)&&e.duration>0&&e.duration<=beat*4);
   assert.ok(e.volume>0&&e.volume<=.21);
   if(e.kind==='voice')assert.ok(e.frequency>=30&&e.frequency<1500&&music.voices[e.preset]);
   else assert.ok(['war','snare','cymbal'].includes(e.preset));
  }
 }
 for(const id of ['__proto__','constructor','missing',null]){assert.equal(music.get(id),null);assert.deepEqual(music.step(id,0,.4),[]);}
 for(const n of [-1,NaN,Infinity,.5])assert.deepEqual(music.step('king-march',n,.4),[]);
 for(const beat of [0,-1,NaN,Infinity])assert.deepEqual(music.step('king-march',0,beat),[]);
});

test('shared Web Audio renderer schedules finite envelopes and releases every temporary node',()=>{
 const nodes=[],sources=[],automation=[];
 const param=()=>({value:0,setValueAtTime:record,linearRampToValueAtTime:record,exponentialRampToValueAtTime:record});
 function record(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&time>=2);automation.push([value,time]);}
 function node(extra={}){const n={connect(){},disconnect(){n.disconnected=true;},...extra};nodes.push(n);return n;}
 const ac={createGain:()=>node({gain:param()}),createBiquadFilter:()=>node({frequency:param(),Q:param()}),createStereoPanner:()=>node({pan:param()}),
  createOscillator(){const n=node({frequency:param(),start(t){n.startAt=t;},stop(t){assert.ok(t>n.startAt);}});sources.push(n);return n;},
  createBufferSource(){const n=node({start(t){n.startAt=t;},stop(t){assert.ok(t>n.startAt);}});sources.push(n);return n;}};
 const destination={},noise={};
 const events=score('king-finale').flat();
 for(const e of events)assert.equal(music.play(ac,e,2+e.offset,destination,noise),true);
 assert.ok(automation.length>1000);
 for(const s of sources)s.onended();
 assert.ok(nodes.every(n=>n.disconnected),'oscillators, gains, filters and panners are all disconnected');
 const valid=events.find(e=>e.kind==='voice');
 for(const e of [{...valid,preset:'missing'},{...valid,frequency:NaN},{...valid,volume:0},{...valid,duration:Infinity},{kind:'missing',duration:1,volume:.1}])assert.equal(music.play(ac,e,2,destination,noise),false);
 assert.equal(music.play(ac,{kind:'drum',preset:'snare',duration:.13,volume:.05},2,destination,null),false);
});
