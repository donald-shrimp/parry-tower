/* Beginner art workbench. The puppets remain the only character renderer. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),E=window.ParryArtEdits,P=window.ParryEncounters;
 const enemy=window.ParryEnemyPuppet,knight=window.ParryKnightPuppet,hero=window.ParryHeroPuppet;
 const canvas=$('editorCanvas'),ctx=canvas.getContext('2d'),clone=E.clone;
 const fields={x:'valueX',y:'valueY',rotation:'valueRotation',scaleX:'valueScaleX',scaleY:'valueScaleY',opacity:'valueOpacity',pivotX:'valuePivotX',pivotY:'valuePivotY'};
 const percent=new Set(['scaleX','scaleY','opacity']),history=[],future=[],pixels=new WeakMap();
 for(const input of Object.values(fields))$(input).step='0.01';
 let project=E.empty(),id='sentinel',selected=null,mode='position',tool='move',keyMode=false,time=0,playing=false,loaded=false;
 let model=null,drag=null,drawing=null,region=0,view={x:0,y:0,scale:1},pan={x:0,y:0},cw=600,ch=500,last=performance.now(),lastUI=0;
 let savedAt=0,lastApplied=E.empty(),draftTimer,fieldSession=null;
 let selection=new Set(),groupPivot=null,groupValues={x:0,y:0,rotation:0},groupFieldSession=null;
 const grouped=()=>selection.size>1;
 const duration=()=>id==='hero'?240:3000;
 const char=()=>project.characters[id]||{placement:{x:0,y:0,scale:1},layers:{}};
 const ensureChar=()=>project.characters[id]||(project.characters[id]={placement:{x:0,y:0,scale:1},layers:{}});
 const layer=()=>selected?(char().layers[selected]||E.defaults()):null;
 const ensureLayerFor=key=>{const c=ensureChar();return c.layers[key]||(c.layers[key]=E.defaults());};
 const ensureLayer=()=>ensureLayerFor(selected);
 const currentKey=()=>layer()?.keys.find(k=>Math.abs(k.time-time)<.5);
 const keys=()=>layer()?.keys||[];
 const middleParts=['upper0','fore0','upper1','fore1','weapon'];
 function middleWindow(){
  const k=enemy.specs.guardian.keyPose.inbetween,swing=window.ParryCombatArt.profile(P.byId.guardian).swing;
  const end=1500-(1-k.end)*swing;
  return [1500-(1-k.start)*swing,1500-(1-k.at)*swing,end,Math.ceil(end)];
 }
 function groupMiddleWindow(){
  const k=enemy.specs.guardian.keyPose.inbetween,swing=window.ParryCombatArt.profile(P.byId.guardian).swing;
  return [1500-(1-k.groupStart)*swing,1500-(1-k.groupAt)*swing,...middleWindow().slice(2)];
 }
 const middleTime=()=>groupMiddleWindow()[1];
 const status=text=>{$('status').textContent=text;};
 const format=n=>Math.round(n*100)/100;
 function setRuntime(){E.setProject(project);}
 function saveDraft(){
  clearTimeout(draftTimer);draftTimer=setTimeout(()=>{
   const ok=E.storeDraft(project);$('draftStatus').textContent=ok?'下書き保存済み':'下書きを保存できません。ファイルを書き出してください';
  },250);
 }
 function updateSaved(){
  const dirty=JSON.stringify(project)!==JSON.stringify(lastApplied);$('draftDot').classList.toggle('dirty',dirty);
  $('saveProject').textContent=dirty?'保存してゲームに反映':'ゲームに反映済み';
  if(!dirty&&loaded)$('draftStatus').textContent=savedAt?'保存・反映済み':'元の設定から編集できます';
  else if(loaded&&$('draftStatus').textContent==='読み込み中…')$('draftStatus').textContent='未反映の下書き';
 }
 function finishChange(before,message){
  if(JSON.stringify(before)===JSON.stringify(project))return;
  try{project=E.normalize(project);}catch(error){project=before;setRuntime();refresh();status(error.message);return;}
  history.push(before);if(history.length>60)history.shift();future.length=0;project.updatedAt=Date.now();
  setRuntime();saveDraft();refresh();status(message||'調整しました。再生して動きを確かめられます。');
 }
 function change(fn,message){const before=clone(project);try{fn();finishChange(before,message);}catch(error){project=before;setRuntime();refresh();status(error.message);}}
 function updateModel(){model=id==='hero'?hero.editModel():id==='knight'?knight.editModel():enemy.editModel(P.byId[id]);return model;}
 function rawPose(){
  if(id==='hero'){const q=hero.pose({action:time>0&&time<240?1-time/240:0});return {q,parts:hero.placements(q),rest:hero.placements(hero.pose())};}
  const e=P.byId[id],past=time>=1500;
  const inBattle=mode==='position'&&$('viewMode').value==='battle';
  const data={e:{...e,index:past?1:0},m:window.ParryCombatArt.profile(e),width:inBattle?cw:900,height:inBattle?ch:550,now:10000+time,
   attackAt:past?14500:11500,attackSpan:3000,lastImpactAt:past?11500:-99999,lastDeflectAt:past?11500:-99999,lastStrikeKind:'just'};
  const api=id==='knight'?knight:enemy,s=api.sample(data),rest=id==='knight'?knight.placements(knight.pose()):enemy.pose(s.s).placements;
  return {q:s.q,parts:id==='knight'?knight.placements(s.q):s.q.placements,rest};
 }
 function adjustedPose(raw){
  return E.placements(id,raw.parts,raw.rest,time,model.unit);
 }
 function drawPuppet(raw){const options={editTime:time};if(id==='hero')hero.drawCutout(ctx,raw.q,options);else if(id==='knight')knight.drawCutout(ctx,raw.q,options);else enemy.drawCutout(ctx,P.byId[id],raw.q,options);}
 function battle(){
  const stamp=id==='hero'?1500+time:time,e=P.byId[id==='hero'?'sentinel':id],past=stamp>=1500;
  const data={e:{...e,index:past?1:0},m:window.ParryCombatArt.profile(e),width:cw,height:ch,now:10000+stamp,
   attackAt:past?14500:11500,attackSpan:3000,lastImpactAt:past?11500:-99999,lastDeflectAt:past?11500:-99999,lastStrikeKind:'just'};
  const l=knight.layout(cw,ch,e,data.m),elapsed=stamp-1500,heroPose={action:elapsed>0&&elapsed<240?1-elapsed/240:0,lift:1,lastStrikeKind:'just'};
  const draw=()=>{knight.drawEnemy(ctx,data);knight.drawHero(ctx,{...data,pose:heroPose});};
  if($('ghost').checked){ctx.save();ctx.globalAlpha=.2;E.original(draw);ctx.restore();}draw();
  if(id==='hero')view={x:l.heroX+hero.pose(heroPose).slide*l.heroScale,y:l.ground,scale:l.heroScale};
  else {const sample=(id==='knight'?knight:enemy).sample(data);view={x:sample.x,y:l.ground+(sample.q.float||0)*l.enemyScale,scale:l.enemyScale};}
  const raw=rawPose();drawSelection(adjustedPose(raw));
 }
 function screen(p){return {x:view.x+p.x*view.scale,y:view.y+p.y*view.scale};}
 function world(p){return {x:(p.x-view.x)/view.scale,y:(p.y-view.y)/view.scale};}
 function inverseWhole(p){const w=E.whole(id);return {x:(p.x-w.x*model.unit)/w.scale,y:(p.y-w.y*model.unit)/w.scale};}
 function pointOnPart(p,source){
  const x=(source[0]-p.pivot[0])*model.unit*(p.sx||1),y=(source[1]-p.pivot[1])*model.unit*(p.sy||1);
  const w=E.whole(id),a={x:p.at.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.at.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)};
  return {x:a.x*w.scale+w.x*model.unit,y:a.y*w.scale+w.y*model.unit};
 }
 function sourceOnPart(p,point){
  const w=inverseWhole(point),x=w.x-p.at.x,y=w.y-p.at.y,a=-p.angle;
  return [(x*Math.cos(a)-y*Math.sin(a))/(model.unit*(p.sx||1))+p.pivot[0],(x*Math.sin(a)+y*Math.cos(a))/(model.unit*(p.sy||1))+p.pivot[1]];
 }
 function hitTest(point,parts){
  for(const key of [...E.orderFor(id,model.order)].reverse()){
   const p=parts[key],part=model.parts[key];if(p.visible===false||p.phaseVisible===false||p.opacity===0)continue;
   const s=sourceOnPart(p,point),x=Math.floor(s[0]-part.crop[0]),y=Math.floor(s[1]-part.crop[1]),im=part.image;
   if(x<0||y<0||x>=im.width||y>=im.height)continue;
   if(!pixels.has(im))pixels.set(im,im.getContext('2d').getImageData(0,0,im.width,im.height).data);
   if(pixels.get(im)[(y*im.width+x)*4+3]>24)return key;
  }return null;
 }
 function maskPolys(){if(drag?.kind==='mask')return drag.polys;return clone(E.maskFor(id,selected,model?.parts[selected]?.mask)||[]);}
 function insertMaskPoint(point){
  const polys=maskPolys(),poly=polys[region];if(!poly)return;
  // Use screen pixels for hit areas, including when zoomed out. Existing handles keep their drag gesture.
  if(poly.some(p=>Math.hypot(p[0]-point.x,p[1]-point.y)*view.scale<6))return;
  let edge=-1,best=10/view.scale,added;
  poly.forEach((a,i)=>{
   const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;if(!length)return;
   const t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length));
   const p=[a[0]+t*dx,a[1]+t*dy],distance=Math.hypot(point.x-p[0],point.y-p[1]);
   if(distance<best){best=distance;edge=i;added=p;}
  });
  if(edge<0)return;
  if(poly.length>=512){status('この輪郭の点は512個までです。');return;}
  change(()=>{poly.splice(edge+1,0,added);ensureLayer().mask=polys;},'輪郭に点を追加しました。点をドラッグして調整できます。');
 }
 function drawMask(){
  ctx.globalAlpha=.65;ctx.drawImage(model.parts[selected]?.source||model.source,0,0,model.width,model.height);ctx.globalAlpha=1;
  const polys=maskPolys();
  polys.forEach((poly,i)=>{
   ctx.beginPath();poly.forEach(([x,y],n)=>n?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
   ctx.fillStyle=i===region?'#9ee8cf35':'#92b3c620';ctx.fill();ctx.lineWidth=(i===region?2:1)/view.scale;ctx.strokeStyle=i===region?'#acf5da':'#7593a6';ctx.stroke();
   if(i===region)for(const [x,y]of poly){ctx.beginPath();ctx.arc(x,y,4/view.scale,0,7);ctx.fillStyle='#f0cf90';ctx.fill();ctx.strokeStyle='#322c25';ctx.stroke();}
  });
  if(drawing){ctx.beginPath();drawing.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=2/view.scale;ctx.strokeStyle='#fff0ae';ctx.stroke();
   for(const [x,y]of drawing.points){ctx.beginPath();ctx.arc(x,y,4/view.scale,0,7);ctx.fillStyle='#ffe3a2';ctx.fill();}}
 }
 function drawSelection(parts){
  if(!selected)return;
  const chosen=grouped()?[...selection]:[selected];
  ctx.setTransform(devicePixelRatio||1,0,0,devicePixelRatio||1,0,0);ctx.lineWidth=1;ctx.strokeStyle='#a5eddb';ctx.setLineDash([4,4]);
  for(const key of chosen){
   const p=parts[key];if(!p||p.phaseVisible===false||p.visible===false)continue;const r=model.parts[key].crop;
   const corners=[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]].map(v=>screen(pointOnPart(p,v)));
   ctx.beginPath();corners.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.stroke();
  }
  ctx.setLineDash([]);
  const p=parts[selected],pivot=grouped()?screenWhole(groupCenter(parts)):screen(pointOnPart(p,p.pivot));ctx.strokeStyle='#f0cb7a';ctx.fillStyle='#f0cb7a';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(pivot.x-9,pivot.y);ctx.lineTo(pivot.x+9,pivot.y);ctx.moveTo(pivot.x,pivot.y-9);ctx.lineTo(pivot.x,pivot.y+9);ctx.stroke();
  ctx.beginPath();ctx.arc(pivot.x,pivot.y,4,0,7);ctx.fill();
  if(tool==='rotate'){ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(pivot.x+45,pivot.y-45);ctx.stroke();ctx.beginPath();ctx.arc(pivot.x+45,pivot.y-45,5,0,7);ctx.fill();}
 }
 function render(){
  if(!loaded)return;updateModel();const dpr=devicePixelRatio||1;
  canvas.dataset.character=id;canvas.dataset.selected=selected||'whole';canvas.dataset.time=String(Math.round(time));canvas.dataset.mode=mode;
  canvas.dataset.selection=[...selection].join(',');
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
  if(mode==='position'&&$('viewMode').value==='battle'){battle();return;}
  const zoom=Number($('zoom').value),u=mode==='mask'?1:model.unit;
  const center={x:(model.width/2-(mode==='mask'?0:model.origin[0]))*u,y:(model.height/2-(mode==='mask'?0:model.origin[1]))*u};
  view.scale=Math.min((cw-64)/(model.width*u),(ch-70)/(model.height*u))*zoom;
  view.x=cw/2-center.x*view.scale+pan.x;view.y=ch/2-center.y*view.scale+pan.y;
  ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
  if(mode==='mask'){drawMask();return;}
  const raw=rawPose();
  ctx.lineWidth=1/view.scale;ctx.strokeStyle='#759bb52f';ctx.beginPath();ctx.moveTo(-10000,0);ctx.lineTo(10000,0);ctx.stroke();
  if($('ghost').checked){ctx.save();ctx.globalAlpha=.20;E.original(()=>drawPuppet(raw));ctx.restore();}
  drawPuppet(raw);drawSelection(adjustedPose(raw));
 }
 function refreshLayers(){
  if(!model)return;$('layers').replaceChildren();
  for(const key of [...E.orderFor(id,model.order)].reverse()){
   const part=model.parts[key],patch=char().layers[key],row=document.createElement('div');
   row.className='layer'+(selection.has(key)?' selected':'')+(patch?.visible===false?' hidden-layer':'');row.dataset.layer=key;
   const check=document.createElement('input');check.type='checkbox';check.className='group-check';check.checked=selection.has(key);check.disabled=mode==='mask';check.setAttribute('aria-label',part.label+'をまとめて動かす');check.addEventListener('change',()=>togglePart(key));
   const button=document.createElement('button');button.type='button';button.className='layer-pick';button.setAttribute('aria-label',part.label+'を選ぶ');button.setAttribute('aria-pressed',String(selection.has(key)));
   const thumb=document.createElement('canvas');thumb.width=72;thumb.height=76;const tc=thumb.getContext('2d'),s=Math.min(64/part.image.width,68/part.image.height);
   tc.drawImage(part.image,(72-part.image.width*s)/2,(76-part.image.height*s)/2,part.image.width*s,part.image.height*s);
   const text=document.createElement('span');text.textContent=part.label;button.append(thumb,text);button.addEventListener('click',event=>event.shiftKey||event.ctrlKey||event.metaKey?togglePart(key):selectPart(key));
   const eye=document.createElement('button');eye.type='button';eye.className='visibility';eye.textContent=patch?.visible===false?'−':'◉';eye.setAttribute('aria-label',part.label+(patch?.visible===false?'を表示':'を非表示'));
   eye.addEventListener('click',()=>change(()=>{const c=ensureChar();c.layers[key]||=E.defaults();c.layers[key].visible=c.layers[key].visible===false;},'部品の表示を切り替えました。'));
   row.append(check,button,eye);$('layers').append(row);
  }
  $('selectWhole').classList.toggle('active',!selected);$('layerForward').disabled=!selected||grouped();$('layerBackward').disabled=!selected||grouped();
  $('selectArms').disabled=id==='hero'||!armParts(true).length;$('selectSwordArm').disabled=!armParts(false).length;
 }
 function resetGroup(){groupPivot=null;groupValues={x:0,y:0,rotation:0};groupFieldSession=null;}
 function armParts(both){
  if(id==='hero')return ['upperArm','forearm','weapon'];if(id==='knight')return ['swordUpper','weapon'];
  const s=enemy.specs[id];return [...new Set([...(both?s?.arms||[]:(s?.arms||[]).slice(0,1)).flatMap(a=>[a.upper,a.fore]),...(s?.grip?[s.grip.part]:[])])].filter(k=>model?.parts[k]);
 }
 function selectPart(key){selection=new Set(key?[key]:[]);resetGroup();selected=key;if(key==='strikePose')time=1500;else if(key&&model.parts.strikePose&&rawPose().parts[key]?.phaseVisible===false)time=100;keyMode=false;tool='move';drawing=null;region=0;playing=false;refresh();status(key?'選んだ部品をドラッグして調整できます。':'画像全体をドラッグして、表示位置を調整できます。');}
 function setSelection(keys){
  selection=new Set(keys.filter(k=>model.parts[k]));selected=[...selection][0]||null;resetGroup();keyMode=false;tool='move';playing=false;drawing=null;
  $('groupScope').value=id==='guardian'?'middle':'key';
  if(grouped()&&id==='guardian')time=middleTime();
  refresh();status(grouped()?selection.size+'個の部品をまとめて移動・回転できます。':selected?'部品を選択しました。':'選択を解除しました。');
 }
 function togglePart(key){const keys=new Set(selection);keys.has(key)?keys.delete(key):keys.add(key);if(keys.size===1)selectPart([...keys][0]);else setSelection([...keys]);}
 function screenWhole(p){const w=E.whole(id);return screen({x:p.x*w.scale+w.x*model.unit,y:p.y*w.scale+w.y*model.unit});}
 function sameParts(a,b){return a.length===b.length&&a.every(k=>b.includes(k));}
 function groupCenter(parts){
  if(groupPivot)return groupPivot;const groups=char().groups||[],last=groups.at(-1);
  if(last&&sameParts(last.parts,[...selection])){
   const raw=rawPose(),pre=E.placements(id,raw.parts,raw.rest,time,model.unit,groups.length-1),state=E.groupState(last,pre,time,model.unit);
   if(state)return {x:state.pivot.x+state.x,y:state.pivot.y+state.y};
  }return parts[selected]?.at||{x:0,y:0};
 }
 function groupTarget(g,asKey){
  if(!asKey)return g;const value=E.sampleKeys(g.keys,time);
  if(!g.keys.length){addKeyAt(g,0,E.sampleKeys([],0));addKeyAt(g,duration(),E.sampleKeys([],0));}
  if(!g.keys.some(k=>k.time===Math.round(time)))addKeyAt(g,time,value);
  return g.keys.find(k=>k.time===Math.round(time));
 }
 function beginGroup(){
  const before=clone(project),scope=$('groupScope').value,raw=rawPose(),parts=adjustedPose(raw),center={...groupCenter(parts)};
  try{for(const key of selection){
   const p=raw.parts[key];
   if(p?.phaseVisible===false||char().layers[key]?.visible===false)throw Error('選んだ部品が表示される時点で調整してください。');
  }
   const groups=ensureChar().groups||= [],last=groups.at(-1),range=scope==='middle'?groupMiddleWindow():undefined;
   const reuse=last&&sameParts(last.parts,[...selection])&&(scope==='key'?last.keys.length&&!last.poseWindow:!last.keys.length&&JSON.stringify(last.poseWindow)===JSON.stringify(range));
   if(!reuse){
    if(groups.length>=16)throw Error('連動グループは16個までです。');
    const anchor=parts[selected],x=center.x-anchor.at.x,y=center.y-anchor.at.y,a=-anchor.angle;
    const g={parts:[...selection],anchor:selected,pivot:[(x*Math.cos(a)-y*Math.sin(a))/model.unit,(x*Math.sin(a)+y*Math.cos(a))/model.unit],x:0,y:0,rotation:0,keys:[]};
    if(range)g.poseWindow=range;groups.push(g);
   }
   const index=groups.length-1,g=groups[index],pre=E.placements(id,raw.parts,raw.rest,time,model.unit,index),state=E.groupState(g,pre,time,model.unit);
   if(!state||state.weight<.01)throw Error('「中割り」へ移動してから調整してください。');
   const key=E.sampleKeys(g.keys,time),other=scope==='key'?{x:g.x,y:g.y,rotation:g.rotation}:key;
   groupTarget(g,scope==='key');setRuntime();
   return {before,index,state,other:{...other},scope,pivot:center,display:{...groupValues}};
  }catch(error){project=before;setRuntime();throw error;}
 }
 function applyGroup(g,x,y,rotation){
  g.changed=Math.abs(x)+Math.abs(y)+Math.abs(rotation)>1e-9;
  const total=E.composeGroup(g.state,g.pivot,{x,y,rotation},model.unit),target=groupTarget(ensureChar().groups[g.index],g.scope==='key');
  for(const key of ['x','y','rotation'])target[key]=total[key]-g.other[key];
  groupPivot={x:g.pivot.x+x,y:g.pivot.y+y};groupValues={x:g.display.x+x/model.unit,y:g.display.y+y/model.unit,rotation:g.display.rotation+rotation};
  setRuntime();
 }
 function displayValues(){
  if(!selected){const p=char().placement;return {x:p.x,y:p.y,scaleX:p.scale,scaleY:p.scale,rotation:0,opacity:1,pivotX:0,pivotY:0};}
  const l=layer();return keyMode?{...l,...E.sampleKeys(l.keys,time)}:l;
 }
 function refreshInspector(){
  const whole=!selected,part=model?.parts[selected];
  $('swordBlurControls').hidden=mode!=='position'||!model?.effects;
  const blur=char().effects?.swordBlurDuration??model?.effects?.swordBlurDuration??200;
  for(const key of ['swordBlurRange','swordBlurDuration'])if(document.activeElement!==$(key))$(key).value=blur;
  $('selectionTitle').textContent=part?.label||'画像全体';$('selectionBadge').textContent=mode==='mask'?'切り抜き':keyMode?'この時点のポーズ':'基本設定';
  $('selectionHelp').textContent=mode==='mask'?'原画を見ながら、この部品の輪郭を直します。':whole?'キャラクター全体の表示位置と大きさを調整します。':keyMode?'現在の時点だけに追加する位置・角度です。間の動きは自動でつながります。':'動作全体に加える位置・角度です。絵をクリックして部品を選び直せます。';
  const scoped=!!layer()?.poseWindow;
  if(scoped&&mode==='position'){
   $('selectionBadge').textContent='中割りだけ';
   $('selectionHelp').textContent='この部品の位置・角度は中割りの間だけ反映されます。数値やポーズを直しても、他の区間の動きには加わりません。';
  }
  const multi=grouped();
  $('groupControls').hidden=!multi||mode!=='position';
  $('transformFields').hidden=multi;
  $('groupScope').querySelector('option[value="middle"]').disabled=id!=='guardian';
  $('groupSummary').textContent=selection.size+'個の部品をまとめて調整';
  $('groupSummary').title=[...selection].map(k=>model.parts[k].label).join(' / ');
  for(const [field,key]of [['groupX','x'],['groupY','y'],['groupRotation','rotation']])if(document.activeElement!==$(field))$(field).value=format(groupValues[key]);
  if(multi){
   $('selectionTitle').textContent=selection.size+'個の部品を連動';$('selectionBadge').textContent=$('groupScope').value==='middle'?'中割りだけ':'まとめて編集';
   $('selectionHelp').textContent='部品同士の位置関係を保ち、一緒に移動・回転します。選び直すときは左のチェックを使ってください。';
  }
  $('middleScopeControls').hidden=id!=='guardian'||mode!=='position'||multi;
  if(multi)$('swordBlurControls').hidden=true;
  const scopedCount=middleParts.filter(key=>char().layers[key]?.poseWindow).length;
  const pending=middleParts.filter(key=>{const l=char().layers[key];return l&&!l.poseWindow&&(l.x||l.y||l.rotation||l.keys.some(k=>k.x||k.y||k.rotation));});
  $('scopeMiddle').disabled=!pending.length;
  $('scopeAll').hidden=!scopedCount;
  $('middleScopeStatus').textContent=pending.length?pending.length+'個の部品の調整を中割りだけにできます。':scopedCount?'適用済み：'+scopedCount+'個の部品。中割りで調整を続けられます。':'腕や剣を動かしてから押してください。';
  $('positionControls').hidden=mode==='mask';$('maskControls').hidden=mode!=='mask';
  $('viewMode').disabled=mode==='mask';$('zoom').disabled=mode!=='mask'&&$('viewMode').value==='battle';
  $('transformTools').hidden=whole||mode!=='position';
  for(const key of ['keyEditRow','pivotFields','motionControls'])$(key).hidden=whole||multi;
  for(const key of ['rotationField','scaleYField','opacityField'])$(key).hidden=whole;
  $('keyMode').checked=keyMode;$('replaceMotion').checked=layer()?.mode==='replace';
  const v=displayValues();for(const [key,input]of Object.entries(fields)){if(document.activeElement!==$(input))$(input).value=format((v[key]??0)*(percent.has(key)?100:1));}
  $('keyEditHelp').textContent=keyMode?'位置や角度を変えると、この時点にポーズを記録します。':scoped?'オフなら、中割りの間に加える位置・角度を調整します。':'オフなら、動作全体の位置を調整します。';
  $('easing').value=currentKey()?.easing||'smooth';$('deleteKey').disabled=!currentKey();
  $('addKey').disabled=whole||multi||mode==='mask';$('resetSelection').disabled=multi;$('resetSelection').textContent=whole?'このキャラの調整をリセット':'この部品の調整をリセット';
  ['move','pivot','rotate'].forEach(k=>{$('tool'+k[0].toUpperCase()+k.slice(1)).classList.toggle('active',tool===k);$('tool'+k[0].toUpperCase()+k.slice(1)).setAttribute('aria-pressed',String(tool===k));});
  $('canvasTitle').textContent=model?.name||'';$('canvasMode').textContent=mode==='mask'?'原画の切り抜き':whole?'画像全体':part.label;
  if(multi)$('canvasMode').textContent=selection.size+'個の部品を連動';
  $('canvasHint').textContent=mode==='mask'?(drawing?'輪郭に沿ってクリック → 右の「確定する」':part?.mask?'点をドラッグ · 線をダブルクリックで点を追加':'左で切り抜く部品を選んでください')
   :whole?'絵をドラッグして移動 · ダブルクリックで部品を選択':tool==='pivot'?'黄色い点をドラッグして、回転の中心を変更':tool==='rotate'?'絵の周りをドラッグして回転':'選んだ部品をドラッグ · 矢印キーで微調整';
  if(multi)$('canvasHint').textContent=tool==='pivot'?'共通の回転中心をドラッグ':tool==='rotate'?'選んだ部品をまとめて回転':'選んだ部品をまとめて移動 · 矢印キーで微調整';
  if(mode==='mask')refreshMaskControls();
 }
 function refreshMaskControls(){
  const polys=maskPolys(),can=!!model.parts[selected]?.mask;$('maskRegion').replaceChildren();
  polys.forEach((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent='範囲 '+(i+1);$('maskRegion').append(o);});
  region=Math.min(region,Math.max(0,polys.length-1));$('maskRegion').value=String(region);
  for(const k of ['maskRegion','redrawMask','addMaskRegion'])$(k).disabled=!can||!!drawing;
  $('removeMaskRegion').disabled=!can||polys.length<2||!!drawing;
  $('maskFinish').hidden=!drawing;$('maskNote').textContent=can?'点を移動した後は「位置と動き」で仕上がりを確認できます。':'この部品は残りの画素や補修画像を使います。位置と動きを調整できます。';
 }
 function refreshTimeline(){
  $('timeRange').max=duration();$('timeNumber').max=duration();$('timeRange').value=time;if(document.activeElement!==$('timeNumber'))$('timeNumber').value=Math.round(time);
  $('play').textContent=playing?'Ⅱ 一時停止':'▶ 再生';$('keyMarkers').replaceChildren();
  for(const key of keys()){
   const b=document.createElement('button');b.className='key-marker'+(Math.abs(key.time-time)<1?' current':'');b.style.left=(key.time/duration()*100)+'%';b.title=key.time+' ms のポーズ';b.setAttribute('aria-label',key.time+'ミリ秒のポーズ');
   b.addEventListener('click',()=>{setTime(key.time);keyMode=true;refreshInspector();refreshTimeline();});$('keyMarkers').append(b);
  }
  $('keyHint').textContent=selected?keys().length+'個のポーズを記録'+(keyMode?' · この時点を編集':''):'部品を選ぶと、時点ごとの動きを編集できます';
 }
 function refreshPhases(){
  $('phaseButtons').replaceChildren();const stages=id==='hero'?[[0,'構え'],[38,'溜め'],[90,'振り'],[160,'振り抜き'],[240,'戻り']]:[[100,'待機'],[1200,'溜め'],[1485,'振り'],[1500,'接触'],[1623,'反動'],[1720,model?.parts.strikePose?'反動を収める':'腕を畳む'],[1900,'構え直し'],[2110,'復帰']];
  if(id==='guardian')stages.splice(2,0,[middleTime(),'中割り']);
  for(const [at,label]of stages){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>setTime(at));$('phaseButtons').append(b);}
 }
 function refresh(){
  if(!loaded)return;updateModel();refreshLayers();refreshInspector();refreshTimeline();updateSaved();
  $('undo').disabled=!history.length;$('redo').disabled=!future.length;
  $('editPosition').classList.toggle('active',mode==='position');$('editMask').classList.toggle('active',mode==='mask');
  $('editPosition').setAttribute('aria-pressed',String(mode==='position'));$('editMask').setAttribute('aria-pressed',String(mode==='mask'));
  $('gameLink').href='./dev.html?floor='+(id==='hero'?2:P.byId[id]?.boss?5:2)+'&enemy='+(id==='hero'?'sentinel':id)+'&art=illustrated';
 }
 function setTime(value){time=Math.max(0,Math.min(duration(),Number(value)||0));playing=false;if(grouped())resetGroup();refreshTimeline();refreshInspector();}
 function addKeyAt(l,at,values){
  const record={time:Math.round(at),x:values.x||0,y:values.y||0,rotation:values.rotation||0,scaleX:values.scaleX??1,scaleY:values.scaleY??1,opacity:values.opacity??1,easing:values.easing||'smooth'};
  l.keys=l.keys.filter(k=>k.time!==record.time);l.keys.push(record);l.keys.sort((a,b)=>a.time-b.time);
 }
 function editTargetFor(key,asKey){
  const l=ensureLayerFor(key);if(!asKey)return l;
  const values=E.sampleKeys(l.keys,time);if(!l.keys.length){addKeyAt(l,0,E.sampleKeys([],0));addKeyAt(l,duration(),E.sampleKeys([],0));}
  let k=l.keys.find(k=>k.time===Math.round(time));if(!k){addKeyAt(l,time,values);k=l.keys.find(k=>k.time===Math.round(time));}return k;
 }
 function editTarget(){return !selected?ensureChar().placement:editTargetFor(selected,keyMode);}
 function setField(key,value){
  const target=(key==='pivotX'||key==='pivotY')?ensureLayer():editTarget();
  if(['x','y','pivotX','pivotY'].includes(key))value=Math.max(-4000,Math.min(4000,value));
  if(!selected&&key==='scaleX')target.scale=value;else target[key]=value;
 }
 function chooseCharacter(value){
  id=value;selected=null;selection.clear();resetGroup();time=0;playing=false;keyMode=false;mode='position';drawing=null;pan={x:0,y:0};$('zoom').value='1';$('groupScope').value=id==='guardian'?'middle':'key';refreshPhases();refresh();
  const count=P.all.filter(e=>(e.sprite||e.id)===id).length;$('sharedNote').textContent=id==='hero'?'主人公の反撃モーションを編集':count>1?'色違いを含む '+count+' 種で、この原画の調整を共有します。':'原画と現在のモーションを読み込みました。';
 }
 function changeOrder(delta){if(!selected)return;change(()=>{const order=[...E.orderFor(id,model.order)],at=order.indexOf(selected),next=Math.max(0,Math.min(order.length-1,at+delta));[order[at],order[next]]=[order[next],order[at]];ensureChar().order=order;},'部品の重なり順を変えました。');}
 function setMode(next){mode=next;playing=false;drawing=null;pan={x:0,y:0};if(next==='mask'){if(!model.parts[selected]?.mask)selected=[...model.order].reverse().find(k=>model.parts[k].mask)||null;selection=new Set(selected?[selected]:[]);resetGroup();}refresh();}
 function undo(back){const from=back?history:future,to=back?future:history;if(!from.length)return;to.push(clone(project));project=from.pop();resetGroup();setRuntime();saveDraft();refresh();status(back?'ひとつ前の状態に戻しました。':'変更をやり直しました。');}
 const pointer=event=>{const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};};
 canvas.addEventListener('pointerdown',event=>{
  if(!loaded||event.button!==0)return;event.preventDefault();canvas.focus();playing=false;const at=pointer(event),w=world(at);
  if(mode==='mask'){
   if(!model.parts[selected]?.mask)return;
   const p=[Math.max(0,Math.min(model.width,w.x)),Math.max(0,Math.min(model.height,w.y))];
   if(drawing){drawing.points.push(p);refreshMaskControls();return;}
   const polys=maskPolys();let index=-1,best=13/view.scale;polys[region]?.forEach((p,i)=>{const d=Math.hypot(p[0]-w.x,p[1]-w.y);if(d<best){best=d;index=i;}});
   if(index<0)return;drag={kind:'mask',before:clone(project),polys,index};
  }else{
   const raw=rawPose(),parts=adjustedPose(raw);
   if(event.shiftKey||event.ctrlKey||event.metaKey){const hit=hitTest(w,parts);if(hit)togglePart(hit);return;}
   if(grouped()){
    try{
     if(tool==='pivot')drag={kind:'groupPivot',before:clone(project),pivot:groupPivot&&{...groupPivot}};
     else {const g=beginGroup(),center=screenWhole(g.pivot),angle=Math.atan2(at.y-center.y,at.x-center.x);drag={...g,kind:'group',at,center,angle,lastAngle:angle,turned:0,tool};}
    }catch(error){status(error.message);return;}
    canvas.setPointerCapture(event.pointerId);return;
   }
   if(selected&&tool==='move'){const hit=hitTest(w,parts);if(hit&&hit!==selected){selectPart(hit);}}
   const values=displayValues();drag={kind:!selected?'whole':tool,at,start:clone(values),before:clone(project),parts,raw,selected};
   if(selected){const p=parts[selected],center=screen(pointOnPart(p,p.pivot));drag.center=center;drag.angle=drag.lastAngle=Math.atan2(at.y-center.y,at.x-center.x);drag.turned=0;}
  }
  canvas.setPointerCapture(event.pointerId);refreshTimeline();
 });
 canvas.addEventListener('pointermove',event=>{
  if(!drag)return;const at=pointer(event),w=world(at);
  if(drag.kind==='groupPivot'){groupPivot=inverseWhole(w);return;}
  if(drag.kind==='group'){
   const scale=view.scale*E.whole(id).scale;
   const angle=Math.atan2(at.y-drag.center.y,at.x-drag.center.x);
   drag.turned+=E.rotationStep(drag.lastAngle,angle);drag.lastAngle=angle;
   try{applyGroup(drag,drag.tool==='move'?(at.x-drag.at.x)/scale:0,drag.tool==='move'?(at.y-drag.at.y)/scale:0,
    drag.tool==='rotate'?drag.turned*180/Math.PI:0);refreshInspector();}
   catch(error){project=drag.before;drag=null;resetGroup();setRuntime();refresh();status(error.message);}
   return;
  }
  if(drag.kind==='mask')drag.polys[region][drag.index]=[Math.max(0,Math.min(model.width,w.x)),Math.max(0,Math.min(model.height,w.y))];
  else {
   const scale=view.scale*model.unit*(drag.kind==='whole'?1:E.whole(id).scale),dx=(at.x-drag.at.x)/scale,dy=(at.y-drag.at.y)/scale;
   if(drag.kind==='move'||drag.kind==='whole'){setField('x',Math.max(-4000,Math.min(4000,drag.start.x+dx)));setField('y',Math.max(-4000,Math.min(4000,drag.start.y+dy)));}
   else if(drag.kind==='rotate'){const angle=Math.atan2(at.y-drag.center.y,at.x-drag.center.x);drag.turned+=E.rotationStep(drag.lastAngle,angle);drag.lastAngle=angle;setField('rotation',Math.max(-4320,Math.min(4320,drag.start.rotation+drag.turned*180/Math.PI)));}
   else if(drag.kind==='pivot'){
    const base=layer().mode==='replace'?drag.raw.rest[selected]:drag.raw.parts[selected],a=-base.angle;
    setField('pivotX',drag.start.pivotX+(dx*Math.cos(a)-dy*Math.sin(a))/(base.sx||1));
    setField('pivotY',drag.start.pivotY+(dx*Math.sin(a)+dy*Math.cos(a))/(base.sy||1));
   }
   setRuntime();refreshInspector();
  }
 });
 function finishDrag(){if(!drag)return;const old=drag;drag=null;if(old.kind==='groupPivot'){status('共通の回転中心を変更しました。');return;}if(old.kind==='group'&&!old.changed){project=old.before;setRuntime();refresh();return;}if(old.kind==='mask'){if(JSON.stringify(old.polys)===JSON.stringify(E.maskFor(id,selected,model.parts[selected].mask)))return;ensureLayer().mask=old.polys;}finishChange(old.before,old.kind==='mask'?'切り抜きの輪郭を変更しました。':old.kind==='group'?'選んだ部品をまとめて動かしました。':'ドラッグした位置を記録しました。');}
 canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',()=>{if(!drag)return;if(drag.kind==='groupPivot')groupPivot=drag.pivot;project=drag.before;drag=null;setRuntime();refresh();});
 canvas.addEventListener('dblclick',event=>{
  if(!loaded||event.button!==0)return;
  if(mode==='mask'){if(!drawing&&model.parts[selected]?.mask){event.preventDefault();insertMaskPoint(world(pointer(event)));}return;}
  if(grouped())return;const parts=adjustedPose(rawPose()),hit=hitTest(world(pointer(event)),parts);if(hit)selectPart(hit);
 });
 canvas.addEventListener('wheel',event=>{event.preventDefault();const values=[.75,1,1.5,2],at=values.indexOf(Number($('zoom').value));$('zoom').value=String(values[Math.max(0,Math.min(3,at+(event.deltaY<0?1:-1)))]);},{passive:false});
 for(const [key,input]of Object.entries(fields)){
  const field=$(input);field.addEventListener('focus',()=>{fieldSession={input,before:clone(project)};playing=false;});
  field.addEventListener('input',()=>{
   if((key==='pivotX'||key==='pivotY')&&!selected)return;
   const value=Number(field.value)/(percent.has(key)?100:1);if(!field.value||!field.checkValidity()||!Number.isFinite(value))return;
   fieldSession||={input,before:clone(project)};playing=false;setField(key,value);setRuntime();refreshInspector();refreshTimeline();updateSaved();
  });
  field.addEventListener('blur',()=>{if(fieldSession?.input!==input)return;const before=fieldSession.before;fieldSession=null;finishChange(before,keyMode?'この時点のポーズを更新しました。':'表示の設定を変更しました。');refreshInspector();});
  field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();field.blur();}});
 }
 for(const [input,key]of [['groupX','x'],['groupY','y'],['groupRotation','rotation']]){
  const field=$(input);
  field.addEventListener('focus',()=>{if(!grouped())return;playing=false;groupFieldSession={input,gesture:null};});
  field.addEventListener('input',()=>{
   if(!grouped()||!field.value||!field.checkValidity())return;
   try{
    if(groupFieldSession?.input!==input||!groupFieldSession.gesture)groupFieldSession={input,gesture:beginGroup()};
    const g=groupFieldSession.gesture,value=Number(field.value)-g.display[key];
    applyGroup(g,key==='x'?value*model.unit:0,key==='y'?value*model.unit:0,key==='rotation'?value:0);refreshInspector();updateSaved();
   }catch(error){if(groupFieldSession?.gesture)project=groupFieldSession.gesture.before;groupFieldSession=null;resetGroup();setRuntime();refresh();status(error.message);}
  });
  field.addEventListener('blur',()=>{if(groupFieldSession?.input!==input)return;const g=groupFieldSession.gesture;groupFieldSession=null;if(g?.changed)finishChange(g.before,'選んだ部品をまとめて調整しました。');else if(g){project=g.before;setRuntime();refresh();}refreshInspector();});
  field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();field.blur();}});
 }
 $('selectArms').addEventListener('click',()=>setSelection(armParts(true)));
 $('selectSwordArm').addEventListener('click',()=>setSelection(armParts(false)));
 $('clearGroup').addEventListener('click',()=>selectPart(null));
 $('groupScope').addEventListener('change',()=>{if($('groupScope').value==='middle')time=middleTime();resetGroup();playing=false;refreshInspector();refreshTimeline();});
 $('characterSelect').addEventListener('change',event=>chooseCharacter(event.target.value));$('selectWhole').addEventListener('click',()=>{mode='position';selectPart(null);});
 function setSwordBlur(value){
  if(!model?.effects)return;const ms=Math.max(40,Math.min(400,Math.round(Number(value)||200)));
  change(()=>{const c=ensureChar();c.effects={...c.effects,swordBlurDuration:ms};},'残像が'+ms+' msで追いつきます。再生して確認できます。');
 }
 $('swordBlurRange').addEventListener('input',event=>setSwordBlur(event.target.value));
 $('swordBlurDuration').addEventListener('input',event=>{const n=event.target.valueAsNumber;if(n>=40&&n<=400)setSwordBlur(n);});
 $('swordBlurDuration').addEventListener('change',event=>setSwordBlur(event.target.value));
 $('swordBlurFast').addEventListener('click',()=>setSwordBlur(80));
 $('swordBlurDefault').addEventListener('click',()=>setSwordBlur(model.effects.swordBlurDuration));
 $('editPosition').addEventListener('click',()=>setMode('position'));$('editMask').addEventListener('click',()=>setMode('mask'));
 $('layerForward').addEventListener('click',()=>changeOrder(1));$('layerBackward').addEventListener('click',()=>changeOrder(-1));
 for(const k of ['move','pivot','rotate'])$('tool'+k[0].toUpperCase()+k.slice(1)).addEventListener('click',()=>{tool=k;playing=false;refreshInspector();});
 $('keyMode').addEventListener('change',event=>{keyMode=event.target.checked;playing=false;refreshInspector();refreshTimeline();});
 $('scopeMiddle').addEventListener('click',()=>{
  if(id!=='guardian')return;
  change(()=>{
   const range=middleWindow();for(const key of middleParts){const l=char().layers[key];
    if(l&&(l.x||l.y||l.rotation||l.keys.some(k=>k.x||k.y||k.rotation)))l.poseWindow=[...range];
   }
   time=middleTime();playing=false;
  },'腕と剣の位置・角度を中割りだけに適用しました。他の区間では元の動きを使います。');
 });
 $('scopeAll').addEventListener('click',()=>{
  if(id!=='guardian')return;
  change(()=>{for(const key of middleParts){const l=char().layers[key];if(l)delete l.poseWindow;}},'腕と剣の位置・角度を、動作全体へ適用する設定に戻しました。');
 });
 $('timeRange').addEventListener('input',event=>setTime(event.target.value));$('timeNumber').addEventListener('input',event=>setTime(event.target.value));
 $('play').addEventListener('click',()=>{const next=!playing;if(mode!=='position')setMode('position');if(grouped())resetGroup();playing=next;if(time>=duration())time=0;refreshInspector();refreshTimeline();});
 $('addKey').addEventListener('click',()=>{if(!selected)return;change(()=>{const l=ensureLayer(),v=E.sampleKeys(l.keys,time);if(!l.keys.length){addKeyAt(l,0,E.sampleKeys([],0));addKeyAt(l,duration(),E.sampleKeys([],0));}addKeyAt(l,time,v);keyMode=true;},'この時点のポーズを記録しました。位置や角度を調整できます。');});
 $('deleteKey').addEventListener('click',()=>{if(!currentKey())return;change(()=>{ensureLayer().keys=layer().keys.filter(k=>k.time!==Math.round(time));},'この時点のポーズを削除しました。');});
 $('easing').addEventListener('change',event=>{if(!selected)return;change(()=>{keyMode=true;editTarget().easing=event.target.value;},'次のポーズまでの動き方を変えました。');});
 $('replaceMotion').addEventListener('change',event=>{if(selected)change(()=>{ensureLayer().mode=event.target.checked?'replace':'add';},'元の動きを使う設定を変えました。');});
 $('motionPreset').addEventListener('change',event=>{
  const kind=event.target.value;event.target.value='';if(!kind||!selected)return;
  change(()=>{const l=ensureLayer(),d=duration(),frames=kind==='spin'?[[0,0],[d*.15,-12],[d*.6,360],[d,360]]:kind==='sway'?[[0,0],[d*.25,-18],[d*.75,18],[d,0]]:[[0,0],[d*.40,-35],[d*.50,65],[d*.67,20],[d,0]];
   l.keys=[];if(kind!=='reset')for(const [at,angle]of frames)addKeyAt(l,at,{rotation:angle});keyMode=false;
  },kind==='reset'?'追加した動きを消しました。':'部品に動きを追加しました。再生して確認できます。');
 });
 $('resetSelection').addEventListener('click',()=>change(()=>{if(selected)delete ensureChar().layers[selected];else delete project.characters[id];keyMode=false;},'元の設定へ戻しました。「元に戻す」で取り消せます。'));
 $('maskRegion').addEventListener('change',event=>{region=Number(event.target.value);});
 function startDrawing(add){drawing={points:[],add};refreshInspector();status('輪郭に沿って3点以上クリックし、「輪郭を確定する」を押してください。');}
 $('redrawMask').addEventListener('click',()=>startDrawing(false));$('addMaskRegion').addEventListener('click',()=>startDrawing(true));
 $('cancelMask').addEventListener('click',()=>{drawing=null;refreshInspector();});
 $('finishMask').addEventListener('click',()=>{
  if(!drawing||drawing.points.length<3){status('輪郭の点を3つ以上置いてください。');return;}
  change(()=>{const polys=maskPolys();if(drawing.add){polys.push(drawing.points);region=polys.length-1;}else polys[region]=drawing.points;ensureLayer().mask=polys;drawing=null;},'切り抜き範囲を保存しました。位置と動きで仕上がりを確認できます。');
 });
 $('removeMaskRegion').addEventListener('click',()=>change(()=>{const polys=maskPolys();if(polys.length>1){polys.splice(region,1);region=0;ensureLayer().mask=polys;}},'選んだ範囲を削除しました。'));
 $('undo').addEventListener('click',()=>undo(true));$('redo').addEventListener('click',()=>undo(false));
 $('fitView').addEventListener('click',()=>{pan={x:0,y:0};$('zoom').value='1';status('全体が見える表示に戻しました。');});
 $('viewMode').addEventListener('change',()=>{playing=false;refreshInspector();status($('viewMode').value==='battle'?'ゲームと同じ配置で表示しています。調整は右の数値やドラッグで反映されます。':'一人で編集する表示に戻しました。');});
 $('helpToggle').addEventListener('click',()=>{$('helpDialog').showModal();$('helpToggle').setAttribute('aria-expanded','true');});
 $('closeHelp').addEventListener('click',()=>{$('helpDialog').close();$('helpToggle').setAttribute('aria-expanded','false');});
 $('exportProject').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(E.normalize(project),null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='parry-art-adjustments.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('調整ファイルを書き出しました。このファイルから編集を再開できます。');});
 $('importProject').addEventListener('click',()=>$('importFile').click());
 $('importFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>2*1024*1024)throw Error('調整ファイルは2MB以内にしてください');const next=E.normalize(JSON.parse(await file.text()));change(()=>{project=next;},'調整ファイルを読み込みました。保存するとゲームにも反映します。');}
  catch(error){status('読み込めませんでした：'+error.message);}finally{event.target.value='';}
 });
 $('saveProject').addEventListener('click',async()=>{
  $('saveProject').disabled=true;playing=false;project.updatedAt=Date.now();const snapshot=E.normalize(project),local=E.applyLocal(snapshot);E.storeDraft(snapshot);
  try{
   const response=await fetch('./__art-studio/project',{method:'POST',headers:{'Content-Type':'application/json','X-Parry-Art-Studio':'1'},body:JSON.stringify(snapshot)});
   if(!response.ok)throw Error('server');const result=await response.json();if(!result.saved)throw Error('save');
   savedAt=Date.now();lastApplied=clone(snapshot);status('保存しました。ゲームにも反映済みです。「実戦で確認」で確かめられます。');
  }catch{
   if(local){lastApplied=clone(snapshot);status('このブラウザのゲームに反映しました。ファイルへの保存は「調整ファイルを書き出す」を使ってください。');}
   else status('保存できませんでした。「調整ファイルを書き出す」で保存してください。');
  }finally{$('saveProject').disabled=false;setRuntime();refresh();}
 });
 document.addEventListener('keydown',event=>{
  if($('helpDialog').open)return;const editing=/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName);
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!editing){event.preventDefault();undo(!event.shiftKey);return;}
  if(editing)return;
  if(event.code==='Space'){event.preventDefault();$('play').click();}
  if(event.key==='Escape'&&drawing){drawing=null;refreshInspector();}
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(arrows[event.key]&&mode==='position'&&loaded){event.preventDefault();playing=false;const [x,y]=arrows[event.key],step=event.shiftKey?10:1;change(()=>{if(grouped()){const g=beginGroup();applyGroup(g,x*step*model.unit,y*step*model.unit,0);}else{const target=editTarget();target.x=Math.max(-4000,Math.min(4000,target.x+x*step));target.y=Math.max(-4000,Math.min(4000,target.y+y*step));}},grouped()?'選んだ部品をまとめて微調整しました。':'位置を微調整しました。');}
 });
 new ResizeObserver(()=>{const r=$('canvasWrap').getBoundingClientRect();cw=r.width;ch=r.height;const d=devicePixelRatio||1;canvas.width=Math.round(cw*d);canvas.height=Math.round(ch*d);}).observe($('canvasWrap'));
 function tick(now){
  const elapsed=Math.min(50,now-last);last=now;
  if(playing&&loaded){time=(time+elapsed*Number($('speed').value))%duration();if(now-lastUI>80){lastUI=now;refreshTimeline();refreshInspector();}}
  render();requestAnimationFrame(tick);
 }
 async function init(){
  try{
   await E.ready;await window.ParryCombatArt.preload();const ok=await knight.preload();if(!ok)throw Error('原画を読み込めませんでした');
   lastApplied=E.getProject();const draft=E.readDraft();project=draft&&draft.updatedAt>=lastApplied.updatedAt?draft:clone(lastApplied);setRuntime();
   const ids=['hero','knight',...Object.keys(enemy.specs)];for(const key of ids){const o=document.createElement('option');o.value=key;o.textContent=key==='hero'?'主人公':key==='knight'?'錆びた騎士':enemy.specs[key].name;$('characterSelect').append(o);}
   const query=new URLSearchParams(location.search);if(ids.includes(query.get('character')))id=query.get('character');
   loaded=true;$('characterSelect').disabled=false;$('characterSelect').value=id;$('saveProject').disabled=false;$('play').disabled=false;$('loading').hidden=true;
   chooseCharacter(id);status('準備できました。画像全体、または左の部品を選んで調整してください。');
  }catch(error){$('loading').textContent=error.message+'。ページを再読み込みしてください。';status('読み込みに失敗しました。');console.error(error);}
 }
 requestAnimationFrame(tick);init();
})();
