/* Shared menu layout contract and DOM adapter. Button nodes retain their listeners. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ParryMenuLayout=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const screens={
  title:{name:'タイトル',cover:'titleCover',main:'startBtn',buttons:['startBtn','continueBtn','practiceBtn','upgradeOpenBtn','tutorialBtn'],blocks:{heading:'h2',records:'.records',actions:'.actionrow'}},
  death:{name:'挑戦終了',cover:'deathCover',main:'retryBtn',buttons:['retryBtn','deathPracticeBtn','deathUpgradeBtn','deathCodexBtn','homeBtn'],blocks:{symbol:'.modal-symbol',kicker:'.modal-kicker',heading:'h2',summary:'#deathSummary',records:'.records',actions:'.actionrow'}},
  pause:{name:'一時停止',cover:'pauseCover',main:'resumeBtn',buttons:['resumeBtn','suspendBtn'],blocks:{symbol:'.modal-symbol',heading:'h2',summary:'#pauseStatus',actions:'.actionrow'}}
 };
 const ranges={columns:[1,3],mainWidth:[50,100],mainSize:[16,28],secondarySize:[10,24],height:[40,68],gap:[4,24],rowGap:[8,40],blockGap:[4,32],padding:[4,24]};
 const cssNames={columns:'columns',mainWidth:'main-width',mainSize:'main-size',secondarySize:'secondary-size',height:'height',gap:'gap',rowGap:'row-gap',blockGap:'block-gap',padding:'padding'};
 function defaults(){
  return {schema:'parry-menu-layout',version:1,updatedAt:0,screens:Object.fromEntries(Object.entries(screens).map(([id,spec])=>[id,{
   main:'auto',pixelMain:true,buttons:[...spec.buttons],blocks:Object.keys(spec.blocks),hidden:[],
   mobile:{columns:id==='pause'?1:2,mainWidth:100,mainSize:18,secondarySize:12,height:48,gap:8,rowGap:16,blockGap:id==='death'?8:14,padding:8},
   desktop:{columns:id==='pause'?1:2,mainWidth:80,mainSize:22,secondarySize:12,height:52,gap:9,rowGap:18,blockGap:id==='death'?12:16,padding:8}
  }]))};
 }
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 function normalize(raw){
  if(!object(raw)||raw.schema!=='parry-menu-layout'||raw.version!==1||!object(raw.screens))throw Error('レイアウト工房の編集ファイルではありません。');
  const result=defaults();
  for(const [id,value]of Object.entries(raw.screens)){
   const spec=screens[id];if(!Object.hasOwn(screens,id)||!object(value))throw Error('不明な画面です。');
   const target=result.screens[id];
   if(Object.keys(value).some(key=>!Object.hasOwn(target,key)))throw Error('不明な設定です。');
   for(const key of ['buttons','blocks'])if(value[key]!==undefined){
    const allowed=key==='buttons'?spec.buttons:Object.keys(spec.blocks),list=value[key];
    if(!Array.isArray(list)||list.length!==allowed.length||new Set(list).size!==list.length||list.some(item=>!allowed.includes(item)))throw Error('ボタンか表示項目の並びが不正です。');
    target[key]=[...list];
   }
   if(value.hidden!==undefined){
    if(!Array.isArray(value.hidden)||new Set(value.hidden).size!==value.hidden.length||value.hidden.some(key=>!['symbol','kicker','records'].includes(key)||!Object.hasOwn(spec.blocks,key)))throw Error('非表示にできない項目です。');
    target.hidden=[...value.hidden];
   }
   if(value.main!==undefined){if(value.main!=='auto'&&!spec.buttons.includes(value.main))throw Error('主操作が不正です。');target.main=value.main;}
   if(value.pixelMain!==undefined){if(typeof value.pixelMain!=='boolean')throw Error('書体設定が不正です。');target.pixelMain=value.pixelMain;}
   for(const profile of ['mobile','desktop'])if(value[profile]!==undefined){
    if(!object(value[profile]))throw Error('表示サイズの設定が不正です。');
    for(const [key,number]of Object.entries(value[profile])){
     const range=ranges[key];if(!Object.hasOwn(ranges,key)||!Number.isInteger(number)||number<range[0]||number>range[1])throw Error('表示サイズの範囲が不正です。');
     target[profile][key]=number;
    }
   }
  }
  result.updatedAt=Number.isSafeInteger(raw.updatedAt)&&raw.updatedAt>=0?raw.updatedAt:0;
  return result;
 }
 function primary(id,layout,hasCheckpoint=false){
  return layout.main==='auto'?(id==='title'&&hasCheckpoint?'continueBtn':screens[id].main):layout.main;
 }
 function apply(doc,id,project,state={}){
  const spec=screens[id];if(!Object.hasOwn(screens,id))throw Error('Unknown menu screen');
  const layout=normalize(project||defaults()).screens[id],cover=doc.getElementById(spec.cover),modal=cover?.querySelector('.modal');
  if(!modal)return;
  modal.classList.add('menu-modal');modal.dataset.menuScreen=id;
  const nodes={};
  for(const [key,selector]of Object.entries(spec.blocks)){
   let node=modal.querySelector('[data-menu-block="'+key+'"]')||modal.querySelector(selector);
   if(key==='actions'&&!node){node=doc.createElement('div');node.className='actionrow';modal.append(node);}
   if(node){node.dataset.menuBlock=key;node.classList.add('menu-block');node.classList.toggle('menu-block-hidden',layout.hidden.includes(key));nodes[key]=node;}
  }
  const actions=nodes.actions;actions.classList.add('menu-actions');
  let main=actions.querySelector('.menu-main-row'),secondary=actions.querySelector('.menu-secondary');
  if(!main){main=doc.createElement('div');main.className='menu-main-row';actions.append(main);}
  if(!secondary){secondary=doc.createElement('div');secondary.className='menu-secondary';actions.append(secondary);}
  const hasCheckpoint=state.hasCheckpoint??!doc.getElementById('continueBtn')?.hidden;
  let mainId=primary(id,layout,hasCheckpoint);
  if(doc.getElementById(mainId)?.hidden)mainId=id==='title'?'startBtn':spec.main;
  for(const buttonId of [mainId,...layout.buttons.filter(buttonId=>buttonId!==mainId)]){
   const button=doc.getElementById(buttonId);if(!button)continue;
   const isMain=buttonId===mainId;
   button.classList.toggle('primary',isMain);button.classList.toggle('secondary',!isMain);
   button.classList.toggle('menu-main-button',isMain);button.classList.toggle('menu-pixel-button',isMain&&layout.pixelMain);
   (isMain?main:secondary).append(button);
  }
  for(const key of layout.blocks)if(nodes[key])modal.append(nodes[key]);
  for(const profile of ['mobile','desktop'])for(const [key,value]of Object.entries(layout[profile])){
   const unit=key==='columns'?'':key==='mainWidth'?'%':'px';
   modal.style.setProperty('--menu-'+profile+'-'+cssNames[key],value+unit);
  }
 }
 function initialize(doc,project){
  const current=normalize(project||defaults());
  for(const id of Object.keys(screens))apply(doc,id,current);
 }
 return {screens,ranges,defaults,normalize,primary,apply,initialize};
});
