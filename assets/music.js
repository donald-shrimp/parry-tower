/* Shared music catalog and Web Audio rendering for combat and Dev audition. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports){
  module.exports=factory(require('./encounters.js'),require('./stage-music.js'),require('./final-boss-music.js'));
 }else{
  root.ParryMusic=factory(root.ParryEncounters,root.ParryStageMusic,root.ParryFinalBossMusic);
 }
})(typeof window==='undefined'?globalThis:window,function(encounters,stages,royal){
 'use strict';
 const pieces=Object.freeze([...(stages?.themes||[]),...(royal?.pieces||[])]);
 const list=()=>pieces;
 const get=id=>royal?.get(id)||stages?.get(id)||null;

 function forEncounter(floor,enemy){
  const piece=royal?.forEncounter(enemy);
  if(piece)return piece;
  const zone=encounters.zoneForFloor(floor);
  return stages?.themes[encounters.ZONES.indexOf(zone)]||get('crypt');
 }

 function playTone(ac,destination,frequency,duration,volume,at,type='triangle',bend=0){
  if(!ac||!destination)return;
  const oscillator=ac.createOscillator(),gain=ac.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(Math.max(25,frequency),at);
  if(bend)oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,frequency+bend),at+duration*.8);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(destination);
  oscillator.start(at);oscillator.stop(at+duration+.015);
 }

 function playNoise(ac,destination,noiseBuffer,at,duration,volume,cutoff=1800){
  if(!ac||!noiseBuffer)return;
  const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();
  source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(volume,at+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(gain);gain.connect(destination);
  source.start(at);source.stop(at+duration+.01);
 }

 // Cinematic giant-footstep drums: audible impact on small speakers + deep body + short rumble.
 // Four identical hits, slightly accented first. Every layer is scheduled on the same Web Audio beat.
 function playCountIn(ac,destination,noiseBuffer,t,accent=false){
  if(!ac||!destination)return;
  const level=accent?1.12:1;
  // Mid-bass punch (220→92Hz) gives the "DON!" definition that sub-bass alone lacks.
  const punch=ac.createOscillator(),punchGain=ac.createGain();
  punch.type='triangle';
  punch.frequency.setValueAtTime(220,t);
  punch.frequency.exponentialRampToValueAtTime(92,t+.11);
  punchGain.gain.setValueAtTime(.0001,t);
  punchGain.gain.exponentialRampToValueAtTime(.34*level,t+.005);
  punchGain.gain.exponentialRampToValueAtTime(.0001,t+.19);
  punch.connect(punchGain);punchGain.connect(destination);
  punch.start(t);punch.stop(t+.20);
  // Chest-sized boom (135→55Hz) hangs under the sharp stomp without masking the next beat.
  const boom=ac.createOscillator(),boomGain=ac.createGain();
  boom.type='sine';
  boom.frequency.setValueAtTime(135,t);
  boom.frequency.exponentialRampToValueAtTime(55,t+.17);
  boomGain.gain.setValueAtTime(.0001,t);
  boomGain.gain.exponentialRampToValueAtTime(.46*level,t+.014);
  boomGain.gain.exponentialRampToValueAtTime(.0001,t+.35);
  boom.connect(boomGain);boomGain.connect(destination);
  boom.start(t);boom.stop(t+.36);
  if(noiseBuffer){
   // Short midrange crack makes every beat distinguishable on phone speakers.
   const crack=ac.createBufferSource(),crackFilter=ac.createBiquadFilter(),crackGain=ac.createGain();
   crack.buffer=noiseBuffer;crackFilter.type='bandpass';crackFilter.frequency.value=950;
   crackFilter.Q.value=.7;
   crackGain.gain.setValueAtTime(.0001,t);
   crackGain.gain.exponentialRampToValueAtTime(.19*level,t+.004);
   crackGain.gain.exponentialRampToValueAtTime(.0001,t+.07);
   crack.connect(crackFilter);crackFilter.connect(crackGain);crackGain.connect(destination);
   crack.start(t);crack.stop(t+.08);
   // A low, brief dust-cloud tail supplies weight like a huge creature landing.
   const dust=ac.createBufferSource(),dustFilter=ac.createBiquadFilter(),dustGain=ac.createGain();
   dust.buffer=noiseBuffer;dustFilter.type='lowpass';dustFilter.frequency.value=380;
   dustGain.gain.setValueAtTime(.0001,t);
   dustGain.gain.exponentialRampToValueAtTime(.11*level,t+.014);
   dustGain.gain.exponentialRampToValueAtTime(.0001,t+.24);
   dust.connect(dustFilter);dustFilter.connect(dustGain);dustGain.connect(destination);
   dust.start(t);dust.stop(t+.25);
  }
 }

 const NOTES=[73.42,82.41,87.31,98,110,116.54,130.81,146.83,164.81,174.61,196,220,233.08,261.63,293.66,329.63,349.23,392,440,466.16,523.25,587.33];
 function playCrypt(ac,destination,noiseBuffer,step,at,beat,boss){
  const index=step%8,bar=Math.floor(step/8);
  const root=(boss?[0,3,2,5]:[0,5,3,2])[Math.floor(bar/2)%4],low=NOTES[root];
  // Quarter-note drums, eighth-note hats, and offbeat melodic answers.
  if(index%2===0){
   const drum=(step/2)%4;
   playTone(ac,destination,drum===0?140:110,.19,drum===0?.26:.13,at,'sine',-90);
   if(drum===1||drum===3){
    playNoise(ac,destination,noiseBuffer,at,.12,boss?.26:.17,600);
    playTone(ac,destination,155,.075,.06,at,'triangle',-30);
   }
  }
  playNoise(ac,destination,noiseBuffer,at,index%2?.045:.055,index%2?.062:.085,3500);
  if(index===0||index===4)playTone(ac,destination,low,beat*(boss?.86:1.45),boss?.23:.16,at,'sawtooth',-4);
  if((index===2||index===6)&&boss)playTone(ac,destination,low*2,.15,.085,at,'square',-12);
  if(index===3||index===7){
   const melody=(boss?[1,5,7,4]:[3,7,5,9])[bar%4];
   playTone(ac,destination,NOTES[Math.min(NOTES.length-1,root+melody)],beat*.43,boss?.12:.09,at,'triangle',8);
  }
  if(index===0&&bar%2===0){
   playTone(ac,destination,low*4,beat*3.5,.042,at,'sine');
   playTone(ac,destination,low*6,beat*3.5,.025,at,'sine');
  }
  if(boss&&(index===1||index===5))playTone(ac,destination,low*2,.12,.04,at,'sawtooth',-45);
 }

 const BELL_PARTIALS=[[1,1,1],[2.76,.20,.55],[5.4,.065,.25]];
 function playStageEvent(ac,destination,noiseBuffer,event,at){
  if(event.kind==='noise'){
   playNoise(ac,destination,noiseBuffer,at,event.duration,event.volume,event.cutoff);
  }else if(event.kind==='bell'){
   for(const [ratio,level,decay]of BELL_PARTIALS)
    playTone(ac,destination,event.frequency*ratio,event.duration*decay,event.volume*level,at,'sine');
  }else{
   playTone(ac,destination,event.frequency,event.duration,event.volume,at,event.type,event.bend);
  }
 }

 function playArrangement(ac,destination,noiseBuffer,step,at,beat){
  const index=step%8;
  // Offbeat hats and sustained D/A harmony from the first bar.
  if(index%2===1)playNoise(ac,destination,noiseBuffer,at,.035,.045,5200);
  if(index===0){
   playTone(ac,destination,293.66,beat*1.8,.032,at,'sine');
   playTone(ac,destination,440,beat*1.8,.024,at,'sine');
  }
 }

 function playStep(ac,{destination,noiseBuffer,id,step,at,beat,boss=false,latter=false,movement=1,startStep=0,countIn=false,arrangement=false}){
  let musicStep=step;
  if(royal?.get(id)){
   // Lookahead may queue the first downbeat while the count-in is still visible.
   if(step<startStep)return;
   musicStep=step-startStep;
   for(const event of royal.step(id,musicStep,beat,movement))
    royal.play(ac,event,at+event.offset,destination,noiseBuffer);
  }else{
   if(countIn)return;
   if(stages&&id!=='crypt'){
    for(const event of stages.step(id,step,beat,boss,latter))
     playStageEvent(ac,destination,noiseBuffer,event,at+event.offset);
   }else{
    playCrypt(ac,destination,noiseBuffer,step,at,beat,boss);
    if(latter&&stages){for(const event of stages.step('crypt',step,beat,boss,true))playStageEvent(ac,destination,noiseBuffer,event,at+event.offset);}
   }
  }
  if(arrangement)playArrangement(ac,destination,noiseBuffer,musicStep,at,beat);
 }

 return Object.freeze({get,list,forEncounter,playStep,playCountIn,playTone,playNoise});
});
