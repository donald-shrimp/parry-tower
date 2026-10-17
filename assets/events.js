/* v0.7.0 event content, pricing and damage helpers; never mutates run or saves. */
(function(root){
 'use strict';
 const ITEMS=Object.freeze([
  Object.freeze({id:'reroll',icon:'↻',name:'運命の札',cost:12,desc:'スキル報酬の引き直し +1'}),
  Object.freeze({id:'barrier',icon:'🛡️',name:'結界の護符',cost:16,desc:'障壁 +20'}),
  Object.freeze({id:'skill',icon:'📜',name:'秘伝の巻物',cost:26,desc:'通常のスキル抽選から1つ取得'}),
  Object.freeze({id:'relic',icon:'🏺',name:'封印された遺物箱',cost:42,desc:'風化60%・秘宝40%の遺物3択'})
 ]);
 const EVENTS=Object.freeze([
  Object.freeze({id:'altar',icon:'🩸',name:'血の祭壇',description:'血を捧げる者に、祭壇は新たな力を授ける。',
   actions:Object.freeze([{id:'sacrifice',label:'最大HP12%を捧げスキルを得る'},{id:'ward',label:'祭壇を見送り、障壁+12'}])}),
  Object.freeze({id:'mirror',icon:'🪞',name:'忘却の鏡',description:'鏡の中には、手に入れなかった別の運命が映る。',
   actions:Object.freeze([{id:'swap',label:'所持遺物1個を新しい遺物と交換'},{id:'coins',label:'鏡を背にして塔貨+12'}])}),
  Object.freeze({id:'traveler',icon:'🎒',name:'旅人の遺品',description:'朽ちた荷物に、かつての挑戦者の道具が残されていた。',
   actions:Object.freeze([{id:'coins',label:'塔貨+18'},{id:'ward',label:'引き直し+1・障壁+10'}])}),
  Object.freeze({id:'chest',icon:'📦',name:'封じられた宝箱',description:'宝箱の隙間から、不気味な魔力が漏れている。',
   actions:Object.freeze([{id:'open',label:'40%で遺物、60%で最大HP20%分の被害'},{id:'coins',label:'開けずに塔貨+10'}])})
 ]);
 const BY_ID=Object.freeze(Object.fromEntries(EVENTS.map(e=>[e.id,e])));
 const ITEMS_BY_ID=Object.freeze(Object.fromEntries(ITEMS.map(x=>[x.id,x])));
 function randomEvent(rng=Math.random){
  const roll=Math.max(0,Math.min(1-Number.EPSILON,Number(rng())||0));
  return EVENTS[Math.floor(roll*EVENTS.length)];
 }
 function altarCost(maxHp){return Math.max(1,Math.ceil(Math.max(1,maxHp)*.12));}
 function canSacrifice(hp,maxHp){return Number.isFinite(hp)&&hp-altarCost(maxHp)>=1;}
 function chestDamage(hp,maxHp){
  if(!Number.isFinite(hp)||hp<=1)return 0;
  return Math.min(hp-1,Math.max(1,Math.ceil(Math.max(1,maxHp)*.2)));
 }
 const API=Object.freeze({ITEMS,ITEMS_BY_ID,EVENTS,BY_ID,randomEvent,altarCost,canSacrifice,chestDamage});
 if(typeof module==='object'&&module.exports)module.exports=API;
 if(root)root.ParryEvents=API;
})(typeof window!=='undefined'?window:undefined);
