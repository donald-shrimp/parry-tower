/* Independent version guard and safe diagnostics.
 * Loaded BEFORE game.js: old cached gameplay code cannot suppress this check.
 * No localStorage access or automatic reload. Safe to use from the browser Console.
 */
(function(root){
 'use strict';
 const BUILD='v0.9.5-preview-3';
 const REQUIRED_ASSETS=[
  'style.css','diagnostics.js','encounters.js','enemy-motions.js','progression.js',
  'relics.js','routes.js','events.js','audio-clock.js','player-settings.js','run-checkpoint.js','combat-sfx.js','stage-music.js','game.js'
 ];
 const MODULES={
  encounters:'ParryEncounters',motions:'ParryEnemyMotions',progression:'ParryProgression',
  relics:'ParryRelics',routes:'ParryRoutes',events:'ParryEvents',stageMusic:'ParryStageMusic',settings:'ParryPlayerSettings',checkpoint:'ParryRunCheckpoint',clock:'ParryAudioClock'
 };
 let registeredBuild=null,stateGetter=null,assetFailures=[];
 let hasLoaded=false;
 const doc=root.document;
 function htmlBuild(){
  return doc.querySelector('meta[name="parry-build"]')?.getAttribute('content')||null;
 }
 function sourceEntries(){
  return Array.from(doc.querySelectorAll('script[src],link[href]')).map(el=>el.getAttribute('src')||el.getAttribute('href')||'');
 }
 function staleAssetUrls(){
  const sources=sourceEntries(),stale=[];
  for(const filename of REQUIRED_ASSETS){
   const path='./assets/'+filename;
   const item=sources.find(src=>src.split(/[?#]/)[0]===path);
   // Every gameplay module needs the SAME build parameter as the HTML.
   if(!item||!item.split(/[?&]v=/)[1]?.split(/[&#]/)[0]||
     item.split(/[?&]v=/)[1].split(/[&#]/)[0]!==BUILD)stale.push(filename);
  }
  return stale;
 }
 function currentState(){
  try{
   const getter=stateGetter||(typeof root.__parryV05==='function'?root.__parryV05:null);
   if(!getter)return null;
   const s=getter();
   return s&&typeof s==='object'?s:null;
  }catch(e){return {stateError:String(e?.message||e)}}
 }
 function snapshot(){
  const state=currentState();
  const modules=Object.fromEntries(Object.entries(MODULES).map(([label,global])=>[label,!!root[global]]));
  const html=htmlBuild(),stale=staleAssetUrls();
  const issues=[];
  if(!html)issues.push('HTMLにビルド情報がありません');
  else if(html!==BUILD)issues.push('HTMLと診断スクリプトのビルドが異なります');
  if(stale.length)issues.push('アセットURLのビルド指定が不一致: '+stale.join(', '));
  if(assetFailures.length)issues.push('読み込みに失敗したアセット: '+assetFailures.join(', '));
  const missing=Object.keys(modules).filter(key=>!modules[key]);
  if(missing.length)issues.push('必要なゲームモジュールがありません: '+missing.join(', '));
  if(!registeredBuild)issues.push('ゲーム本体のビルド登録がありません（古いgame.jsの可能性）');
  else if(registeredBuild!==html||registeredBuild!==BUILD)
   issues.push('HTMLとゲーム本体のビルドが異なります');
  if(!state)issues.push('ゲーム状態を取得できません');
  else if(state.stateError)issues.push('ゲーム状態の取得に失敗しました');
  else if(!Number.isFinite(state.towerCoins)||!Number.isFinite(state.towerCoinsEarned))
   issues.push('塔貨フィールドが存在しません（古いゲームコードの可能性）');
  const floor=Number.isInteger(state?.floor)?state.floor:null;
  const plannedRoute=floor!==null&&modules.routes?root.ParryRoutes.branchKind(floor):null;
  const routeActive=state?.mode==='route';
  const devMode=doc.documentElement?.dataset?.parryDev==='true';
  return {
   status:issues.length?'mismatch':'ok',
   expectedBuild:BUILD,htmlBuild:html,gameBuild:registeredBuild,
   url:root.location?.pathname||'',devMode,
   mode:state?.mode??null,floor,practice:state?.practice??null,clock:state?.clock??null,
   enemy:state?.enemy??null,
   towerCoins:typeof state?.towerCoins==='number'?state.towerCoins:null,
   towerCoinsEarned:typeof state?.towerCoinsEarned==='number'?state.towerCoinsEarned:null,
   plannedRoute,routeActive,currentRoom:state?.currentRoom??null,
   routeTrial:state?.routeTrial??null,
   modules,staleAssets:stale,assetFailures:[...assetFailures],issues
  };
 }
 function logSnapshot(){
  const result=snapshot();
  root.console?.group?.('[パリィの塔] 診断結果: '+(result.status==='ok'?'正常':'更新が必要'));
  root.console?.table?.({
   status:result.status,htmlBuild:result.htmlBuild,gameBuild:result.gameBuild,
   floor:result.floor,mode:result.mode,towerCoins:result.towerCoins,
   earned:result.towerCoinsEarned,plannedRoute:result.plannedRoute,
   practice:result.practice,devMode:result.devMode
  });
  root.console?.info?.('詳細情報（保存データ・個人情報は含まれません）',result);
  root.console?.groupEnd?.();
  return result;
 }
 function showWarning(data){
  const id='parryVersionWarning';
  let bar=doc.getElementById(id);
  if(!bar){
   bar=doc.createElement('section');bar.id=id;bar.className='version-warning';
   bar.setAttribute('role','alert');
   bar.setAttribute('aria-live','assertive');
   const heading=doc.createElement('strong');heading.textContent='⚠️ ゲームの更新が必要です';
   const message=doc.createElement('p');
   const button=doc.createElement('button');
   button.type='button';button.textContent='再読み込みする';button.addEventListener('click',()=>root.location.reload());
   bar.append(heading,message,button);
   (doc.body||doc.documentElement).prepend(bar);
  }
  bar.querySelector('p').textContent=
   '画面とプログラムのバージョンが一致しない可能性があります。'+
   '更新すると進行中のランは失われますが、恒久強化・図鑑の保存データは消去しません。'+
   '問題: '+data.issues.join(' / ');
  return bar;
 }
 function verify(){
  const data=snapshot();
  if(data.status!=='ok')showWarning(data);
  else doc.getElementById('parryVersionWarning')?.remove();
  return data;
 }
 function registerGame(build,getter){
  registeredBuild=typeof build==='string'?build:null;
  stateGetter=typeof getter==='function'?getter:null;
  if(hasLoaded)verify();
 }
 function recordFailedAsset(event){
  const source=event?.target?.getAttribute?.('src')||event?.target?.getAttribute?.('href');
  if(source&&source.includes('/assets/')&&!assetFailures.includes(source))assetFailures.push(source);
 }
 const API=Object.freeze({
  diagnose:logSnapshot,status:snapshot,checkVersion:verify,
  // JSON with only technical state; no saved player data or identifiers.
  report:()=>JSON.stringify(snapshot(),null,2)
 });
 root.parryTower=API;
 root.ParryDiagnostics=Object.freeze({build:BUILD,registerGame,verify});
 root.addEventListener('error',recordFailedAsset,true);
 root.addEventListener('load',()=>{
  hasLoaded=true;verify();
 });
 if(typeof module==='object'&&module.exports)module.exports={BUILD};
})(typeof window!=='undefined'?window:undefined);
