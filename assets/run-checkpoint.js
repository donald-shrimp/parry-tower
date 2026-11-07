/* Versioned local challenge checkpoint. No audio/performance timestamps survive reload. */
(function(root){
 'use strict';
 const KEY='parryTowerRun_v1',MODES=['combat','victory','reward','relic','route','room','routeSkill'];
 const transient=new Set(['artLoading','artFallback','attackAt','telegraphStart','nextFloorHintAt','clearAt','lastHitAt','noticeAt','feedbackAt','playStartedAt','phaseStartedAt','phaseCountStartAt','parryAnimAt','lastDeflectAt','lastDamageAt','lastImpactAt','lastUltimateAt','lastTimingDeltaMs','lastTimingKind','guardStartedAt','guardReleasedAt','parryReadyAt','parryBlockedAt','deathInputUnlockAt']);
 const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 function capture(game,choices=[]){
  const mode=game.mode==='loading'?'combat':game.mode;
  if(game.practice||!MODES.includes(mode)||!(game.hp>0))return null;
  const copy=JSON.parse(JSON.stringify(game));copy.mode=mode;
  for(const key of transient)delete copy[key];
  Object.assign(copy,{guardHeld:false,pendingKind:null,inputLocked:false,parryDamageActive:false,parryRecoveryActive:false,parryDamage:0});
  return {version:1,savedAt:Date.now(),game:copy,choices:choices.map(s=>typeof s==='string'?s:s.id)};
 }
 function validate(raw,{skills,relics,encounters,skins}){
  if(!raw||raw.version!==1||!raw.game||JSON.stringify(raw).length>60000)return null;
  const g=raw.game,ids=new Set(skills.map(s=>s.id)),rids=new Set(relics.map(r=>r.id));
  if(!MODES.includes(g.mode)||g.practice||!Number.isInteger(g.floor)||!number(g.floor,1,9999)||!number(g.maxHp,1,1e7)||!number(g.hp,Number.MIN_VALUE,g.maxHp)||!number(g.shield,0,1e7)||!number(g.baseAtk,1,1e7)||!skins.includes(g.skin)||typeof g.skinEffects!=='boolean')return null;
  if(!g.bonuses||typeof g.bonuses!=='object'||['soulGain','bossWard','regen','revive','choice4'].some(id=>!number(g.bonuses[id],0,1000))||!number(g.lifeBonus,0,10000))return null;
  if(g.bonuses.wardCapacity!==undefined&&![0,20,40,60].includes(g.bonuses.wardCapacity))return null;
  if(g.bonuses.wardInheritance!==undefined&&![0,5,8,10,15,20].includes(g.bonuses.wardInheritance))return null;
  if(g.bonuses.coinGain!==undefined&&![0,10,20,30,45].includes(g.bonuses.coinGain))return null;
  if(g.relicBulwarkUsed!==undefined&&typeof g.relicBulwarkUsed!=='boolean')return null;
  if(![null,'rest','merchant','event','trial'].includes(g.currentRoom)||![null,'altar','mirror','traveler','chest','sanctuary','forge','scales'].includes(g.eventId)||![null,'result','mirror','target:training','target:breakthrough','target:polish','target:sanctuary_train','target:forge_polish'].includes(g.roomStage)||typeof g.roomLocked!=='boolean')return null;
  if(g.merchantBought!==undefined&&(!Array.isArray(g.merchantBought)||g.merchantBought.length>12||g.merchantBought.some(id=>typeof id!=='string')))return null;
  if(g.floorPerfects!==undefined&&!number(g.floorPerfects,0,1e6))return null;
  if(g.lastEventId!==undefined&&g.lastEventId!==null&&typeof g.lastEventId!=='string')return null;
  if(g.mode==='room'&&g.currentRoom==='event'&&!g.eventId)return null;
  if(![null,'first','boss5','boss10','special'].includes(g.relicRewardKind)||![null,'room','mirror'].includes(g.relicReturn))return null;
  if(![-12,0,12].includes(g.skinTempoOffset??0))return null;
  if(g.tempoBpmReduction!==undefined&&![0,2,4,6,8,10,12].includes(g.tempoBpmReduction))return null;
  if(typeof g.legacyVisual!=='boolean'||typeof g.tutorial!=='boolean'||typeof g.tutorialFinishing!=='boolean'||!Number.isInteger(g.tutorialStep)||!number(g.tutorialStep,0,2)||(g.tutorial&&g.floor!==1))return null;
  for(const key of ['lv','skillBreaks','relicCounters'])if(!g[key]||typeof g[key]!=='object'||Array.isArray(g[key]))return null;
  for(const [id,n]of Object.entries(g.relicCounters))if(!rids.has(id)||!Number.isInteger(n)||!number(n,0,1000))return null;
  for(const [id,n]of Object.entries(g.skillBreaks))if(!ids.has(id)||!Number.isInteger(n)||!number(n,0,2))return null;
  for(const [id,n]of Object.entries(g.lv))if(!ids.has(id)||!Number.isInteger(n)||!number(n,0,skills.find(s=>s.id===id).max+(g.skillBreaks[id]||0)))return null;
  for(const [key,max,set]of [['relics',3,rids],['polishedRelics',3,rids],['relicDiscarded',rids.size,rids],['relicOffer',3,rids],['sealedSkillIds',4,ids],['routeSkillSet',4,ids]]){
   if(!Array.isArray(g[key])||g[key].length>max||new Set(g[key]).size!==g[key].length||g[key].some(id=>!set.has(id)))return null;
  }
  if(g.polishedRelics.some(id=>!g.relics.includes(id))||g.relicDiscarded.some(id=>g.relics.includes(id)))return null;
  for(const key of ['towerCoins','towerCoinsEarned','combo','peakCombo','perfects','parries','damage','charge','bossKills','rerolls','bonusSouls','misses','whiffs','guards','rawMaxHp','relicStopUsed'])if(!number(g[key],0,key==='charge'?7:1e12))return null;
  if(!Array.isArray(raw.choices)||raw.choices.length>4||new Set(raw.choices).size!==raw.choices.length||raw.choices.some(id=>!ids.has(id)))return null;
  if(g.mode==='combat'&&(!g.enemy||!encounters(g.enemy.bookKey)||!number(g.enemy.hp,Number.MIN_VALUE,g.enemy.maxHp)||!number(g.enemy.maxHp,1,1e12)||!number(g.enemy.atk,0,1e9)||!Array.isArray(g.enemy.rhythm)||!g.enemy.rhythm.length||g.enemy.rhythm.length>64||g.enemy.rhythm.some(n=>!number(n,.25,100))||!number(g.enemy.burn,0,1e12)||!Number.isInteger(g.enemy.index)||!number(g.enemy.index,0,1e9)||![1,2].includes(g.enemy.phase)))return null;
  if(['room','route'].includes(g.mode)&&![4,8].includes(g.floor%10))return null;
  if(g.mode==='room'&&!['rest','merchant','event'].includes(g.currentRoom))return null;
  if(g.relicSwapTarget!==null&&!g.relicOffer.includes(g.relicSwapTarget))return null;
  if(g.relicMirrorTarget!==null&&!g.relics.includes(g.relicMirrorTarget))return null;
  if(g.mode==='relic'&&(!g.relicOffer.length||g.relicOffer.some(id=>g.relics.includes(id)||g.relicDiscarded.includes(id))))return null;
  if(g.mode==='reward'&&raw.choices.some(id=>g.sealedSkillIds.includes(id)||(g.lv[id]||0)>=skills.find(s=>s.id===id).max+(g.skillBreaks[id]||0)))return null;
  if(g.mode==='routeSkill'&&!g.routeSkillSet.length)return null;
  const safe=JSON.parse(JSON.stringify(raw));for(const key of transient)delete safe.game[key];
  safe.game.bonuses.wardCapacity??=0;safe.game.bonuses.wardInheritance??=0;safe.game.bonuses.coinGain??=0;safe.game.relicBulwarkUsed??=false;
  safe.game.merchantBought??=[];safe.game.floorPerfects??=0;safe.game.lastEventId??=null;safe.game.routeSkillTitle=typeof g.routeSkillTitle==='string'&&g.routeSkillTitle.length<=80?g.routeSkillTitle:'スキル獲得';
  return safe;
 }
 const API=Object.freeze({KEY,MODES,capture,validate});
 if(typeof module==='object'&&module.exports)module.exports=API;if(root)root.ParryRunCheckpoint=API;
})(typeof window!=='undefined'?window:undefined);
