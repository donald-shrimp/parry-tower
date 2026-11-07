/* Skill catalog and descriptions with explicit display values; no live game references. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat-math.js'),require('./progression.js'));
 else root.ParrySkills=factory(root.ParryCombatMath,root.ParryProgression);
})(typeof window==='undefined'?globalThis:window,function(math,progression){
 'use strict';
 const PULSE_COMBO_STEP=6;
 const KING_COMBO_STEP=8;

 const definitions=[
  {id:'blade',icon:'🗡️',name:'剛剣',rarity:'common',max:20,
   desc:l=>`基礎反撃・攻撃スキルダメージ +${25*l}%`,
   hint:'基礎攻撃'},
  {id:'thunder',icon:'⚡',name:'落雷',rarity:'common',max:12,
   desc:(l,c)=>`パリィで雷撃 ${math.scaleSkillDmg(10+12*l,c.baseAtk,c.bladeLevel)} ダメージ`,
   hint:'連鎖の起点'},
  {id:'echo',icon:'🌀',name:'残響',rarity:'rare',max:6,
   desc:l=>`パリィ後、追撃 ${Math.round(25+l*13)}%`,
   hint:'雷撃と共鳴'},
  {id:'blood',icon:'🩸',name:'吸血',rarity:'common',max:8,
   desc:l=>`パリィ与ダメの ${6+l*2}% 回復（最低2・上限HP25%）`,
   hint:'与ダメージ吸収'},
  {id:'fury',icon:'🔥',name:'狂戦士',rarity:'rare',max:6,
   desc:l=>`コンボごとの攻撃補正 +${l*2}%`,
   hint:'吸血と共鳴'},
  {id:'aegis',icon:'🛡️',name:'魔法障壁',rarity:'common',max:10,
   desc:l=>`ジャストで障壁を ${3+3*l} 獲得`,
   hint:'反射と共鳴'},
  {id:'wardcraft',icon:'🔰',name:'結界増幅',rarity:'rare',max:3,startCost:90,
   desc:l=>`戦闘中の障壁獲得量と補充上限 +${math.wardcraftBonus(l)}%（余剰回復の変換量は除く）`,
   hint:'障壁ビルド'},
  {id:'thorns',icon:'🪞',name:'反射',rarity:'rare',max:6,
   desc:l=>`ガード時に攻撃力の ${30+l*18}% を反射`,
   hint:'障壁と共鳴'},
  {id:'precision',icon:'🎯',name:'一点集中',rarity:'common',max:10,
   desc:l=>`ジャスト反撃倍率 +${l*35}%`,
   hint:'奥義と共鳴'},
  {id:'focus',icon:'👁️',name:'心眼',rarity:'common',max:6,
   desc:l=>`ジャスト判定を ±${11+l*2}ms に拡張`,
   hint:'操作補助'},
  {id:'stability',icon:'🍀',name:'静かな呼吸',rarity:'common',max:6,
   desc:l=>`通常パリィを ±${31+l*3}ms に拡張`,
   hint:'操作補助'},
  {id:'ember',icon:'☄️',name:'灼熱',rarity:'common',max:10,
   desc:(l,c)=>`パリィで炎の継続ダメージ +${math.scaleSkillDmg(l*7,c.baseAtk,c.bladeLevel)}`,
   hint:'処刑と共鳴'},
  {id:'execute',icon:'💀',name:'処刑人',rarity:'rare',max:6,
   desc:l=>`残HP35%以下の敵への攻撃 +${l*23}%`,
   hint:'炎と共鳴'},
  {id:'tempo',icon:'⏳',name:'緩慢の呪い',rarity:'rare',max:4,
   desc:l=>`BGMと敵のBPM −${math.tempoReduction(l)}`,
   hint:'テンポ操作'},
  {id:'pulse',icon:'🌟',name:'共鳴波',rarity:'rare',max:6,
   desc:(l,c)=>`${PULSE_COMBO_STEP}コンボごとに衝撃波 +${math.scaleSkillDmg(l*42,c.baseAtk,c.bladeLevel)} ダメージ`,
   hint:'コンボ特化'},
  {id:'rune',icon:'🔮',name:'奥義紋',rarity:'epic',max:6,
   desc:(l,c)=>`奥義の基礎ダメージ +${Math.round(l*45*math.baseAttackScale(c.baseAtk))}`,
   hint:'集中と共鳴'},
  {id:'gamble',icon:'🥀',name:'背水',rarity:'rare',max:6,
   desc:l=>`自分のHPが半分未満なら攻撃 +${l*30}%`,
   hint:'危険な火力'},
  {id:'heal',icon:'💗',name:'生命の器',rarity:'common',max:10,
   desc:(l,c)=>`最大HP +${progression.lifeVesselBonus(c.baseHp,l)}、取得時にも回復`,
   hint:'持久戦'},
  {id:'double',icon:'🎲',name:'双撃',rarity:'epic',max:5,
   desc:l=>`${14+l*9}% の確率で反撃が2倍`,
   hint:'一撃の爆発力'},
  {id:'fortitude',icon:'🛡️',name:'不屈',rarity:'common',max:4,startCost:20,
   desc:l=>`HP被弾後、次の反撃 +${15+10*l}%`,
   hint:'被弾からの反撃'},
  {id:'heartbeat',icon:'🎵',name:'拍動',rarity:'common',max:4,startCost:25,
   desc:l=>`3連続ジャストで奥義+1・基礎攻撃の ${math.heartbeatDamagePercent(l)}% 追撃`,
   hint:'連続ジャスト'},
  {id:'overcharge',icon:'⚡',name:'過充電',rarity:'rare',max:5,startCost:95,
   desc:l=>`成功パリィ3回ごとに基礎攻撃 ${(0.7+0.4*l).toFixed(1)}倍 の雷撃`,
   hint:'雷撃ビルド'},
  {id:'bloodlust',icon:'🦇',name:'血の渇望',rarity:'rare',max:4,startCost:110,
   desc:l=>`パリィ時HP+${2+l}、実回復×${(1+0.5*l).toFixed(1)}を次の反撃に蓄積`,
   hint:'回復から火力'},
  {id:'frost',icon:'❄️',name:'氷結',rarity:'rare',max:6,startCost:90,
   desc:l=>`4パリィで氷の加護。次の被攻撃 -${math.frostReduction(l)}%`,
   hint:'被ダメージ軽減'},
  {id:'king',icon:'👑',name:'王の一撃',rarity:'epic',max:4,startCost:300,
   desc:l=>`${KING_COMBO_STEP}コンボごとに基礎攻撃 ${2+l}倍 の追撃`,
   hint:'コンボ特化'}
 ];

 const SYNERGIES=[
  {a:'thunder',b:'echo',name:'⚡ 雷鳴残響',desc:'追撃のたびに雷が再落下'},
  {a:'blood',b:'fury',name:'🩸 血の律動',desc:'1コンボごとに吸血率・回復上限 +1%pt（無制限）'},
  {a:'aegis',b:'thorns',name:'🪞 鏡壁の反撃',desc:'ジャスト時に障壁の一部を攻撃に転換'},
  {a:'ember',b:'execute',name:'☄️ 紅蓮処刑',desc:'敵HP35%以下で成功パリィすると炎上蓄積と同じ値の追撃。炎上は消費しない'},
  {a:'rune',b:'precision',name:'🔮 時空切断',desc:'奥義の発動時に追加の斬撃'},
  {a:'fortitude',b:'aegis',name:'🛡️ 不滅の盾',desc:'障壁破壊でも不屈が発動・反撃後に障壁+5'},
  {a:'heartbeat',b:'focus',name:'🎵 共鳴心眼',desc:'拍動が2連続ジャストで発動'},
  {a:'overcharge',b:'thunder',name:'⚡ 雷霆循環',desc:'過充電時に落雷の基礎ダメージ50%を追加'},
  {a:'bloodlust',b:'blood',name:'🦇 鮮血連鎖',desc:'回復からの蓄積ダメージ×1.5（上限は維持）'},
  {a:'frost',b:'thorns',name:'❄️ 氷鏡',desc:'氷結で軽減したダメージの50%を反射'},
  {a:'king',b:'pulse',name:'👑 王の共鳴',desc:`王の一撃が${PULSE_COMBO_STEP}コンボごとに発動`}
 ];

 const byId=Object.fromEntries(definitions.map(skill=>[skill.id,skill]));
 const SKILLS=definitions.map(({desc,...metadata})=>metadata);

 // context: {baseAtk, bladeLevel, baseHp}, selected by the current screen/run.
 function describe(id,level,context){
  return byId[id].desc(level,context);
 }

 function cap(id,breaks){return Object.hasOwn(byId,id)?byId[id].max+(breaks?.[id]||0):0;}

 return {SKILLS,SYNERGIES,PULSE_COMBO_STEP,KING_COMBO_STEP,describe,cap};
});
