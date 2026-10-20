'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../assets/combat-sfx');
test('three metal impacts have deterministic finite waveforms, clean boundaries, headroom and different timbres',()=>{
 const outputs=[];
 for(const rate of [44100,48000])for(const [kind,p]of Object.entries(S.PROFILES)){
  const a=S.synthesize(kind,rate),b=S.synthesize(kind,rate);assert.deepEqual(a,b);
  assert.equal(a.length,Math.ceil(p.duration*rate));assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<1e-8);
  let peak=0,energy=0,late=0,early=0;
  for(let i=0;i<a.length;i++){assert.ok(Number.isFinite(a[i]));peak=Math.max(peak,Math.abs(a[i]));energy+=a[i]*a[i];if(i<rate*.04)early+=a[i]*a[i];if(i>a.length*.75)late+=a[i]*a[i];}
  assert.ok(peak<=.881&&peak>.8);assert.ok(energy>1);assert.ok(late<early*.1,'impact dies away without a hard click');
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
});
