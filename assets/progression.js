/* Permanent progression: metadata and safe, versioned loadout operations.
 * Skill list comes from the live battle catalog, not a copied fixed list.
 * Any future skill automatically appears with its rarity's default unlock price.
 */
(function(root){
 'use strict';
 const VERSION=1;
 const SLOT_COSTS=Object.freeze([20,65]);
 // Original five tiers and their prices are fixed for save compatibility.
 // Additional survivability levels give struggling players a long-term path forward.
 const ORIGINAL_BASE_COSTS=[8,21,40,65,96];
 const SURVIVAL_EXTRA_COSTS=[100,130,165,205,250,300,360];
 const BASE_UPGRADES=Object.freeze([
  Object.freeze({id:'life',icon:'♡',name:'生命の祝福',effect:'最大HP',
   max:12,costs:Object.freeze([...ORIGINAL_BASE_COSTS,...SURVIVAL_EXTRA_COSTS]),
   bonuses:Object.freeze(Array.from({length:12},(_,i)=>(i+1)*10))}),
  Object.freeze({id:'attack',icon:'⚔',name:'剣の研鑽',effect:'基礎反撃ダメージ',
   max:8,costs:Object.freeze([...ORIGINAL_BASE_COSTS,150,210,285]),
   bonuses:Object.freeze(Array.from({length:8},(_,i)=>i<5?(i+1)*3:15+(i-4)*2))}),
  Object.freeze({id:'ward',icon:'🛡',name:'守護の祈り',effect:'初期障壁',
   max:12,costs:Object.freeze([...ORIGINAL_BASE_COSTS,...SURVIVAL_EXTRA_COSTS]),
   bonuses:Object.freeze(Array.from({length:12},(_,i)=>(i+1)*8))})
 ]);
 const KNOWN_BASE_UPGRADES=Object.freeze(Object.fromEntries(BASE_UPGRADES.map(v=>[v.id,v])));
 function baseLevel(progress,id){
  const def=KNOWN_BASE_UPGRADES[id];
  if(!def)return 0;
  return safeLevel(progress?.[id],def.max);
 }
 function baseValue(progress,id){
  const def=KNOWN_BASE_UPGRADES[id];
  const level=baseLevel(progress,id);
  return def&&level?def.bonuses[level-1]:0;
 }
 function baseCostNext(progress,id){
  const def=KNOWN_BASE_UPGRADES[id];
  if(!def)return Infinity;
  const level=baseLevel(progress,id);
  return level===def.max?Infinity:def.costs[level];
 }
 const DEFAULT_SKILL_COSTS=Object.freeze({common:25,rare:90,epic:300});
 const SKILL_COST_OVERRIDES=Object.freeze({
  blade:15,thunder:25,blood:25,aegis:25,precision:20,focus:25,stability:20,ember:20,heal:30,
  gamble:60,thorns:70,execute:75,echo:90,fury:90,pulse:90,tempo:120,rune:300,double:300
 });
 // Each definition controls its own prices, effects and visibility in the shop.
 const UPGRADES=Object.freeze([
  {id:'regen',group:'base',icon:'💗',name:'再生力',costs:[12,24,45,80,140],values:[5,10,15,18,20],description:v=>`階層クリア時 HP ${v}%回復`},
  {id:'bossWard',group:'base',icon:'🛡️',name:'守護の備え',costs:[15,30,55,90,155,235],values:[5,10,15,25,40,55],description:v=>`ボス戦開始時 障壁 +${v}`},
  {id:'soulGain',group:'base',icon:'✧',name:'魂の共鳴',costs:[30,60,100,150,225],values:[5,10,15,20,25],description:v=>`獲得する魂の欠片 +${v}%`},
  {id:'extraReroll',group:'special',icon:'↻',name:'出撃準備',costs:[25],values:[1],description:v=>`初期引き直し +${v}回`},
  {id:'choice4',group:'special',icon:'🎴',name:'選択眼',costs:[80],values:[4],description:v=>`戦利品が${v}択になる`},
  {id:'revive',group:'special',icon:'🔥',name:'不死鳥の加護',costs:[150],values:[30],description:v=>`1ラン1回、致死ダメージを受けてもHP${v}%で復活`},
  {id:'sealSlots',group:'special',icon:'🔮',name:'運命の封印',costs:[25,60,120,220],values:[1,2,3,4],description:v=>`戦利品から除外できるスキル ${v}種`}
 ]);
 // One-time consolation rewards for repeated completed attempts. A bitmask is
 // stored alongside the existing run count so old saves can claim past milestones
 // on their next defeat, without double-paying on subsequent defeats.
 const RUN_RESCUE_MILESTONES=Object.freeze([
  Object.freeze({runs:3,bonus:20}),
  Object.freeze({runs:8,bonus:35}),
  Object.freeze({runs:15,bonus:60})
 ]);
 const RUN_RESCUE_VALID_MASK=(1<<RUN_RESCUE_MILESTONES.length)-1;
 function rescueMask(value){
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0
   ?value&RUN_RESCUE_VALID_MASK:0;
 }
 function rescueReward(runs,claimedMask=0){
  const completed=typeof runs==='number'&&Number.isSafeInteger(runs)&&runs>=0?runs:0;
  let mask=rescueMask(claimedMask),bonus=0;
  const newlyClaimed=[];
  RUN_RESCUE_MILESTONES.forEach((milestone,index)=>{
   const bit=1<<index;
   if(completed>=milestone.runs&&!(mask&bit)){
    bonus+=milestone.bonus;mask|=bit;newlyClaimed.push(milestone.runs);
   }
  });
  return {bonus,mask,atRuns:newlyClaimed};
 }
 const EXTRAS=Object.freeze([
  Object.freeze({id:'legacyVisual',icon:'◇',name:'開発初期モード',cost:1000,description:'原点回帰 — あの頃の塔へ。開発初期の主人公・敵のビジュアルに切り替えます。'})
 ]);
 const extraEnabled=(progress,id)=>EXTRAS.some(item=>item.id===id)&&Array.isArray(progress?.unlockedExtras)&&progress.unlockedExtras.includes(id)&&Array.isArray(progress?.enabledExtras)&&progress.enabledExtras.includes(id);
 function toggleExtra(progress,id,enabled,skills=[]){
  const p=normalize(progress,skills);
  if(!EXTRAS.some(item=>item.id===id)||!p.unlockedExtras.includes(id)||typeof enabled!=='boolean')return null;
  p.enabledExtras=p.enabledExtras.filter(other=>other!==id);if(enabled)p.enabledExtras.push(id);
  return p;
 }
 const KNOWN_UPGRADES=Object.freeze(Object.fromEntries(UPGRADES.map(v=>[v.id,v])));
 function safeLevel(value,max){
  return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0;
 }
 function defaults(){return {version:VERSION,slots:0,unlockedSkills:[],equipped:[null,null],
  regen:0,bossWard:0,soulGain:0,extraReroll:0,choice4:0,revive:0,sealSlots:0,sealedSkills:[],unlockedExtras:[],enabledExtras:[]};}
 function skillPrice(skill){
  if(!skill||typeof skill.id!=='string')return Infinity;
  if(Number.isSafeInteger(skill.startCost)&&skill.startCost>=0)return skill.startCost;
  return SKILL_COST_OVERRIDES[skill.id]??DEFAULT_SKILL_COSTS[skill.rarity]??35;
 }
 function normalize(raw,skills=[]){
  const p=defaults();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return p;
  const extraIds=new Set(EXTRAS.map(item=>item.id));
  p.unlockedExtras=[...new Set((Array.isArray(raw.unlockedExtras)?raw.unlockedExtras:[]).filter(id=>extraIds.has(id)))];
  p.enabledExtras=[...new Set((Array.isArray(raw.enabledExtras)?raw.enabledExtras:[]).filter(id=>p.unlockedExtras.includes(id)))];
  p.slots=safeLevel(raw.slots,SLOT_COSTS.length);
  for(const def of UPGRADES)p[def.id]=safeLevel(raw[def.id],def.costs.length);
  const owned=Array.isArray(raw.unlockedSkills)?raw.unlockedSkills.filter(id=>typeof id==='string'&&id.length<=80):[];
  p.unlockedSkills=[...new Set(owned)].slice(0,500); // retain unknown IDs in case a skill is restored later
  const known=new Set(skills.map(s=>s.id));
  const previous=Array.isArray(raw.equipped)?raw.equipped:[];
  const assigned=new Set();
  for(let i=0;i<p.slots;i++){
   const id=previous[i];
   if(typeof id==='string'&&known.has(id)&&p.unlockedSkills.includes(id)&&!assigned.has(id)){
    p.equipped[i]=id;assigned.add(id);
   }
  }
  // Unknown or removed skills cannot occupy the limited seal slots.
  // Equipped skills are never sealed; old saves without these fields remain valid.
  const sealed=Array.isArray(raw.sealedSkills)?raw.sealedSkills:[];
  const limit=value(p,'sealSlots');
  p.sealedSkills=[...new Set(sealed.filter(id=>typeof id==='string'&&id.length<=80))]
   .filter(id=>known.has(id)&&!p.equipped.includes(id)).slice(0,limit);
  return p;
 }
 function seal(progress,id,enabled,skills){
  const p=normalize(progress,skills);
  if(typeof id!=='string'||!skills.some(skill=>skill.id===id))return null;
  if(typeof enabled!=='boolean')return null;
  const exists=p.sealedSkills.includes(id);
  if(enabled){
   if(exists||p.equipped.includes(id)||p.sealedSkills.length>=value(p,'sealSlots'))return null;
   p.sealedSkills.push(id);
  }else{
   if(!exists)return null;
   p.sealedSkills=p.sealedSkills.filter(other=>other!==id);
  }
  return p;
 }
 function activeSeals(progress,skills){
  return normalize(progress,skills).sealedSkills;
 }
 function equip(progress,slot,id,skills){
  const p=normalize(progress,skills);
  if(!Number.isInteger(slot)||slot<0||slot>=p.slots)return null;
  if(id!==null){
   if(typeof id!=='string'||!p.unlockedSkills.includes(id)||!skills.some(s=>s.id===id)||p.sealedSkills.includes(id))return null;
   if(p.equipped.some((equipped,i)=>i!==slot&&equipped===id))return null;
  }
  p.equipped[slot]=id;
  return p;
 }
 function initialLevels(progress,skills){
  const p=normalize(progress,skills),result={};
  for(const id of p.equipped)if(id)result[id]=1;
  return result;
 }
 function value(progress,id){
  const def=KNOWN_UPGRADES[id];
  if(!def)return 0;
  const level=safeLevel(progress?.[id],def.costs.length);
  return level?def.values[level-1]:0;
 }
 function costNext(progress,id){
  const def=KNOWN_UPGRADES[id];if(!def)return Infinity;
  const level=safeLevel(progress?.[id],def.costs.length);
  return level===def.costs.length?Infinity:def.costs[level];
 }
 const api=Object.freeze({VERSION,SLOT_COSTS,BASE_UPGRADES,baseLevel,baseValue,baseCostNext,RUN_RESCUE_MILESTONES,rescueMask,rescueReward,DEFAULT_SKILL_COSTS,UPGRADES,
  EXTRAS,extraEnabled,toggleExtra,defaults,normalize,skillPrice,equip,seal,activeSeals,initialLevels,value,costNext});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ParryProgression=api;
})(typeof window!=='undefined'?window:undefined);
