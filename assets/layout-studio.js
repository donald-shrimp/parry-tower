(async()=>{
 'use strict';
 const M=window.ParryMenuLayout,$=id=>document.getElementById(id),DRAFT='parry.menu-layout.draft.v1';
 const adopted=M.normalize(window.ParryMenuLayoutConfig),frames=[$('editedFrame'),$('originalFrame')];
 let project=M.normalize(adopted),selected='title',profile='mobile',canSave=false,ready=false,labels={},savedWarning='';
 const status=text=>{$('studioStatus').textContent=text;};
 const blockNames={symbol:'シンボル',kicker:'英語小見出し',heading:'見出し',summary:'説明・結果',records:'記録',actions:'ボタン'};
 const sizeNames={columns:['下段の列数','列'],mainWidth:['主操作の幅','%'],mainSize:['主操作の文字サイズ','px'],secondarySize:['サブボタンの文字サイズ','px'],height:['ボタンの最小高さ','px'],gap:['下段ボタンの間隔','px'],rowGap:['主操作と下段の間隔','px'],blockGap:['各表示項目の間隔','px'],padding:['画面内側の余白','px']};
 const current=()=>project.screens[selected];
 function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function persist(){
  project.updatedAt=Date.now();
  try{localStorage.setItem(DRAFT,JSON.stringify(project));status('下書きを保存しました。');}
  catch{status('下書きを保存できません。JSONを書き出してください。');}
 }
 function fit(){
  const width=Number($('previewWidth').value),height=844;
  for(const frame of frames){
   const stage=frame.parentElement,scale=Math.min(1,stage.clientWidth/width);
   frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')';frame.style.left=(stage.clientWidth-width*scale)/2+'px';stage.style.height=height*scale+'px';
  }
  $('previewInfo').textContent=width+' × '+height+'pxの画面を表示。幅が収まらない場合は縮小します。操作ボタンは表示の確認用です。';
 }
 function preview(){
  if(!ready)return;
  const hasCheckpoint=$('hasCheckpoint').checked;
  frames.forEach((frame,index)=>{
   const doc=frame.contentDocument;
   for(const spec of Object.values(M.screens))doc.getElementById(spec.cover).hidden=true;
   doc.getElementById(M.screens[selected].cover).hidden=false;
   doc.getElementById('continueBtn').hidden=!hasCheckpoint;
   doc.getElementById('continueBtn').textContent='つづきから · 55F →';
   doc.getElementById('startBtn').textContent=hasCheckpoint?'新しく挑戦する →':'塔に挑戦する →';
   M.apply(doc,selected,index?adopted:project,{hasCheckpoint});
  });
  $('checkpointLabel').hidden=selected!=='title';
  $('originalPanel').hidden=!$('showOriginal').checked;
  $('previewGrid').classList.toggle('comparing',$('showOriginal').checked);
  fit();
 }
 function change(){persist();preview();}
 function orderList(target,key,names){
  target.replaceChildren();const values=current()[key];
  values.forEach((value,index)=>{
   const row=node('li'),name=node('span',names[value],'order-name');row.dataset.item=value;row.append(name);
   if(key==='blocks'&&['symbol','kicker','records'].includes(value)){
    const label=node('label',undefined,'check'),input=node('input');input.type='checkbox';input.checked=!current().hidden.includes(value);input.setAttribute('aria-label',names[value]+'を表示');
    input.addEventListener('change',()=>{current().hidden=current().hidden.filter(item=>item!==value);if(!input.checked)current().hidden.push(value);change();});label.append(input,document.createTextNode('表示'));row.append(label);
   }
   for(const [offset,text]of [[-1,'↑'],[1,'↓']]){
    const button=node('button',text);button.type='button';button.disabled=index+offset<0||index+offset>=values.length;
    button.setAttribute('aria-label',names[value]+'を'+(offset<0?'上へ':'下へ'));
    button.addEventListener('click',()=>{
     [values[index],values[index+offset]]=[values[index+offset],values[index]];
     orderList(target,key,names);change();
     const moved=target.querySelector('[data-item="'+value+'"]');
     const next=moved.querySelector('button[aria-label="'+button.getAttribute('aria-label')+'"]');
     (next.disabled?moved.querySelector('button:not(:disabled)'):next)?.focus();
    });row.append(button);
   }
   target.append(row);
  });
 }
 function sizes(){
  $('mobileProfile').setAttribute('aria-pressed',String(profile==='mobile'));$('desktopProfile').setAttribute('aria-pressed',String(profile==='desktop'));
  $('sizeFields').replaceChildren();
  for(const [key,[name,unit]]of Object.entries(sizeNames)){
   const label=node('label',undefined,'size-field'),input=node('input'),value=node('span');input.type='number';input.min=M.ranges[key][0];input.max=M.ranges[key][1];input.step=1;input.value=current()[profile][key];input.setAttribute('aria-label',name);
   input.addEventListener('input',()=>{if(!input.checkValidity()||input.value==='')return;current()[profile][key]=Number(input.value);change();});
   input.addEventListener('change',()=>{input.value=current()[profile][key];});
   value.append(input,document.createTextNode(' '+unit));label.append(document.createTextNode(name),value);$('sizeFields').append(label);
  }
 }
 function select(id){
  selected=id;$('screenTitle').textContent=M.screens[id].name;
  for(const button of $('screenList').children)button.setAttribute('aria-pressed',String(button.dataset.screen===id));
  $('mainAction').replaceChildren();
  for(const value of ['auto',...M.screens[id].buttons]){
   const option=node('option',value==='auto'?'おすすめ（自動）':labels[value]);option.value=value;$('mainAction').append(option);
  }
  $('mainAction').value=current().main;$('pixelMain').checked=current().pixelMain;
  orderList($('buttonOrder'),'buttons',labels);orderList($('blockOrder'),'blocks',blockNames);sizes();preview();
 }
 function selectProfile(next){profile=next;$('previewWidth').value=next==='mobile'?'390':'1280';sizes();preview();}
 function frameSource(template){
  const doc=new DOMParser().parseFromString(template,'text/html');
  doc.querySelectorAll('script').forEach(el=>el.remove());
  const base=doc.createElement('base');base.href=new URL('./',location.href).href;doc.head.prepend(base);
  // The preview is static and sandboxed. It never boots the game or reads saves.
  doc.getElementById('titleRecords').innerHTML='<span>最高到達 55F</span><span>最高コンボ 68</span><span>挑戦 150回</span>';
  doc.getElementById('deathSummary').innerHTML='<b>55F</b>で力尽きた。<br>ジャストパリィ <b>120回</b> / 被弾 <b>12回</b><br>最大コンボ <b>68</b><br>魂の欠片 <b>+84 ✧</b>';
  doc.getElementById('deathRecords').innerHTML='<span>⚔ いつもの主人公</span><span>最高到達 55F</span><span>最高コンボ 68</span><span>挑戦 150回</span>';
  doc.getElementById('runStateLabel').textContent='PREVIEW';
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
 }
 function loadFrame(frame,source){return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('プレビューを読み込めませんでした。ページを再読み込みしてください。')),20000);
  frame.addEventListener('load',()=>{
   clearTimeout(timer);const doc=frame.contentDocument;
   doc.addEventListener('click',event=>event.preventDefault(),true);resolve();
  },{once:true});frame.srcdoc=source;
 });}
 $('saveProject').disabled=true;document.querySelector('main').inert=true;
 try{
  const response=await fetch('./index.html',{cache:'no-store'});if(!response.ok)throw Error('画面HTMLを読み込めません（'+response.status+'）。');
  const template=await response.text(),doc=new DOMParser().parseFromString(template,'text/html');
  labels=Object.fromEntries(Object.values(M.screens).flatMap(spec=>spec.buttons.map(id=>[id,doc.getElementById(id).textContent])));
  let draft=null;try{draft=M.normalize(JSON.parse(localStorage.getItem(DRAFT)));}catch{}
  try{
   const saved=await fetch('/__layout-editor/project',{cache:'no-store'});
   if(saved.ok){const data=await saved.json();canSave=data.writable===true;if(data.project)project=M.normalize(data.project);}
   else if(saved.status!==404)savedWarning='保存ファイルを読み込めません。下書きを確認してください。 ';
  }catch{savedWarning='保存サーバーに接続できません。 ';}
  if(draft&&draft.updatedAt>project.updatedAt)project=draft;
  const source=frameSource(template);await Promise.all(frames.map(frame=>loadFrame(frame,source)));
  ready=true;document.querySelector('main').inert=false;$('saveProject').disabled=false;
  for(const [id,spec]of Object.entries(M.screens)){
   const button=node('button',spec.name);button.type='button';button.dataset.screen=id;button.addEventListener('click',()=>select(id));$('screenList').append(button);
  }
  $('mainAction').addEventListener('change',()=>{current().main=$('mainAction').value;change();});
  $('pixelMain').addEventListener('change',()=>{current().pixelMain=$('pixelMain').checked;change();});
  $('hasCheckpoint').addEventListener('change',preview);$('showOriginal').addEventListener('change',preview);
  $('previewWidth').addEventListener('change',()=>{profile=Number($('previewWidth').value)<=600?'mobile':'desktop';sizes();preview();});
  $('mobileProfile').addEventListener('click',()=>selectProfile('mobile'));$('desktopProfile').addEventListener('click',()=>selectProfile('desktop'));
  $('resetScreen').addEventListener('click',()=>{project.screens[selected]=M.normalize(adopted).screens[selected];persist();select(selected);});
  new ResizeObserver(fit).observe($('previewGrid'));select(selected);
  status(savedWarning+(canSave?'編集できます。「保存」でこのPCの編集ファイルに残せます。':'編集できます。ファイル保存にはローカル用サーバーを使うか、JSONを書き出してください。'));
 }catch(error){status(error.message);return;}
 $('saveProject').addEventListener('click',async()=>{
  persist();if(!canSave){status('下書きを保存しました。JSONを書き出すこともできます。');return;}
  $('saveProject').disabled=true;
  try{
   const response=await fetch('/__layout-editor/project',{method:'POST',headers:{'Content-Type':'application/json','X-Parry-Layout-Editor':'1'},body:JSON.stringify(project)});
   if(!response.ok)throw Error('保存に失敗しました（'+response.status+'）。');
   status('このPCの編集ファイルへ保存しました。本編へ反映するときは採用を依頼してください。');
  }catch(error){status(error.message+' 下書きはブラウザーに残っています。');}
  finally{$('saveProject').disabled=false;}
 });
 $('exportProject').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)+'\n'],{type:'application/json'})),link=node('a');
  link.href=url;link.download='parry-menu-layout.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('importProject').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>200000)throw Error('ファイルが大きすぎます。');const next=M.normalize(JSON.parse(await file.text()));project=next;persist();select(selected);status('編集ファイルを読み込みました。');}
  catch(error){status('読み込めませんでした。'+error.message);}event.target.value='';
 });
})();
