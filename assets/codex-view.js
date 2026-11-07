/* Pure bestiary presentation. Practice eligibility is still checked by the game controller. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./encounters.js'),require('./skills.js'));
 else root.ParryCodexView=factory(root.ParryEncounters,root.ParrySkills);
})(typeof window==='undefined'?globalThis:window,function(P,SkillCatalog){
 'use strict';
 const {SKILLS,SYNERGIES}=SkillCatalog;
 const SK=Object.fromEntries(SKILLS.map(skill=>[skill.id,skill]));

 function renderSkills(unlockedSkills,skillContext){
  const describeSkill=(id,level)=>SkillCatalog.describe(id,level,skillContext);
  const view={summary:'',listHtml:''};
  const unlockedCount=SKILLS.filter(s=>unlockedSkills.includes(s.id)).length;
  view.summary=unlockedCount+' / '+SKILLS.length+' 解放 · '+SYNERGIES.length+' 共鳴';
  view.listHtml=SKILLS.map(s=>{
   if(!unlockedSkills.includes(s.id)){
    return `<div class="codex-card upgrade-row locked"><div class="upgrade-main"><span class="upgrade-symbol">🔒</span><div><div class="upgrade-name">未解放</div><div class="upgrade-effect">${s.rarity.toUpperCase()} · ショップで解放後に登録</div></div></div></div>`;
   }
   const syns=SYNERGIES.filter(syn=>syn.a===s.id||syn.b===s.id).map(syn=>{
    const partner=SK[syn.a===s.id?syn.b:syn.a];
    return `<div class="codex-synergy-hint"><b>${syn.name}</b>（+${partner.icon}${partner.name}）：${syn.desc}</div>`;
   }).join('');
   return `<div class="codex-card upgrade-row ${s.rarity}"><div class="upgrade-main"><span class="upgrade-symbol">${s.icon}</span><div><div class="upgrade-name">${s.name}</div><div class="upgrade-effect">${s.rarity.toUpperCase()} · 最大Lv.${s.max}（限界突破+2） · ${s.hint}</div><div class="upgrade-effect">${describeSkill(s.id,1)}</div>${syns}</div></div></div>`;
  }).join('');
  return view;
 }

 function renderMonsters(book,filter){
  const view={summary:'',listHtml:''};
  const groups=P.all.map(m=>{
   if(m.rare)return {m,base:P.findByKey(m.id+':rare'),elite:null};
   return {m,base:P.findByKey(m.id+':normal'),elite:P.findByKey(m.id+':elite')};
  });
  const entries=P.codexEntries(),discovered=entries.filter(e=>book.seen[e.bookKey]).length;
  view.summary=discovered+' / '+entries.length+' 発見';
  const filtered=groups.filter(g=>{
   const seenBase=!!book.seen[g.base.bookKey],seenElite=!!(g.elite&&book.seen[g.elite.bookKey]);
   if(filter==='discovered')return seenBase||seenElite;
   if(filter==='rare')return !!g.m.rare;
   if(filter==='elite')return !!g.elite&&(seenElite||!seenBase);
   if(filter==='normal')return !g.m.rare;
   return true;
  });
  view.listHtml=filtered.map(g=>{
   const seenBase=book.seen[g.base.bookKey],seenElite=g.elite?book.seen[g.elite.bookKey]:null;
   if(!seenBase&&!seenElite)return '<div class="codex-card codex-monster locked"><div class="codex-symbol">？</div><strong>未遭遇</strong></div>';
   const winsBase=book.defeated[g.base.bookKey]?.wins||0,winsElite=g.elite?(book.defeated[g.elite.bookKey]?.wins||0):0;
   const firstF=Math.min(seenBase?.firstFloor||999,seenElite?.firstFloor||999);
   const rank=g.m.rare?'rare':g.m.boss?'boss':seenElite?'elite':'normal';
   const type=g.m.rare?'RARE':g.m.boss?(seenElite?'BOSS / ELITE':'BOSS'):(seenElite?'NORMAL / ELITE':'NORMAL');
   const stats=g.m.rare
    ?`${type} · 遭遇 ${seenBase.encounters}回 · 討伐 ${winsBase}回 · 初遭遇 ${firstF}F`
    :`${type} · 通常 遭遇${seenBase?.encounters||0}/討伐${winsBase} · 精鋭 遭遇${seenElite?.encounters||0}/討伐${winsElite} · 初遭遇 ${firstF}F`;
   const btns=g.m.rare
    ?`<div class="codex-practice-row"><button class="codex-practice" data-practice="${g.base.bookKey}">⚔ 稽古場で練習</button></div>`
    :`<div class="codex-practice-row">${seenBase?`<button class="codex-practice" data-practice="${g.base.bookKey}">⚔ 通常で稽古</button>`:'<button class="codex-practice" disabled>未遭遇 (通常)</button>'}${seenElite?`<button class="codex-practice elite-btn" data-practice="${g.elite.bookKey}">⚔ 精鋭で稽古</button>`:'<button class="codex-practice elite-btn" disabled>未遭遇 (精鋭)</button>'}</div>`;
   return '<div class="codex-card codex-monster '+rank+'"><div class="codex-symbol">'+(g.m.rare?'✦':g.m.boss?'♛':seenElite?'◆':'⚔')+'</div><strong>'+g.m.name+'</strong><small>'+stats+'</small><p>'+g.m.desc+'</p>'+btns+'</div>';
  }).join('')||'<div class="empty">該当する敵はまだいません。</div>';
  return view;
 }

 function render({tab,filter,book,unlockedSkills,skillContext}){
  return tab==='skills'?renderSkills(unlockedSkills,skillContext):renderMonsters(book,filter);
 }

 return {render};
});
