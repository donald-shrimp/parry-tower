/* Pure combat calculations. Callers select current/frozen values and apply effects. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./progression.js'));
 else root.ParryCombatMath=factory(root.ParryProgression);
})(typeof window==='undefined'?globalThis:window,function(progression){
 'use strict';

 const ULTIMATE_BASE_MULTIPLIER=1.8;
 const heartbeatDamagePercent=level=>120+60*level;

 function baseAttackScale(baseAtk){return (baseAtk||25)/25;}
 function skillAtkScale(baseAtk,bladeLevel){return baseAttackScale(baseAtk)*(1+bladeLevel*.25);}
 function scaleSkillDmg(raw,baseAtk,bladeLevel){return Math.max(1,Math.round(raw*skillAtkScale(baseAtk,bladeLevel)));}
 function runBaseHp(lifeBonus){return 65+lifeBonus;}

 function hpSkillScale(baseHp,healLevel){
  return 1+(baseHp-65+progression.lifeVesselBonus(baseHp,healLevel))/100;
 }

 function tempoReduction(level){
  return Math.min(6,Math.max(0,Math.floor(Number(level)||0)))*2;
 }

 function frostReduction(level){
  return Math.min(85,15+10*Math.min(6,level)+5*Math.max(0,level-6));
 }

 function wardcraftBonus(level){
  return [0,20,35,50,60,70][Math.min(5,Math.max(0,Math.floor(level)))];
 }

 function shieldCap(wardCapacity,aegisLevel,wardcraftLevel){
  return Math.ceil((100+wardCapacity+20*aegisLevel)*(100+wardcraftBonus(wardcraftLevel))/100);
 }

 // Lifesteal uses actual damage (not overkill). Blood Rhythm has no combo ceiling.
 function bloodHealAmount(dealt,level,combo,synergy,maxHp){
  if(level<=0||dealt<=0||maxHp<=0)return 0;
  const bonus=synergy?Math.max(0,Math.floor(combo)):0;
  const rate=(6+level*2+bonus)/100;
  const cap=Math.ceil(maxHp*(25+bonus)/100);
  return Math.min(Math.max(2,Math.round(dealt*rate)),cap);
 }

 function attackMultiplier({bladeLevel,furyLevel,gambleLevel,executeLevel,combo,hp,maxHp,enemyHp,enemyMaxHp}){
  let multiplier=(1+bladeLevel*.25)*(1+Math.min(combo,120)*(.012+furyLevel*.02));
  if(hp<maxHp*.5)multiplier*=1+gambleLevel*.30;
  if(enemyHp/enemyMaxHp<.35)multiplier*=1+executeLevel*.23;
  return multiplier;
 }

 return {
  ULTIMATE_BASE_MULTIPLIER,heartbeatDamagePercent,baseAttackScale,skillAtkScale,
  scaleSkillDmg,runBaseHp,hpSkillScale,tempoReduction,frostReduction,wardcraftBonus,
  shieldCap,bloodHealAmount,attackMultiplier
 };
});
