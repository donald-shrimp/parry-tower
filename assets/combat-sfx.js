/* Deterministic metal impacts, rendered once per AudioContext/sample rate. */
(function(root,factory){'use strict';const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.ParryCombatSfx=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const profile=p=>Object.freeze({...p,modes:Object.freeze(p.modes),weights:Object.freeze(p.weights),damping:Object.freeze(p.damping),envelope:Object.freeze(p.envelope.map(Object.freeze))});
 // New waveforms, using only coarse resonance/envelope measurements of the
 // user's references. No reference recording or decoded sample is embedded.
 const PROFILES=Object.freeze({
  guard:profile({duration:.58,speed:1,noise:.55,highpass:180,lowpass:4500,body:400,level:.42,
   modes:[634,834,1410,1594,1993,2038,2254,2427],weights:[.12,.06,.14,.64,.25,.57,.53,.09],damping:[1,3,0,0,5,1,0,4],
   envelope:[[0,0],[.01,.22],[.035,.58],[.065,.88],[.09,1],[.15,.56],[.25,.22],[.4,.04],[.56,0]]}),
  parry:profile({duration:.76,speed:1,noise:.48,highpass:250,lowpass:6000,body:220,level:.43,
   modes:[5691,6575,7161,7705,7446,5788,9398,2949,4503,5080,3405,2079],weights:[.62,.50,.73,.60,.53,.30,.44,.44,.23,.24,.18,.15],damping:[0,0,7,4,6,0,6,8,2,4,0,0],
   envelope:[[0,0],[.008,.12],[.025,.5],[.055,.9],[.08,1],[.14,.74],[.2,.66],[.28,.43],[.4,.18],[.55,.04],[.73,0]]}),
  just:profile({duration:1.2,speed:1.15,noise:.82,highpass:2100,lowpass:12500,body:960,level:.44,
   modes:[3903,6341,3000,4800,8034,4846,1895,5044,4990,4285,3527,4741,1617,1985,10878,5590],weights:[.80,.69,.65,.64,.59,.57,.56,.53,.53,.42,.40,.39,.36,.36,.32,.32],damping:[0,.8,.6,1,.8,.8,1,0,.6,.2,.6,.2,.8,.8,.2,.4],
   envelope:[[0,0],[.003,.78],[.025,1],[.08,.9],[.18,.88],[.3,.77],[.45,.61],[.6,.48],[.72,.25],[.9,.12],[1.1,.025],[1.35,0]]})
 });
 const cache=new WeakMap();
 function synthesize(kind,sampleRate=48000){
  const p=PROFILES[kind];if(!p||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid metal sound');
  const out=new Float32Array(Math.ceil(p.duration*sampleRate));let seed=0x193a59,low=0,filtered=0,slow=0,peak=0,section=0;
  const cutoff=Math.min(p.lowpass,sampleRate*.4),alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  const highAlpha=1-Math.exp(-2*Math.PI*Math.min(p.highpass,sampleRate*.2)/sampleRate);
  const amplitudes=p.weights.slice(),decays=p.damping.map(d=>Math.exp(-d*p.speed/sampleRate));
  for(let i=0;i<out.length;i++){
   const t=i/sampleRate*p.speed,attack=1-Math.exp(-t/.0005),fade=Math.min(1,(out.length-1-i)/(sampleRate*.012));
   while(section<p.envelope.length-2&&t>p.envelope[section+1][0])section++;
   const a=p.envelope[section],b=p.envelope[section+1],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
   const ringEnvelope=a[1]+(b[1]-a[1])*u*u*(3-2*u);
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const white=(seed>>>0)/2147483648-1;
   low+=alpha*(white-low);filtered+=alpha*(low-filtered);slow+=highAlpha*(filtered-slow);
   const crack=Math.exp(-t/.012)+(t>=.006?.30*Math.exp(-(t-.006)/.012):0);
   const scrape=ringEnvelope*Math.exp(-t/.16)*(1+.20*Math.sin(2*Math.PI*173*t));
   const transient=(filtered-slow)*(crack+scrape*.18)*p.noise;
   const rough=.25*Math.exp(-t/.025)*Math.sin(2*Math.PI*83*t);
   let modes=0;for(let j=0;j<p.modes.length;j++){
    const hz=p.modes[j];if(hz*p.speed>=sampleRate*.45)continue;
    const phase=2*Math.PI*hz*t+j*2.399963+rough*(1+j%3);
    modes+=Math.sin(phase)*amplitudes[j];amplitudes[j]*=decays[j];
   }
   // Immediate contact stays on the collision; the measured, irregular steel
   // resonances then bloom and ring. Speed scales both pitch and time for JUST.
   const body=Math.sin(2*Math.PI*p.body*t)*Math.exp(-t/.014);
   out[i]=Math.tanh((transient+modes*ringEnvelope*.37+body*.18)*1.2)*attack*Math.max(0,fade);
   peak=Math.max(peak,Math.abs(out[i]));
  }
  const gain=peak ? .88/peak : 0;for(let i=0;i<out.length;i++)out[i]*=gain;
  return out;
 }
 function bufferFor(ac,kind){
  if(!PROFILES[kind])return null;let sounds=cache.get(ac);if(!sounds){sounds=new Map();cache.set(ac,sounds);}
  if(!sounds.has(kind)){const pcm=synthesize(kind,ac.sampleRate),buffer=ac.createBuffer(1,pcm.length,ac.sampleRate);buffer.getChannelData(0).set(pcm);sounds.set(kind,buffer);}
  return sounds.get(kind);
 }
 function play(ac,kind,when=ac.currentTime,destination=ac.destination){
  const buffer=bufferFor(ac,kind);if(!buffer)return false;
  const t=Math.max(ac.currentTime,when),source=ac.createBufferSource(),gain=ac.createGain();source.buffer=buffer;
  gain.gain.setValueAtTime(PROFILES[kind].level,t);source.connect(gain);gain.connect(destination);
  source.onended=()=>{source.disconnect?.();gain.disconnect?.();};source.start(t);return true;
 }
 function prepare(ac){for(const kind of Object.keys(PROFILES))bufferFor(ac,kind);}
 return Object.freeze({PROFILES,synthesize,bufferFor,play,prepare});
});
