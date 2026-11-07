/* Route/room presentation. Eligibility, costs, rewards and targets are resolved by the caller. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ParryRoomView=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';

 function action(id,label,detail='',disabled=false){
  return `<button type="button" class="room-choice" data-room-action="${id}" ${disabled?'disabled':''}>
  <span><b>${label}</b>${detail?`<small>${detail}</small>`:''}</span><span aria-hidden="true">›</span></button>`;
 }
 function routes(options){
  return options.map(room=>`<button type="button" class="route-card" data-route="${room.id}">
 <span class="route-symbol">${room.icon}</span><span class="route-card-body"><span class="route-card-heading"><b>${room.name}</b><span class="route-badge route-badge--${room.id}">${room.tag}</span></span><small>${room.desc}</small></span><span aria-hidden="true">›</span></button>`).join('');
 }
 function merchantActions(items){
  return items.map(({item,already,available,affordable})=>action('buy:'+item.id,
   item.icon+' '+item.name+' · '+item.cost+' 🪙',
   item.desc+(already?' · 購入済':!available?' · 対象なし':''),already||!affordable||!available)).join('');
 }
 function targetActions(targets,{merchant=false,breakthrough=false,disabled=false}={}){
  return targets.map(target=>{
   const label=target.icon+' '+target.name+(target.kind==='skill'?' Lv.'+target.level+' → '+(target.level+1):'');
   let detail=target.description+' → '+target.nextDescription;
   if(merchant&&target.kind==='skill')detail+=' / 上限 '+target.cap+' → '+(target.cap+(breakthrough?1:0))+
    (breakthrough?'（限界突破 '+(target.breaks+1)+'/2）':'');
   return action('target:'+target.id,label,detail,disabled);
  }).join('');
 }
 function eventActions(eventId,options){
  return options.map(option=>{
   const {id,available,value,hasRelics}=option;
   let label=option.label;
   let description='';
   if(eventId==='altar'&&id==='sacrifice')description='HP-'+value+'。イベントの支払いは被弾扱いになりません。';
   if(eventId==='mirror'&&id==='swap')description='所持遺物1つを選び、風化・秘宝から3択。';
   if(eventId==='chest'&&id==='open')description=hasRelics?'失敗してもHP1で生存。':'めぼしい遺物は残っていないようだ（当選時は塔貨+'+value+'・引き直し+1）。失敗してもHP1で生存。';
   if(eventId==='sanctuary'&&id==='resonate')label='共鳴相方を習得';
   if(eventId==='sanctuary'&&id==='train')label='スキル強化 +1Lv';
   if(eventId==='sanctuary'&&id==='pray')label='祈る · 最大HPの25%回復';
   if(eventId==='forge'&&id==='polish')label='遺物研磨（無料）';
   if(eventId==='forge'&&id==='temper'){
    label='武具強化 · 塔貨15';
    description='この挑戦の基礎攻撃力+3・障壁+15。';
   }
   if(eventId==='scales'&&id==='toSouls')label='塔貨16 → 魂の欠片+'+value+' ✧';
   if(eventId==='scales'&&id==='toCoins'){
    label='現在HP20% → 塔貨+'+value+'・引き直し+1';
    description='死亡しない。';
   }
   if(eventId==='scales'&&id==='leave')label='立ち去る · 障壁+10';
   return action('event:'+id,label,description,!available);
  }).join('');
 }
 function render({room,event,stage,result,locked,status,items=[],targetItem,targets=[],held=[],options=[]}){
  const id=room.id;
  const view={
   kicker:id==='event'?'MYSTERIOUS ENCOUNTER':id==='merchant'?'TRAVELLING MERCHANT':'A MOMENT OF RESPITE',
   icon:event?.icon||room.icon,title:event?.name||room.name,
   description:event?.description||room.desc,descriptionHidden:false,
   note:'🪙 塔貨 '+status.coins+'　♡ '+Math.ceil(status.hp)+' / '+status.maxHp+'　🛡 '+Math.ceil(status.shield),
   actionsHtml:''
  };
  if(stage==='result'){
   view.description=result;
   view.actionsHtml=action('continue','次の階へ')+(id==='merchant'&&!locked?merchantActions(items):'');
  }else if(id==='merchant'&&stage?.startsWith('target:')){
   view.title=targetItem.name;view.description=targetItem.cost+' 🪙';
   view.actionsHtml=targetActions(targets,{merchant:true,breakthrough:targetItem.id==='breakthrough',disabled:status.coins<targetItem.cost})+
    action('back','戻る');
  }else if(id==='event'&&stage==='target:sanctuary_train'){
   view.title='共鳴の聖堂';view.descriptionHidden=true;
   view.actionsHtml=targetActions(targets)+action('back','戻る');
  }else if(id==='event'&&stage==='target:forge_polish'){
   view.title='古の金床';view.descriptionHidden=true;
   view.actionsHtml=targetActions(targets)+action('back','戻る');
  }else if(id==='rest'){
   view.actionsHtml=action('rest:heal','🔥 休息','最大HPの35%を回復')+
    action('rest:meditate','🛡 瞑想','障壁+20、スキル報酬の引き直し+1');
  }else if(id==='merchant'){
   view.actionsHtml=merchantActions(items)+action('leave','立ち去る');
  }else if(id==='event'&&stage==='mirror'){
   view.description='交換が確定するまで、元の遺物は失われません。';
   view.actionsHtml=held.map(relic=>action('mirror:'+relic.id,relic.icon+' '+relic.name,relic.desc)).join('')+
    action('back','戻る');
  }else if(id==='event'){
   view.actionsHtml=eventActions(event.id,options);
  }
  return view;
 }
 return {routes,render};
});
