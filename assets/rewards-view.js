/* Reward presentation only: callers own rolls, payments, ownership, saves and actions. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./skills.js'),require('./relics.js'));
 else root.ParryRewardsView=factory(root.ParrySkills,root.ParryRelics);
})(typeof window==='undefined'?globalThis:window,function(SkillCatalog,RR){
 'use strict';
 const {SYNERGIES}=SkillCatalog;

 function skillCardMeta(s,levels,skillContext){
  const lvl=id=>levels?.[id]||0;
  const describeSkill=(id,level)=>SkillCatalog.describe(id,level,skillContext);
  const cur=lvl(s.id),next=cur+1;
  const diffHtml=cur>0?`<span class="levelup-diff">Lv.${cur} → Lv.${next}（現在：${describeSkill(s.id,cur)}）</span>`:'';
  const readySynergies=cur===0?SYNERGIES.filter(syn=>(syn.a===s.id&&lvl(syn.b)>0)||(syn.b===s.id&&lvl(syn.a)>0)):[];
  const synHtml=readySynergies.length?'<span class="synergy-ready-badge">✦ 共鳴解放可能！</span>':'';
  return {diffHtml,synHtml};
 }

 function skills({choices,levels,skillContext,floor,finalClear,rerolls,maxHp,lastDiscovered,rare}){
  const lvl=id=>levels?.[id]||0;
  const describeSkill=(id,level)=>SkillCatalog.describe(id,level,skillContext);
  const rar={common:'COMMON',rare:'RARE',epic:'EPIC'};
  const notices=[finalClear&&floor===80?'👑 塔の頂を制覇！ 81Fから無限踏破が始まる':null,
   lastDiscovered?'📖 図鑑登録':null,rare?'✦ レア報酬獲得':null,floor%5===0?'↻ 引き直し +1':null].filter(Boolean);
  return {
   cardsClass:'reward-cards'+(choices.length===4?' four':''),
   title:finalClear&&floor===80?'80F制覇 — 終刻の王を討伐':`${floor}F 突破 — 戦利品`,
   cardsHtml:choices.map(s=>{const meta=skillCardMeta(s,levels,skillContext);return `<button class="reward-card ${s.rarity}" data-skill="${s.id}"><span class="rarity">${rar[s.rarity]||String(s.rarity||'COMMON').toUpperCase()} · ${lvl(s.id)?'LEVEL UP':'NEW SKILL'}</span><span class="emoji">${s.icon}</span><span class="rname">${s.name} <span class="muted" style="font-size:10px">Lv.${lvl(s.id)+1}</span></span><span class="rdesc">${describeSkill(s.id,lvl(s.id)+1)}</span>${meta.diffHtml}${meta.synHtml}</button>`}).join(''),
   rerollLabel:`↻ 引き直す (残 ${rerolls})`,rerollDisabled:rerolls<=0,
   healLabel:`♡ 強化せずHPを ${Math.round(maxHp*.2)} 回復`,
   note:notices.join('　'),noteHidden:!notices.length
  };
 }

 function eventSkills({choices:pool,title,levels,skillContext}){
  const lvl=id=>levels?.[id]||0;
  const describeSkill=(id,level)=>SkillCatalog.describe(id,level,skillContext);
  const view={title:title||'スキルをひとつ選べ',cardsHtml:''};
  view.cardsHtml=pool.map(skill=>{const meta=skillCardMeta(skill,levels,skillContext);return `<button class="reward-card ${skill.rarity}" type="button" data-route-skill="${skill.id}">
 <span class="rarity">${skill.rarity.toUpperCase()} · ${lvl(skill.id)?'LEVEL UP':'NEW SKILL'}</span>
 <span class="emoji">${skill.icon}</span><span class="rname">${skill.name} <small>Lv.${lvl(skill.id)+1}</small></span>
 <span class="rdesc">${describeSkill(skill.id,lvl(skill.id)+1)}</span>${meta.diffHtml}${meta.synHtml}</button>`}).join('');
  return view;
 }

 function relics({offered,selected,held,heldCount}){
  const view={};
  view.title=selected?'交換する遺物を選べ':'遺物をひとつ選べ';
  view.hint=selected?'取り外した遺物は、このランでは再取得できません。':'所持 '+heldCount+' / '+RR.MAX_HELD;
  view.cardsHtml=selected?'':
   offered.map(r=>`<button type="button" class="relic-reward-card ${r.rarity}" data-relic="${r.id}"><span class="relic-reward-rarity">${RR.RARITY_LABELS[r.rarity]}</span><span class="relic-reward-symbol">${r.icon}</span><strong>${r.name}</strong><span class="relic-reward-desc">${r.desc}</span><small>相性：${r.affinity}</small></button>`).join('');
  view.replaceHidden=!selected;
  view.replaceHtml=selected?
   `<p class="relic-replace-note">${selected.icon} ${selected.name} と交換する遺物</p>`+
   held.map(r=>{return `<button type="button" class="relic-replace-card" data-replace="${r.id}"><span>${r.icon}</span><span><b>${r.name}</b><small>${r.desc}</small></span></button>`}).join(''):'';
  view.backHidden=!selected;
  view.skipLabel='今回は見送る →';
  return view;
 }

 function inventory(items){
  const view={};
  view.count=items.length+' / '+RR.MAX_HELD;
  view.listHtml=items.length?items.map(r=>`<div class="relic-owned ${r.rarity}"><span class="relic-owned-icon">${r.icon}</span><div><div class="relic-owned-title">${r.name}</div><div class="relic-owned-desc">${r.desc}</div></div></div>`).join(''):'<div class="empty">遺物なし</div>';
  return view;
 }

 return {skills,eventSkills,relics,inventory};
});
