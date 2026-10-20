'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const BUILD='v0.9.3-11';
const source=fs.readFileSync('assets/diagnostics.js','utf8');

function diagnosticPage(page='index.html',options={}){
 const html=fs.readFileSync(page,'utf8');
 const listeners={},elements=new Map(),logs=[];
 let reloads=0,saveWrites=0;
 const attributes=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)].map(m=>m[1]);
 const meta=html.match(/<meta name="parry-build" content="([^"]+)"/)?.[1]||null;
 const nodes=attributes.map(url=>({getAttribute(name){return name==='src'||name==='href'?url:null}}));
 function node(tag){
  return {
   tag,id:null,textContent:'',children:[],attrs:{},listeners:{},
   setAttribute(k,v){this.attrs[k]=v},
   addEventListener(k,fn){this.listeners[k]=fn},
   append(...children){this.children.push(...children)},
   querySelector(k){return this.children.find(x=>x.tag===k)||null},
   remove(){if(this.id)elements.delete(this.id)}
  };
 }
 const body={prepend(child){if(child.id)elements.set(child.id,child)}};
 const document={
  documentElement:{dataset:{parryDev:page==='dev.html'?'true':'false'}},
  body,
  querySelector(selector){
   if(selector==='meta[name="parry-build"]')
    return meta===null?null:{getAttribute:()=>options.htmlBuild??meta};
   return null;
  },
  querySelectorAll(selector){
   if(selector==='script[src],link[href]')
    return options.assetEntries||nodes;
   return [];
  },
  getElementById(id){return elements.get(id)||null},
  createElement:node
 };
 const logger={
  group(...x){logs.push(['group',...x])},table(...x){logs.push(['table',...x])},
  info(...x){logs.push(['info',...x])},groupEnd(){}
 };
 const win={
  document,location:{pathname:'/parry-tower/'+(page==='dev.html'?'dev.html':''),reload(){reloads++}},
  console:logger,addEventListener(k,cb){listeners[k]=cb}
 };
 const modules={
  ParryEncounters:{},ParryEnemyMotions:{},ParryProgression:{},ParryRelics:{},
  ParryRoutes:{branchKind(floor){return floor%10===4?'first':floor%10===8?'second':null}},
  ParryEvents:{},ParryStageMusic:{}
 };
 for(const [key,value] of Object.entries(modules))if(!options.missingModule||options.missingModule!==key)win[key]=value;
 const ctx={window:win,module:{exports:{}},console:logger,localStorage:{
  getItem(){throw Error('diagnostics MUST NOT read player saves')},
  setItem(){saveWrites++;throw Error('diagnostics MUST NOT mutate player saves')}
 }};
 vm.runInNewContext(source,ctx,{filename:'diagnostics.js'});
 const healthy={
  mode:'relic',floor:3,practice:false,towerCoins:18,towerCoinsEarned:18,
  enemy:'knight',currentRoom:null,routeTrial:false
 };
 if(options.legacyState){
  win.__parryV05=()=>({mode:'relic',floor:3,practice:false});
 }else if(!options.noState){
  win.__parryV05=()=>healthy;
 }
 if(!options.oldGame&&!options.noState){
  win.ParryDiagnostics.registerGame(options.gameBuild||BUILD,win.__parryV05);
 }
 if(options.failedAsset)listeners.error({target:{getAttribute(k){return k==='src'?options.failedAsset:null}}});
 listeners.load();
 return {
  api:win.parryTower,win,doc:document,log:logs,healthy,
  get warning(){return document.getElementById('parryVersionWarning')},
  get reloads(){return reloads},get writes(){return saveWrites}
 };
}
test('HTML, game marker and asset query versions are identical in both entrypoints',()=>{
 const required=['style.css','diagnostics.js','encounters.js','enemy-motions.js','progression.js',
  'relics.js','routes.js','events.js','combat-sfx.js','stage-music.js','game.js'];
 for(const file of ['index.html','dev.html']){
  const s=fs.readFileSync(file,'utf8');
  assert.match(s,/<meta name="parry-build" content="v0\.9\.3-11">/);
  assert.match(s,/v0\.9\.3/);
  for(const name of required)assert.ok(s.includes('./assets/'+name+'?v='+BUILD),name+' in '+file);
  for(const asset of [...s.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)]){
   assert.ok(asset[1].includes('?v='+BUILD),'all local assets have build query: '+asset[1]);
  }
  assert.ok(s.indexOf('assets/diagnostics.js')<s.indexOf('assets/game.js'),'guard loads before game');
 }
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.ok(game.includes("window.ParryDiagnostics?.registerGame('v0.9.3-11',window.__parryV05)"));
});
test('healthy game reports technical status and correct floor-specific route with no warning',()=>{
 const p=diagnosticPage();
 assert.equal(p.api.status().status,'ok');
 assert.equal(p.api.status().towerCoins,18);
 assert.equal(p.api.status().towerCoinsEarned,18);
 assert.equal(p.api.status().floor,3);
 assert.equal(p.api.status().plannedRoute,null,'3F is not a crossroads');
 assert.equal(p.warning,null);
 assert.equal(p.api.status().gameBuild,BUILD);
 assert.equal(p.api.status().htmlBuild,BUILD);
 assert.equal(p.api.status().staleAssets.length,0);
 assert.ok(Object.values(p.api.status().modules).every(Boolean));
 assert.equal(p.writes,0);
 const report=JSON.parse(p.api.report());
 assert.equal(report.status,'ok');
 assert.equal(report.practice,false);
 assert.ok(!('permanent' in report));
 assert.ok(!('localStorage' in report));
 const diagnostic=p.api.diagnose();
 assert.equal(diagnostic.status,'ok');
 assert.ok(p.log.some(entry=>entry[0]==='table'));
});
test('4F and 8F show expected route types; no forced warning in legitimate reward mode',()=>{
 for(const [floor,route] of [[3,null],[4,'first'],[8,'second'],[14,'first'],[18,'second']]){
  const p=diagnosticPage('index.html');
  p.healthy.floor=floor;
  assert.equal(p.api.status().plannedRoute,route);
  assert.equal(p.api.status().status,'ok');
 }
});
test('legacy cached game.js lacking registration and towerCoins triggers actionable warning',()=>{
 const p=diagnosticPage('index.html',{oldGame:true,legacyState:true});
 const s=p.api.diagnose();
 assert.equal(s.status,'mismatch');
 assert.equal(s.htmlBuild,BUILD,'HTML is current');
 assert.equal(s.gameBuild,null,'game.js failed to register');
 assert.equal(s.floor,3);
 assert.equal(s.towerCoins,null,'old gameplay has no tower coin counter');
 assert.ok(s.issues.some(x=>x.includes('ゲーム本体のビルド登録')));
 assert.ok(s.issues.some(x=>x.includes('塔貨フィールド')));
 assert.ok(p.warning);
 assert.match(p.warning.children[1].textContent,/保存データは消去しません/);
 assert.match(p.warning.children[1].textContent,/進行中のランは失われます/);
 assert.equal(p.reloads,0,'never reload without the player clicking');
 p.warning.children[2].listeners.click();
 assert.equal(p.reloads,1);
 assert.equal(p.writes,0);
});
test('HTML build and game build disagreements are detected independently',()=>{
 const htmlMismatch=diagnosticPage('index.html',{htmlBuild:'v0.6.0'});
 assert.equal(htmlMismatch.api.status().status,'mismatch');
 assert.ok(htmlMismatch.api.status().issues.some(x=>x.includes('HTMLと診断')));
 assert.ok(htmlMismatch.warning);
 const gameMismatch=diagnosticPage('index.html',{gameBuild:'v0.6.0'});
 assert.equal(gameMismatch.api.status().status,'mismatch');
 assert.ok(gameMismatch.api.status().issues.some(x=>x.includes('ゲーム本体のビルド')));
 assert.ok(gameMismatch.warning);
});
test('missing module, stale URL and script load failure each trigger a warning',()=>{
 const missing=diagnosticPage('index.html',{missingModule:'ParryRoutes'});
 assert.equal(missing.api.status().status,'mismatch');
 assert.ok(missing.api.status().issues.some(x=>x.includes('必要なゲームモジュール')));
 const missingMusic=diagnosticPage('index.html',{missingModule:'ParryStageMusic'});
 assert.equal(missingMusic.api.status().status,'mismatch');
 const stale=diagnosticPage('index.html',{assetEntries:[]});
 assert.equal(stale.api.status().staleAssets.length,11);
 assert.equal(stale.api.status().status,'mismatch');
 const failed=diagnosticPage('index.html',{failedAsset:'./assets/game.js?v='+BUILD});
 assert.equal(failed.api.status().status,'mismatch');
 assert.equal(failed.api.status().assetFailures.length,1);
 assert.ok(failed.warning);
});
test('game.js absent entirely shows reload prompt without diagnostic code crashing',()=>{
 const p=diagnosticPage('index.html',{noState:true});
 assert.equal(p.api.status().status,'mismatch');
 assert.equal(p.api.status().mode,null);
 assert.ok(p.api.status().issues.some(x=>x.includes('ゲーム状態を取得できません')));
 assert.ok(p.warning);
});
test('developer entry is detected without exposing querystrings or stored account data',()=>{
 const p=diagnosticPage('dev.html');
 assert.equal(p.api.status().status,'ok');
 assert.equal(p.api.status().devMode,true);
 assert.equal(p.api.status().url,'/parry-tower/dev.html');
 assert.equal(p.writes,0);
});
test('late registering game repairs initial warning automatically',()=>{
 const p=diagnosticPage('index.html',{oldGame:true,legacyState:true});
 assert.ok(p.warning);
 p.win.__parryV05=()=>p.healthy;
 p.win.ParryDiagnostics.registerGame(BUILD,p.win.__parryV05);
 assert.equal(p.api.status().status,'ok');
 assert.equal(p.warning,null);
});
