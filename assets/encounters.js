/* Encounter definitions and progression rules are deliberately independent of rendering/audio.
   Node tests can exercise them without a browser or AudioContext. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryEncounters=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const monsters=[
  {id:'slime',name:'残響スライム',kind:'slime',rhythm:[4,4],color:'#76dec5',desc:'大きく縮んでから飛び込んでくる。'},
  {id:'knight',name:'錆びた騎士',kind:'knight',rhythm:[2,2,3,1],color:'#d0a5da',desc:'素直な振り下ろしと休符が特徴。'},
  {id:'rogue',name:'影の暗殺者',kind:'rogue',hpMultiplier:0.90,atkMultiplier:0.80,rhythm:[1.5,1.5,2,3],color:'#ee819a',desc:'裏拍からの鋭い突きを繰り返す。'},
  {id:'wraith',name:'塔の亡霊',kind:'wraith',rhythm:[3,2,2,4],color:'#89b0fa',desc:'予備動作の長い爪撃を仕掛ける。'},
  {id:'sentinel',name:'鉄壁の番兵',kind:'knight',hpMultiplier:1.10,atkMultiplier:1.00,rhythm:[3,2,3,2],color:'#8cb3dc',desc:'間を取る重い剣戟。'},
  {id:'duelist',name:'紅刃の剣士',kind:'rogue',hpMultiplier:0.90,atkMultiplier:0.80,rhythm:[2,1.5,1.5,3],color:'#f2a3aa',desc:'鋭い突きを短く連ねる。'},
  {id:'cantor',name:'残響の詠み手',kind:'wraith',hpMultiplier:1.00,atkMultiplier:0.90,rhythm:[3,1.5,2.5,3],color:'#c4a1e9',desc:'休符と裏拍を織り交ぜる幻影。'},
  {id:'clockwork',name:'時計仕掛けの兵士',kind:'knight',hpMultiplier:1.10,atkMultiplier:0.95,rhythm:[2,1,3,2],color:'#e4ae80',desc:'一定の拍と急な連撃を切り替える。'},
  // v0.8.0: palette-shifted existing silhouettes with fresh, readable half-beat patterns.
  {id:'ember_slime',name:'灼熱スライム',kind:'slime',sprite:'slime',palette:{hueRotate:-125,saturation:145},
   hpMultiplier:1.00,atkMultiplier:1.00,rhythm:[4,2,2],color:'#fb9a59',
   desc:'身体に火を宿すスライム。大きな跳躍に続いて拍を詰める。'},
  {id:'molten_sentinel',name:'熔鉄の番兵',kind:'knight',sprite:'sentinel',palette:{hueRotate:170,saturation:130},
   hpMultiplier:1.10,atkMultiplier:1.00,rhythm:[3,2,1.5,1.5],color:'#e58e60',
   desc:'炉で焼けた大盾を掲げ、終盤に素早い連撃を仕掛ける。'},
  {id:'frost_wraith',name:'氷霞の亡霊',kind:'wraith',sprite:'wraith',palette:{hueRotate:-40,saturation:90},
   hpMultiplier:1.00,atkMultiplier:0.90,rhythm:[4,2,1.5,1.5],color:'#9de7f3',
   desc:'冷気に潜む亡霊。長い間から半拍の差で爪を伸ばす。'},
  {id:'silver_duelist',name:'白銀の双剣士',kind:'rogue',sprite:'duelist',palette:{hueRotate:190,saturation:80},
   hpMultiplier:0.90,atkMultiplier:0.80,rhythm:[2,1,2,1],color:'#a6d8ef',
   desc:'白銀の二刀を交互に振る。短い連撃と間合いの変化を読む。'},
  // v0.9.0: final ascent — familiar silhouettes with advanced but readable score phrases.
  {id:'star_cantor',name:'星屑の詠み手',kind:'wraith',sprite:'cantor',palette:{hueRotate:85,saturation:135},
   hpMultiplier:1.00,atkMultiplier:0.90,rhythm:[3,1.5,2,1.5],color:'#d9a8f3',
   desc:'星座の軌跡を描く詠唱。裏拍が交じる非対称なフレーズ。'},
  {id:'orbital_clockwork',name:'天球の機兵',kind:'knight',sprite:'clockwork',palette:{hueRotate:60,saturation:115},
   hpMultiplier:1.10,atkMultiplier:0.95,rhythm:[2,1.5,1.5,2],color:'#bcb5ef',
   desc:'天球儀を模した機兵。均等な打点を細かな連撃に変える。'},
  {id:'void_knight',name:'影喰いの騎士',kind:'knight',sprite:'knight',palette:{hueRotate:115,saturation:80},
   hpMultiplier:1.10,atkMultiplier:0.95,rhythm:[2,1,2.5,1.5],color:'#aa89bf',
   desc:'光を呑む甲冑。重い斬撃から間合いを外して追撃する。'},
  {id:'last_assassin',name:'終幕の刺客',kind:'rogue',sprite:'rogue',palette:{hueRotate:145,saturation:110},
   hpMultiplier:0.90,atkMultiplier:0.80,rhythm:[1.5,1,1.5,2],color:'#d374a7',
   desc:'終幕を告げる刺客。鋭い半拍と単拍を取り混ぜる。'}
 ];
 const bosses=[
  {id:'guardian',name:'鐘楼の守護者',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,2,1,3,1,3],color:'#ffcc86',boss:true,desc:'鐘の拍に合わせて大剣を振り下ろす。'},
  {id:'ironwarden',name:'鉄血の監督官',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,1,2,1,3,3],color:'#f6a58c',boss:true,desc:'兵舎を統率する連撃型の守護者。'},
  {id:'dirgekeeper',name:'弔鐘の司祭',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[3,1.5,1.5,2,4],color:'#abb6ff',boss:true,desc:'休符を読めなければ崩される。'},
  {id:'timewarden',name:'時の監視者',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[1,2,1,3,1,4],color:'#f9d2a0',boss:true,desc:'短い斬撃と長い溜めを交互に使う。'},
  {id:'forge_master',name:'炉心の管理者',kind:'guardian',sprite:'guardian',palette:{hueRotate:-30,saturation:145},
   hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,2,1,1.5,1.5,2],color:'#ffab66',boss:true,
   desc:'灼熱の炉を統べる巨兵。重い二撃から拍を刻み直す。'},
  {id:'frost_priest',name:'氷冠の司祭',kind:'guardian',sprite:'guardian',palette:{hueRotate:180,saturation:75},
   hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[3,1.5,1,2,1.5,3],color:'#b2d5ff',boss:true,
   desc:'凍てついた冠を戴き、休符と裏拍で相手を揺さぶる。'},
  {id:'star_warden',name:'星界の監視者',kind:'guardian',sprite:'timewarden',palette:{hueRotate:80,saturation:115},
   hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[3,1.5,1.5,2,2],color:'#ded0fc',boss:true,
   desc:'星の軌道を見通す監視者。左右非対称の拍を繰り返す。'},
  {id:'endking',name:'終刻の王',kind:'guardian',sprite:'guardian',palette:{hueRotate:145,saturation:135},
   hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,2,1,3,1,2],phaseRhythm:[1.5,1.5,2,1,2,2],
   color:'#d8b1f0',boss:true,finalBoss:true,
   desc:'塔の最上層で待つ終刻の王。残りHP半分で第二楽章に移る。'}
 ];
 const rares=[
  {id:'golden_tone',name:'黄金の音叉',kind:'wraith',rhythm:[3,3,2],color:'#ffe0a1',rare:true,soulBonus:8,desc:'黄金の鐘の音を響かせる希少な亡霊。'},
  {id:'gem_slime',name:'宝石スライム',kind:'slime',rhythm:[4,4,3],color:'#b7f7d1',rare:true,soulBonus:12,desc:'硬い宝石を抱えるスライム。倒すと大量の欠片が手に入る。'}
 ];
 const all=[...monsters,...bosses,...rares];
 const byId=Object.fromEntries(all.map(e=>[e.id,e]));
 const ZONES=[
  {name:'忘れられた地下墓地',accent:'#7addb8',boss:'guardian',
   fixed:{1:'slime',2:'knight',9:'knight'},
   pools:{3:['slime','knight'],4:['knight','wraith'],6:['slime','knight','wraith'],7:['knight','slime','wraith'],8:['slime','wraith']}},
  {name:'鉄血の兵舎',accent:'#e6a27f',boss:'ironwarden',
   fixed:{1:'sentinel',2:'knight',9:'sentinel'},
   pools:{3:['knight','sentinel'],4:['sentinel','duelist'],6:['knight','sentinel','duelist'],7:['duelist','sentinel'],8:['sentinel','knight']}},
  {name:'残響の礼拝堂',accent:'#b8b6fa',boss:'dirgekeeper',
   fixed:{1:'wraith',2:'cantor',9:'cantor'},
   pools:{3:['wraith','cantor'],4:['rogue','cantor'],6:['cantor','rogue','wraith'],7:['duelist','cantor'],8:['rogue','wraith']}},
  {name:'歪んだ時計塔',accent:'#ebc17e',boss:'timewarden',
   fixed:{1:'clockwork',2:'duelist',9:'clockwork'},
   pools:{3:['clockwork','sentinel'],4:['rogue','clockwork'],6:['clockwork','cantor','sentinel'],7:['duelist','clockwork'],8:['sentinel','clockwork','wraith']}},
  {name:'熔鉄の工房',accent:'#f9a36b',scene:'forge',boss:'forge_master',
   fixed:{1:'ember_slime',2:'molten_sentinel',9:'molten_sentinel'},
   pools:{3:['ember_slime','molten_sentinel'],4:['molten_sentinel','ember_slime'],
    6:['ember_slime','molten_sentinel'],7:['molten_sentinel','ember_slime'],
    8:['ember_slime','molten_sentinel']}},
  {name:'白霜の回廊',accent:'#a9e5ff',scene:'frost',boss:'frost_priest',
   fixed:{1:'frost_wraith',2:'silver_duelist',9:'silver_duelist'},
   pools:{3:['frost_wraith','silver_duelist'],4:['silver_duelist','frost_wraith'],
    6:['frost_wraith','silver_duelist'],7:['silver_duelist','frost_wraith'],
    8:['silver_duelist','frost_wraith']}},
  {name:'星詠みの観測所',accent:'#c5b5f4',scene:'astral',boss:'star_warden',
   fixed:{1:'star_cantor',2:'orbital_clockwork',9:'orbital_clockwork'},
   pools:{3:['star_cantor','orbital_clockwork'],4:['orbital_clockwork','star_cantor'],
    6:['star_cantor','orbital_clockwork'],7:['orbital_clockwork','star_cantor'],
    8:['orbital_clockwork','star_cantor']}},
  {name:'虚無の天蓋',accent:'#c49bcf',scene:'void',boss:'endking',
   fixed:{1:'void_knight',2:'last_assassin',9:'void_knight'},
   pools:{3:['void_knight','last_assassin'],4:['last_assassin','void_knight'],
    6:['void_knight','last_assassin'],7:['last_assassin','void_knight'],
    8:['void_knight','last_assassin']}}
 ];
 // Two-zone-ahead blood-trial guests: only signature regulars, never bosses or rares.
 // No future zone exists at 61–80F, so the late-game trial stays an ordinary elite fight.
 const FORESHADOW_IDS=Object.freeze({
  2:['cantor'],
  3:['clockwork'],
  4:['ember_slime','molten_sentinel'],
  5:['frost_wraith','silver_duelist'],
  6:['star_cantor','orbital_clockwork'],
  7:['void_knight','last_assassin']
 });
 const FORESHADOW_RATE=.5;
 // The eight-zone ascent ends at 80F; endless play cycles back to the first zone.
 const zoneForFloor=f=>ZONES[Math.floor((((Math.max(1,Math.floor(f))-1)%(ZONES.length*10))+(ZONES.length*10))%(ZONES.length*10)/10)];
 const positionInZone=f=>((Math.max(1,Math.floor(f))-1)%10)+1;
 const enemyKey=e=>e.id+':'+(e.rare?'rare':e.elite?'elite':'normal');
 function buildEnemy(def,elite=false){
  if(!def)throw Error('Unknown enemy');
  return {...def,rhythm:[...def.rhythm],...(def.phaseRhythm?{phaseRhythm:[...def.phaseRhythm]}:{}),
   elite:!!elite,rare:!!def.rare,boss:!!def.boss,
   displayName:(elite?'精鋭・':'')+def.name,bookKey:enemyKey({...def,elite})};
 }
 function encounterForFloor(f,rng=Math.random,lastRareFloor=-9999){
  const floor=Math.max(1,Math.floor(f)),zone=zoneForFloor(floor),position=positionInZone(floor);
  if(position===5||position===10)return buildEnemy(byId[zone.boss],position===10);
  if(zone.fixed[position])return buildEnemy(byId[zone.fixed[position]],position===9);
  // Rare enemies replace the normal encounter; never bosses or guaranteed story/fixed rooms.
  if(floor>=6&&floor-lastRareFloor>=4&&rng()<0.08)
   return buildEnemy(rares[Math.floor(rng()*rares.length)%rares.length]);
  const pool=zone.pools[position]||[zone.fixed[1]];
  const chosen=pool[Math.floor(rng()*pool.length)%pool.length];
  const elite=floor>=8&&rng()<0.12;
  return buildEnemy(byId[chosen],elite);
 }
 // At 4F/8F, sometimes reveal the silhouette and rhythm from *two zones ahead*.
 // This is an ephemeral masked opponent; the original template and codex stay untouched.
 function foreshadowTrialForFloor(f,rng=Math.random){
  if(!Number.isSafeInteger(f)||f<1||f>60||![4,8].includes(positionInZone(f)))return null;
  const futureZone=Math.floor((f-1)/10)+2;
  const pool=FORESHADOW_IDS[futureZone];
  if(!pool||rng()>=FORESHADOW_RATE)return null;
  const idx=Math.min(pool.length-1,Math.max(0,Math.floor(rng()*pool.length)));
  const normal=byId[pool[idx]];
  if(!normal||normal.boss||normal.rare)return null;
  return {...buildEnemy(normal,true),preview:true,name:'？？？',displayName:'？？？'};
 }
 function findByKey(key){
  if(typeof key!=='string')return null;
  const [id,type,...rest]=key.split(':');
  if(rest.length||!byId[id])return null;
  const def=byId[id];
  if(type==='rare'&&def.rare)return buildEnemy(def);
  if(def.rare||!['normal','elite'].includes(type))return null;
  return buildEnemy(def,type==='elite');
 }
 function codexEntries(){
  return [...monsters,...bosses].flatMap(m=>[buildEnemy(m),buildEnemy(m,true)])
   .concat(rares.map(m=>buildEnemy(m)));
 }
 function baseStats(enc,f,arena=false){
  const actualFloor=arena?(enc.boss?5:1):Math.max(1,Math.floor(f));
  // Keep the original difficulty curve through floor 10, then soften its exponential growth.
  const hpGrowth=Math.pow(1.18,Math.min(actualFloor-1,9))
   *Math.pow(1.075,Math.max(0,Math.min(actualFloor,60)-10))
   *Math.pow(1.035,Math.max(0,actualFloor-60));
  const atkGrowth=Math.pow(1.09,Math.min(actualFloor-1,9))
   *Math.pow(1.045,Math.max(0,Math.min(actualFloor,60)-10))
   *Math.pow(1.012,Math.max(0,actualFloor-60));
  const hpScale=(enc.boss?2.15:1)*(enc.elite?1.30:1)*(enc.rare?1.12:1);
  const atkScale=(enc.boss?1.25:1)*(enc.elite?1.15:1)*(enc.rare?.95:1);
  // Preserve the pre-v0.5.4 floor/elite/rare curve and minimum attack floor,
  // then apply the enemy's own profile. Applying 0.80 before Math.max(13,...)
  // would erase most of the intended damage reduction on early floors.
  const baseHp=Math.max(1,Math.round(49*hpGrowth*hpScale));
  const baseAtk=Math.max(13,Math.round(14*atkGrowth*atkScale));
  const hpMultiplier=(enc.hpMultiplier??1)*(enc.finalBoss&&actualFloor===80&&!arena?1.35:1);
  const atkMultiplier=enc.atkMultiplier??1;
  return {maxHp:Math.max(1,Math.round(baseHp*hpMultiplier)),
   atk:Math.max(1,Math.round(baseAtk*atkMultiplier))};
 }
 function emptyBook(){return {version:2,seen:{},defeated:{}}}
 function normalizeBook(input){
  const b=emptyBook();
  if(!input||typeof input!=='object')return b;
  const sourceSeen=input.seen&&typeof input.seen==='object'?input.seen:{};
  for(const [key,rec] of Object.entries(sourceSeen)){
   if(!findByKey(key)||!rec||typeof rec!=='object')continue;
   const encounters=Math.max(0,Math.min(999999,Math.floor(Number(rec.encounters)||0)));
   if(encounters>0)b.seen[key]={encounters,firstFloor:Math.max(1,Math.floor(Number(rec.firstFloor)||1))};
  }
  // Prior v0.5.3 previews tracked only defeated enemies. Preserve their unlocks.
  const defeated=input.defeated&&typeof input.defeated==='object'?input.defeated:{};
  for(const [key,rec] of Object.entries(defeated)){
   if(!findByKey(key)||!rec||typeof rec!=='object')continue;
   const wins=Math.max(0,Math.min(999999,Math.floor(Number(rec.wins)||0)));
   if(wins>0){
    const firstFloor=Math.max(1,Math.floor(Number(rec.firstFloor)||1));
    b.defeated[key]={wins,firstFloor};
    if(!b.seen[key])b.seen[key]={encounters:wins,firstFloor};
   }
  }
  return b;
 }
 function recordEncounter(book,enc,floor){
  if(!enc||enc.preview)return false; // Hidden guest never unlocks a future enemy.
  const key=enemyKey(enc),previous=book.seen[key];
  book.seen[key]={encounters:Math.min(999999,(previous?.encounters||0)+1),
   firstFloor:previous?.firstFloor||Math.max(1,Math.floor(floor))};
  return !previous;
 }
 function recordDefeat(book,enc,floor){
  if(!enc||enc.preview)return false; // Nor does defeating its disguise reveal the codex.
  const key=enemyKey(enc),previous=book.defeated[key];
  if(!book.seen[key])recordEncounter(book,enc,floor);
  book.defeated[key]={wins:Math.min(999999,(previous?.wins||0)+1),firstFloor:previous?.firstFloor||Math.max(1,Math.floor(floor))};
  return !previous;
 }
 return Object.freeze({monsters,bosses,rares,all,ZONES,byId,zoneForFloor,positionInZone,
  encounterForFloor,foreshadowTrialForFloor,FORESHADOW_RATE,enemyKey,buildEnemy,findByKey,codexEntries,baseStats,emptyBook,normalizeBook,recordEncounter,recordDefeat});
});
