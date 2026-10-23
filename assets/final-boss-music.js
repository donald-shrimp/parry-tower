/* Dev compositions. Pure eighth-note scores + a renderer using the caller's
 * AudioContext/bus; no clock, random calls, saved state or automatic selection. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ParryFinalBossMusic=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 const pieces=freeze([
  {id:'king-march',name:'王の行進',from:75,to:75,floor:75,bpm:136,bars:16,preview:true,level:0,color:'#d8b171',zone:'75階・前哨戦の試作',
   description:'低い金管が王の旋律を断片的に告げ、太鼓と行進のスネアが進む。力を抑えた、重々しい前哨戦。',
   instruments:'低音金管・大太鼓・行進スネア・低いオルガン'},
  {id:'king-awakening',name:'終王の覚醒',from:80,to:80,floor:80,bpm:142,bars:16,preview:true,level:1,color:'#dd9b9f',zone:'80階・第一楽章の試作',
   description:'75階と同じ旋律が完成形で現れる。金管の主題、刻む低音弦、厚い和音と太鼓で、最初から本気の最終決戦。',
   instruments:'重奏金管・低音弦の刻み・オルガン・大太鼓・シンバル'},
  {id:'king-finale',name:'終王の覚醒 — 第二楽章',from:80,to:80,floor:80,bpm:142,bars:16,preview:true,level:2,color:'#edb3df',zone:'80階・第二楽章の試作',
   description:'BPMは第一楽章と同じ。弦の刻みを細かくし、上声の対旋律と太鼓のフィルで最後まで追い込む。',
   instruments:'重奏金管・16分の低音弦・対旋律・オルガン・連打太鼓'}
 ]);
 const byId=Object.freeze(Object.fromEntries(pieces.map(p=>[p.id,p])));
 const get=id=>Object.hasOwn(byId,id)?byId[id]:null;
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 // D harmonic minor: the same cadence (D–A–Bb–C#–D) links both encounters.
 const roots=freeze([0,0,8,8,5,5,7,7,0,3,8,7,5,8,7,7]);
 const chords=freeze({0:[0,3,7],3:[3,7,10],5:[5,8,12],7:[7,11,14,17],8:[8,12,15]});
 // [eighth-note onset, semitones above D2, duration in quarter-note beats].
 const motif=freeze([
  [[0,24,1.5],[3,19,.5],[4,20,1],[6,23,1]],
  [[0,24,2],[4,31,1],[6,29,1]],
  [[0,27,1.5],[3,26,.5],[4,24,1],[6,20,1]],
  [[0,23,2.5],[5,19,.5],[6,23,1]],
  [[0,29,1.5],[3,27,.5],[4,26,1],[6,24,1]],
  [[0,27,1],[2,29,1],[4,32,1],[6,31,1]],
  [[0,31,1.5],[3,29,.5],[4,26,1],[6,23,1]],
  [[0,23,2],[4,26,1],[6,23,1]]
 ]);
 const answers=freeze({0:[31,29,27,26],3:[36,34,31,29],5:[32,31,29,27],7:[35,31,29,26],8:[39,38,36,32]});
 function step(id,n,beat,movement=1){
  const p=get(id);if(!p||!Number.isInteger(n)||n<0||!Number.isFinite(beat)||beat<=0)return [];
  n%=p.bars*8;
  const ix=n%8,bar=Math.floor(n/8),root=roots[bar],chord=chords[root],level=p.level===1&&movement>=2?2:p.level,out=[];
  const voice=(preset,midi,beats,volume,pan=0,offset=0)=>out.push({kind:'voice',preset,frequency:hz(midi),duration:beat*beats,volume,pan,offset});
  const drum=(preset,volume,offset=0)=>out.push({kind:'drum',preset,duration:preset==='cymbal'?.7:preset==='snare'?.13:.30,volume,pan:0,offset});
  // March has a spacious half-time weight. The full score fills every quarter.
  if((level===0?[0,4]:[0,2,4,6]).includes(ix))drum('war',ix===0?.205:.14);
  if(ix===2||ix===6)drum('snare',level===0?.065:.075);
  if((bar%4===3||level===2&&bar%2===1)&&ix===7){
   drum('snare',.040);if(level===2)drum('snare',.033,beat*.25);
  }
  if(ix===0&&bar%(level===0?8:2)===0)drum('cymbal',level===0?.022:.033);
  if(ix===0||ix===4)voice('bass',38+root,1.8,.066,0);
  if(ix===0){
   // A low, sustained foundation; thicker arrangements do not simply turn it up.
   for(let i=0;i<3;i++)voice('organ',50+chord[i],3.8,.014,(i-1)*.25);
  }
  if(level>0){
   const arp=[0,2,1,2,0,2,1,2],note=50+chord[arp[ix]];
   voice('strings',note,level===2?.36:.73,level===2?.023:.032,-.28);
   if(level===2)voice('strings',50+chord[arp[(ix+1)%8]],.36,.019,.28,beat*.25);
  }
  const phrase=motif[bar%8];
  for(let i=0;i<phrase.length;i++){
   const [onset,pitch,length]=phrase[i];
   // Only fragments at 75F; exactly those pitches return in the full melody.
   if(ix!==onset||level===0&&(bar%2===1||i!==0&&i!==phrase.length-1))continue;
   voice('brass',38+pitch,length*(level===0?.85:.93),level===0?.047:.060,.05);
   if(level===2&&bar>=8)voice('strings',50+pitch,length*.9,.015,-.12);
  }
  if(level===2&&ix%2===1){
   voice('choir',38+answers[root][Math.floor(ix/2)],.9,.020,.30);
  }
  // The last bars pull toward the leading tone, then resolve into the loop's D.
  if(level>0&&bar%8===7&&(ix===4||ix===6))drum('war',.10);
  return out;
 }
 const VOICES=freeze({
  bass:{layers:[['triangle',1,0,.8],['sine',.5,0,.2]],cutoff:600,attack:.015,sustain:.65},
  brass:{layers:[['sawtooth',1,-4,.38],['sawtooth',1,4,.38],['triangle',2,0,.24]],cutoff:2000,attack:.035,sustain:.72},
  strings:{layers:[['sawtooth',1,-6,.5],['sawtooth',1,6,.5]],cutoff:1650,attack:.025,sustain:.65},
  organ:{layers:[['sine',1,0,.56],['sine',2,0,.27],['triangle',3,0,.17]],cutoff:1350,attack:.07,sustain:.80},
  choir:{layers:[['triangle',1,-3,.65],['sine',2,3,.25],['sine',3,0,.10]],cutoff:1800,attack:.065,sustain:.64}
 });
 function play(ac,event,at,destination,noiseBuffer){
  if(!ac||!destination||!event||!Number.isFinite(at)||!Number.isFinite(event.duration)||event.duration<=0||!Number.isFinite(event.volume)||event.volume<=0)return false;
  const d=event.duration,end=at+d,level=event.volume;
  if(event.kind==='voice'){
   const spec=VOICES[event.preset];if(!spec||!Number.isFinite(event.frequency)||event.frequency<=0)return false;
   const gain=ac.createGain(),filter=ac.createBiquadFilter(),attack=Math.min(spec.attack,d*.25);
   filter.type='lowpass';filter.Q.value=.55;
   const cutoff=Math.min(spec.cutoff,Math.max(500,event.frequency*7));
   filter.frequency.setValueAtTime(cutoff*.55,at);
   filter.frequency.linearRampToValueAtTime(cutoff,at+attack);
   filter.frequency.linearRampToValueAtTime(cutoff*.65,end);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.linearRampToValueAtTime(level,at+attack);
   gain.gain.linearRampToValueAtTime(level*spec.sustain,at+d*.7);
   gain.gain.exponentialRampToValueAtTime(.0001,end);
   filter.connect(gain);let pan=null,active=spec.layers.length;
   if(ac.createStereoPanner&&event.pan){pan=ac.createStereoPanner();pan.pan.value=event.pan;gain.connect(pan);pan.connect(destination);}
   else gain.connect(destination);
   for(const [type,ratio,cents,mix]of spec.layers){
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;
    o.frequency.setValueAtTime(event.frequency*ratio*Math.pow(2,cents/1200),at);g.gain.value=mix;
    o.onended=()=>{o.disconnect();g.disconnect();if(--active===0){filter.disconnect();gain.disconnect();pan?.disconnect();}};
    o.connect(g);g.connect(filter);o.start(at);o.stop(end+.015);
   }
   return true;
  }
  if(event.kind!=='drum')return false;
  if(event.preset==='war'){
   for(const [type,start,finish,volume,length]of [['sine',135,45,level,d],['triangle',210,88,level*.36,.11]]){
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(start,at);
    o.frequency.exponentialRampToValueAtTime(finish,at+length*.8);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.006);
    g.gain.exponentialRampToValueAtTime(.0001,at+length);o.connect(g);g.connect(destination);
    o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+length+.01);
   }
   return true;
  }
  if(!['snare','cymbal'].includes(event.preset)||!noiseBuffer)return false;
  const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();
  src.buffer=noiseBuffer;src.loop=true;filter.type='highpass';filter.frequency.value=event.preset==='snare'?900:4500;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,end);src.connect(filter);filter.connect(gain);gain.connect(destination);
  src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  src.start(at);src.stop(end+.01);return true;
 }
 return Object.freeze({pieces,get,step,play,voices:VOICES,motif});
});
