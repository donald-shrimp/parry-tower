/* Player preferences and tap calibration. Pure data; never owns a clock. */
(function(root){
 'use strict';
 const KEY='parryTowerSettings_v1';
 const DEFAULTS=Object.freeze({bgm:100,sfx:100,shake:true,flash:true});
 const percent=v=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(200,Math.round(v))):100;
 function normalize(raw){return {bgm:percent(raw?.bgm),sfx:percent(raw?.sfx),shake:typeof raw?.shake==='boolean'?raw.shake:true,flash:typeof raw?.flash==='boolean'?raw.flash:true};}
 function median(values){const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
 // Include the established shield startup: the player taps ON the heard beat.
 function recommend(errors,startup=100){
  const values=errors.filter(v=>Number.isFinite(v)&&Math.abs(v)<=240);
  if(values.length<8)return null;
  const center=median(values),deviation=median(values.map(v=>Math.abs(v-center)));
  const stable=values.filter(v=>Math.abs(v-center)<=Math.max(25,deviation*3));
  if(stable.length<8||deviation>60)return null;
  const measured=median(stable)+startup,candidate=Math.max(-180,Math.min(180,Math.round(measured/5)*5));
  return {candidate,count:stable.length,deviation:Math.round(deviation),clamped:Math.abs(measured-candidate)>5};
 }
 const API=Object.freeze({KEY,DEFAULTS,normalize,recommend});
 if(typeof module==='object'&&module.exports)module.exports=API;if(root)root.ParryPlayerSettings=API;
})(typeof window!=='undefined'?window:undefined);
