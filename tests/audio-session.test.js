'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../assets/audio-session.js');

function fixture(options={}){
 const contexts=[],timers=[];
 let samples=0;
 const audio=create({
  createContext(){
   const ac={
    state:'running',currentTime:1,sampleRate:8,resumes:0,
    resume(){ac.resumes++;return Promise.reject(new Error('user activation required'));},
    createBuffer(_channels,length){
     const data=new Float32Array(length);
     return {getChannelData:()=>data};
    },
    createGain(){
     return {
      owner:ac,destination:null,disconnected:0,
      gain:{value:0,cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}},
      connect(destination){assert.equal(destination.owner,ac,'no cross-context connections');this.destination=destination;},
      disconnect(){this.disconnected++;}
     };
    }
   };
   ac.destination={owner:ac};contexts.push(ac);
   return ac;
  },
  now:()=>1000,defer:(callback,delay)=>timers.push({callback,delay}),
  random:()=>{samples++;return .5},playStep(){},devMode:true,...options
 });
 const start=()=>audio.startScore({beat:.5,id:'crypt',boss:false});
 return {audio,contexts,timers,start,samples:()=>samples};
}

test('a closed context waits for combat recovery, then reconnects all buses with the current mix',()=>{
 const {audio,contexts,start,samples}=fixture({prepare:ac=>{ac.currentTime=2}});
 audio.setMix({enabled:true,bgm:80,sfx:40});audio.setDevSfxVolume(27);
 const first=audio.ensureContext();
 assert.equal(samples(),0,'SE-only access does not prepare BGM');
 assert.equal(audio.score.bus,null);
 const oldSteel=audio.steelDestination(),oldPlayer=audio.playerBus;
 assert.equal(start(),true);
 assert.equal(audio.score.origin,2+.17,'warmup completes before reading the origin');
 const oldMusic=audio.score.bus,noise=audio.score.noise;
 assert.equal(samples(),4);
 first.state='closed';
 assert.equal(audio.ensureContext(),null,'SE must not replace the clock of an active score');
 assert.equal(audio.context,first);
 audio.stopScore();
 assert.equal(start(),true);
 const second=contexts[1];
 assert.notEqual(audio.context,first);
 assert.equal(audio.context,second);
 assert.equal(audio.score.noise,noise);
 assert.equal(samples(),4,'recovery does not change the noise or random stream');
 assert.notEqual(audio.score.bus,oldMusic);
 assert.equal(audio.score.bus.destination,second.destination);
 const steel=audio.steelDestination();
 assert.notEqual(steel,oldSteel);
 assert.notEqual(audio.playerBus,oldPlayer);
 assert.equal(steel.destination,audio.playerBus);
 assert.equal(audio.playerBus.destination,second.destination);
 assert.equal(steel.gain.value,.27);
 assert.equal(audio.playerBus.gain.value,.4);
 assert.equal(audio.score.bus.gain.value,.35*80/100);
});

test('a rejected resume is handled and a later score can recover',async()=>{
 const {audio,start}=fixture();
 const ac=audio.ensureContext();
 ac.state='suspended';
 assert.equal(start(),true);
 assert.equal(ac.resumes,1);
 await new Promise(resolve=>setImmediate(resolve));
 ac.state='running';
 assert.equal(start(),true);
 assert.equal(audio.context,ac);
 assert.equal(ac.resumes,1);
});

test('rapid stop and restart retires only the bus captured by each fade timer',()=>{
 const {audio,start,timers}=fixture();
 const buses=[];
 for(let i=0;i<2;i++){
  assert.equal(start(),true);
  const bus=audio.score.bus;buses.push(bus);
  audio.stopScore();audio.stopScore();
  assert.equal(audio.score.bus,null);
  assert.equal(bus.gain.value,0);
 }
 assert.equal(start(),true);
 const current=audio.score.bus;
 assert.deepEqual(timers.map(t=>t.delay),[200,200]);
 for(const {callback} of timers.reverse())callback();
 assert.deepEqual(buses.map(bus=>bus.disconnected),[1,1]);
 assert.equal(audio.score.bus,current);
 assert.equal(current.disconnected,0);
 assert.equal(current.gain.value,.35);
});

test('contact reservations consume muted hits and cancel only future unfinished sounds',()=>{
 const {audio,start}=fixture();start();
 const sounds=[];
 const play=(_ac,at)=>{const sound={when:at,ended:false,cancel(){this.cancelled=true;}};sounds.push(sound);return sound;};
 assert.equal(audio.reserveContact(1.2,play),false);
 for(const at of [.99,1,1.05,1.1])assert.equal(audio.reserveContact(at,play),true);
 sounds[3].ended=true;
 audio.setMix({enabled:false,bgm:100,sfx:100});
 assert.equal(audio.reserveContact(1.15,play),true);
 assert.equal(sounds.length,4);
 audio.stopScore();
 assert.deepEqual(sounds.filter(sound=>sound.cancelled).map(sound=>sound.when),[1.05]);
});
