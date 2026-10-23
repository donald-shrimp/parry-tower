'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),music=require('../assets/final-boss-music');
const score=(id,beat=60/142,movement=1)=>Array.from({length:128},(_,n)=>music.step(id,n,beat,movement));

test('royal music follows actual endking variants across tower cycles and training',()=>{
 const P=require('../assets/encounters');
 for(const cycle of [0,80,160]){
  assert.equal(music.forEncounter(P.encounterForFloor(75+cycle)).id,'king-march');
  const final=P.encounterForFloor(80+cycle);
  assert.equal(music.forEncounter(final).id,'king-awakening');
  assert.equal(music.forEncounter({...final,phase:2}).id,'king-finale');
  assert.equal(music.forEncounter({...P.encounterForFloor(75+cycle),phase:2}).id,'king-march');
 }
 for(const e of P.all.filter(e=>!e.finalBoss))assert.equal(music.forEncounter(e),null);
 assert.equal(music.forEncounter(null),null);
 for(const page of ['index.html','dev.html']){
  const html=require('node:fs').readFileSync(page,'utf8');
  assert.ok(html.indexOf('assets/final-boss-music.js')>=0);
  assert.ok(html.indexOf('assets/final-boss-music.js')<html.indexOf('assets/game.js'));
 }
});

test('approved march and awakening remain exactly the same scores',()=>{
 const hash=require('node:crypto').createHash;
 for(const [id,expected]of [
  ['king-march','b470fe523f78f812a01528b59f2c7a8a2ab42dbff55cffacefa7a0bcbbe35563'],
  ['king-awakening','efb7e3e43a20d66ff096e158d9445135c2feed367674e8b1d0f2966a045b1ddf']
 ])assert.equal(hash('sha256').update(JSON.stringify(score(id))).digest('hex'),expected,id);
});

test('second movement changes the lead and harmony, uses count-in drums, and opens space before its last phrase',()=>{
 const first=score('king-awakening'),second=score('king-finale');
 const lead=part=>part.flat().filter(e=>e.preset==='brass').map(e=>e.frequency);
 assert.ok(Math.max(...lead(second))>Math.max(...lead(first))*1.4,'new brass phrase rises beyond the original register');
 assert.notDeepEqual(lead(second.slice(0,32)),lead(second.slice(64,96)),'middle passage develops a different lead');
 const chords=part=>part.filter((_,n)=>n%8===0).map(events=>events.filter(e=>e.preset==='organ').map(e=>e.frequency));
 assert.notDeepEqual(chords(first),chords(second),'harmonic rhythm also develops');
 assert.ok(second[0].some(e=>e.preset==='stomp'));
 for(const n of [0,2,4,6])assert.ok(second[n].some(e=>e.preset==='stomp'),'opening recalls four count-in blows');
 assert.equal(first.flat().some(e=>e.preset==='stomp'),false);
 const bridge=second.slice(64,80).flat().filter(e=>e.preset==='stomp');
 const climax=second.slice(96,112).flat().filter(e=>e.preset==='stomp');
 assert.ok(climax.length>bridge.length,'low middle passage leaves room for the final return');
});

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
   else assert.ok(['war','snare','cymbal','stomp'].includes(e.preset));
  }
 }
 for(const id of ['__proto__','constructor','missing',null]){assert.equal(music.get(id),null);assert.deepEqual(music.step(id,0,.4),[]);}
 for(const n of [-1,NaN,Infinity,.5])assert.deepEqual(music.step('king-march',n,.4),[]);
 for(const beat of [0,-1,NaN,Infinity])assert.deepEqual(music.step('king-march',0,beat),[]);
});

test('stomp keeps the actual count-in punch, boom and noise envelopes at a lower music mix',()=>{
 const oscillators=[],noises=[],gains=[],automations=[];
 const param=()=>({value:0,setValueAtTime(v,t){automations.push(['set',v,t]);},exponentialRampToValueAtTime(v,t){automations.push(['ramp',v,t]);}});
 const ac={createGain(){const n={gain:param(),connect(){},disconnect(){}};gains.push(n);return n;},
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){},stop(t){n.stopAt=t;}};oscillators.push(n);return n;},
  createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(t){n.stopAt=t;}};noises.push(n);return n;},
  createBiquadFilter(){return {frequency:param(),Q:param(),connect(){},disconnect(){}};}};
 assert.equal(music.play(ac,{kind:'drum',preset:'stomp',duration:.36,volume:.17},2,{},{}),true);
 assert.deepEqual(oscillators.map(n=>n.type),['triangle','sine']);assert.equal(noises.length,2);
 for(const [value,t]of [[220,2],[92,2.11],[135,2],[55,2.17],[.17,2.005],[.23,2.014],[.095,2.004],[.055,2.014]]){
  assert.ok(automations.some(([,v,at])=>Math.abs(v-value)<1e-10&&Math.abs(at-t)<1e-10),value+' at '+t);
 }
 assert.deepEqual(oscillators.map(n=>n.stopAt),[2.20,2.36]);
 assert.deepEqual(noises.map(n=>n.stopAt),[2.08,2.25]);
 for(const source of [...oscillators,...noises])source.onended();
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
