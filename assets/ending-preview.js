(()=>{'use strict';
 const $=id=>document.getElementById(id),scene=window.ParryEndingScene,hero=window.ParryHeroPuppet,canvas=$('endingCanvas'),ctx=canvas.getContext('2d');
 let params={...scene.DEFAULTS},time=0,playing=false,last=performance.now(),generation=0,ready=false;
 function draw(){
  const state=scene.draw(ctx,960,600,time,params,ready?(c,p)=>hero.drawHero(c,{skin:$('endingSkin').value,now:p.time,pose:{lift:p.guard,heldLift:p.guard,guardHeld:!!p.guard,action:0,hurt:0,push:0},layout:{heroX:p.x,ground:p.y,heroScale:p.scale}}):null,$('endingLowFlash').checked);
  $('endingTime').max=String(state.duration*10);$('endingTime').value=String(Math.round(time*10));$('endingPosition').textContent=time.toFixed(1)+'秒 / '+state.duration.toFixed(1)+'秒 · '+state.stage;
  $('endingPlay').textContent=playing?'一時停止':'再生';$('endingPlay').setAttribute('aria-pressed',String(playing));
 }
 function rebuild(){params=scene.normalize(params);time=Math.min(time,scene.sample(0,params).duration);$('endingMarks').innerHTML=scene.marks(params).map(m=>'<button type="button" class="secondary" data-at="'+m.at+'">'+m.name+'</button>').join('');for(const key of Object.keys(params))$(key+'Value').textContent=params[key]+(['fireworks','pullback','overload'].includes(key)?'秒':'');$('endingParameters').textContent=JSON.stringify(params,null,2);draw();}
 function seek(t){time=t;playing=false;draw()}
 $('endingPlay').addEventListener('click',()=>{if(time>=scene.sample(0,params).duration)time=0;playing=!playing;last=performance.now();draw()});
 $('endingRestart').addEventListener('click',()=>seek(0));$('endingTime').addEventListener('input',()=>seek(Number($('endingTime').value)/10));
 $('endingMarks').addEventListener('click',e=>{const b=e.target.closest?.('[data-at]');if(b)seek(Number(b.dataset.at))});
 $('endingLowFlash').addEventListener('change',draw);
 for(const input of document.querySelectorAll('[data-param]'))input.addEventListener('input',()=>{params[input.dataset.param]=Number(input.value);rebuild()});
 async function loadSkin(){const id=++generation;ready=false;$('endingLoad').textContent='立ち絵を準備しています…';const ok=await hero.preloadSkin($('endingSkin').value);if(id!==generation)return;ready=ok;$('endingLoad').textContent=ok?'立ち絵の準備完了。再生・シークで確認できます。':'立ち絵を読み込めませんでした。';draw()}
 $('endingSkin').addEventListener('change',loadSkin);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;draw()}});
 function frame(now){if(playing){time=Math.min(scene.sample(0,params).duration,time+Math.min(100,now-last)/1000*Number($('endingSpeed').value));if(time>=scene.sample(0,params).duration)playing=false;}last=now;draw();requestAnimationFrame(frame)}
 rebuild();loadSkin();requestAnimationFrame(frame);
})();
