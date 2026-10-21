/* Validate clock mappings; the caller keeps ownership of its AudioContext. */
(function(root){
 'use strict';
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(){
  let previous=null,pair=null,progressAt=null,latency=0,hasLatency=false;
  let source='initial',reason=null,healthy=true,fallbacks=0,pauses=0;
  const events=[];
  function event(kind,why,at){events.push({kind,reason:why,at:Math.round(at)});if(events.length>8)events.shift();}
  function status(next,why,ok,at){
   if(source!==next||reason!==why){
    if(next==='audio'){if(source!=='audio')fallbacks++;event('fallback',why,at);}
    else if(next==='output'&&source==='audio')event('recovered',null,at);
    else if(!ok)event('unavailable',why,at);
   }
   source=next;reason=why;healthy=ok;
  }
  function reset(){previous=null;pair=null;progressAt=null;source='initial';reason=null;healthy=true;}
  function sample({audio,perf,state='running',stamp=null,stampError=false,latencyHint=0}){
   let bad=null;
   if(!finite(audio)||!finite(perf)||audio<0)bad='audio-invalid';
   else if(state!=='running')bad='audio-'+state;
   else if(previous){
    const da=(audio-previous.audio)*1000,dp=perf-previous.perf;
    if(da< -50||dp<0||Math.abs(da-dp)>1000)bad='audio-jump';
   }
   if(!bad){
    if(progressAt===null||!previous||audio>previous.audio)progressAt=perf;
    if(perf-progressAt>1000)bad='audio-stalled';
   }
   if(bad){status('unavailable',bad,false,finite(perf)?perf:0);return {healthy:false,offset:0,source,reason};}
   previous={audio,perf};
   const direct=perf-audio*1000;
   let why=stampError?'timestamp-error':!stamp?'timestamp-unavailable':null;
   if(!why){
    const c=stamp.contextTime,p=stamp.performanceTime;
    if(!finite(c)||!finite(p)||c<=0||p<=0)why='timestamp-invalid';
    else if(c>audio+.05||p>perf+100)why='timestamp-future';
    else {
     const mapped=p-c*1000,lag=mapped-direct;
     if(lag< -100||lag>1500)why='timestamp-range';
     else if(pair&&(c<pair.context-.001||p<pair.perf-1||Math.abs((p-pair.perf)-(c-pair.context)*1000)>80))why='timestamp-drift';
     else if(pair&&audio-pair.audio>.5&&c<=pair.context+.001)why='timestamp-stalled';
     if(!why){
      // Duplicate output samples must not teach the fallback a growing delay.
      if(!pair||c>pair.context+.001){pair={context:c,perf:p,audio};latency=clamp(lag,0,1500);hasLatency=true;}
      status('output',null,true,perf);return {healthy:true,offset:mapped,source,reason};
     }
    }
   }
   status('audio',why,true,perf);
   const delay=hasLatency?latency:finite(latencyHint)?clamp(latencyHint,0,1500):0;
   return {healthy:true,offset:direct+delay,source,reason};
  }
  function paused(at){pauses++;event('pause',reason,at);}
  const snapshot=()=>({source,reason,healthy,fallbacks,pauses,events:events.map(e=>({...e}))});
  return Object.freeze({reset,sample,paused,snapshot});
 }
 const API=Object.freeze({create});
 if(typeof module==='object'&&module.exports)module.exports=API;if(root)root.ParryAudioClock=API;
})(typeof window!=='undefined'?window:undefined);
