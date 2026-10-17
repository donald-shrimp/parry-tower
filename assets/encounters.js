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
  {id:'clockwork',name:'時計仕掛けの兵士',kind:'knight',hpMultiplier:1.10,atkMultiplier:0.95,rhythm:[2,1,3,2],color:'#e4ae80',desc:'一定の拍と急な連撃を切り替える。'}
 ];
 const bosses=[
  {id:'guardian',name:'鐘楼の守護者',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,2,1,3,1,3],color:'#ffcc86',boss:true,desc:'鐘の拍に合わせて大剣を振り下ろす。'},
  {id:'ironwarden',name:'鉄血の監督官',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[2,1,2,1,3,3],color:'#f6a58c',boss:true,desc:'兵舎を統率する連撃型の守護者。'},
  {id:'dirgekeeper',name:'弔鐘の司祭',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[3,1.5,1.5,2,4],color:'#abb6ff',boss:true,desc:'休符を読めなければ崩される。'},
  {id:'timewarden',name:'時の監視者',kind:'guardian',hpMultiplier:1.50,atkMultiplier:1.00,rhythm:[1,2,1,3,1,4],color:'#f9d2a0',boss:true,desc:'短い斬撃と長い溜めを交互に使う。'}
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
   pools:{3:['clockwork','sentinel'],4:['rogue','clockwork'],6:['clockwork','cantor','sentinel'],7:['duelist','clockwork'],8:['sentinel','clockwork','wraith']}}
 ];
 const zoneForFloor=f=>ZONES[Math.floor((((Math.max(1,Math.floor(f))-1)%40)+40)%40/10)];
 const positionInZone=f=>((Math.max(1,Math.floor(f))-1)%10)+1;
 const enemyKey=e=>e.id+':'+(e.rare?'rare':e.elite?'elite':'normal');
 function buildEnemy(def,elite=false){
  if(!def)throw Error('Unknown enemy');
  return {...def,rhythm:[...def.rhythm],elite:!!elite,rare:!!def.rare,boss:!!def.boss,
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
  const hpGrowth=Math.pow(1.18,Math.min(actualFloor-1,9))*Math.pow(1.075,Math.max(0,actualFloor-10));
  const atkGrowth=Math.pow(1.09,Math.min(actualFloor-1,9))*Math.pow(1.045,Math.max(0,actualFloor-10));
  const hpScale=(enc.boss?2.15:1)*(enc.elite?1.30:1)*(enc.rare?1.12:1);
  const atkScale=(enc.boss?1.25:1)*(enc.elite?1.15:1)*(enc.rare?.95:1);
  // Preserve the pre-v0.5.4 floor/elite/rare curve and minimum attack floor,
  // then apply the enemy's own profile. Applying 0.80 before Math.max(13,...)
  // would erase most of the intended damage reduction on early floors.
  const baseHp=Math.max(1,Math.round(49*hpGrowth*hpScale));
  const baseAtk=Math.max(13,Math.round(14*atkGrowth*atkScale));
  const hpMultiplier=enc.hpMultiplier??1;
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
  const key=enemyKey(enc),previous=book.seen[key];
  book.seen[key]={encounters:Math.min(999999,(previous?.encounters||0)+1),
   firstFloor:previous?.firstFloor||Math.max(1,Math.floor(floor))};
  return !previous;
 }
 function recordDefeat(book,enc,floor){
  const key=enemyKey(enc),previous=book.defeated[key];
  if(!book.seen[key])recordEncounter(book,enc,floor);
  book.defeated[key]={wins:Math.min(999999,(previous?.wins||0)+1),firstFloor:previous?.firstFloor||Math.max(1,Math.floor(floor))};
  return !previous;
 }
 return Object.freeze({monsters,bosses,rares,all,ZONES,byId,zoneForFloor,positionInZone,
  encounterForFloor,enemyKey,buildEnemy,findByKey,codexEntries,baseStats,emptyBook,normalizeBook,recordEncounter,recordDefeat});
});
