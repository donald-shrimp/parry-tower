/* Synchronous health transitions. Only the documented health fields of state are used.
 * Rules contain resolved skill/relic values. Effects run at the original transition points.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat-math.js'));
 else root.ParryCombatHealth=factory(root.ParryCombatMath);
})(typeof window==='undefined'?globalThis:window,function(math){
 'use strict';

 function addShield(state,amount,{combat,cap,wardcraftLevel}){
  const gain=combat?Math.ceil(amount*(100+math.wardcraftBonus(wardcraftLevel))/100):amount;
  const added=Math.max(0,Math.min(gain,cap-state.shield));
  state.shield+=added;
  return added;
 }

 function heal(state,amount,{cap,overflow},recovery,effects){
  const before=state.hp;
  state.hp=Math.min(state.maxHp,state.hp+amount);
  const restored=Math.max(0,state.hp-before);
  if(restored>.1)effects.hp(restored);
  if(recovery&&overflow){
   const perParry=Math.ceil(state.maxHp*Math.round(overflow.budgetRatio*100)/100);
   const ceiling=Math.min(cap,Math.ceil(state.maxHp*(overflow.polished?40:30)/100));
   const gain=Math.min(
    Math.floor(Math.max(0,amount-restored)*Math.round(overflow.ratio*100)/100),
    Math.max(0,perParry-recovery.converted)
   );
   const added=addShield(state,gain,{combat:false,cap:ceiling});
   recovery.converted+=added;
   if(added)effects.shield(added);
  }
  return restored;
 }

 function finishParryBlood(state,rules,recovery,heal){
  if(!state.parryDamageActive)return 0;
  const dealt=state.parryDamage;
  state.parryDamage=0;
  state.parryDamageActive=false;
  const amount=math.bloodHealAmount(dealt,rules.bloodLevel,state.combo,rules.bloodSynergy,state.maxHp);
  return amount?heal(amount,recovery):0;
 }

 function finishParryRecovery(state,rules,heal){
  if(!state.parryRecoveryActive)return;
  state.parryRecoveryActive=false;
  const recovery={converted:0};
  const blood=finishParryBlood(state,rules,recovery,heal);
  const lust=rules.bloodlustLevel&&!state.practice?heal(2+rules.bloodlustLevel,recovery):0;
  const bell=rules.bellOwned&&state.relicBellDue?heal(rules.bellAmount,recovery):0;
  state.relicBellDue=false;
  const pact=rules.pactOwned&&state.relicPactReady?heal(rules.pactAmount,recovery):0;
  state.relicPactReady=false;
  // Only actual successful-parry recovery becomes next-hit damage.
  if(rules.bloodlustLevel&&!state.practice){
   const multiple=(1+rules.bloodlustLevel*.5)*(rules.bloodlustSynergy?1.5:1);
   const cap=state.baseAtk*(2.5+rules.bloodlustLevel*.5);
   state.bloodlustPending=Math.min(cap,Math.round((blood+lust+bell+pact)*multiple));
  }
 }

 function applyDamage(state,amount,tag,rules,effects){
  let damage=state.practice||state.tutorial?0:Math.max(1,Math.ceil(amount));
  const previousShield=state.shield,previousHp=state.hp;
  let prevented=0;
  if(damage>0&&rules.frostLevel&&state.frostWard&&!state.practice){
   prevented=Math.floor(damage*math.frostReduction(rules.frostLevel)/100);
   damage=Math.max(0,damage-prevented);
   state.frostWard=false;
   effects.frost(prevented);
  }
  const used=Math.min(state.shield,damage);
  state.shield=Math.max(0,state.shield-used);
  damage-=used;
  if(previousShield>0&&damage>0&&rules.sigilRatio!==null&&!state.relicBulwarkUsed){
   state.relicBulwarkUsed=true;
   const blocked=Math.floor(damage*Math.round(rules.sigilRatio*100)/100);
   damage-=blocked;
   effects.sigil(blocked);
  }
  if(tag==='GUARD'&&rules.silver&&damage>0){
   damage-=Math.min(rules.silver.cap,Math.floor(damage*rules.silver.ratio));
  }
  if(damage>0&&rules.rustyReduction!==null&&!state.relicRustyUsed){
   state.relicRustyUsed=true;
   damage=Math.max(0,damage-rules.rustyReduction);
  }
  if(damage>0)state.hp=Math.max(0,state.hp-damage);
  if(state.hp<previousHp&&rules.pactOwned&&!state.relicPactConsumed){
   state.relicPactConsumed=true;
   state.relicPactReady=true;
  }
  if(rules.fortitudeLevel&&!state.practice){
   if(state.hp<previousHp||(rules.fortitudeSynergy&&previousShield>0&&state.shield===0)){
    state.fortitudeReady=true;
   }
  }
  effects.hit(damage);
  if(state.hp<=0){
   if(!state.practice&&!state.reviveUsed&&rules.revivePercent){
    state.reviveUsed=true;
    state.hp=Math.max(1,Math.ceil(state.maxHp*rules.revivePercent/100));
    effects.revive();
   }else effects.die();
  }
  // Death/phase changes made by a callback take effect immediately.
  if(prevented>0&&rules.frostMirror&&state.mode==='combat')effects.reflect(prevented*.5);
  effects.sync();
 }

 return {addShield,heal,finishParryRecovery,applyDamage};
});
