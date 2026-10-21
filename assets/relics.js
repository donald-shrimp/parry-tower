/* Relics: run-scoped, unique artifacts with deterministic reward-pool helpers.
 * Combat effects are applied only by assets/game.js (one event per real parry/attack).
 * Does not use localStorage or mutate the permanent skill progression save.
 */
(function(root){
 'use strict';
 const MAX_HELD=3;
 const RELICS=Object.freeze([
  {id:'rusty_crest',power:Object.freeze([6, 9]),polishedDesc:'各階最初のHP被ダメージを9軽減',icon:'🛡️',name:'錆びた盾章',rarity:'common',desc:'各階最初のHP被ダメージを6軽減',affinity:'不屈・氷結'},
  {id:'stardust_whetstone',power:Object.freeze([0.3, 0.45]),polishedDesc:'各階最初の成功パリィの通常反撃 +45%',icon:'⚔️',name:'星屑の砥石',rarity:'common',desc:'各階最初の成功パリィの通常反撃 +30%',affinity:'剛剣・一点集中'},
  {id:'conduit_stone',power:Object.freeze([12, 18]),polishedDesc:'成功パリィ4回ごとに雷撃18ダメージ',icon:'⚡',name:'雷導石',rarity:'common',desc:'成功パリィ4回ごとに雷撃12ダメージ',affinity:'落雷・過充電'},
  {id:'ember_vial',power:Object.freeze([3, 5]),polishedDesc:'成功パリィごとに炎上蓄積 +5',icon:'☄️',name:'余燼の小瓶',rarity:'common',desc:'成功パリィごとに炎上蓄積 +3',affinity:'灼熱・処刑人'},
  {id:'pilgrim_bell',power:Object.freeze([4, 6]),polishedDesc:'成功パリィ4回ごとにHP6回復',icon:'💗',name:'巡礼者の鐘',rarity:'common',desc:'成功パリィ4回ごとにHP4回復',affinity:'吸血・血の渇望'},
  {id:'broken_gear',power:Object.freeze([5, 8]),polishedDesc:'奥義発動後、次の成功パリィで障壁+8',icon:'⚙️',name:'欠けた歯車',rarity:'common',desc:'奥義発動後、次の成功パリィで障壁+5',affinity:'拍動・奥義紋'},
  {id:'serene_crystal',power:Object.freeze([8, 12]),polishedDesc:'3連続ジャストで障壁+12',icon:'🎵',name:'静謐の水晶',rarity:'rare',desc:'3連続ジャストで障壁+8',affinity:'拍動・心眼'},
  {id:'emperor_conduit',power:Object.freeze([0.25, 0.4]),polishedDesc:'雷撃ダメージ+40%。雷撃スキルがなければ5パリィごとに雷撃30',secondary:Object.freeze([20,30]),icon:'⚡',name:'雷帝の導線',rarity:'rare',desc:'雷撃ダメージ+25%。雷撃スキルがなければ5パリィごとに雷撃20',affinity:'落雷・過充電・残響'},
  {id:'silver_mirror',power:Object.freeze([0.2, 0.3]),polishedDesc:'ガード時のHP被ダメージ-30%（最大12軽減）',secondary:Object.freeze([8,12]),icon:'🪞',name:'蒼銀の鏡',rarity:'rare',desc:'ガード時のHP被ダメージ-20%（最大8軽減）',affinity:'反射・氷結'},
  {id:'royal_banner',power:Object.freeze([10, 15]),polishedDesc:'10コンボごとの到達時に障壁+15',icon:'🚩',name:'王の戦旗',rarity:'rare',desc:'10コンボごとの到達時に障壁+10',affinity:'狂戦士・王の一撃'},
  {id:'blood_pact_chalice',power:Object.freeze([8, 12]),polishedDesc:'各階最初のHP被弾後、次の成功パリィでHP12回復',icon:'🩸',name:'血盟の杯',rarity:'rare',desc:'各階最初のHP被弾後、次の成功パリィでHP8回復',affinity:'不屈・血の渇望'},
  {id:'golden_festival_bell',power:Object.freeze([0.2, 0.3]),polishedDesc:'ボスへの通常反撃ダメージ+30%',icon:'🔔',name:'黄金の祭鐘',rarity:'rare',desc:'ボスへの通常反撃ダメージ+20%',affinity:'奥義紋・処刑人'},
  {id:'stopped_hand',power:Object.freeze([1, 2]),polishedDesc:'各階のガード2回までコンボを維持',icon:'⏳',name:'止まった秒針',rarity:'legendary',desc:'各階最初のガード1回だけコンボを維持',affinity:'狂戦士・共鳴波'},
  {id:'reaper_pact',power:Object.freeze([0.35, 0.5]),polishedDesc:'所持中最大HP-20%、通常反撃ダメージ+50%',icon:'💀',name:'死神の盟約',rarity:'legendary',desc:'所持中最大HP-20%、通常反撃ダメージ+35%',affinity:'背水・剛剣・吸血'},
  {id:'duet_mask',power:Object.freeze([0.4, 0.6]),polishedDesc:'ジャストで次の成功パリィに通常反撃60%の追加斬撃を準備',icon:'🎭',name:'二重奏の仮面',rarity:'legendary',desc:'ジャストで次の成功パリィに通常反撃40%の追加斬撃を準備',affinity:'一点集中・拍動・残響'}
 ].map(r=>Object.freeze(r)));
 const BY_ID=Object.freeze(Object.fromEntries(RELICS.map(r=>[r.id,r])));
 const RARITY_LABELS=Object.freeze({common:'風化',rare:'秘宝',legendary:'神話'});
 const WEIGHTS=Object.freeze({
  first:Object.freeze({common:80,rare:20,legendary:0}),
  boss5:Object.freeze({common:65,rare:35,legendary:0}),
  boss10:Object.freeze({common:45,rare:45,legendary:10}),
  special:Object.freeze({common:60,rare:40,legendary:0})
 });
 function validIds(ids){
  if(!Array.isArray(ids))return [];
  return [...new Set(ids.filter(id=>typeof id==='string'&&Object.hasOwn(BY_ID,id)))];
 }
 function available(owned=[],discarded=[]){
  const excluded=new Set([...validIds(owned),...validIds(discarded)]);
  return RELICS.filter(r=>!excluded.has(r.id));
 }
 function rewardType(floor,enemy,random=Math.random){
  if(!enemy||!Number.isFinite(floor))return null;
  if(floor===3)return 'first';
  if(enemy.boss)return floor===5?'boss5':'boss10';
  if(enemy.rare)return random()<.35?'special':null;
  if(enemy.elite)return random()<.20?'special':null;
  return null;
 }
 // Each slot has its own rarity roll; no repeated offerings.
 // When a pool is exhausted, redistribute its weight across remaining rarities.
 function offer(kind,owned=[],discarded=[],rng=Math.random,count=3){
  const weights=WEIGHTS[kind];
  if(!weights)return [];
  const pool=available(owned,discarded).filter(r=>weights[r.rarity]>0),result=[];
  const target=Math.max(0,Math.min(3,Math.floor(count)));
  for(let i=0;i<target&&pool.length;i++){
   const rarityNames=['common','rare','legendary'].filter(k=>weights[k]>0&&pool.some(r=>r.rarity===k));
   const total=rarityNames.reduce((sum,k)=>sum+weights[k],0);
   let roll=Math.max(0,Math.min(1-Number.EPSILON,Number(rng())||0))*total,chosen=rarityNames.at(-1);
   for(const k of rarityNames){roll-=weights[k];if(roll<0){chosen=k;break;}}
   const candidates=pool.filter(r=>r.rarity===chosen);
   const idx=Math.floor(Math.max(0,Math.min(1-Number.EPSILON,Number(rng())||0))*candidates.length);
   const selected=candidates[idx];result.push(selected);
   pool.splice(pool.findIndex(r=>r.id===selected.id),1);
  }
  return result;
 }
 const API=Object.freeze({MAX_HELD,RELICS,BY_ID,RARITY_LABELS,WEIGHTS,validIds,available,rewardType,offer});
 if(typeof module==='object'&&module.exports)module.exports=API;
 if(root)root.ParryRelics=API;
})(typeof window!=='undefined'?window:undefined);
