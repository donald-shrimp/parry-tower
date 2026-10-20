/* Adopted stage scores. One step is an eighth note; eight bars loop without
 * owning an AudioContext, a timer, combat state, or player saves. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ParryStageMusic=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const MINOR=[0,2,3,5,7,8,10],DORIAN=[0,2,3,5,7,9,10];
 const themes=[
  {id:'crypt',name:'地下墓地の脈動',zone:'忘れられた地下墓地',from:1,to:10,color:'#7addb8',original:true,
   description:'現行曲をそのまま比較。低いベースと裏拍の旋律が、暗い地下墓地の足取りを作る。',instruments:'現行のキック・スネア・ハット・鋸歯状波ベース・三角波の旋律'},
  {id:'barracks',name:'鉄靴の行進',zone:'鉄血の兵舎',from:11,to:20,color:'#e6a27f',tonic:38,scale:MINOR,
   description:'短く区切る低音と行進のスネア。兵士たちの規律と、前へ進む力をイメージ。',instruments:'行進スネア・矩形波の低音・短いラッパ風の旋律',
   roots:[0,0,5,3,0,4,3,4],wave:'square',bassWave:'triangle',length:.48,lead:.065,bass:.15,pad:.014,
   melody:[[0,null,0,2,4,null,2,null,3,null,2,0,1,null,-1,null],[0,2,4,null,5,4,2,null,3,2,1,null,-1,null,0,null]],
   kicks:[0,3,4],snares:[2,6],hats:[0,2,4,6],kick:.23,snare:.19,hat:.047,bassSteps:[0,3,4,6]},
  {id:'chapel',name:'祈りの残響',zone:'残響の礼拝堂',from:21,to:30,color:'#b8b6fa',tonic:36,scale:MINOR,
   description:'鐘の問いかけに柔らかい和音が応える。広い礼拝堂に音が残る、静かな緊張感。',instruments:'倍音を重ねた鐘・柔らかい和音・低い脈動',
   roots:[0,5,3,6,0,5,4,4],wave:'bell',bassWave:'sine',length:1.35,lead:.075,bass:.13,pad:.023,
   melody:[[4,null,null,2,null,null,0,null,3,null,null,2,null,1,null,null],[0,null,2,null,4,null,null,null,5,null,4,null,2,null,0,null]],
   kicks:[0,4],snares:[2,6],hats:[1,3,5,7],kick:.19,snare:.10,hat:.025,bassSteps:[0,4],echo:true},
  {id:'clocktower',name:'歯車の輪舞',zone:'歪んだ時計塔',from:31,to:40,color:'#ebc17e',tonic:40,scale:MINOR,
   description:'噛み合う歯車のように、短い音が左右の隙間を埋める。拍の芯を残した機械的な輪舞。',instruments:'刻む矩形波・金属的な高音・細かなハット',
   roots:[0,4,0,6,5,3,1,4],wave:'square',bassWave:'triangle',length:.25,lead:.054,bass:.125,pad:.009,
   melody:[[0,4,2,5,1,4,2,6,0,4,3,5,2,4,1,4],[5,2,4,1,3,0,2,4,6,4,2,1,0,2,-1,0]],
   kicks:[0,4],snares:[2,6],hats:[0,1,2,3,4,5,6,7],kick:.20,snare:.13,hat:.036,bassSteps:[0,2,4,6]},
  {id:'forge',name:'炉心の鼓動',zone:'熔鉄の工房',from:41,to:50,color:'#f9a36b',tonic:34,scale:MINOR,
   description:'炉の唸りと槌の一撃。重い四つ打ちと低い反復で、灼熱の作業場を進む。',instruments:'重いキック・低音ベース・金床風の打音・粗い旋律',
   roots:[0,0,1,0,5,3,1,4],wave:'sawtooth',bassWave:'sawtooth',length:.62,lead:.047,bass:.14,pad:.012,
   melody:[[0,null,-1,0,null,2,null,0,1,null,0,null,-1,null,0,null],[0,null,2,3,4,null,2,null,1,null,0,-1,0,null,null,null]],
   kicks:[0,2,4,6],snares:[2,6],hats:[1,3,5,7],kick:.25,snare:.17,hat:.034,bassSteps:[0,3,4,7]},
  {id:'frost',name:'白霜の灯',zone:'白霜の回廊',from:51,to:60,color:'#a9e5ff',tonic:38,scale:MINOR,
   description:'氷の粒が光る澄んだ旋律。音数を減らし、冷たい空間と小さな灯りを描く。',instruments:'ガラス風の鐘・正弦波の和音・控えめな打楽器',
   roots:[0,3,5,2,0,6,3,4],wave:'bell',bassWave:'sine',length:1.1,lead:.067,bass:.12,pad:.020,
   melody:[[7,null,4,null,2,null,null,3,5,null,4,null,2,null,0,null],[4,null,5,7,null,6,null,4,3,null,2,null,1,null,0,null]],
   kicks:[0,4],snares:[2,6],hats:[1,5],kick:.17,snare:.08,hat:.023,bassSteps:[0,4],echo:true},
  {id:'astral',name:'星図の航路',zone:'星詠みの観測所',from:61,to:70,color:'#c5b5f4',tonic:41,scale:DORIAN,
   description:'星の軌道をたどる上昇アルペジオ。浮遊感のある和音と、前へ流れる旋律。',instruments:'流れる三角波・広い和音・星粒のような高音',
   roots:[0,3,1,4,5,3,6,4],wave:'triangle',bassWave:'sine',length:.66,lead:.066,bass:.13,pad:.023,
   melody:[[0,2,4,7,null,4,2,5,1,3,5,8,null,5,3,2],[4,6,7,null,5,4,2,0,3,5,7,9,null,7,4,2]],
   kicks:[0,4],snares:[2,6],hats:[0,2,3,5,6,7],kick:.19,snare:.11,hat:.031,bassSteps:[0,4]},
  {id:'void',name:'終刻の戴冠',zone:'虚無の天蓋',from:71,to:80,color:'#c49bcf',tonic:33,scale:MINOR,
   description:'重い低音と荘厳な和音。遠くの鐘が終わりを告げ、短い旋律が王座へ導く。',instruments:'低いホルン風の音・長い和音・遠い鐘・重い太鼓',
   roots:[0,0,5,3,1,5,4,4],wave:'triangle',bassWave:'square',length:1.3,lead:.074,bass:.11,pad:.024,
   melody:[[0,null,null,4,null,null,3,null,2,null,null,1,null,null,-1,null],[5,null,4,null,2,null,null,0,1,null,-1,null,0,null,null,null]],
   kicks:[0,4],snares:[2,6],hats:[0,2,4,6],kick:.25,snare:.14,hat:.026,bassSteps:[0,4]}
 ];
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 themes.forEach(freeze);Object.freeze(themes);
 const byId=Object.freeze(Object.fromEntries(themes.map(theme=>[theme.id,theme])));
 const get=id=>Object.hasOwn(byId,id)?byId[id]:null;
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 function degree(theme,n){const scale=theme.scale,octave=Math.floor(n/7);return theme.tonic+octave*12+scale[((n%7)+7)%7];}
 function step(id,n,beat,boss=false){
  const s=get(id);if(!s||s.original||!Number.isInteger(n)||n<0||!Number.isFinite(beat)||beat<=0)return [];
  n%=64;const ix=n%8,bar=Math.floor(n/8),root=s.roots[bar],out=[],strength=boss?1.10:1;
  const tone=(midi,duration,volume,type='sine',offset=0,bend=0)=>out.push({kind:'tone',frequency:hz(midi),duration,volume:volume*strength,type,offset,bend});
  const bell=(midi,duration,volume,offset=0)=>out.push({kind:'bell',frequency:hz(midi),duration,volume:volume*strength,offset});
  const noise=(duration,volume,cutoff)=>out.push({kind:'noise',duration,volume:volume*strength,cutoff,offset:0});
  if(s.kicks.includes(ix)||boss&&ix%2===0)out.push({kind:'tone',frequency:ix===0?140:110,duration:.19,volume:s.kick*(ix===0?1:.63)*strength,type:'sine',bend:-90,offset:0});
  if(s.snares.includes(ix)){noise(.11,s.snare,s.id==='forge'?450:900);tone(50,.065,.034,'triangle',0,-30);}
  if(s.hats.includes(ix))noise(.035,s.hat*(ix%2?.75:1),s.id==='clocktower'?5200:3800);
  if(s.id==='barracks'&&(ix===5||ix===7))noise(.035,.044,1300);
  if(s.bassSteps.includes(ix))tone(degree(s,root)+(ix===6?12:0),beat*(s.id==='clocktower'?.43:.85),s.bass,s.bassWave);
  if(ix===0){
   for(const d of [0,2,4])tone(degree(s,root+d)+12,beat*3.4,s.pad,'sine');
   if(['forge','void'].includes(s.id)&&bar%2===0)bell(degree(s,root)+24,beat*2.1,.042);
  }
  const note=s.melody[Math.floor(bar/2)%2][(bar%2)*8+ix];
  if(note!==null){
   const midi=degree(s,root+note)+24;
   if(s.wave==='bell'){
    bell(midi,beat*s.length,s.lead);
    if(s.echo)bell(midi,beat*.65,s.lead*.19,beat*.5);
   }else tone(midi,beat*s.length,s.lead,s.wave);
  }
  if(s.id==='clocktower'&&(ix===3||ix===7))bell(degree(s,root+4)+24,beat*.28,.032);
  if(s.id==='astral'&&ix===7)bell(degree(s,root+7)+24,beat*1.1,.029);
  return out;
 }
 return Object.freeze({themes,get,step,bars:8,stepsPerBar:8});
});
