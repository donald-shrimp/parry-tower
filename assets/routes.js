/* v0.7.0 route planning: standalone rules, no save/DOM/audio access. */
(function(root){
 'use strict';
 const ROOMS=Object.freeze({
  rest:Object.freeze({id:'rest',name:'安息の間',icon:'🔥',tag:'SAFE',desc:'HP35%回復、または障壁+20と引き直し+1',risk:'戦闘なし・通常スキル報酬なし・コンボ終了'}),
  merchant:Object.freeze({id:'merchant',name:'行商人の隠れ処',icon:'🛒',tag:'TRADE',desc:'塔貨でラン限定の強化を購入（訪問ごとに1品）',risk:'戦闘なし・通常スキル報酬なし・コンボ終了'}),
  trial:Object.freeze({id:'trial',name:'血闘の間',icon:'⚔️',tag:'DANGER',desc:'HP1.3倍・攻撃力1.15倍の精鋭戦。勝利で塔貨14枚と通常戦利品',risk:'戦闘あり・時折、正体不明の精鋭が現れる'}),
  event:Object.freeze({id:'event',name:'奇遇の間',icon:'🔮',tag:'MYSTERY',desc:'祭壇・鏡・遺品・宝箱などのランダムイベント',risk:'戦闘なし・通常スキル報酬なし・コンボ終了'})
 });
 const PATHS=Object.freeze({
  first:Object.freeze(['rest','merchant','trial']),
  second:Object.freeze(['rest','event','trial'])
 });
 function branchKind(floor){
  if(!Number.isSafeInteger(floor)||floor<1)return null;
  const pos=((floor-1)%10)+1;
  return pos===4?'first':pos===8?'second':null;
 }
 function options(floor){return (PATHS[branchKind(floor)]||[]).map(id=>ROOMS[id]);}
 function isBattle(id){return id==='trial'}
 function towerCoins(enemy,trial=false){
  if(trial)return 14;
  if(!enemy)return 0;
  if(enemy.boss)return 10;
  if(enemy.elite||enemy.rare)return 12;
  return 6;
 }
 const API=Object.freeze({ROOMS,PATHS,branchKind,options,isBattle,towerCoins});
 if(typeof module==='object'&&module.exports)module.exports=API;
 if(root)root.ParryRoutes=API;
})(typeof window!=='undefined'?window:undefined);
