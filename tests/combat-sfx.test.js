'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../assets/combat-sfx');
test('adopted defense gains equal the user-selected 25 percent of the reviewed production baseline',()=>{
 const old={guard:.294,parry:.301,just:.2464},levels=[];
 const ac={sampleRate:8000,currentTime:10,destination:{},
  createBuffer(ch,n){return{getChannelData:()=>new Float32Array(n)}},
  createBufferSource(){return{connect(){},start(){}}},
  createGain(){return{gain:{setValueAtTime(value){levels.push(value)}},connect(){}}}};
 for(const kind of ['guard','parry','just']){
  assert.equal(S.PROFILES[kind].level,old[kind]*.25);assert.equal(S.play(ac,kind),true);
 }
 assert.deepEqual(levels,[.0735,.07525,.0616]);
});
test('three metal impacts have deterministic finite waveforms, clean boundaries, headroom and different timbres',()=>{
 const outputs=[];
 for(const rate of [44100,48000])for(const [kind,p]of Object.entries(S.PROFILES)){
  const a=S.synthesize(kind,rate),b=S.synthesize(kind,rate);assert.deepEqual(a,b);
  assert.equal(a.length,Math.ceil(p.duration*rate));assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<1e-8);
  let peak=0,energy=0,late=0,early=0;
  for(let i=0;i<a.length;i++){assert.ok(Number.isFinite(a[i]));peak=Math.max(peak,Math.abs(a[i]));energy+=a[i]*a[i];if(i<rate*.04)early+=a[i]*a[i];if(i>a.length*.75)late+=a[i]*a[i];}
  assert.ok(peak<=.881&&peak>(kind==='just'?.25:.8));assert.ok(energy>1);assert.ok(late<early*.1,'impact dies away without a hard click');
  outputs.push(Buffer.from(a.buffer));
 }
 assert.notDeepEqual(outputs[0],outputs[1]);assert.notDeepEqual(outputs[1],outputs[2]);
 assert.ok(S.PROFILES.just.duration>S.PROFILES.parry.duration&&S.PROFILES.parry.duration>S.PROFILES.guard.duration);
 assert.throws(()=>S.synthesize('miss'));assert.throws(()=>S.synthesize('guard',1));
});
test('metal samples are cached per audio context and scheduled once without modifying the BGM clock',()=>{
 let made=0;const starts=[],disconnects=[],dest={};
 const ac={sampleRate:48000,currentTime:10,destination:dest,
  createBuffer(ch,n,rate){made++;return{n,rate,getChannelData:()=>new Float32Array(n)};},
  createBufferSource(){const src={connect(){},disconnect(){disconnects.push('source')},start(t){starts.push({t,src})}};return src;},
  createGain(){return{gain:{setValueAtTime(v,t){assert.ok(v>0&&v<1);assert.ok(t>=10);}},connect(d){assert.equal(d,dest)},disconnect(){disconnects.push('gain')}};}};
 assert.equal(S.play(ac,'guard',10.003),true);assert.equal(S.play(ac,'guard',9),true);
 assert.equal(made,1);assert.deepEqual(starts.map(x=>x.t),[10.003,10]);assert.equal(ac.currentTime,10);
 assert.equal(S.play(ac,'parry',10.1),true);assert.equal(S.play(ac,'just',10.2),true);assert.equal(made,3);
 assert.equal(S.play(ac,'miss'),false);assert.equal(starts.length,4);
 starts[0].src.onended();assert.deepEqual(disconnects,['source','gain']);
 S.prepare(ac);assert.equal(made,3);assert.equal(starts.length,4,'warmup never plays a sound');
 let freshMade=0;const other={...ac,createBuffer(ch,n,rate){freshMade++;return{getChannelData:()=>new Float32Array(n)};}};
 S.prepare(other);S.prepare(other);assert.equal(freshMade,3,'each context prepares all sounds only once');
 assert.equal(starts.length,4);assert.equal(other.currentTime,10);
});

test('reference-like steel rings after the immediate contact instead of ending as a short pitched tick',()=>{
 const rate=48000,energy=(a,start,end)=>{let sum=0;for(let i=Math.floor(start*rate);i<Math.min(a.length,end*rate);i++)sum+=a[i]*a[i];return sum;};
 for(const kind of ['guard','parry','just']){
  const a=S.synthesize(kind,rate);assert.ok(energy(a,0,.005)>.001,kind+' has immediate contact');
  assert.ok(energy(a,.08,.30)>energy(a,0,.04),kind+' keeps its irregular metal ring after the initial hit');
 }
 const a=S.synthesize('just',rate);assert.ok(energy(a,.2,.45)>energy(a,0,.04)*.5,'JUST still has a recognizable steel tail');
 assert.ok(energy(a,.6,.85)<energy(a,.08,.3)*.04,'late JUST ring fades instead of sustaining a whistle');
});

test('neutral contact and result tails use one audio time, skip the attack and cancel queued contacts',()=>{
 const starts=[],levels=[];let made=0;
 const ac={sampleRate:48000,currentTime:10,destination:{},
  createBuffer(ch,n){made++;const data=new Float32Array(n);return{getChannelData:()=>data};},
  createBufferSource(){const s={connect(){},disconnect(){},start(when,offset){starts.push({s,when,offset});},stop(when){s.stoppedAt=when;}};return s;},
  createGain(){return{gain:{setValueAtTime(v,t){levels.push([v,t]);},linearRampToValueAtTime(v,t){levels.push([v,t]);},cancelScheduledValues(){}},connect(){},disconnect(){}};}};
 const contact=S.playContact(ac,10.1);assert.equal(starts[0].when,10.1);assert.equal(starts[0].offset,0);
 const pcm=starts[0].s.buffer.getChannelData(0);assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
 assert.ok(pcm.every(Number.isFinite));assert.ok(pcm.some(x=>Math.abs(x)>.3));assert.ok(pcm.every(x=>Math.abs(x)<1));
 contact.cancel();assert.equal(starts[0].s.stoppedAt,10);
 S.playContact(ac,10.2);assert.equal(made,1,'same neutral waveform is cached');
 S.playTail(ac,'just',10);assert.equal(starts.at(-1).when,10.04);assert.ok(Math.abs(starts.at(-1).offset-.04)<1e-8);
 ac.currentTime=10.093;S.playTail(ac,'guard',10);
 assert.equal(starts.at(-1).when,10.093);assert.ok(Math.abs(starts.at(-1).offset-.093)<1e-8);
 assert.equal(S.playTail(ac,'miss',10),false);
 ac.currentTime=12;assert.equal(S.playTail(ac,'guard',10),false,'do not restart an expired tail');
 assert.ok(levels.some(([v])=>v===.0735*.4));
 starts[0].s.onended();assert.equal(contact.ended,true);
});
