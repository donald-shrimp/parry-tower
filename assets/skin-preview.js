/* Visual-only comparison using the production hero rig and accepted keys. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),hero=window.ParryHeroPuppet,skins=window.ParryProgression.SKINS;
 const selected=hero.skinId(new URLSearchParams(location.search).get('skin'));
 let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false,time=0,last=performance.now();
 for(const skin of skins){
  const card=document.createElement('article');card.className='skin-review'+(skin.id===selected?' selected':'');card.style.setProperty('--skin-color',skin.color);
  card.innerHTML='<h2>'+skin.icon+' '+skin.name+'<small>'+(skin.id==='normal'?'STANDARD':'外見プレビュー')+'</small></h2><canvas width="600" height="440" data-skin="'+skin.id+'" aria-label="'+skin.name+'のモーション"></canvas><p>'+skin.look+'</p><a href="./dev.html?floor=5&amp;enemy=guardian&amp;practice=1&amp;skin='+skin.id+'">この姿で無敵練習 ↗</a>';
  $('skins').append(card);
 }
 const canvases=[...document.querySelectorAll('canvas[data-skin]')];
 function pose(){
  const kind=$('motion').value,after=time-540,success=['just','parry'].includes(kind);
  const lifting=kind!=='miss'&&time>=320&&time<780,lift=lifting?Math.min(1,(time-320)/100):0;
  return {now:time,lastStrikeKind:kind,lastImpactAt:after>=0?540:-99999,
   action:success&&after>=0&&after<240?1-after/240:0,lift,
   guardHeld:kind==='guard'&&lifting,heldLift:lift,
   push:after>=0&&after<160?Math.sin(Math.PI*after/160)*(kind==='just'?1:.45):0,
   hurt:after>=0&&after<250&&['guard','miss'].includes(kind)?1-after/250:0};
 }
 function draw(){
  $('time').value=String(Math.round(time));$('timeLabel').textContent=Math.round(time)+' ms';
  $('phase').textContent=time<320?'待機':time<540?'盾を前へ':time<580?'接触':time<780?(['just','parry'].includes($('motion').value)?'反撃':'衝突の反動'):'復帰';
  for(const button of document.querySelectorAll('button[data-time]'))button.setAttribute('aria-pressed',String(!playing&&Math.abs(time-Number(button.dataset.time))<2));
  if(!ready)return;
  const input=pose();
  for(const c of canvases){
   const ctx=c.getContext('2d'),g=ctx.createRadialGradient(350,230,20,300,200,370);g.addColorStop(0,'#27394f');g.addColorStop(1,'#101823');ctx.fillStyle=g;ctx.fillRect(0,0,600,440);
   ctx.fillStyle='#24303d';ctx.fillRect(0,402,600,38);ctx.strokeStyle='#72819855';ctx.beginPath();ctx.moveTo(0,402);ctx.lineTo(600,402);ctx.stroke();
   hero.drawHero(ctx,{skin:c.dataset.skin,now:time,pose:input,layout:{heroX:350,ground:402,heroScale:2.1}});
   c.dataset.time=String(Math.round(time));c.dataset.motion=$('motion').value;
  }
 }
 function syncPlay(){ $('play').textContent=playing?'一時停止':'再生';$('play').setAttribute('aria-pressed',String(playing)); }
 function seek(value){time=Number(value);playing=false;syncPlay();draw()}
 $('play').addEventListener('click',()=>{playing=!playing;last=performance.now();syncPlay()});
 $('time').addEventListener('input',()=>seek($('time').value));
 $('motion').addEventListener('change',draw);
 for(const b of document.querySelectorAll('button[data-time]'))b.addEventListener('click',()=>seek(b.dataset.time));
 function frame(now){if(playing&&ready)time=(time+Math.min(70,now-last)*Number($('speed').value))%1200;last=now;draw();requestAnimationFrame(frame)}
 syncPlay();requestAnimationFrame(frame);
 Promise.all(skins.map(skin=>hero.preloadSkin(skin.id))).then(results=>{
  ready=results.every(Boolean);$('loadStatus').textContent=ready?'全スキンの準備完了。再生・スロー・位置バーで確認できます。':'立ち絵の読み込みに失敗しました。ページを再読み込みしてください。';draw();
 });
})();
