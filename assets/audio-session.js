/* Own the audio context, output buses and reservations on its clock. */
(function(root){
 'use strict';
 const LOOKAHEAD=.17, MAX_STEPS=24, LATE_TOLERANCE=.025, MIN_STEP_LEAD=.002;
 const BGM_GAIN=.35;

 function create({
  createContext,now,defer,random=Math.random,prepare,playStep,devMode=false
 }){
  let context=null,playerBus=null,devBus=null,contacts=[];
  let enabled=true,bgm=100,sfx=100,devVolume=1;
  const score={
   active:false,origin:0,visualOriginPerf:0,beat:60/112,nextStep:0,musicStartStep:0,
   boss:false,theme:0,music:'crypt',bus:null,noise:null,
   get bpm(){return Math.round(60/this.beat)}
  };

  function cancelFutureContacts(){
   const at=context?.currentTime??0;
   for(const sound of contacts){
    if(!sound.ended&&sound.when>at){
     // A context may close before its scheduled sources finish.
     try{sound.cancel()}catch(e){}
    }
   }
   contacts=[];
  }

  function ensureContext(forScore=false){
   try{
    if(context?.state==='closed'){
     // An SE request during combat leaves recovery to the score's clock check.
     if(score.active&&!forScore)return null;
     cancelFutureContacts();
     context=null;score.bus=null;playerBus=null;devBus=null;
    }
    context=context||createContext();
    if(context.state==='suspended'||(forScore&&context.state!=='running'))
     Promise.resolve(context.resume()).catch(()=>{});
    return context;
   }catch(e){return null}
  }

  function effectDestination(){
   if(!playerBus){
    playerBus=context.createGain();
    playerBus.gain.value=enabled?sfx/100:0;
    playerBus.connect(context.destination);
   }
   return playerBus;
  }

  function steelDestination(){
   if(!devMode)return effectDestination();
   if(!devBus){
    devBus=context.createGain();
    devBus.gain.value=devVolume;
    devBus.connect(effectDestination());
   }
   return devBus;
  }

  function setMix(options){
   ({enabled,bgm,sfx}=options);
   if(score.bus)score.bus.gain.setTargetAtTime(enabled?BGM_GAIN*bgm/100:0,context.currentTime,.025);
   if(playerBus)playerBus.gain.setTargetAtTime(enabled?sfx/100:0,context.currentTime,.025);
  }

  function getDevSfxVolume(){return Math.round(devVolume*100)}
  function setDevSfxVolume(percent){
   const value=Number(percent);
   if(Number.isFinite(value)){
    devVolume=Math.max(0,Math.min(100,Math.round(value)))/100;
    if(devBus)devBus.gain.setTargetAtTime(devVolume,context.currentTime,.015);
   }
   return getDevSfxVolume();
  }

  function prepareScore(){
   const ac=ensureContext(true);
   if(!ac)return null;
   try{
    prepare?.(ac);
    if(!score.bus){
     score.bus=ac.createGain();
     score.bus.gain.value=BGM_GAIN*bgm/100;
     score.bus.connect(ac.destination);
    }
    // AudioBuffer can be shared across contexts. Keep the original noise and RNG use.
    if(!score.noise){
     const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*.5),ac.sampleRate);
     const samples=buffer.getChannelData(0);
     for(let i=0;i<samples.length;i++)samples[i]=random()*2-1;
     score.noise=buffer;
    }
    return ac;
   }catch(e){return null}
  }

  function startScore({beat,id,boss,startStep=0}){
   score.beat=beat;
   const ac=prepareScore();
   if(!ac){score.active=false;return false}
   score.active=true;score.boss=boss;score.music=id;score.musicStartStep=startStep;
   score.origin=ac.currentTime+LOOKAHEAD;score.visualOriginPerf=now()+170;
   score.nextStep=0;score.theme++;
   score.bus.gain.cancelScheduledValues(ac.currentTime);
   score.bus.gain.setTargetAtTime(enabled?BGM_GAIN*bgm/100:0,ac.currentTime,.018);
   return true;
  }

  function scheduleScore(){
   if(!score.active||!context||context.state==='suspended')return;
   const at=context.currentTime,until=at+LOOKAHEAD;
   for(let n=0;n<MAX_STEPS;n++){
    const step=score.nextStep,time=score.origin+step*score.beat/2;
    if(!(time<until))break;
    if(time>=at-LATE_TOLERANCE)playStep(context,step,time>at?time:at+MIN_STEP_LEAD);
    score.nextStep++;
   }
  }

  function stopScore(){
   cancelFutureContacts();
   score.active=false;score.nextStep=0;
   if(!score.bus||!context)return;
   const retired=score.bus;
   const disconnect=()=>{try{retired.disconnect?.()}catch(e){}};
   try{
    const at=Number.isFinite(context.currentTime)?context.currentTime:0;
    retired.gain.cancelScheduledValues(at);
    retired.gain.setTargetAtTime(0,at,.025);
   }catch(e){disconnect()}
   score.bus=null;
   defer(disconnect,200);
  }

  function reserveContact(at,play){
   if(!score.active||context?.state!=='running'||!(at<=context.currentTime+LOOKAHEAD))return false;
   // Consumed even when muted or too late. The caller marks the beat exactly once.
   if(enabled&&at>=context.currentTime-LATE_TOLERANCE){
    contacts=contacts.filter(sound=>!sound.ended);
    const sound=play(context,at,steelDestination());
    if(sound)contacts.push(sound);
   }
   return true;
  }

  return Object.freeze({
   get context(){return context},get playerBus(){return playerBus},get devBus(){return devBus},score,
   ensureContext,prepareScore,effectDestination,steelDestination,setMix,getDevSfxVolume,setDevSfxVolume,
   startScore,scheduleScore,stopScore,reserveContact
  });
 }

 const api=Object.freeze({create});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ParryAudioSession=api;
})(typeof window==='undefined'?globalThis:window);
