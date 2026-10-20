/* Deterministic metal impacts, rendered once per AudioContext/sample rate. */
(function(root,factory){'use strict';const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.ParryCombatSfx=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const PROFILES=Object.freeze({
  guard:Object.freeze({duration:.21,decay:.055,noise:.55,highpass:350,lowpass:4200,scrape:.012,body:180,roughness:.75,level:.42,
   modes:Object.freeze([243,391,657,941,1519,2237,3271,4513]),weights:Object.freeze([.20,.20,.43,.36,.25,.16,.10,.05])}),
  parry:Object.freeze({duration:.27,decay:.075,noise:.65,highpass:600,lowpass:6500,scrape:.023,body:240,roughness:.65,level:.43,
   modes:Object.freeze([463,947,1511,2243,3167,4411,5879,7417]),weights:Object.freeze([.10,.25,.39,.43,.34,.24,.14,.07])}),
  just:Object.freeze({duration:.46,decay:.13,noise:.75,highpass:900,lowpass:9000,scrape:.046,body:280,roughness:.90,level:.44,
   modes:Object.freeze([997,1583,2311,3089,4297,5651,7331,9067]),weights:Object.freeze([.06,.13,.30,.40,.33,.27,.13,.05])})
 });
 const cache=new WeakMap();
 function synthesize(kind,sampleRate=48000){
  const p=PROFILES[kind];if(!p||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid metal sound');
  const out=new Float32Array(Math.ceil(p.duration*sampleRate));let seed=0x193a59,low=0,filtered=0,slow=0,peak=0;
  const cutoff=Math.min(p.lowpass,sampleRate*.4),alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  const highAlpha=1-Math.exp(-2*Math.PI*Math.min(p.highpass,sampleRate*.2)/sampleRate);
  for(let i=0;i<out.length;i++){
   const t=i/sampleRate,attack=1-Math.exp(-t/.00025),fade=Math.min(1,(out.length-1-i)/(sampleRate*.012));
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const white=(seed>>>0)/2147483648-1;
   low+=alpha*(white-low);filtered+=alpha*(low-filtered);slow+=highAlpha*(filtered-slow);
   // Broadband contact, a tiny second collision and a coarse scrape supply the
   // consonant. A low-passed tick followed by a sine sounded like a wood block/bell.
   const crack=Math.exp(-t/.0035)+(t>=.008?.55*Math.exp(-(t-.008)/.005):0);
   const scrape=(1-Math.exp(-t/.002))*Math.exp(-t/p.scrape)*(1+.32*Math.sin(2*Math.PI*173*t));
   const transient=(filtered-slow)*(crack+scrape*.45)*p.noise;
   let modes=0;for(let j=0;j<p.modes.length;j++){
    const hz=p.modes[j];if(hz>=sampleRate*.45)continue;
    const decay=p.decay*(j%3===0?.78:1)/(1+j*.06);
    const phase=2*Math.PI*hz*t+p.roughness*Math.exp(-t/.018)*Math.sin(2*Math.PI*hz*.71*t+j);
    modes+=Math.sin(phase)*p.weights[j]*Math.exp(-t/decay);
   }
   // The low body lasts only a few milliseconds; mid/high, irregular plate modes
   // carry the tail instead of a dominant pitched "pon" or a clean bell note.
   const body=Math.sin(2*Math.PI*p.body*t)*Math.exp(-t/.009);
   out[i]=Math.tanh((transient+modes*.50+body*.20)*1.35)*attack*Math.max(0,fade);
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
 return Object.freeze({PROFILES,synthesize,bufferFor,play});
});
