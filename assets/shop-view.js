/* Pure shop presentation. Input records are read-only; returned view owns only display values. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./progression.js'),require('./skills.js'));
 else root.ParryShopView=factory(root.ParryProgression,root.ParrySkills);
})(typeof window==='undefined'?globalThis:window,function(PR,SkillCatalog){
 'use strict';
 const {SKILLS}=SkillCatalog;
 const LEGACY_OFFERS=PR.BASE_UPGRADES;

 function upgradeRow(o,coins){
  const full=o.level>=o.max,price=full?Infinity:o.cost;
  const effect=o.effect?`${o.effect} `:'';
  const next=full?'':` → Lv.${o.level+1}：${o.next}`;
  const desc=`現在：${effect}${o.current}${next}${o.note||''}`;
  const progress=o.max>1
   ?`<div class="upgrade-progress" role="progressbar" aria-label="${o.name} 強化進捗" aria-valuemin="0" aria-valuemax="${o.max}" aria-valuenow="${o.level}">${Array.from({length:o.max},(_,i)=>`<span class="${i<o.level?'filled':''}"></span>`).join('')}</div>`
   :'';
  return `<div class="upgrade-row upgrade-tier"><div class="upgrade-main"><span class="upgrade-symbol">${o.icon}</span><div><div class="upgrade-name">${o.name} <span class="muted">Lv.${o.level}/${o.max}</span></div><div class="upgrade-effect">${desc}</div>${progress}</div></div><button type="button" class="upgrade-buy" data-action="${o.action}" data-key="${o.id}" ${full||coins<price?'disabled':''}>${full?'MAX':price+' ✧'}</button></div>`;
 }
 function bonusNavigation(bonusView){
  return '<div class="bonus-nav" role="group" aria-label="おまけの種類">'+[['items','演出のおまけ'],['skins','主人公スキン']].map(([id,name])=>'<button type="button" class="upgrade-tab '+(bonusView===id?'active':'')+'" data-action="bonus-section" data-key="'+id+'" aria-pressed="'+(bonusView===id)+'">'+name+'</button>').join('')+'</div>';
 }
 function renderSkinPicker(permanent,coins,bonusView){
  return bonusNavigation(bonusView)+'<div class="skin-picker-head"><h3>主人公スキン</h3></div><div class="skin-grid">'+PR.SKINS.map(skin=>{
   const owned=PR.ownsSkin(permanent,skin.id),wearing=!PR.extraEnabled(permanent,'legacyVisual')&&skin.id===permanent.equippedSkin;
   const action=owned?'skin-equip':'skin-buy';
   const buy='<button type="button" class="upgrade-buy skin-buy" data-action="'+action+'" data-key="'+skin.id+'" '+(wearing||!owned&&coins<skin.cost?'disabled':'')+'>'+(owned?'装備する':skin.cost+' ✧')+'</button>';
   const r=permanent.skinRecords[skin.id]||{bestFloor:0,bestCombo:0};
   return '<article class="skin-card '+(wearing?'selected':'')+'" style="--skin-color:'+skin.color+'"><canvas class="skin-art-sample" data-skin-sample="'+skin.id+'" width="480" height="300" role="img" aria-label="'+skin.name+'の立ち絵"></canvas><h4>'+skin.name+'</h4><p class="skin-look">'+skin.look+'</p><p class="skin-rule">'+skin.rule+'</p><p class="skin-look">自己記録：'+r.bestFloor+'F / '+r.bestCombo+' COMBO</p><div class="skin-actions">'+buy+'</div></article>';
  }).join('')+'</div>';
 }
 function render({meta,permanent,tab,bonusView,skillContext}){
  let upgradeTab=tab;
  const describeSkill=(id,level)=>SkillCatalog.describe(id,level,skillContext);
  const view={tab,coins:meta.coins,coinsLabel:meta.coins+' ✧',tabsHtml:'',listHtml:'',preloadSkins:[]};
  if(upgradeTab==='skills')upgradeTab='loadout';
  if(upgradeTab==='special')upgradeTab='base';
  view.tab=upgradeTab;
  const tabs=[['loadout','初期スキル'],['base','能力強化'],['seal','運命の封印'],['bonus','おまけ']];
  view.tabsHtml=tabs.map(([id,name])=>`<button type="button" class="upgrade-tab ${upgradeTab===id?'active':''}" aria-pressed="${upgradeTab===id}" data-tab="${id}">${name}</button>`).join('');
  if(upgradeTab==='loadout'){
   const owned=SKILLS.filter(skill=>permanent.unlockedSkills.includes(skill.id)&&!permanent.sealedSkills.includes(skill.id));
   const rows=PR.SLOT_COSTS.map((cost,i)=>{
    if(i>=permanent.slots){
     return `<div class="upgrade-row locked"><div class="upgrade-main"><span class="upgrade-symbol">🔒</span><div><div class="upgrade-name">スロット ${i+1}</div><div class="upgrade-effect">未解放</div></div></div><button type="button" class="upgrade-buy" data-action="slot" data-key="${i}" ${i!==permanent.slots||meta.coins<cost?'disabled':''}>${cost} ✧</button></div>`;
    }
    const selected=permanent.equipped[i];
    const options=owned.filter(skill=>!permanent.equipped.some((id,j)=>j!==i&&id===skill.id))
     .map(skill=>`<option value="${skill.id}" ${selected===skill.id?'selected':''}>${skill.icon} ${skill.name} · Lv.1</option>`).join('');
    return `<div class="upgrade-slot"><div class="upgrade-slot-head"><span class="upgrade-slot-label">スロット ${i+1}</span></div><select class="upgrade-equip" data-equip="${i}" aria-label="スロット ${i+1} の初期装備"><option value="" ${!selected?'selected':''}>— 装備なし —</option>${options}</select></div>`;
   }).join('');
   const unlocked=SKILLS.filter(skill=>permanent.unlockedSkills.includes(skill.id)).length;
   const skillRows=SKILLS.map(skill=>{
    const isOwned=permanent.unlockedSkills.includes(skill.id),cost=PR.skillPrice(skill),sealed=permanent.sealedSkills.includes(skill.id);
    const quickSlots=isOwned&&permanent.slots>0&&!sealed?`<div class="quick-equip-row">${Array.from({length:permanent.slots},(_,i)=>{
     const eq=permanent.equipped[i]===skill.id;
     return `<button type="button" class="quick-equip-btn ${eq?'equipped':''}" data-action="quick-equip" data-key="${i}:${skill.id}">${eq?`✓ スロット${i+1}装備中`:`スロット${i+1}に装備`}</button>`;
    }).join('')}</div>`:'';
    return `<div class="upgrade-row ${skill.rarity}"><div class="upgrade-main"><span class="upgrade-symbol">${skill.icon}</span><div><div class="upgrade-name">${skill.name} <span class="muted">${String(skill.rarity||'common').toUpperCase()}</span></div><div class="upgrade-effect">${describeSkill(skill.id,1)}</div>${quickSlots}</div></div><button type="button" class="upgrade-buy" data-action="skill" data-key="${skill.id}" ${isOwned||meta.coins<cost?'disabled':''}>${isOwned?'解放済み':cost+' ✧'}</button></div>`;
   }).join('');
   view.listHtml=`<p class="upgrade-note">装備したスキルはLv.1で開始。</p><div class="upgrade-slots">${rows}</div><p class="upgrade-note">初期装備用の解放：${unlocked} / ${SKILLS.length}　ラン中の通常抽選は変わりません。</p>${skillRows}`;
  }else if(upgradeTab==='bonus'&&bonusView==='skins'){
   view.preloadSkins=PR.SKINS.map(skin=>skin.id);
   view.listHtml=renderSkinPicker(permanent,meta.coins,bonusView);
  }else if(upgradeTab==='bonus'){
   view.listHtml=bonusNavigation(bonusView)+PR.EXTRAS.map(item=>{
    const owned=permanent.unlockedExtras.includes(item.id),enabled=PR.extraEnabled(permanent,item.id);
    const choice=item.choices?'<label class="bonus-choice">斬撃の色 <select data-extra-option="'+item.id+'" '+(!owned?'disabled':'')+'>'+item.choices.map(choice=>'<option value="'+choice.id+'" '+(PR.extraOption(permanent,item.id).id===choice.id?'selected':'')+'>'+choice.name+'</option>').join('')+'</select></label>':'';
    return '<div class="upgrade-row bonus-row"><div class="upgrade-main"><span class="upgrade-symbol">'+item.icon+'</span><div><div class="upgrade-name">'+item.name+'</div><div class="upgrade-effect">'+item.description+'</div>'+(['slashTint','comboGlow'].includes(item.id)?'<canvas class="bonus-sample" width="180" height="74" data-bonus-sample="'+item.id+'" aria-label="'+item.name+'の見本"></canvas>':'')+choice+'</div></div><button type="button" class="upgrade-buy" data-action="'+(owned?'bonus-toggle':'bonus-buy')+'" data-key="'+item.id+'" '+(owned?'aria-pressed="'+enabled+'"':meta.coins<item.cost?'disabled':'')+'>'+(owned?(enabled?'ON → OFF':'OFF → ON'):item.cost+' ✧')+'</button></div>';
   }).join('');
  }else if(upgradeTab==='seal'){
   const limit=PR.value(permanent,'sealSlots'),seals=permanent.sealedSkills;
   const nextCost=PR.costNext(permanent,'sealSlots'),full=!Number.isFinite(nextCost);
   const upgrade=`<div class="upgrade-row"><div class="upgrade-main"><span class="upgrade-symbol">🔮</span><div><div class="upgrade-name">封印枠 ${limit}/4</div><div class="upgrade-effect">戦利品の抽選から除外。使用 ${seals.length}枠</div></div></div><button type="button" class="upgrade-buy" data-action="extra" data-key="sealSlots" ${full||meta.coins<nextCost?'disabled':''}>${full?'MAX':nextCost+' ✧'}</button></div>`;
   const rows=SKILLS.map(skill=>{
    const sealed=seals.includes(skill.id),equipped=permanent.equipped.includes(skill.id);
    const blocked=!sealed&&(equipped||seals.length>=limit);
    const label=sealed?'封印を解く':equipped?'装備中':limit===0?'枠未解放':seals.length>=limit?'枠が満杯':'封印する';
    return `<div class="upgrade-row ${skill.rarity} ${sealed?'sealed':''}"><div class="upgrade-main"><span class="upgrade-symbol">${skill.icon}</span><div><div class="upgrade-name">${skill.name} <span class="muted">${String(skill.rarity||'common').toUpperCase()}</span></div><div class="upgrade-effect">${sealed?'🔮 封印中':describeSkill(skill.id,1)}</div></div></div><button type="button" class="upgrade-buy" data-action="seal" data-key="${skill.id}" aria-pressed="${sealed}" ${blocked?'disabled':''}>${label}</button></div>`;
   }).join('');
   view.listHtml=upgrade+rows;
  }else{
   const legacy=LEGACY_OFFERS.map(o=>{
    const level=PR.baseLevel(meta,o.id),now=PR.baseValue(meta,o.id);
    const next=PR.baseValue({...meta,[o.id]:level+1},o.id);
    return upgradeRow({...o,level,action:'legacy',cost:PR.baseCostNext(meta,o.id),current:`+${now}`,next:`+${next}`},meta.coins);
   });
   const extra=PR.UPGRADES.filter(o=>(o.group==='base'||o.group==='special')&&o.id!=='sealSlots').map(o=>{
    const level=permanent[o.id],max=o.costs.length;
    const current=level===0&&max===1?'未取得':o.formatValue(PR.value(permanent,o.id));
    const next=level<max?o.formatValue(o.values[level]):'';
    return upgradeRow({...o,level,max,cost:PR.costNext(permanent,o.id),action:'extra',current,next},meta.coins);
   });
   view.listHtml=legacy.concat(extra).join('');
  }
  return view;
 }

 return {render};
});
