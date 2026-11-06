/* Adopted stage scores. One step is an eighth note; eight bars loop without
 * owning an AudioContext, a timer, combat state, or player saves. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ParryStageMusic=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const MINOR=[0,2,3,5,7,8,10],DORIAN=[0,2,3,5,7,9,10];
 const CRYPT_NOTES=[73.42,82.41,87.31,98,110,116.54,130.81,146.83,164.81,174.61,196,220,233.08,261.63,293.66,329.63,349.23,392,440,466.16,523.25,587.33];
 const themes=[
  {id:'crypt',name:'地下墓地の脈動',latterName:'地下墓地の脈動 — 深層回廊',zone:'忘れられた地下墓地',from:1,to:10,latterFrom:5,color:'#7addb8',original:true,
   description:'現行曲をそのまま比較。低いベースと裏拍の旋律が、暗い地下墓地の足取りを作る。',
   latterDescription:'5F以降：石棺の奥から亡霊の囁き（高音アンサー）が応え、4拍目の推進ベースと奇数小節の暗色和音が加わる。',
   instruments:'現行のキック・スネア・ハット・鋸歯状波ベース・三角波の旋律',
   latterInstruments:'亡霊の残響チャイム・裏拍導入メロディ・4拍目推進ベース・短調アンビエント和音',
   latterPoints:['1拍裏に低い導入音、3拍裏に高音の残響アンサーを追加して裏拍メロディを対話形式に発展','4拍目（ix=6）に5度/オクターブの推進ベースを追加','奇数小節の頭にも短3度・5度の暗い和音パッドを薄く重ねて深層の空気感を強調'],
   melody:[[null,null,null,3,null,null,null,7,null,null,null,5,null,null,null,9],[null,null,null,3,null,null,null,7,null,null,null,5,null,null,null,9]],
   latterMelody:[[null,2,null,3,null,10,null,7,null,4,null,5,null,9,null,9],[null,3,null,5,null,12,null,7,null,5,null,9,null,11,null,9]]},
  {id:'barracks',name:'鉄靴の行進',latterName:'鉄靴の行進 — 突撃陣形',zone:'鉄血の兵舎',from:11,to:20,latterFrom:15,color:'#e6a27f',tonic:38,scale:MINOR,
   description:'短く区切る低音と行進のスネア。兵士たちの規律と、前へ進む力をイメージ。',
   latterDescription:'15F以降：主力部隊の迎撃態勢。ラッパ旋律に3度上のホルンハモリが重なり、休符を埋めるファンファーレと小節末ロールが加わる。',
   instruments:'行進スネア・矩形波の低音・短いラッパ風の旋律',
   latterInstruments:'二声ブラス（矩形波＋三角波3度ハモリ）・ランニングベース・小節末マーチングロール',
   latterPoints:['主旋律の休符に勇ましい駆け上がり（4→5→4→2）とターンアラウンドを追加','拍頭・強拍のラッパに3度上のホルン風ハーモニーを重ねて分隊の厚み表現','2拍目（ix=2）の5度経過ベースと、2小節ごとの末尾スネア連打で行進の推進力を強化'],
   roots:[0,0,5,3,0,4,3,4],wave:'square',bassWave:'triangle',length:.48,lead:.065,bass:.15,pad:.014,
   melody:[[0,null,0,2,4,null,2,null,3,null,2,0,1,null,-1,null],[0,2,4,null,5,4,2,null,3,2,1,null,-1,null,0,null]],
   latterMelody:[[0,null,0,2,4,5,4,2,3,null,2,0,1,2,0,-1],[0,2,4,2,5,4,2,4,3,2,1,0,-1,1,2,null]],
   kicks:[0,3,4],snares:[2,6],hats:[0,2,4,6],kick:.23,snare:.19,hat:.047,bassSteps:[0,3,4,6]},
  {id:'chapel',name:'祈りの残響',latterName:'祈りの残響 — 聖歌の重唱',zone:'残響の礼拝堂',from:21,to:30,latterFrom:25,color:'#b8b6fa',tonic:36,scale:MINOR,
   description:'鐘の問いかけに柔らかい和音が応える。広い礼拝堂に音が残る、静かな緊張感。',
   latterDescription:'25F以降：大聖堂の奥へ。主旋律の鐘の隙間に高音カリヨンが輪唱（カノン）で応答し、3拍目にパイプオルガン風の和音が膨らむ。',
   instruments:'倍音を重ねた鐘・柔らかい和音・低い脈動',
   latterInstruments:'高音カリヨン（小鐘カノン）・パイプオルガン風3拍目コード・5度ペダルベース',
   latterPoints:['鐘の長い休符の隙間（ix=2, 7）に1オクターブ上の澄んだ小鐘がカノン風に応答','3拍目（ix=4）からパイプオルガン風の柔らかい和音が立ち上がり聖堂の奥行きを拡大','4拍目表（ix=6）に5度の低いペダルベースを添えて荘厳な重みをプラス'],
   roots:[0,5,3,6,0,5,4,4],wave:'bell',bassWave:'sine',length:1.35,lead:.075,bass:.13,pad:.023,
   melody:[[4,null,null,2,null,null,0,null,3,null,null,2,null,1,null,null],[0,null,2,null,4,null,null,null,5,null,4,null,2,null,0,null]],
   latterMelody:[[4,null,null,2,null,4,0,null,3,null,null,2,4,1,null,0],[0,null,2,null,4,null,6,4,5,null,4,2,3,null,0,null]],
   kicks:[0,4],snares:[2,6],hats:[1,3,5,7],kick:.19,snare:.10,hat:.025,bassSteps:[0,4],echo:true},
  {id:'clocktower',name:'歯車の輪舞',latterName:'歯車の輪舞 — 倍速脱進機',zone:'歪んだ時計塔',from:31,to:40,latterFrom:35,color:'#ebc17e',tonic:40,scale:MINOR,
   description:'噛み合う歯車のように、短い音が左右の隙間を埋める。拍の芯を残した機械的な輪舞。',
   latterDescription:'35F以降：時計塔の中枢機関。高音域へ跳躍する変奏アルペジオと、秒針・分針が交差する裏拍チャイム、半拍ディレイの精密チック音が噛み合う。',
   instruments:'刻む矩形波・金属的な高音・細かなハット',
   latterInstruments:'オクターブ跳躍アルペジオ・交差チャイム（ix=1,3,5,7）・アルペジオベース・精密エコー',
   latterPoints:['8分音符の輪舞フレーズが拍裏で1オクターブ上（7度・8度）へ跳躍する変奏譜面','従来は2・4拍裏のみだった金属ベルが全拍裏（ix=1,3,5,7）で高低交互に交差','ベースが単音反復から機械的なアルペジオ（0→4→7→4度）へ変化'],
   roots:[0,4,0,6,5,3,1,4],wave:'square',bassWave:'triangle',length:.25,lead:.054,bass:.125,pad:.009,
   melody:[[0,4,2,5,1,4,2,6,0,4,3,5,2,4,1,4],[5,2,4,1,3,0,2,4,6,4,2,1,0,2,-1,0]],
   latterMelody:[[0,4,7,5,1,4,8,6,0,4,7,5,2,6,4,7],[5,2,7,1,3,0,6,4,6,4,8,1,0,4,2,7]],
   kicks:[0,4],snares:[2,6],hats:[0,1,2,3,4,5,6,7],kick:.20,snare:.13,hat:.036,bassSteps:[0,2,4,6]},
  {id:'forge',name:'炉心の鼓動',latterName:'炉心の鼓動 — 白熱鍛造',zone:'熔鉄の工房',from:41,to:50,latterFrom:45,color:'#f9a36b',tonic:34,scale:MINOR,
   description:'炉の唸りと槌の一撃。重い四つ打ちと低い反復で、灼熱の作業場を進む。',
   latterDescription:'45F以降：白熱する炉心深部。金床を打ち鳴らす金属ベルがシンコペーションで響き、5度パワーコードと裏拍ドライブベースがうねる。',
   instruments:'重いキック・低音ベース・金床風の打音・粗い旋律',
   latterInstruments:'金床アンビル打音・5度パワーコード重音・高域クライマックスリフ・裏拍オクターブベース',
   latterPoints:['休符を熱いハンマリングで繋ぎ、Bパートで高音域（6度）まで駆け上がる白熱リフ','強拍のメロディに5度上（+4度）の鋸歯状波を重ねて重厚なパワーコード化','スネア裏（ix=5）に金床をハンマーで叩くカン！という金属ベル打音を追加'],
   roots:[0,0,1,0,5,3,1,4],wave:'sawtooth',bassWave:'sawtooth',length:.62,lead:.047,bass:.14,pad:.012,
   melody:[[0,null,-1,0,null,2,null,0,1,null,0,null,-1,null,0,null],[0,null,2,3,4,null,2,null,1,null,0,-1,0,null,null,null]],
   latterMelody:[[0,null,-1,0,2,4,2,0,1,null,0,2,3,2,0,-1],[0,2,4,3,4,6,4,2,1,3,2,0,-1,0,2,null]],
   kicks:[0,2,4,6],snares:[2,6],hats:[1,3,5,7],kick:.25,snare:.17,hat:.034,bassSteps:[0,3,4,7]},
  {id:'frost',name:'白霜の灯',latterName:'白霜の灯 — 結晶の煌めき',zone:'白霜の回廊',from:51,to:60,latterFrom:55,color:'#a9e5ff',tonic:38,scale:MINOR,
   description:'氷の粒が光る澄んだ旋律。音数を減らし、冷たい空間と小さな灯りを描く。',
   latterDescription:'55F以降：氷晶の奥宮。静寂の美しさはそのままに、余韻の隙間に1オクターブ上の氷粒アルペジオと透明なオーロラ9th和音が降り注ぐ。',
   instruments:'ガラス風の鐘・正弦波の和音・控えめな打楽器',
   latterInstruments:'高音クリスタル粒ベル・オーロラ9th浮遊和音・繊細な氷晶ハイハット',
   latterPoints:['主旋律の余韻の隙間（ix=1, 5）に高音域の小さな氷晶ベルがキラリと舞い落ちる','3拍目（ix=4）に透明感のある9th（ナインス）正弦波コードを重ねてオーロラの光を表現','控えめだったハットに2・4拍裏の繊細な氷粒パルスを追加'],
   roots:[0,3,5,2,0,6,3,4],wave:'bell',bassWave:'sine',length:1.1,lead:.067,bass:.12,pad:.020,
   melody:[[7,null,4,null,2,null,null,3,5,null,4,null,2,null,0,null],[4,null,5,7,null,6,null,4,3,null,2,null,1,null,0,null]],
   latterMelody:[[7,null,4,6,2,null,4,3,5,null,4,2,1,null,0,2],[4,null,5,7,9,6,4,null,3,4,2,null,1,2,0,null]],
   kicks:[0,4],snares:[2,6],hats:[1,5],kick:.17,snare:.08,hat:.023,bassSteps:[0,4],echo:true},
  {id:'astral',name:'星図の航路',latterName:'星図の航路 — 天球の交響',zone:'星詠みの観測所',from:61,to:70,latterFrom:65,color:'#c5b5f4',tonic:41,scale:DORIAN,
   description:'星の軌道をたどる上昇アルペジオ。浮遊感のある和音と、前へ流れる旋律。',
   latterDescription:'65F以降：天球儀の中心へ。上昇アルペジオがさらに高音域へ伸び、ドリアン長6度を活かした天球の対旋律と流星ディレイ・躍動ベースが重なる。',
   instruments:'流れる三角波・広い和音・星粒のような高音',
   latterInstruments:'天球の対旋律リード・流星ディレイチャイム・裏拍オクターブ躍動ベース',
   latterPoints:['上昇アルペジオの休符を繋ぎ、9度・11度まで滑らかに天翔ける拡大フレーズ','1拍目・3拍目に星空を横切る伸びやかな対旋律（ドリアン6度・5度）を追加','ベースが2分音符から8分裏オクターブ躍動（ix=2, 6）へ進化し、流星の半拍エコーが煌めく'],
   roots:[0,3,1,4,5,3,6,4],wave:'triangle',bassWave:'sine',length:.66,lead:.066,bass:.13,pad:.023,
   melody:[[0,2,4,7,null,4,2,5,1,3,5,8,null,5,3,2],[4,6,7,null,5,4,2,0,3,5,7,9,null,7,4,2]],
   latterMelody:[[0,2,4,7,9,4,2,5,1,3,5,8,10,5,3,2],[4,6,7,9,5,4,2,0,3,5,7,9,11,7,4,2]],
   kicks:[0,4],snares:[2,6],hats:[0,2,3,5,6,7],kick:.19,snare:.11,hat:.031,bassSteps:[0,4]},
  {id:'void',name:'終刻の戴冠',latterName:'終刻の戴冠 — 王座への階',zone:'虚無の天蓋',from:71,to:80,latterFrom:75,color:'#c49bcf',tonic:33,scale:MINOR,
   description:'重い低音と荘厳な和音。遠くの鐘が終わりを告げ、短い旋律が王座へ導く。',
   latterDescription:'75F以降（76–79F道中）：王座へ至る最後の階段。重厚な刻みベースと威厳あるホルン二声、毎小節鳴り響く弔鐘が決戦の緊張感を極限まで高める。',
   instruments:'低いホルン風の音・長い和音・遠い鐘・重い太鼓',
   latterInstruments:'二声ホルン重奏・王座の刻みベース（オスティナート）・毎小節の弔鐘・終拍の重太鼓',
   latterPoints:['長い休符だったホルン旋律が力強く歩を進め、フレーズ末尾で王座へ駆け上がる','ベースに2・4拍目のオクターブ刻み（ix=2, 6）と小節末の重太鼓（ix=7）を追加','偶数小節のみだった遠い鐘を毎小節＆3拍目の5度鐘へ拡大し、主旋律に重厚なハモリを付与'],
   roots:[0,0,5,3,1,5,4,4],wave:'triangle',bassWave:'square',length:1.3,lead:.074,bass:.11,pad:.024,
   melody:[[0,null,null,4,null,null,3,null,2,null,null,1,null,null,-1,null],[5,null,4,null,2,null,null,0,1,null,-1,null,0,null,null,null]],
   latterMelody:[[0,null,2,4,null,5,3,null,2,null,3,1,0,null,-1,1],[5,null,4,2,3,null,1,0,1,2,-1,null,0,2,4,null]],
   kicks:[0,4],snares:[2,6],hats:[0,2,4,6],kick:.25,snare:.14,hat:.026,bassSteps:[0,4]}
 ];
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 themes.forEach(freeze);Object.freeze(themes);
 const byId=Object.freeze(Object.fromEntries(themes.map(theme=>[theme.id,theme])));
 const get=id=>Object.hasOwn(byId,id)?byId[id]:null;
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 function degree(theme,n){const scale=theme.scale,octave=Math.floor(n/7);return theme.tonic+octave*12+scale[((n%7)+7)%7];}
 function cryptLatterStep(n,beat,boss){
  const ix=n%8,bar=Math.floor(n/8),root=boss?[0,3,2,5][Math.floor(bar/2)%4]:[0,5,3,2][Math.floor(bar/2)%4],low=CRYPT_NOTES[root],out=[];
  if(ix%2===0){
   const b=(n/2)%4;
   out.push({kind:'tone',frequency:b===0?140:110,duration:.19,volume:b===0?.26:.13,type:'sine',bend:-90,offset:0});
   if(b===1||b===3){
    out.push({kind:'noise',duration:.12,volume:boss?.26:.17,cutoff:600,offset:0});
    out.push({kind:'tone',frequency:155,duration:.075,volume:.06,type:'triangle',bend:-30,offset:0});
   }
  }
  out.push({kind:'noise',duration:ix%2?.045:.055,volume:ix%2?.062:.085,cutoff:3500,offset:0});
  if(ix===0||ix===4)out.push({kind:'tone',frequency:low,duration:beat*(boss?.86:1.45),volume:boss?.23:.16,type:'sawtooth',bend:-4,offset:0});
  if(ix===6)out.push({kind:'tone',frequency:CRYPT_NOTES[root+4],duration:beat*.42,volume:.105,type:'sawtooth',bend:-6,offset:0});
  if((ix===2||ix===6)&&boss)out.push({kind:'tone',frequency:low*2,duration:.15,volume:.085,type:'square',bend:-12,offset:0});
  if(ix===1){
   const intro=[2,4,3,5][bar%4];
   out.push({kind:'tone',frequency:CRYPT_NOTES[Math.min(CRYPT_NOTES.length-1,root+intro)],duration:beat*.34,volume:.068,type:'triangle',bend:4,offset:0});
  }
  if(ix===3||ix===7){
   const melody=boss?[1,5,7,4][bar%4]:[3,7,5,9][bar%4];
   const f=CRYPT_NOTES[Math.min(CRYPT_NOTES.length-1,root+melody)];
   out.push({kind:'tone',frequency:f,duration:beat*.43,volume:boss?.12:.09,type:'triangle',bend:8,offset:0});
  }
  if(ix===5){
   const ans=[10,9,12,11][bar%4];
   const f=CRYPT_NOTES[Math.min(CRYPT_NOTES.length-1,root+ans)];
   out.push({kind:'bell',frequency:f,duration:beat*.58,volume:.048,offset:0});
  }
  if(ix===0&&bar%2===0){
   out.push({kind:'tone',frequency:low*4,duration:beat*3.4,volume:.042,type:'sine',bend:0,offset:0});
   out.push({kind:'tone',frequency:low*6,duration:beat*3.4,volume:.025,type:'sine',bend:0,offset:0});
  }else if(ix===0){
   out.push({kind:'tone',frequency:CRYPT_NOTES[root+2]*2,duration:beat*2.8,volume:.032,type:'sine',bend:0,offset:0});
   out.push({kind:'tone',frequency:CRYPT_NOTES[root+4]*2,duration:beat*2.8,volume:.024,type:'sine',bend:0,offset:0});
  }
  if(boss&&(ix===1||ix===5))out.push({kind:'tone',frequency:low*2,duration:.12,volume:.04,type:'sawtooth',bend:-45,offset:0});
  return out;
 }
 function step(id,n,beat,boss=false,latter=false){
  const s=get(id);if(!s||!Number.isInteger(n)||n<0||!Number.isFinite(beat)||beat<=0)return [];
  n%=64;
  if(s.original)return latter?cryptLatterStep(n,beat,boss):[];
  const ix=n%8,bar=Math.floor(n/8),root=s.roots[bar],out=[],strength=boss?1.10:1;
  const tone=(midi,duration,volume,type='sine',offset=0,bend=0)=>out.push({kind:'tone',frequency:hz(midi),duration,volume:volume*strength,type,offset,bend});
  const bell=(midi,duration,volume,offset=0)=>out.push({kind:'bell',frequency:hz(midi),duration,volume:volume*strength,offset});
  const noise=(duration,volume,cutoff)=>out.push({kind:'noise',duration,volume:volume*strength,cutoff,offset:0});
  if(s.kicks.includes(ix)||boss&&ix%2===0||(latter&&s.id==='void'&&ix===7))
   out.push({kind:'tone',frequency:ix===0?140:110,duration:.19,volume:s.kick*(ix===0?1:.63)*strength,type:'sine',bend:-90,offset:0});
  if(s.snares.includes(ix)){noise(.11,s.snare,s.id==='forge'?450:900);tone(50,.065,.034,'triangle',0,-30);}
  const hats=latter&&s.id==='frost'?[1,3,5,7]:s.hats;
  if(hats.includes(ix))noise(.035,s.hat*(ix%2?.75:1),s.id==='clocktower'?5200:s.id==='frost'&&latter?5600:3800);
  if(s.id==='barracks'&&(ix===5||ix===7||(latter&&bar%2===1&&ix===6)))noise(.035,.044,1300);
  const bassSteps=latter&&['astral','void'].includes(s.id)?[0,2,4,6]:latter&&s.id==='barracks'?[0,2,3,4,6]:latter&&s.id==='chapel'?[0,4,6]:latter&&s.id==='forge'?[0,1,3,4,5,7]:s.bassSteps;
  if(bassSteps.includes(ix)){
   const bassDeg=latter&&s.id==='clocktower'?root+[0,4,7,4][Math.floor(ix/2)%4]:latter&&s.id==='barracks'&&ix===2?root+4:latter&&s.id==='chapel'&&ix===6?root+4:root;
   const oct=ix===6||(latter&&['astral','void'].includes(s.id)&&ix===2)||(latter&&s.id==='forge'&&(ix===1||ix===5))?12:0;
   tone(degree(s,bassDeg)+oct,beat*(s.id==='clocktower'?.43:.85),s.bass*(latter&&(ix===1||ix===2||ix===5)?.78:1),s.bassWave);
  }
  if(ix===0){
   for(const d of [0,2,4])tone(degree(s,root+d)+12,beat*3.4,s.pad,'sine');
   if(['forge','void'].includes(s.id)&&(bar%2===0||latter))bell(degree(s,root)+24,beat*2.1,.042);
  }
  if(latter&&s.id==='chapel'&&ix===4){
   tone(degree(s,root+2)+12,beat*2.2,.022,'triangle');
   tone(degree(s,root+4)+12,beat*2.2,.020,'sine');
  }
  if(latter&&s.id==='frost'&&ix===4){
   tone(degree(s,root+4)+24,beat*1.9,.022,'sine');
   tone(degree(s,root+8)+24,beat*1.9,.018,'sine');
  }
  const scoreGrid=latter&&s.latterMelody?s.latterMelody:s.melody;
  const note=scoreGrid[Math.floor(bar/2)%2][(bar%2)*8+ix];
  if(note!==null){
   const midi=degree(s,root+note)+24;
   if(s.wave==='bell'){
    bell(midi,beat*s.length,s.lead);
    if(s.echo)bell(midi,beat*.65,s.lead*.19,beat*.5);
   }else{
    tone(midi,beat*s.length,s.lead,s.wave);
    if(latter&&s.id==='barracks'&&(ix===0||ix===4||ix===2))tone(degree(s,root+note+2)+24,beat*s.length,s.lead*.52,'triangle');
    if(latter&&s.id==='forge'&&(ix===0||ix===3||ix===4))tone(degree(s,root+note+4)+24,beat*(s.length*.85),s.lead*.55,'sawtooth');
    if(latter&&s.id==='void'&&(ix===0||ix===3||ix===6))tone(degree(s,root+note-3)+24,beat*(s.length*.9),s.lead*.48,'sawtooth');
    if(latter&&s.id==='astral'&&(ix===3||ix===7))tone(degree(s,root+4)+24,beat*.42,s.lead*.38,'sine',beat*.5);
   }
  }
  if(latter&&s.id==='chapel'&&(ix===2||ix===7)){
   const cNote=[7,6,4,5][(bar+ix)%4];
   bell(degree(s,root+cNote)+24,beat*.75,.034);
  }
  if(latter&&s.id==='frost'&&(ix===1||ix===5)){
   const crystal=[6,8,5,7][(bar+ix)%4];
   bell(degree(s,root+crystal)+24,beat*.55,.028);
  }
  if(latter&&s.id==='astral'&&(ix===0||ix===4)){
   const sky=ix===0?5:4;
   tone(degree(s,root+sky)+24,beat*1.45,.034,'sine');
  }
  if(latter&&s.id==='forge'&&ix===5)bell(degree(s,root+4)+24,beat*.38,.038);
  if(latter&&s.id==='void'&&ix===4)bell(degree(s,root+4)+24,beat*1.8,.036);
  if(s.id==='clocktower'&&(ix===3||ix===7||(latter&&(ix===1||ix===5)))){
   const bellDeg=latter&&(ix===1||ix===5)?7:4;
   bell(degree(s,root+bellDeg)+24,beat*.28,.032,latter&&ix===5?beat*.5:0);
  }
  if(s.id==='astral'&&(ix===7||(latter&&ix===3)))bell(degree(s,root+(ix===3?4:7))+24,beat*1.1,.029);
  return out;
 }
 return Object.freeze({themes,get,step,bars:8,stepsPerBar:8});
});
