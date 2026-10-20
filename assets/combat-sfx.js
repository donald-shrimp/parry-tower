/* Deterministic metal impacts, rendered once per AudioContext/sample rate. */
(function(root,factory){'use strict';const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.ParryCombatSfx=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const PROFILES=Object.freeze({
  guard:Object.freeze({duration:.16,decay:.033,noise:.52,lowpass:1900,level:.42,
   modes:Object.freeze([219,407,713,1091,1733]),weights:Object.freeze([1,.57,.31,.18,.09])}),
  parry:Object.freeze({duration:.24,decay:.055,noise:.62,lowpass:6500,level:.43,
   modes:Object.freeze([613,1039,1723,2477,3461,4567]),weights:Object.freeze([.7,.62,.41,.27,.16,.10])}),
  just:Object.freeze({duration:.44,decay:.105,noise:.67,lowpass:10000,level:.44,
   modes:Object.freeze([743,1289,2039,2063,3037,4153,5783]),weights:Object.freeze([.49,.54,.43,.24,.31,.21,.11])})
 });
 const cache=new WeakMap();
 function synthesize(kind,sampleRate=48000){
  const p=PROFILES[kind];if(!p||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid metal sound');
  const out=new Float32Array(Math.ceil(p.duration*sampleRate));let seed=0x193a59,low=0,peak=0;
  const cutoff=Math.min(p.lowpass,sampleRate*.4),alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  for(let i=0;i<out.length;i++){
   const t=i/sampleRate,attack=1-Math.exp(-t/.0008),fade=Math.min(1,(out.length-1-i)/(sampleRate*.012));
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const white=(seed>>>0)/2147483648-1;
   low+=alpha*(white-low);
   const transient=low*Math.exp(-t/.006)*p.noise;
   let modes=0;for(let j=0;j<p.modes.length;j++){
    const hz=p.modes[j];if(hz>=sampleRate*.45)continue;
    const decay=p.decay/(1+j*.12),phase=2*Math.PI*hz*(t-.012*(t-.025*(1-Math.exp(-t/.025))));
    modes+=Math.sin(phase)*p.weights[j]*Math.exp(-t/decay);
   }
   out[i]=(transient+modes*.23)*attack*Math.max(0,fade);peak=Math.max(peak,Math.abs(out[i]));
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
