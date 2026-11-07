/* Prepare new runs and validated checkpoints for gameplay. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./progression.js'));
 else root.ParryRunState=factory(root.ParryProgression);
})(typeof window==='undefined'?globalThis:window,function(progression){
 'use strict';

 function create({
  practice,practiceKey,skin,skinEffects,floor,devOverride,initialLevels,sealedSkillIds,
  lifeBonus,initialShield,baseAtk,extraRerolls,bonuses,legacyVisual,tutorial
 },now){
  const baseHp=65+lifeBonus;
  const rawMaxHp=baseHp+progression.lifeVesselBonus(baseHp,initialLevels.heal||0);
  const startingHp=Math.ceil(rawMaxHp*progression.skinRules(skinEffects?skin:'normal').hp);

  return {
   mode:'combat',
   skin,skinEffects,
   guardHeld:false,
   guardStartedAt:0,
   practice,
   practiceKey:practice?practiceKey:null,
   bonusSouls:0,
   towerCoins:0,
   towerCoinsEarned:0,
   routeTrial:false,
   currentRoom:null,
   roomStage:null,
   roomLocked:false,
   eventId:null,
   routeSkillSet:[],
   routeSkillTitle:'',
   relicReturn:null,
   relicMirrorTarget:null,
   lastRareFloor:-9999,
   lastDiscovered:false,
   floor,devOverride,
   maxHp:startingHp,
   hp:startingHp,
   shield:initialShield,
   baseAtk,
   lv:{...initialLevels},
   skillBreaks:{},
   polishedRelics:[],
   sealedSkillIds:[...sealedSkillIds],
   relics:[],
   relicDiscarded:[],
   relicCounters:{},
   relicOffer:[],
   relicRewardKind:null,
   relicSwapTarget:null,
   rawMaxHp,
   relicBulwarkUsed:false,
   relicRustyUsed:false,
   relicStardustUsed:false,
   relicStopUsed:0,
   relicPactConsumed:false,
   relicPactReady:false,
   relicMaskReady:false,
   relicGearReady:false,
   relicBellDue:false,
   relicBoltDue:false,
   relicEmperorDue:false,
   relicJustStreak:0,
   enemy:null,
   combo:0,
   peakCombo:0,
   perfects:0,
   parries:0,
   damage:0,
   charge:0,
   runs:0,
   bossKills:0,
   rerolls:1+extraRerolls,
   reviveUsed:false,
   justStreak:0,
   overchargeCount:0,
   frostCount:0,
   frostWard:false,
   fortitudeReady:false,
   bloodlustPending:0,
   parryRecoveryActive:false,
   parryDamageActive:false,
   parryDamage:0,
   whiffUntil:0,
   parryAnimAt:-9999,
   parryAnimKind:'',
   lastDeflectAt:-9999,
   lastDamageAt:-9999,
   misses:0,
   whiffs:0,
   guards:0,
   notice:'',
   noticeAt:0,
   lastHitAt:0,
   feedback:'',
   feedbackAt:0,
   clearAt:0,
   flash:false,
   playStartedAt:now,
   pendingKind:null,
   inputLocked:false,
   lastAttemptDelta:null,
   lastImpactAt:-99999,
   lastStrikeKind:'miss',
   merchantBought:[],
   floorPerfects:0,
   lastEventId:null,
   lastUltimateAt:-99999,
   lastTimingDeltaMs:null,
   lastTimingKind:null,
   legacyVisual,
   bonuses:{...bonuses},
   lifeBonus,
   tutorial,
   tutorialStep:0,
   tutorialFinishing:false
  };
 }

 function adjustRelicMaxHp(run){
  const base=Math.ceil((run.rawMaxHp||run.maxHp)*progression.skinRules(run.skinEffects?run.skin:'normal').hp);
  const reaperPact=!run.practice&&run.relics?.includes('reaper_pact');
  run.maxHp=reaperPact?Math.max(1,Math.floor(base*.8)):base;
  run.hp=Math.min(run.maxHp,run.hp);
 }

 function resetParryInput(run){
  run.guardAtImpact=null;
  run.parryReadyAt=0;
  run.guardReleasedAt=-99999;
  run.parryBlockedAt=-99999;
 }

 // Checkpoint validation already owns a deep copy. Prepare that same run in place.
 function prepareRestore(run,now){
  const baseHp=65+run.lifeBonus,healLevel=run.lv.heal||0;
  const newRawMaxHp=baseHp+progression.lifeVesselBonus(baseHp,healLevel);
  // Raise only the old Life Vessel maximum. Saved HP can only stay or be clamped.
  if(run.rawMaxHp===baseHp+15*healLevel&&newRawMaxHp>run.rawMaxHp){
   run.rawMaxHp=newRawMaxHp;
   adjustRelicMaxHp(run);
  }
  Object.assign(run,{
   artLoading:false,artFallback:false,playStartedAt:now,
   parryAnimAt:-99999,lastDeflectAt:-99999,lastDamageAt:-99999,lastImpactAt:-99999,
   whiffUntil:0,guardHeld:false,pendingKind:null,inputLocked:false
  });
  resetParryInput(run);
 }

 return Object.freeze({create,prepareRestore,adjustRelicMaxHp,resetParryInput});
});
