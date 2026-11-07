(async()=>{'use strict';
 const M=window.ParryCopyEditor,$=id=>document.getElementById(id),DRAFT='parry.copy-b.draft.v1';
 let project=M.defaults(),selected=M.entries[0].id,samples={},canSave=false;
 const status=text=>{$('editorStatus').textContent=text;};
 function readDraft(){try{return M.normalize(JSON.parse(localStorage.getItem(DRAFT)));}catch{return null;}}
 function persist(){
  project.updatedAt=Date.now();
  try{localStorage.setItem(DRAFT,JSON.stringify(project));status('下書きを保存しました。');}
  catch{status('ブラウザーに下書きを保存できません。JSONを書き出してください。');}
 }
 const entry=()=>M.entries.find(item=>item.id===selected);
 function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
 function preview(target,record,sample){
  target.replaceChildren();const item=entry(),values=record[item.id];
  const text=id=>values[id]?.visible?M.format(values[id].text,sample):null;
  const add=(parent,tag,id,className)=>{const value=text(id);if(value!==null)parent.append(el(tag,value,className));};
  if(item.kind==='choice'){
   const card=el('div',undefined,'room-choice'),body=el('span');
   add(body,'b','upper');add(body,'small','lower');card.append(body,el('span','›'));target.append(card);
  }else if(item.kind==='skill'){
   const card=el('div',undefined,'reward-card common');card.append(el('span','COMMON · LEVEL UP','rarity'),el('span','🛡️','emoji'));
   add(card,'span','upper','rname');add(card,'span','body','rdesc');add(card,'span','lower','levelup-diff');target.append(card);
  }else if(item.kind==='heading'){
   if(text('upper')!==null)target.append(el('span',text('upper'),'upgrade-tab active'));
   add(target,'h3','lower');
  }else{
   add(target,'h3','upper');add(target,'p','lower');
  }
  if(Object.values(values).every(value=>!value.visible))target.replaceChildren(el('p','すべて非表示','preview-empty'));
 }
 function renderPreview(){
  const sample={...entry().sample,...samples[selected]};
  preview($('editedPreview'),project.entries,sample);preview($('originalPreview'),M.defaults().entries,sample);
 }
 function select(id){
  selected=id;const item=entry();
  for(const button of $('entryList').children)button.setAttribute('aria-current',String(button.dataset.id===id));
  $('entryTitle').textContent=item.id.split('-')[0]+' · '+item.name;
  $('fieldEditors').replaceChildren();$('sampleEditors').replaceChildren();
  for(const field of item.fields){
   const value=project.entries[id][field.id],group=el('div',undefined,'field-editor'+(!value.visible?' is-hidden':''));
   const label=el('label',field.label),toggle=el('span',undefined,'visibility-toggle'),check=el('input');
   check.type='checkbox';check.checked=value.visible;check.setAttribute('aria-label',field.label+'を表示');
   toggle.append(check,document.createTextNode('表示する'));label.append(toggle);
   const textarea=el('textarea');textarea.value=value.text;textarea.maxLength=1000;textarea.setAttribute('aria-label',field.label+'の文言');
   check.addEventListener('change',()=>{value.visible=check.checked;group.classList.toggle('is-hidden',!value.visible);persist();renderPreview();});
   textarea.addEventListener('input',()=>{value.text=textarea.value;persist();renderPreview();});
   group.append(label,textarea);$('fieldEditors').append(group);
  }
  const variables=Object.keys(item.sample);$('variableHelp').textContent=variables.length?'差し込み：'+variables.map(key=>'{'+key+'}').join('、')+'。下の見本の値で確認できます。':'';
  for(const key of variables){
   const label=el('label','{'+key+'}'),input=el('input',undefined,'sample-input');input.value=samples[id]?.[key]??item.sample[key];
   input.addEventListener('input',()=>{(samples[id]??={})[key]=input.value;renderPreview();});label.append(input);$('sampleEditors').append(label);
  }
  renderPreview();
 }
 for(const item of M.entries){
  const button=el('button',item.id.split('-')[0]+' '+item.name);button.type='button';button.dataset.id=item.id;button.addEventListener('click',()=>select(item.id));$('entryList').append(button);
 }
 $('resetEntry').addEventListener('click',()=>{project.entries[selected]=M.defaults().entries[selected];persist();select(selected);});
 $('saveProject').addEventListener('click',async()=>{
  persist();
  if(!canSave){status('下書きを保存しました。ファイル保存にはローカル用サーバーを使用するか、JSONを書き出してください。');return;}
  const button=$('saveProject');button.disabled=true;
  try{
   const response=await fetch('/__copy-editor/project',{method:'POST',headers:{'Content-Type':'application/json','X-Parry-Copy-Editor':'1'},body:JSON.stringify(project)});
   if(!response.ok)throw Error('保存に失敗しました（'+response.status+'）。');
   status('ローカルの編集ファイルに保存しました。');
  }catch(error){status(error.message+' 下書きはこのブラウザーに残っています。');}
  finally{button.disabled=false;}
 });
 $('exportProject').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)+'\n'],{type:'application/json'})),link=el('a');
  link.href=url;link.download='parry-copy-b.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('importProject').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
   if(file.size>200000)throw Error('ファイルが大きすぎます。');
   const next=M.normalize(JSON.parse(await file.text()));project=next;persist();select(selected);status('編集ファイルを読み込みました。');
  }catch(error){status('読み込めませんでした。'+error.message);}
  event.target.value='';
 });
 const draft=readDraft();
 try{
  const response=await fetch('/__copy-editor/project',{cache:'no-store'});
  if(response.ok){
   const data=await response.json();canSave=data.writable===true;
   if(data.project)project=M.normalize(data.project);
  }
 }catch{}
 if(draft&&draft.updatedAt>project.updatedAt)project=draft;
 select(selected);status(canSave?'編集できます。「保存」でローカルの編集ファイルに保存します。':'編集できます。下書きはこのブラウザーに保存します。');
})();
