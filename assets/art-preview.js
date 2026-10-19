/* Rendering-only review page. No gameplay, sound, or storage. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),art=window.ParryCombatArt,rig=window.ParryCharacterRig,puppet=window.ParryKnightPuppet,hero=window.ParryHeroPuppet,enemies=window.ParryEnemyPuppet,P=window.ParryEncounters;
 const select=$('enemySelect'),stages=$('stages'),range=$('frameRange');
 const canvases=[$('before'),$('after')];
 if(matchMedia('(max-width: 780px)').matches)$('sizeSelect').value='mobile';
 const bases=['knight','slime','rogue','wraith','sentinel','duelist','cantor','clockwork','guardian'];
 for(const group of [bases,P.all.map(e=>e.id).filter(id=>!bases.includes(id))]){
  const optgroup=document.createElement('optgroup');optgroup.label=group===bases?'基本キャラクター':'派生・ボス・レア';
  for(const id of group){const o=document.createElement('option');o.value=id;o.textContent=P.byId[id].name;optgroup.append(o);}
  select.append(optgroup);
 }
 const query=new URLSearchParams(location.search);
 const embedded=query.get('embed')==='1';if(embedded)document.documentElement.classList.add('embedded');
 if(['v4','source'].includes(query.get('compare'))){
  $('comparisonSelect').value=query.get('compare')==='source'?'source':'sword-v4';
  $('compareBtn').setAttribute('aria-pressed','true');stages.classList.add('compare');document.querySelector('.old').hidden=false;
 }
 if(P.byId[query.get('enemy')])select.value=query.get('enemy');
 if(query.get('rank')==='elite')$('rankSelect').value='elite';
 if(query.get('size')==='mobile')$('sizeSelect').value='mobile';
 let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,time=100,last=performance.now(),attackIndex=0,debug=false;
 if(query.has('time')&&Number.isFinite(Number(query.get('time')))){time=Math.max(0,Math.min(2899,Number(query.get('time'))));playing=false;}
 let loaded=false;
 const notes={knight:'後ろへ引き、構えを保って一気に斬り込む。',slime:'縮んで蓄え、打撃の突起から体ごと突進。',rogue:'低い構えから短剣を真っすぐ突く。',wraith:'浮いて引き、爪と腕を伸ばす。',sentinel:'盾を前に残し、腰脇から重く斬り上げる。',duelist:'二本の剣を一撃ごとに交互に振る。',cantor:'袖と掌を引き、詠唱から掌撃を放つ。',clockwork:'歯車を巻き、ピストンを送り出す。',guardian:'頭上へ大きく振りかぶり、体を左に向けたまま両手で振り下ろす。',ironwarden:'胸前の両手構えから、斜めに斬り込む。',dirgekeeper:'剣先を低く構え、休符から静かに斬り上げる。',timewarden:'胸の時計を見せる中段構えから、両手で突く。',golden_tone:'金色の衣と掌で、鈴の音の波を放つ。',gem_slime:'黄色い身体と結晶を縮め、打撃の突起を伸ばす。'};
 const revised=new Set(['sentinel','guardian','ironwarden','dirgekeeper','timewarden','gem_slime']);
 const snapshots=[[100,'待機'],[1200,'予備動作'],[1485,'斬撃'],[1500,'接触・38ms保持'],[1623,'反動／振り抜き'],[1720,'構え直し前'],[1900,'構え直し'],[2110,'復帰']];
 for(const [at,label]of snapshots){
  const button=document.createElement('button');button.type='button';button.className='pose-snapshot';button.setAttribute('aria-label',label+'を拡大');
  button.innerHTML='<span>'+label+'</span><canvas aria-label="'+label+'の静止ポーズ"></canvas>';
  button.addEventListener('click',()=>setTime(at));$('poseGallery').append(button);
 }
 const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,t)=>a+(b-a)*t,smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
 function resize(){
  const mobile=$('sizeSelect').value==='mobile';stages.classList.toggle('mobile',mobile);
  stages.classList.toggle('previous',$('comparisonSelect').value==='previous'&&$('lookSelect').value==='illustrated');
  const dpr=Math.min(devicePixelRatio||1,2);
  for(const c of canvases){
   const rect=c.getBoundingClientRect();
   c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr);
  }
  if(loaded)refreshPoseSheet();
 }
 function selectedEnemy(){
  const e=P.byId[select.value]||P.byId.knight;
  return !e.rare&&$('rankSelect').value==='elite'?{...e,elite:true}:e;
 }
 function selection(){
  const e=selectedEnemy();$('rankSelect').disabled=!!e.rare;
  const mode=$('lookSelect').value;
  $('artSource').textContent=mode==='illustrated'?(notes[e.sprite||e.id]||'原画から分割・敵固有の動作'):mode==='rework'?'不採用の図形試作（比較用）':'以前の原画・拡大案';
  $('enemyTitle').firstChild.textContent=(e.elite?'精鋭・':'')+e.name+' ';
  $('nextStrike').hidden=(e.sprite||e.id)!=='duelist';
  $('playLink').href='./dev.html?floor='+(e.boss?5:2)+'&enemy='+encodeURIComponent(e.id+(e.rare?':rare':e.elite?':elite':':normal'))+'&art='+mode;
  $('normalPlayLink').href='./index.html?art='+mode;
  if(loaded&&!embedded){refreshParts();refreshPoseSheet();}
 }
 function refreshParts(){
  const e=P.byId[select.value]||P.byId.knight,c=$('partsCanvas'),knight=puppet.supports(e);
  $('partsTitle').textContent=e.name+'：元PNGから分けた部品';
  const spec=enemies.specs[enemies.idFor(e)];
  const swordArmor=knight||['sentinel','duelist','guardian','ironwarden','dirgekeeper','timewarden'].includes(enemies.idFor(e));
  $('poseArtLinks').hidden=!spec?.keyPose;
  if(spec?.keyPose){$('readyArtLink').href='./assets/'+spec.source;$('contactArtLink').href='./assets/'+spec.keyPose.source;}
  $('partsDescription').textContent=spec?.keyPose?'構えと打ち込みの作画を切り替え、両腕と握り方の形を保ちます。原画をそれぞれ開いて確認できます。':spec?.motion==='slime'?'本体を圧縮し、突起を別の部品としてしならせます。原画の画素から直接分割しています。':spec?.float?'肩と肘をつなぎ、浮遊する衣が遅れて流れます。原画の画素から直接分割しています。':swordArmor?'肩・肘・攻撃部位を接続し、脚の構えを保ちます。剣腕は肩鎧から切り分け、肩ごと振ります。':'肩・肘・攻撃部位を接続し、脚の構えを保ちます。原画の画素から直接分割しています。';
  c.getContext('2d').clearRect(0,0,c.width,c.height);
  if(knight)puppet.drawParts(c.getContext('2d'),c.width,c.height);else enemies.drawParts(c.getContext('2d'),e,c.width,c.height);
  const match=knight?puppet.compareIdle():enemies.compareIdle(e);
  $('idleMatch').textContent=match?'待機の再合成と元原画の一致 '+((1-match.ratio)*100).toFixed(2)+'%'+(knight?'（赤布の補修範囲を除く）':'（全画素で照合）'):'原画を読み込めませんでした。';
  if(match){$('idleMatch').dataset.differenceRatio=String(match.ratio);$('idleMatch').dataset.enemy=e.id;}
 }
 function changeEnemy(id){select.value=id;selection();time=100;attackIndex=0;}
 for(const [id,step] of [['prevEnemy',-1],['nextEnemy',1]])$(id).addEventListener('click',()=>{
  const options=[...select.options],at=options.findIndex(o=>o.value===select.value);changeEnemy(options[(at+step+options.length)%options.length].value);
 });
 function setTime(value){playing=false;time=Number(value);$('togglePlay').textContent='再生';range.value=time;}
 $('nextStrike').addEventListener('click',()=>{attackIndex++;setTime(1500);if(loaded)refreshPoseSheet();});
 select.addEventListener('change',()=>{selection();time=100;attackIndex=0;});
 $('rankSelect').addEventListener('change',selection);
 $('sizeSelect').addEventListener('change',resize);
 $('resultSelect').addEventListener('change',()=>{if(loaded)refreshPoseSheet();});
 $('lookSelect').addEventListener('change',()=>{selection();resize();});
 function comparison(){
  const kind=$('comparisonSelect').value;
  $('comparisonTitle').textContent=kind==='sword-v4'?'剣モーション v4':kind==='previous'?'調整前':kind==='main'?'mainの間合い（参考）':'元の立ち絵';
  $('comparisonNote').textContent=kind==='sword-v4'?'左：以前の切り抜き方式。右：現在の修整案（両手持ちは打ち込み専用の作画）':kind==='previous'?'以前の縮尺・動作':kind==='main'?'mainの配置・移動式＋以前の試作絵':'主人公・選択中の敵の構えの原画';
  resize();
 }
 $('comparisonSelect').addEventListener('change',comparison);
 $('skeletonBtn').addEventListener('click',()=>{debug=!debug;$('skeletonBtn').setAttribute('aria-pressed',String(debug));if(loaded)refreshPoseSheet();});
 $('partsBtn').addEventListener('click',()=>{const on=$('partsPanel').hidden;$('partsPanel').hidden=!on;$('heroPartsPanel').hidden=!on;$('partsBtn').setAttribute('aria-expanded',String(on));});
 $('compareBtn').addEventListener('click',()=>{
  const on=$('compareBtn').getAttribute('aria-pressed')!=='true';
  $('compareBtn').setAttribute('aria-pressed',String(on));
  stages.classList.toggle('compare',on);document.querySelector('.old').hidden=!on;resize();
 });
 $('togglePlay').textContent=playing?'一時停止':'再生';
 $('togglePlay').addEventListener('click',()=>{playing=!playing;$('togglePlay').textContent=playing?'一時停止':'再生';});
 range.addEventListener('input',()=>setTime(range.value));
 for(const button of document.querySelectorAll('button[data-time]'))button.addEventListener('click',()=>setTime(button.dataset.time));
 function background(ctx,w,h){
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#101b2b');g.addColorStop(1,'#202c3e');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let i=0;i<7;i++){ctx.fillStyle='#080f1b66';ctx.fillRect(w*i/6-12,0,20,h*.8);}
  ctx.strokeStyle='#5e738376';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h*.8);ctx.lineTo(w,h*.8);ctx.stroke();
  const floor=ctx.createLinearGradient(0,h*.8,0,h);floor.addColorStop(0,'#304355');floor.addColorStop(1,'#111b2a');ctx.fillStyle=floor;ctx.fillRect(0,h*.8+1,w,h*.2);
  ctx.strokeStyle='#a4b7cb12';
  for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(i*w/8,h*.8);ctx.lineTo((i-4)*w/5+w/2,h);ctx.stroke();}
 }
 function legacy(ctx,d,pose){
  const {e,m,width:w,height:h,now}=d;
  const base=Math.min(w/550,h/470)*1.23,s=base*(e.boss?1.34:1),after=now-d.lastImpactAt;
  const raw=art.timeline(m,d.attackAt-now,after,d.attackSpan),p=raw.p;
  const rec=after>=0&&after<m.recovery?1-smooth(after/m.recovery):0;
  const target=w*.28+39*base+m.reach*s,stage=target+m.stage*s;
  const normal=mix(mix(w*.73,stage,raw.prep),target,p*p*(1+.12*(1-p)));
  ctx.save();ctx.translate(mix(normal,target,rec),h*.8);ctx.scale(-s,s);
  const age=now-d.lastDeflectAt,duration=Math.min(195,Math.max(75,d.attackAt-now-145));
  const recoil=age>=0&&age<duration&&['just','parry'].includes(d.lastStrikeKind)
   ?Math.sin(Math.PI*age/duration)*(d.lastStrikeKind==='just'?1:.5):0;
  ctx.translate(-recoil*(e.kind==='slime'?36:e.kind==='rogue'?29:e.kind==='wraith'?22:e.kind==='guardian'?16:24),0);
  if(e.kind==='slime')ctx.scale(1+recoil*.20,1-recoil*.22);
  else if(e.kind==='wraith')ctx.globalAlpha=1-recoil*.33;
  else ctx.rotate(-recoil*(e.kind==='guardian' ? .075 : .13));
  if(e.palette)ctx.filter='hue-rotate('+e.palette.hueRotate+'deg) saturate('+e.palette.saturation+'%)';
  const enemyPose={e,m,now,p,rec,action:Math.max(p,rec),charge:raw.prep*(1-p)*(1-rec),recoil};
  if((e.sprite||e.id)==='knight')window.ParryKnightTrace.drawEnemy(ctx,enemyPose);
  else window.ParryCharacterArt.drawEnemy(ctx,enemyPose);
  ctx.restore();ctx.save();ctx.translate(w*.28,h*.8);ctx.scale(base,base);
  window.ParryHeroReady.drawHero(ctx,pose);ctx.restore();
 }
 function draw(c,improved,stamp,poseTime=time){
  const time=poseTime;
  if(c.closest('[hidden]'))return;
  const rect=c.getBoundingClientRect(),w=rect.width,h=rect.height,ctx=c.getContext('2d');
  ctx.setTransform(c.width/w,0,0,c.height/h,0,0);background(ctx,w,h);
  const e={...selectedEnemy(),index:attackIndex+(time>=1500?1:0)},m=art.profile(e),after=time-1500;
  c.dataset.enemy=e.id;c.dataset.time=String(time);
  const strike=$('resultSelect').value;
  const now=10000+time,contact=11500;
  const d={e,m,now,width:w,height:h,attackAt:time<1500?contact:contact+3000,
   attackSpan:3000,lastImpactAt:time>=1500?contact:-99999,
   lastDeflectAt:time>=1500&&['just','parry'].includes(strike)?contact:-99999,lastStrikeKind:strike};
  const counter=['just','parry'].includes(strike)&&after>=0&&after<240?1-after/240:0;
  const pose={now,action:counter,lift:time>1250&&time<1700?1:0,heldLift:strike==='guard'?1:0,
   guardHeld:strike==='guard',push:after>=0&&after<160?Math.sin(Math.PI*after/160):0,
   hurt:after>=0&&after<250&&['miss','guard'].includes(strike)?1-after/250:0,
   lastStrikeKind:strike,lastImpactAt:d.lastImpactAt};
  const rework=improved&&$('lookSelect').value==='rework',illustrated=$('lookSelect').value==='illustrated';
  const comparisonKind=$('comparisonSelect').value;
  const movingIllustrated=illustrated&&(improved||['previous','sword-v4'].includes(comparisonKind));
  if(!improved&&comparisonKind==='main')legacy(ctx,d,pose);
  else if(!improved&&comparisonKind==='source'&&illustrated&&puppet.readyFor(e)){
   const l=puppet.layout(w,h,e,m);
   hero.drawReference(ctx,{x:l.heroX,ground:l.ground,scale:l.heroScale});
   if(puppet.supports(e))puppet.drawReference(ctx,{x:l.restX,ground:l.ground,scale:l.enemyScale});
   else enemies.drawReference(ctx,e,{x:l.restX,ground:l.ground,scale:l.enemyScale});
  }
  else if(movingIllustrated){
   const staging=improved||comparisonKind==='sword-v4'?'wide':'previous';
   const motionVersion=!improved&&comparisonKind==='sword-v4'?'v4':'v5';
   if(!puppet.drawEnemy(ctx,{...d,debug,staging,motionVersion}))art.drawEnemy(ctx,d);
   if(!puppet.drawHero(ctx,{...d,pose,debug,staging,motionVersion}))art.drawHero(ctx,{...d,pose});
  }
  else if(rework){rig.drawEnemy(ctx,{...d,debug});rig.drawHero(ctx,{...d,pose,debug});}
  else {art.drawEnemy(ctx,d);art.drawHero(ctx,{...d,pose});}
  if(after>=0&&after<190&&!(comparisonKind==='source'&&!improved)){
   const layout=!improved&&comparisonKind==='main'
    ?{hitX:w*.28+39*Math.min(w/550,h/470)*1.23,hitY:h*.8-58*Math.min(w/550,h/470)*1.23}
    :(movingIllustrated&&puppet.readyFor(e)?puppet:rework?rig:art).layout(w,h,e,m,improved||comparisonKind==='sword-v4'?'wide':'previous');
   const x=layout.hitX,y=layout.hitY;
   ctx.save();ctx.globalAlpha=1-after/190;ctx.strokeStyle=strike==='miss'?'#e8879d':'#c9f7ff';
   ctx.lineWidth=2;const rad=9+after*.19;
   for(let i=0;i<9;i++){const a=i*2.399;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);ctx.lineTo(x+Math.cos(a)*(rad+13),y+Math.sin(a)*(rad+13));ctx.stroke();}
   ctx.restore();
  }
 }
 function refreshPoseSheet(){
  if(embedded)return;
  const e=P.byId[select.value]||P.byId.knight;
  $('poseGalleryTitle').textContent=e.name+'：構えから復帰まで';
  $('poseGallery').dataset.enemy=e.id;
  const dpr=Math.min(devicePixelRatio||1,2);
  for(const [i,c]of [...$('poseGallery').querySelectorAll('canvas')].entries()){
   const r=c.getBoundingClientRect();c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);
   draw(c,true,0,snapshots[i][0]);
  }
 }
 function frame(stamp){
  if(playing){const next=time+Math.min(70,stamp-last)*Number($('speedSelect').value);if(next>=2900)attackIndex++;time=next%2900;}last=stamp;
  range.value=Math.round(time);$('timeLabel').textContent=(time/1000).toFixed(2)+' s';
  const m=art.profile(P.byId[select.value]||P.byId.knight);
  $('phaseLabel').textContent=time<1500-m.prepare?'待機':time<1500-m.swing?'溜め':time<1500?'振り':time<1538?'接触':time<1740?'主人公の反撃':time<1500+m.recovery?'戻り':'待機';
  for(const b of document.querySelectorAll('button[data-time]'))b.setAttribute('aria-pressed',String(!playing&&Math.abs(time-Number(b.dataset.time))<2));
  for(let i=0;i<canvases.length;i++)draw(canvases[i],i===1,stamp);
  requestAnimationFrame(frame);
 }
 window.addEventListener('resize',resize);
 selection();comparison();
 Promise.all([art.preload(),puppet.preload()]).then(([results,ok])=>{
  loaded=true;const count=P.all.filter(puppet.readyFor).length;
  $('loadStatus').textContent=ok&&results.every(Boolean)&&count===P.all.length?'全'+count+'種の原画・動作を読み込みました。スロー・部品・原画比較でレビューできます。':'読み込み済み '+count+'/'+P.all.length+'種。一部の素材を読み込めません。HTTPサーバーで開いてください。';
  if(ok&&!embedded){
   refreshParts();
   refreshPoseSheet();
   const partsHero=$('heroPartsCanvas');hero.drawParts(partsHero.getContext('2d'),partsHero.width,partsHero.height);
   const heroMatch=hero.compareIdle();$('heroIdleMatch').dataset.differenceRatio=String(heroMatch.ratio);
   $('heroIdleMatch').textContent='主人公の待機と元原画の一致 '+((1-heroMatch.ratio)*100).toFixed(2)+'%（全画素で照合）';
  }
 });
 for(const id of embedded?[]:['knight',...Object.keys(enemies.specs)]){
  const e=P.byId[id],s=enemies.specs[id],source=id==='knight'?puppet.SOURCE:s.source;
  const figure=document.createElement('figure');
  figure.innerHTML='<a href="./assets/'+source+'" target="_blank" rel="noopener"><img src="./assets/'+source+'" width="1445" height="1088" loading="lazy" alt="'+e.name+'の原画"></a><figcaption><strong>'+e.name+(revised.has(id)?' <small>修整版</small>':'')+'</strong><span>'+notes[id]+'</span><button type="button">動作を見る</button></figcaption>';
  figure.querySelector('button').addEventListener('click',()=>{changeEnemy(id);$('lookSelect').value='illustrated';selection();playing=true;$('togglePlay').textContent='一時停止';resize();stages.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  $('rosterGallery').append(figure);
 }
 if(embedded){
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='parry-pixel-review')return;
   const message=event.data;
   if(window.ParryPixelArt?.paletteEnemy&&message.enemy!==window.ParryPixelArt.paletteEnemy)return;
   if(P.byId[message.enemy]&&message.enemy!==select.value){select.value=message.enemy;selection();}
   if(['normal','elite'].includes(message.rank)&&$('rankSelect').value!==message.rank){$('rankSelect').value=message.rank;selection();}
   if(['just','parry','guard','miss'].includes(message.result))$('resultSelect').value=message.result;
   if(Number.isFinite(message.time))setTime(Math.max(0,Math.min(2899,message.time)));
  });
 }
 requestAnimationFrame(frame);
})();
