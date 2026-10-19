/* Review only: no gameplay writes, persistence, adoption or merge action. */
(()=>{
 'use strict';const $=id=>document.getElementById(id),P=window.ParryEncounters,query=new URLSearchParams(location.search);
 let manifest,palettes,allEntries=[],entries=[],playing=false,time=100,last=performance.now(),sent=0,motion=false;
 const style=()=>$('style').value,isPalette=()=>$('comparison').value==='palette';
 const entry=()=>entries.find(e=>e.key===$('character').value)||entries[0];
 const poseFile=(e=entry(),role=$('pose').value)=>manifest.files.find(f=>f.id===e.sourceId&&f.role===role)||manifest.files.find(f=>f.id===e.sourceId&&f.role==='ready');
 const asset=path=>'./assets/'+path;
 const filter=e=>e.palette?'hue-rotate('+e.palette.hueRotate+'deg) saturate('+e.palette.saturation+'%)':'none';
 const candidateInfo=e=>palettes.characters.find(c=>c.id===e.key);
 const candidateFilter=e=>isPalette()&&!candidateInfo(e)?.retainOriginalPalette?'none':filter(e);
 const reviewLabel=e=>({'approved':'配色了承済み','original-approved':'元の配色を維持・了承済み','revised-review':'塗り分け修正・確認用'}[candidateInfo(e)?.reviewStatus]||'');
 const styleLabel=()=>manifest.profiles[style()]?.label||'原画解像度';
 function paths(e,file){
  const old=style()==='original'?file.source:file.variants[style()].source;
  const changed=palettes.characters.find(c=>c.id===e.key)?.files.find(f=>f.role===file.role);
  return isPalette()?[old,changed.variants[style()].source]:[file.source,old];
 }
 function show(){
  const e=entry(),file=poseFile(),pair=paths(e,file);
  ['original','candidate'].forEach((id,i)=>{
   $(id).src=asset(pair[i]);$(id).style.filter=i===1?candidateFilter(e):filter(e);
   $(id).style.width=(Number($('zoom').value)*100)+'%';$(id).style.height=(Number($('zoom').value)*100)+'%';
   $(id).classList.toggle('pixel',style()!=='original'&&(i===1||isPalette()));
   $(id).alt=e.name+(isPalette()?(i?'の提案配色':'の現在の配色'):(i?'のドット絵候補':'の原画'));
  });
  $('beforeLabel').textContent=isPalette()?styleLabel():'原画';$('variantLabel').textContent=styleLabel();
  $('details').textContent=e.name+' · '+($('pose').value==='contact'?'打ち込み':'構え')+' · '+styleLabel()+(isPalette()?' · '+e.zone+' / '+reviewLabel(e):'')+' / 原画は保持・細かめを本編に採用済み';
 }
 function choose(){
  const e=entry(),old=$('pose').value;$('pose').replaceChildren();
  for(const file of manifest.files.filter(f=>f.id===e.sourceId&&['ready','contact'].includes(f.role))){const o=document.createElement('option');o.value=file.role;o.textContent=file.role==='ready'?'構え':'振り下ろし・打ち込み';$('pose').append(o);}
  if([...$('pose').options].some(o=>o.value===old))$('pose').value=old;
  show();if(motion){if(isPalette())$('afterMotion').src=frameUrl(true);send();}
 }
 function gallery(){
  $('gallery').replaceChildren();
  for(const e of entries){
   const file=poseFile(e,'ready'),button=document.createElement('button');button.type='button';button.className='card';
   const name=document.createElement('span');name.textContent=e.name;button.append(name);const pair=document.createElement('div');pair.className='thumbs';
   paths(e,file).forEach((path,i)=>{const image=document.createElement('img');image.src=asset(path);image.loading='lazy';image.width=file.width;image.height=file.height;image.alt=e.name+(i?' 候補':' 現在');image.style.filter=i===1?candidateFilter(e):filter(e);if(style()!=='original'&&(i===1||isPalette()))image.className='pixel';pair.append(image);});
   button.append(pair);const caption=document.createElement('small');caption.textContent=isPalette()?e.zone+' · '+reviewLabel(e):'原画 / '+styleLabel();button.append(caption);
   button.addEventListener('click',()=>{$('character').value=e.key;choose();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});$('gallery').append(button);
  }
 }
 function mode(){
  const old=$('character').value;entries=isPalette()?allEntries.filter(e=>palettes.characters.some(c=>c.id===e.key)).sort((a,b)=>a.zoneIndex-b.zoneIndex||Number(a.boss)-Number(b.boss)):allEntries;
  $('character').replaceChildren();for(const e of entries){const o=document.createElement('option');o.value=e.key;o.textContent=e.name;$('character').append(o);}
  $('character').value=entries.some(e=>e.key===old)?old:isPalette()?'endking':'knight';
  $('style').querySelector('option[value="original"]').disabled=!isPalette();if(!isPalette()&&style()==='original')$('style').value='fine';
  $('pageTitle').textContent=isPalette()?'その階層に似合う、色へ。':'いつもの立ち絵を、ドット絵に。';
  $('intro').textContent=isPalette()?'火・氷・星・虚無。左が現在の配色、右が素材を塗り分けた候補です。':'元の絵とポーズを保って加工した3つの候補。見た目と動きで比べてください。';
  for(const id of ['beforeTitle','beforeMotionTitle'])$(id).textContent=isPalette()?'現在の配色':'今の立ち絵';
  for(const id of ['afterTitle','afterMotionTitle'])$(id).textContent=isPalette()?'提案配色':'ドット絵の候補';
  $('galleryTitle').textContent=isPalette()?'色違い12体を見比べる':'全キャラクターを見比べる';choose();gallery();if(motion)loadFrames();
 }
 function frameUrl(right=false){
  const e=entry(),params=new URLSearchParams({enemy:e.key==='hero'?'knight':e.key,time:String(Math.round(time)),embed:'1'});
  if((right||isPalette())&&style()!=='original')params.set('pixelStyle',style());
  if(right&&isPalette())params.set('paletteEnemy',e.key);
  return './art-preview.html?'+params;
 }
 function loadFrames(){$('beforeMotion').src=frameUrl();$('afterMotion').src=frameUrl(true);}
 function send(){
  const e=entry(),state={type:'parry-pixel-review',enemy:e.key==='hero'?'knight':e.key,rank:$('rank').value,result:$('result').value,time};
  for(const id of ['beforeMotion','afterMotion'])$(id).contentWindow?.postMessage(state,location.origin);
 }
 function tick(stamp){if(playing&&motion){time=(time+Math.min(80,stamp-last)*Number($('speed').value))%2900;$('time').value=Math.round(time);}
  last=stamp;$('timeLabel').textContent=(time/1000).toFixed(2)+' s';if(motion&&stamp-sent>32){send();sent=stamp;}requestAnimationFrame(tick);}
 $('comparison').addEventListener('change',mode);$('character').addEventListener('change',choose);
 $('pose').addEventListener('change',()=>{show();time=$('pose').value==='contact'?1500:100;$('time').value=time;playing=false;$('play').textContent='再生';if(motion)send();});$('zoom').addEventListener('change',show);
 $('style').addEventListener('change',()=>{show();gallery();if(motion)loadFrames();});
 $('openMotion').addEventListener('click',()=>{motion=!motion;$('motionPanel').hidden=!motion;$('openMotion').textContent=motion?'動きの比較を閉じる':'動きの比較を開く';
  if(motion)loadFrames();else{playing=false;$('play').textContent='再生';for(const id of ['beforeMotion','afterMotion'])$(id).removeAttribute('src');}});
 $('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'一時停止':'再生';});
 $('time').addEventListener('input',()=>{playing=false;$('play').textContent='再生';time=Number($('time').value);send();});
 for(const id of ['rank','result'])$(id).addEventListener('change',send);
 for(const id of ['beforeMotion','afterMotion'])$(id).addEventListener('load',send);
 const imageStages=[...document.querySelectorAll('.image-stage')];
 for(const pane of imageStages)pane.addEventListener('scroll',()=>{for(const other of imageStages)if(other!==pane&&(other.scrollTop!==pane.scrollTop||other.scrollLeft!==pane.scrollLeft)){other.scrollTop=pane.scrollTop;other.scrollLeft=pane.scrollLeft;}});
 for(const el of document.querySelectorAll('select,button'))el.disabled=true;
 Promise.all(['pixel','palette'].map(kind=>fetch('./assets/character-art/'+kind+'-candidates/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('候補一覧を読み込めません');return r.json();}))).then(([data,recoloured])=>{
  manifest=data;palettes=recoloured;allEntries=[{key:'hero',sourceId:'hero',name:'主人公'},...P.all.map(e=>{
   const zone=P.ZONES.findIndex(z=>z.boss===e.id||Object.values(z.fixed).includes(e.id)||Object.values(z.pools).some(p=>p.includes(e.id)));
   return {key:e.id,sourceId:e.sprite||e.id,name:e.name,palette:e.palette,zoneIndex:zone,boss:!!e.boss,zone:zone<0?'全域':(zone*10+1)+'〜'+(zone*10+10)+'F '+P.ZONES[zone].name};
  })];
  for(const el of document.querySelectorAll('select,button'))el.disabled=false;
  if(query.get('compare')==='palette')$('comparison').value='palette';mode();
  if(entries.some(e=>e.key===query.get('enemy'))){$('character').value=query.get('enemy');choose();}
  requestAnimationFrame(tick);
 }).catch(error=>{$('details').textContent=error.message;});
})();
