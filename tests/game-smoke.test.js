'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js');
const PR=require('../assets/progression.js');

function makeHarness(seed={},devMode=false,artMode='',devSearch='?floor=21&enemy=cantor%3Anormal',artGate=null,failRunSave=false){
 let clock=10000,animation=null,randomOverride=null;const clickers=new Map(),storage=new Map(Object.entries(seed));
 const audioEvents=[],metalEvents=[],contactEvents=[],tailEvents=[],artDrawCounts={hero:0,enemy:0};let lastHeroPose=null,lastHeroSkin=null,lastEnemySample=null;const bonusArtEvents=[];
 const math=Object.create(Math);math.random=()=>randomOverride===null?Math.random():randomOverride;
 const html=fs.readFileSync(devMode?'dev.html':'index.html','utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const required=['codexCover','practiceBtn','practiceEnemy','codexList','zoneLabel','gameCanvas','upgradeCover','upgradeList','upgradeTabs','combatBuffs','relicCover','relicOfferCards','relicReplaceList','relicList','relicCount','routeCover','routeCards','roomCover','roomActions','routeSkillCover','routeSkillCards','towerCoinsLabel'];
 for(const id of required)assert.ok(ids.includes(id),id+' is missing in index.html');
 const el=new Map();
 function node(id){
  const n={
   id,hidden:false,dataset:{},style:{},innerHTML:'',textContent:'',value:id==='practiceEnemy'?'knight':id==='codexFilter'?'all':id==='devFloor'?'11':'',disabled:false,listeners:{},children:[],
   append(...children){this.children.push(...children)},appendChild(child){this.children.push(child)},
   setAttribute(k,v){this[k]=v},
   addEventListener(k,cb){this.listeners[k]=cb;},
   click(){this.listeners.click?.()},scrollIntoView(){},focus(){},
   getBoundingClientRect(){return {width:800,height:500}},
   querySelectorAll(selector){
    if(selector==='[data-practice]'){
     return [...this.innerHTML.matchAll(/data-practice="([^"]+)"/g)].map(m=>{
      const key=m[1],b={dataset:{practice:key},addEventListener(type,cb){clickers.set(key,cb)}};return b;
     });
    }
    return [];
   }
  };
  el.set(id,n);return n;
 }
 for(const id of ids)node(id);
 const noop=()=>{};
 const ctx=new Proxy({globalAlpha:1},{
  get(target,k){
   if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop:noop});
   if(k==='measureText')return ()=>({width:36});
   return target[k]??noop;
  },set(target,k,v){target[k]=v;return true;}
 });
 el.get('gameCanvas').getContext=()=>ctx;
 const para=()=>({value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop,linearRampToValueAtTime:noop,cancelScheduledValues:noop,setTargetAtTime:noop});
 class Audio{
  constructor(){this.state='running';this.sampleRate=44100;this.destination={}}
  get currentTime(){return clock/1000}
  getOutputTimestamp(){return {performanceTime:clock,contextTime:clock/1000}}
  resume(){return Promise.resolve()}
  createGain(){const gain=para();gain.setTargetAtTime=value=>{gain.value=value};return {gain,connect:noop}}
  createOscillator(){
   const osc={frequency:null,initialFrequency:null,type:'sine',connect:noop,
    start(time){audioEvents.push({time,frequency:osc.initialFrequency,type:osc.type})},stop:noop};
   osc.frequency=para();
   osc.frequency.setValueAtTime=(hz)=>{osc.initialFrequency=hz};
   return osc;
  }
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)}}
  createBufferSource(){return {connect:noop,start:noop,stop:noop}}
  createBiquadFilter(){return {frequency:para(),Q:para(),connect:noop}}
 }
 const windowListeners={},documentListeners={};
 const window={
  ParryAudioClock:require('../assets/audio-clock.js'),
  ParryPlayerSettings:require('../assets/player-settings.js'),ParryRunCheckpoint:require('../assets/run-checkpoint.js'),ParryEncounters:P,ParryEnemyMotions:require('../assets/enemy-motions.js'),ParryProgression:require('../assets/progression.js'),ParryRelics:require('../assets/relics.js'),ParryRoutes:require('../assets/routes.js'),ParryEvents:require('../assets/events.js'),AudioContext:Audio,devicePixelRatio:1,addEventListener:(type,listener)=>{windowListeners[type]=listener}
 };
 window.ParryStageMusic=require('../assets/stage-music');
 window.ParryFinalBossMusic=require('../assets/final-boss-music');
 const document={
  documentElement:{dataset:{parryDev:devMode?'true':'false'}},
  createElement(tag){if(tag==='canvas')return {getContext:()=>ctx};return {tag,children:[],value:'',label:'',textContent:'',appendChild(x){this.children.push(x)}}},
  getElementById(id){if(!el.has(id))throw new Error('Unknown DOM id: '+id);return el.get(id)},
  addEventListener:(type,listener)=>{documentListeners[type]=listener},querySelectorAll:()=>[],hidden:false
 };
 const context={
  window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failRunSave&&k==='parryTowerRun_v1')throw new Error('quota');storage.set(k,v)},removeItem:k=>storage.delete(k)},
  navigator:{vibrate:noop},performance:{now:()=>clock},
  requestAnimationFrame:cb=>{animation=cb},setTimeout:()=>0,clearTimeout:noop,
  ResizeObserver:undefined,console,Math:math
 };
 vm.runInNewContext(fs.readFileSync('assets/combat-sfx.js','utf8'),context);
 const metal=window.ParryCombatSfx;window.ParryCombatSfx={...metal,play(ac,kind,when,destination){metalEvents.push({kind,when:when??ac.currentTime,destination});return metal.play(ac,kind,when,destination);}};
 window.ParryCombatSfx.playContact=(ac,when,destination)=>{const e={when,destination,cancelled:false};contactEvents.push(e);const h=metal.playContact(ac,when,destination),cancel=h.cancel;h.cancel=()=>{e.cancelled=true;cancel();};return h;};
 window.ParryCombatSfx.playTail=(ac,kind,contactAt,destination)=>{tailEvents.push({kind,contactAt,resultAt:ac.currentTime,destination});return metal.playTail(ac,kind,contactAt,destination);};
 if(artMode){
  context.URL=URL;
  window.location={search:artMode==='adopted'?'':'?art='+(artMode==='missing'?'impact':artMode==='missing-illustrated'?'illustrated':artMode)};window.document=document;window.URL=URL;window.localStorage=context.localStorage;
  // Synchronous raster stand-ins exercise the real compositors in this VM.
  window.Image=class {set src(_){this.onload?.();}};
  if(['impact','illustrated','adopted'].includes(artMode))for(const name of [...(artMode==='adopted'?['palette-candidates','character-style']:[]),'character-art','character-ready','character-knight','combat-art',...(['illustrated','adopted'].includes(artMode)?['character-edit','character-hero-puppet','character-enemy-data','character-enemy-puppet','character-knight-puppet']:[])]){
   document.currentScript={src:'http://localhost/assets/'+name+'.js'};
   vm.runInNewContext(fs.readFileSync('assets/'+name+'.js','utf8'),context,{filename:name+'.js'});
  }
  document.currentScript=null;
  if(['illustrated','adopted'].includes(artMode)){
   const original=window.ParryKnightPuppet;
   window.ParryKnightPuppet={...original,drawHero(...args){lastHeroPose={...args[1].pose};lastHeroSkin=args[1].skin;const ok=original.drawHero(...args);if(ok)artDrawCounts.hero++;return ok;},
    drawEnemy(...args){const ok=original.drawEnemy(...args);if(ok){artDrawCounts.enemy++;
     const sampler=window.ParryEnemyPuppet?.supports(args[1].e)?window.ParryEnemyPuppet:original;
     lastEnemySample=sampler.sample(args[1]);
    }return ok;}};
  }
 }
 if(window.ParryCombatArt){const art=window.ParryCombatArt;window.ParryCombatArt={...art,
  counterSlash(ctx,data){const out=art.counterSlash(ctx,data);if(out)bonusArtEvents.push({kind:'slashTint',tint:data.tint?.id||null});return out;},
  comboAura(ctx,data){const out=art.comboAura(ctx,data);if(out)bonusArtEvents.push({kind:'comboGlow',tier:out.tier,combo:data.combo});return out;}};}
 if(artGate)window.ParryKnightPuppet=artGate;
 // Test-only instrumentation lives in the VM, not in the shipped game or its public debug API.
 const source=fs.readFileSync('assets/game.js','utf8');
 assert.match(source,/\}\)\(\);\s*$/);
 const debugSource=source.replace(/\}\)\(\);\s*$/, `const hitLog=[];
  // Test-only recording of what is actually drawn in the canvas at each phase.
  const phaseDrawLabels=[];
  const hudDrawLabels=[];
  const originalTextDraw=textDraw;
  textDraw=function(...args){
   if(game.enemy?.finalBoss&&['phase','combat'].includes(game.mode))
    phaseDrawLabels.push({mode:game.mode,label:String(args[0]),y:args[2]});
   if(game.mode==='combat'&&(String(args[0]).includes(' COMBO')||String(args[0]).startsWith('FLOOR ')))
    hudDrawLabels.push({label:String(args[0]),y:args[2],size:args[3]});
   return originalTextDraw(...args);
  };
  const rawDamageEnemy=damageEnemy;
  damageEnemy=function(n,color,label){
   const before=game.enemy?.hp||0;
   const outcome=rawDamageEnemy(n,color,label);
   hitLog.push({label:label||'反撃',dealt:Math.max(0,before-(game.enemy?.hp||0))});
   return outcome;
  };
  window.__parryBloodTest={
   presentation:()=>({contact:attackPresentation.contact?{...attackPresentation.contact}:null,clash:clashFX?{...clashFX}:null}),
   fallbackSfx:legacy=>{if(legacy){delete window.ParryCombatSfx.playContact;delete window.ParryCombatSfx.playTail;}else window.ParryCombatSfx=null;},
   musicTheme:()=>score.music,
   musicBus:()=>score.bus,audioContext:()=>audioContext,
   mixGains:()=>({bgm:score.bus?.gain.value,steel:devSfxBus?.gain.value}),
   phaseDrawLabels:()=>phaseDrawLabels.map(x=>({...x})),
   clearPhaseDrawLabels:()=>{phaseDrawLabels.length=0},
   hudDrawLabels:()=>hudDrawLabels.map(x=>({...x})),
   clearHudDrawLabels:()=>{hudDrawLabels.length=0},
   hits:()=>hitLog.map(h=>({...h})),
   resetHits:()=>{hitLog.length=0},
   rewardPool:()=>choosePool().map(skill=>skill.id),
   incoming:n=>applyDamage(n,'TEST'),
   setShield:ward=>{game.shield=ward},
   setFrostWard:flag=>{game.frostWard=flag},
   setFrostCount:value=>{game.frostCount=value},
   setFortitudeReady:flag=>{game.fortitudeReady=flag},
   setOverchargeCount:value=>{game.overchargeCount=value},
   setJustStreak:value=>{game.justStreak=value},
   setBloodlustPending:value=>{game.bloodlustPending=value},
   jumpFloor:floor=>{stopScore();game.floor=floor;game.routeTrial=false;enterFloor(performance.now());return game.mode},
   setEvent:id=>{if(game.currentRoom!=='event'||!EV.BY_ID[id])return false;game.eventId=id;game.roomStage=null;game.roomLocked=false;renderRoom();return true},
   setTowerCoins:coins=>{game.towerCoins=coins;syncHUD()},
   getRouteOptions:()=>RT.options(game.floor).map(r=>r.id),
   getEventActions:()=>EV.BY_ID[game.eventId]?.actions.map(x=>x.id)||[],
   setEventStage:stage=>{game.roomStage=stage;renderRoom()},

   grantRelic:id=>{
    if(!RR.BY_ID[id]||game.relics.includes(id)||game.relics.length>=RR.MAX_HELD)return false;
    const mode=game.mode,offer=game.relicOffer;game.mode='relic';game.relicOffer=[id];
    const result=grantRelic(id);game.mode=mode;game.relicOffer=offer;return result;
   },
   setRelicCounter:(id,count)=>{game.relicCounters[id]=count},
   setRelicFlag:(id,value)=>{game[id]=value},
   setRawMaxHp:value=>{game.rawMaxHp=value;adjustRelicMaxHp()},
   forceRelicAward:kind=>{game.relicRewardKind=kind},
   awardPreview:kind=>showRelicRewards(kind),
   finishRelic:()=>finishRelicReward(),
   relicInfo:()=>({burn:game.enemy?.burn,held:[...game.relics],discarded:[...game.relicDiscarded],
    rustyUsed:game.relicRustyUsed,stardustUsed:game.relicStardustUsed,stopUsed:game.relicStopUsed,
    pactReady:game.relicPactReady,bellDue:game.relicBellDue,maskReady:game.relicMaskReady,
    gearReady:game.relicGearReady,justStreak:game.relicJustStreak,
    counters:{...game.relicCounters},boltDue:game.relicBoltDue,emperorDue:game.relicEmperorDue}),

  preferences:()=>({...preferences,sfxGain:playerSfxBus?.gain.value}),
  checkpoint:()=>{checkpoint();return readCheckpoint()},
  tutorialInfo:()=>({active:game.tutorial,step:game.tutorialStep,finishing:game.tutorialFinishing}),
  calibrationInfo:()=>calibration?{kind:calibration.kind,targets:calibration.targets?.map(t=>scoreToPerf(t,0)),result:calibration.result,errors:calibration.errors?[...calibration.errors]:[]}:null,
  timingInfo:()=>({windup:!motionFor(game.enemy).noWindup,windupLead:motionFor(game.enemy).cuePrepare,recovery:motionFor(game.enemy).recovery,parryWindow:getParryWindow(),target:inputTargetAt(),telegraphStart:game.telegraphStart,guardAtImpact:game.guardAtImpact,lastDeflectAt:game.lastDeflectAt}),
  skillCatalog:()=>SKILLS.map(s=>({id:s.id,max:s.max,desc:s.desc})),
  skillCap,merchantTargets,
  setBreaks:(id,n)=>{game.skillBreaks[id]=n},
  bloodHealAmount,
  setSkill:(id,level)=>{game.lv[id]=level},
  gainSkill:id=>gainSkillLevel(id),
  setHp:hp=>{game.hp=hp},
  setMaxHp:hp=>{game.maxHp=hp},
  setEnemyHp:hp=>{game.enemy.hp=hp;game.enemy.maxHp=Math.max(game.enemy.maxHp,hp)},
  setCombo:combo=>{game.combo=combo},
  setCharge:charge=>{game.charge=charge},
  setBurn:burn=>{game.enemy.burn=burn},
  setEnemyAttack:attack=>{game.enemy.atk=attack},
  setBaseAttack:attack=>{game.baseAtk=attack},
  info:()=>({enemyHp:game.enemy?.hp,enemyMaxHp:game.enemy?.maxHp,baseAtk:game.baseAtk,combo:game.combo,charge:game.charge,
   guards:game.guards,charge:game.charge,parryDamageActive:!!game.parryDamageActive,justStreak:game.justStreak,overchargeCount:game.overchargeCount})
 };})();`);
 vm.runInNewContext(debugSource,context,{filename:'game.js'});
 if(devMode)vm.runInNewContext(fs.readFileSync('assets/dev-tools.js','utf8'),{
  window,document,location:{search:devSearch},URLSearchParams,console
 },{filename:'dev-tools.js'});
 return {
  el,clickers,storage,artMode:()=>document.documentElement.dataset.parryArt,state:()=>window.__parryV05(),dev:()=>window.__parryDev,bloodTest:()=>window.__parryBloodTest,
  artStatus:()=>({hero:!!window.ParryHeroReady?.ready(),knight:!!window.ParryKnightTrace?.ready()}),
  readyArt:async(e)=>{await window.ParryCombatArt?.preload();await window.ParryKnightPuppet?.preload(e);await new Promise(resolve=>setImmediate(resolve));},
  illustratedStatus:()=>({hero:!!window.ParryHeroPuppet?.ready(),knight:!!window.ParryKnightPuppet?.ready()}),
  bonusArtEvents:()=>bonusArtEvents.map(e=>({...e})),
  artDrawCounts:()=>({...artDrawCounts}),
  metalEvents:()=>metalEvents.map(e=>({...e})),heroPose:()=>lastHeroPose,heroSkin:()=>lastHeroSkin,enemySample:()=>lastEnemySample,
  contactEvents:()=>contactEvents.map(e=>({...e})),tailEvents:()=>tailEvents.map(e=>({...e})),
  audioEvents:()=>audioEvents.map(x=>({...x})),clearAudioEvents:()=>{audioEvents.length=0},
  press(id){const e=el.get(id);assert.ok(e?.listeners.click,id+' click handler missing');e.listeners.click()},
   upgradeTab(id){el.get('upgradeTabs').listeners.click({target:{closest:()=>({dataset:{tab:id}})}})},
   upgradeBuy(action,key){el.get('upgradeList').listeners.click({target:{closest:()=>({dataset:{action,key:String(key)}})}})},
   upgradeEquip(slot,id){el.get('upgradeList').listeners.change({target:{closest:selector=>selector==='[data-equip]'?{dataset:{equip:String(slot)},value:id||''}:null}})},
   upgradeOption(id,value){el.get('upgradeList').listeners.change({target:{closest:selector=>selector==='[data-extra-option]'?{dataset:{extraOption:id},value}:null}})},
   relicSelect(id){el.get('relicOfferCards').listeners.click({target:{closest:()=>({dataset:{relic:id}})}})},
   relicReplace(id){el.get('relicReplaceList').listeners.click({target:{closest:()=>({dataset:{replace:id}})}})},
   routeSelect(id){el.get('routeCards').listeners.click({target:{closest:()=>({dataset:{route:id}})}})},
   roomChoose(id){el.get('roomActions').listeners.click({target:{closest:()=>({dataset:{roomAction:id}})}})},
   routeSkillSelect(id){el.get('routeSkillCards').listeners.click({target:{closest:()=>({dataset:{routeSkill:id}})}})},


  resize(width,height){
   el.get('gameCanvas').getBoundingClientRect=()=>({width,height});
   windowListeners.resize();
  },
  parry(){this.hold();this.release()},
  hold(pointerId=1){el.get('gameCanvas').listeners.pointerdown({preventDefault:noop,pointerId})},
  release(pointerId=1){documentListeners.pointerup({pointerId})},
  cancel(pointerId=1){documentListeners.pointercancel({pointerId})},
  keyDown(code='Space'){documentListeners.keydown({code,repeat:false,preventDefault:noop})},
  keyUp(code='Space'){documentListeners.keyup({code,preventDefault:noop})},
  blur(){windowListeners.blur()},
  hide(){document.hidden=true;documentListeners.visibilitychange();document.hidden=false},
  random(value){randomOverride=value},
  frame(at){clock=at;assert.ok(animation);animation(clock)},
  clock(at){clock=at},
  get now(){return clock}
 };
}
function settleCurrentAttack(g){
 const timing=g.bloodTest().timingInfo();g.frame(Math.max(g.state().attackAt,timing.target+timing.parryWindow)+1);
}

test('bestiary UI has no obsolete arena actions and practice buttons stay within card layouts',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const js=fs.readFileSync('assets/game.js','utf8');
 const css=fs.readFileSync('assets/style.css','utf8');
 assert.match(html,/魔物図鑑・稽古場/);
 assert.doesNotMatch(html,/闘技場|arenaResultCover|id="codexBtn"/);
 assert.doesNotMatch(js,/闘技場|data-arena|arenaResult|finishArena|startArena/);
 assert.match(js,/data-practice/);
 assert.match(css,/\.codex-list\{[^}]*grid-auto-rows:max-content/);
 assert.match(css,/\.codex-card\{[^}]*height:auto/);
 assert.match(css,/\.codex-practice\{[^}]*width:100%/);
 assert.match(css,/\.codex-practice\{[^}]*min-height:38px/);
});
test('a cold start warms title assets and waits for artwork before drawing or starting the combat clock',async()=>{
 let loaded=false,finish,warmups=0,draws=0;
 const pending=new Promise(resolve=>{finish=resolve});
 const art={preloadSources(){warmups++;},readyFor:()=>loaded,preload:()=>pending,
  drawHero(){draws++;return true},drawEnemy(){draws++;return true}};
 const g=makeHarness({},false,'','',art);assert.equal(warmups,1);
 g.random(.5);g.press('startBtn');
 assert.equal(g.state().mode,'loading');assert.equal(g.state().scoreActive,false);
 const hp=g.state().hp;g.frame(20000);g.hold();g.frame(25000);g.release();
 assert.equal(draws,0);assert.equal(g.state().hp,hp);assert.equal(g.state().guardHeld,false);
 assert.equal(g.el.get('pauseBtn').disabled,true);
 loaded=true;finish(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.state().mode,'combat');assert.equal(g.state().scoreActive,true);
 assert.ok(g.state().attackAt>g.now+2000,'first attack gets a fresh full count-in');
 g.frame(g.now+1);assert.equal(draws,2);
});
test('late image completion cannot revive an abandoned run or replace a newer encounter',async()=>{
 const waiting=[];
 const art={preloadSources(){},readyFor:()=>false,preload:()=>new Promise(resolve=>waiting.push(resolve))};
 const g=makeHarness({},true,'','',art);
 g.dev().launch(5,'guardian:normal');await Promise.resolve();
 g.dev().reset();waiting.shift()(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.state().mode,'title');assert.equal(g.state().scoreActive,false);
 g.dev().launch(5,'guardian:normal');await Promise.resolve();
 g.dev().launch(15,'sentinel:normal');await Promise.resolve();
 waiting.shift()(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.state().mode,'loading');assert.equal(g.state().enemy,'sentinel');
 waiting.shift()(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.state().mode,'combat');assert.equal(g.state().enemy,'sentinel');
});
test('an image failure finishes loading with a stable fallback instead of blocking combat',async()=>{
 let draws=0;
 const art={preloadSources(){},readyFor:()=>false,preload:()=>Promise.reject(Error('missing image')),
  drawHero(){draws++;return true},drawEnemy(){draws++;return true}};
 const g=makeHarness({},false,'','',art);g.press('startBtn');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.state().mode,'combat');g.frame(g.now+1);assert.equal(draws,0);
 assert.equal(g.state().scoreActive,true);
});
for(const variant of ['impact','illustrated','studio-edits','adopted'])test(variant+' art preserves score timing, damage, guard, progression and inputs across the roster',async()=>{
 const artMode=variant==='studio-edits'?'illustrated':variant;
 const edit=require('../assets/character-edit'),specs=require('../assets/character-enemy-data');
 const edited={...edit.empty(),updatedAt:100,characters:Object.fromEntries(['hero','knight',...Object.keys(specs)].map(id=>[id,{placement:{x:30,y:-10,scale:1.1},layers:{body:{...edit.defaults(),rotation:12,opacity:.8,keys:[{time:0,x:0},{time:1500,x:35},{time:3000,x:0}]}},order:['body']}]))};
 const seed=variant==='studio-edits'?{[edit.ACTIVE_KEY]:JSON.stringify(edited)}:{};
 const plain=value=>JSON.parse(JSON.stringify(value));
 const ids=['illustrated','adopted'].includes(artMode)?P.all.map(e=>e.id):['knight','slime','rogue','wraith','sentinel','duelist','cantor','clockwork','guardian','void_knight','endking'];
 for(const id of ids){
  const old=makeHarness(seed,true),improved=makeHarness(seed,true,artMode);
  await improved.readyArt(P.byId[id]);
  assert.deepEqual(improved.artStatus(),{hero:true,knight:true});
  if(['illustrated','adopted'].includes(artMode))assert.deepEqual(improved.illustratedStatus(),{hero:true,knight:true});
  for(const g of [old,improved]){
   g.frame(10001); // Real pages paint the title before a dev launch chooses an enemy.
   g.random(.5);assert.equal(g.dev().launch(5,id+(P.byId[id].rare?':rare':':normal')),true);
   g.bloodTest().setEnemyHp(100000);
  }
  await improved.readyArt(P.byId[id]);
  for(const kind of ['just','guard','miss','parry']){
   for(const g of [old,improved]){
    const due=g.state().attackAt;
    g.frame(due-280);g.frame(due-160);
    if(kind==='just'||kind==='parry'){g.clock(due-(kind==='just'?100:80));g.parry();}
    else if(kind==='guard'){g.clock(due-150);g.hold();}
    g.frame(due+1);g.release();g.frame(due+110);
   }
   assert.deepEqual(plain(improved.state()),plain(old.state()),id+' / '+kind);
   assert.deepEqual(improved.audioEvents(),old.audioEvents(),id+' audio schedule changed');
   assert.deepEqual([...improved.storage],[...old.storage],id+' storage changed');
  }
  if(['illustrated','adopted'].includes(artMode))for(const count of Object.values(improved.artDrawCounts()))assert.ok(count>=10,id+' must render the real illustrated mode');
 }
});

for(const mode of ['missing','missing-illustrated'])test(mode+' module still plays and stores exactly the same result as the default renderer',()=>{
 const old=makeHarness(),fallback=makeHarness({},false,mode);
 for(const g of [old,fallback]){
  g.random(.5);g.press('startBtn');
  for(let i=0;i<6&&g.state().mode==='combat';i++)settleCurrentAttack(g);
 }
 assert.equal(fallback.state().mode,'gameover');
 assert.deepEqual(JSON.parse(JSON.stringify(fallback.state())),JSON.parse(JSON.stringify(old.state())));
 assert.deepEqual([...fallback.storage],[...old.storage]);
});

test('developer review links select the requested regular, rare or elite instead of random floor enemies',()=>{
 for(const [input,expected] of [['rogue','rogue:normal'],['gem_slime','gem_slime:rare'],['knight:elite','knight:elite'],['cantor:normal','cantor:normal']]){
  const g=makeHarness({},true,'','?floor=2&enemy='+encodeURIComponent(input));
  assert.equal(g.el.get('devEnemy').value,expected);
  g.press('devLaunch');assert.equal(g.state().encounterKey,expected);
 }
});

test('title exposes the encyclopedia and only previously encountered enemies become trainable',()=>{
 const g=makeHarness();
 assert.equal(g.state().mode,'title');
 assert.equal(g.el.get('codexCover').hidden,true);
 assert.equal(g.el.get('zoneLabel').textContent,'忘れられた地下墓地');
 assert.equal(g.el.has('codexCount'),false,'the title should not display a discovery counter');
 g.press('practiceBtn');
 assert.equal(g.state().mode,'codex');
 assert.equal(g.clickers.size,0,'no default unlocked enemies before first encounter');
 assert.match(g.el.get('codexList').innerHTML,/未遭遇/);
});
test('meeting a slime unlocks safe training even when the tower run ends without a kill',()=>{
 const g=makeHarness();
 g.press('startBtn');
 assert.equal(g.state().enemy,'slime');
 assert.equal(g.state().practice,false);
 assert.ok(g.state().discovered.includes('slime:normal'),'registered at spawn');
 const bookBefore=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(bookBefore.seen['slime:normal'].encounters,1);
 assert.equal(bookBefore.defeated['slime:normal'],undefined);
 for(let i=0;i<5;i++){
  const due=g.state().attackAt;
  settleCurrentAttack(g);  // no tap: wait through the complete input window, then take the hit
 }
 assert.equal(g.state().mode,'gameover');
 const beforeSouls=g.state().souls;
 g.frame(g.now+500); // Wait for the death-menu mis-tap grace before choosing a button.
 g.press('deathCodexBtn');
 assert.equal(g.state().mode,'codex');
 assert.match(g.el.get('codexList').innerHTML,/data-practice="slime:normal"/);
 g.clickers.get('slime:normal')();
 assert.equal(g.state().practice,true);
 assert.equal(g.state().encounterKey,'slime:normal');
 const hpBefore=g.state().hp;
 for(let i=0;i<9;i++){
  const due=g.state().attackAt;
  settleCurrentAttack(g);
 }
 assert.equal(g.state().mode,'combat','practice is immortal');
 assert.equal(g.state().hp,hpBefore,'practice ignores incoming damage');
 assert.equal(g.state().souls,beforeSouls,'practice never grants soul rewards');
 const bookAfter=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(bookAfter.seen['slime:normal'].encounters,1,'practice does not count as another encounter');
 assert.equal(bookAfter.defeated['slime:normal'],undefined);
});
test('practicing another encountered variant via dropdown never unlocks unencountered variants',()=>{
 const seedBook={version:2,seen:{'slime:normal':{encounters:1,firstFloor:1},'guardian:elite':{encounters:1,firstFloor:10}},defeated:{}};
 const g=makeHarness({'parryTowerBestiary_v1':JSON.stringify(seedBook)});
 g.press('practiceBtn');
 assert.match(g.el.get('codexList').innerHTML,/data-practice="guardian:elite"/);
 assert.doesNotMatch(g.el.get('codexList').innerHTML,/data-practice="knight:normal"/);
 g.clickers.get('slime:normal')();
 assert.equal(g.state().practice,true);
 const select=g.el.get('practiceEnemy');
 assert.match(select.innerHTML,/guardian:elite/);
 assert.doesNotMatch(select.innerHTML,/knight:normal/);
 select.value='guardian:elite';
 select.listeners.change();
 assert.equal(g.state().encounterKey,'guardian:elite');
 assert.equal(g.state().bpm,142);
 assert.equal(g.state().souls,0);
 assert.equal(JSON.parse(g.storage.get('parryTowerBestiary_v1')).seen['guardian:elite'].encounters,1);
});

test('dev entry is unlinked from the public game and runtime is dev-only',()=>{
 const main=fs.readFileSync('index.html','utf8');
 const dev=fs.readFileSync('dev.html','utf8');
 const control=fs.readFileSync('assets/dev-tools.js','utf8');
 assert.doesNotMatch(main,/dev\.html|dev-tools|data-parry-dev|id="devLaunch"/);
 assert.match(dev,/data-parry-dev="true"/);
 assert.match(dev,/id="devFloor"/);
 assert.match(dev,/id="devEnemy"/);
 assert.match(dev,/id="devLaunch"/);
 assert.match(dev,/src="\.\/assets\/enemy-motions\.js\?v=v0\.9\.7"/);
 assert.match(dev,/src="\.\/assets\/dev-tools\.js\?v=v0\.9\.7&tempo=1&beat-contact=1&cue=1&layout=2&music=1"/);
 assert.match(control,/engine\.launch/);
 assert.equal(makeHarness().dev(),undefined,'ordinary players must not receive dev controls');
});

test('Dev moves and focuses the play area before starting the selected fight, BGM practice or merchant',()=>{
 for(const action of ['devLaunch','devMusicPractice','devMerchantGrowing','devMerchantCapped']){
  const g=makeHarness({},true,'','?floor=5&enemy=guardian&practice=1&skin=chick&timingMode=onehalf&inputOffset=45');
  const calls=[];
  g.el.get('devPlay').scrollIntoView=opts=>{assert.equal(g.state().mode,'title',action+' must move before the clock starts');assert.equal(opts.behavior,'instant');calls.push('move')};
  g.el.get('devPlay').focus=opts=>{assert.equal(opts.preventScroll,true);calls.push('focus')};
  g.press(action);assert.deepEqual(calls,['move','focus']);
  if(action==='devLaunch'){
   assert.equal(g.state().enemy,'guardian');assert.equal(g.state().floor,5);
   assert.equal(g.dev().skinState().id,'chick');assert.equal(g.state().offset,45);assert.equal(g.state().practice,true);
  }else if(action==='devMusicPractice')assert.equal(g.state().practice,true);
  else assert.equal(g.state().currentRoom,'merchant');
 }
});

test('Dev setup navigation pauses before leaving combat and returning to the play area never resumes by itself',()=>{
 const g=makeHarness({},true);g.press('devLaunch');const before=g.state(),saved=[...g.storage];
 g.el.get('devSetup').scrollIntoView=()=>assert.equal(g.state().mode,'pause','pause before scrolling away');
 g.press('devShowSetup');g.press('devShowSetup');assert.equal(g.state().mode,'pause');
 g.frame(g.now+10000);assert.equal(g.state().hp,before.hp);
 g.press('devShowPlay');assert.equal(g.state().mode,'pause');
 g.press('resumeBtn');assert.equal(g.state().mode,'combat');assert.ok(g.state().attackAt>g.now);
 assert.deepEqual([...g.storage],saved);
});

test('Dev setup navigation stays on the stage during unpausable artwork loading and second movement',async()=>{
 let loaded=false,finish;
 const art={preloadSources(){},readyFor:()=>loaded,preload:()=>new Promise(resolve=>{finish=resolve}),drawHero:()=>false,drawEnemy:()=>false};
 const loading=makeHarness({},true,'','?floor=5&enemy=guardian',art);
 loading.press('devLaunch');await Promise.resolve();assert.equal(loading.state().mode,'loading');
 loading.el.get('devSetup').scrollIntoView=()=>assert.fail('must not leave a stage that will start asynchronously');
 loading.press('devShowSetup');loading.frame(loading.now+1);assert.equal(loading.el.get('devShowSetup').disabled,true);
 loaded=true;finish(true);await new Promise(resolve=>setImmediate(resolve));loading.frame(loading.now+1);
 assert.equal(loading.el.get('devShowSetup').disabled,false);

 const phase=makeHarness({},true);phase.dev().launch(80,'endking:elite');
 phase.bloodTest().setEnemyHp(Math.floor(phase.state().enemyMaxHp*.49)+100);phase.bloodTest().setBaseAttack(1);resolveBloodParry(phase,20);
 assert.equal(phase.state().mode,'phase');
 phase.el.get('devSetup').scrollIntoView=()=>assert.fail('must stay on stage during the count-in');
 phase.press('devShowSetup');phase.frame(phase.now+1500);assert.equal(phase.el.get('devShowSetup').disabled,true);
 phase.frame(phase.state().phaseCountStartAt+4*phase.state().beat*1000+1);
 assert.equal(phase.el.get('devShowSetup').disabled,false);
 phase.el.get('devSetup').scrollIntoView=()=>assert.equal(phase.state().mode,'pause');phase.press('devShowSetup');
});
test('developer page jumps to arbitrary floor and enemy without writing the public saves',()=>{
 const oldMeta=JSON.stringify({coins:27,bestFloor:12,bestCombo:3,runs:2,life:1,attack:0,ward:0});
 const oldBook=JSON.stringify({version:2,seen:{'slime:normal':{encounters:3,firstFloor:1}},defeated:{}});
 const seed={'parryTowerPrototype_v1':oldMeta,'parryTowerBestiary_v1':oldBook,'parryTowerAudioOffset_v05':'5'};
 const g=makeHarness(seed,true),dev=g.dev();
 assert.ok(dev?.isolated);
 assert.equal(dev.list().length,50);
 assert.equal(dev.launch(21,'cantor:normal'),true);
 assert.equal(g.state().floor,21);
 assert.equal(g.state().enemy,'cantor');
 assert.equal(g.state().practice,false);
 assert.equal(g.state().bpm,112);
 assert.equal(g.state().souls,27);
 assert.equal(g.storage.get('parryTowerPrototype_v1'),oldMeta);
 assert.equal(g.storage.get('parryTowerBestiary_v1'),oldBook);
 assert.equal(dev.launch(40,'timewarden:elite'),true);
 assert.equal(g.state().floor,40);
 assert.equal(g.state().enemy,'timewarden');
 assert.equal(g.state().bpm,142);
 assert.equal(dev.launch(41,'ember_slime:normal'),true);
 assert.equal(g.state().floor,41);
 assert.equal(g.state().enemy,'ember_slime');
 assert.equal(dev.launch(51,'frost_wraith:normal'),true);
 assert.equal(g.state().floor,51);
 assert.equal(g.state().enemy,'frost_wraith');
 assert.equal(dev.launch(61,'star_cantor:normal'),true);
 assert.equal(g.state().floor,61);
 assert.equal(g.state().enemy,'star_cantor');
 assert.equal(dev.launch(71,'void_knight:normal'),true);
 assert.equal(g.state().floor,71);
 assert.equal(g.state().enemy,'void_knight');
 assert.equal(dev.launch(80,'endking:elite'),true);
 assert.equal(g.state().enemy,'endking');
 assert.equal(g.state().bossPhase,1);
 assert.equal(dev.launch(30,'golden_tone:rare'),true);
 assert.equal(g.state().enemy,'golden_tone');
 assert.equal(g.state().encounterRare,true);
 assert.equal(g.storage.get('parryTowerBestiary_v1'),oldBook);
 assert.equal(dev.launch(31,'bogus:normal'),false);
 assert.equal(g.state().floor,30);
 dev.reset();
 assert.equal(g.state().mode,'title');
 const slider=g.el.get('latencySlider');
 slider.listeners.input({target:{value:'35'}});
 assert.equal(g.storage.get('parryTowerAudioOffset_v05'),'5');
});

test('the separate dev.html page presets controls and actually launches the selected floor on click',()=>{
 const g=makeHarness({},true);
 assert.equal(g.el.get('devFloor').value,'21');
 assert.equal(g.el.get('devEnemy').value,'cantor:normal');
 assert.ok(g.el.get('devEnemy').children.length>=4);
 assert.equal(g.state().mode,'title');
 g.press('devLaunch');
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().floor,21);
 assert.equal(g.state().enemy,'cantor');
 assert.match(g.el.get('devStatus').textContent,/21F/);
 g.el.get('devFloor').value='32';
 g.el.get('devEnemy').value='clockwork:normal';
 g.press('devLaunch');
 assert.equal(g.state().floor,32);
 assert.equal(g.state().enemy,'clockwork');
 g.press('devReset');
 assert.equal(g.state().mode,'title');
});

test('developer balance preview reflects actual spawn stats, tier modifiers and input changes',()=>{
 const g=makeHarness({},true),dev=g.dev();
 assert.ok(dev.preview);
 assert.equal(g.el.get('devBalanceInfo').textContent.includes('残響の詠み手'),true);
 assert.match(g.el.get('devBalanceInfo').textContent,/×0\.90/);
 const floor=g.el.get('devFloor'),select=g.el.get('devEnemy');
 floor.value='11';select.value='sentinel:normal';floor.listeners.input();
 select.listeners.change();
 assert.match(g.el.get('devBalanceInfo').textContent,/鉄壁の番兵/);
 assert.match(g.el.get('devBalanceInfo').textContent,/×1\.10/);
 assert.match(g.el.get('devBalanceInfo').textContent,/×1\.00/);
 const sentinel=dev.preview(11,'sentinel:normal');
 assert.equal(sentinel.maxHp,Math.round(dev.preview(11,'knight:normal').maxHp*1.1));
 assert.equal(sentinel.atk,dev.preview(11,'knight:normal').atk);
 g.press('devLaunch');
 assert.equal(g.state().enemy,'sentinel');
 assert.equal(dev.state().enemyMaxHp,sentinel.maxHp);
 assert.equal(dev.state().enemyAttack,sentinel.atk);
 const guardian=dev.preview(10,'guardian:elite');
 const bossAtFive=dev.preview(5,'guardian:normal');
 assert.equal(guardian.hpMultiplier,1.5);
 assert.equal(guardian.atkMultiplier,1);
 assert.ok(guardian.maxHp>bossAtFive.maxHp);
 floor.value='10';select.value='guardian:elite';select.listeners.change();
 assert.match(g.el.get('devBalanceInfo').textContent,/精鋭・鐘楼の守護者/);
 g.press('devLaunch');
 assert.equal(dev.state().enemyMaxHp,guardian.maxHp);
 assert.equal(dev.state().enemyAttack,guardian.atk);
 const rogue=dev.preview(1,'rogue:normal');
 assert.equal(rogue.atk,11);
 assert.equal(rogue.atkMultiplier,0.8);
 assert.equal(dev.preview(1,'missing:normal'),null);
});


test('v0.5.5 retains essential HUD and settings but does not narrate the controls',()=>{
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  for(const copy of [
   'BGMの拍と、敵の振りかぶり・踏み込みが連動する',
   '音楽で拍をつかみ',
   '静かな反復の先に',
   'タイミングバーなし',
   '音はオン推奨',
   '身構え → 踏み込み → 接触',
   '次の一撃まで、時間は止まっています',
   '次の階層に持ち込む能力を1つ選択',
   'ドラムの拍を聴きながら',
   '4拍カウントイン後、攻撃が拍に同期します',
   '端末内に最高記録と恒久強化を保存'
  ])assert.ok(!html.includes(copy),page+' should omit '+copy);
  for(const id of ['startBtn','practiceBtn','codexCover','hpText','enemyHpText','comboLabel',
    'rewardCards','rewardNote','latencySlider','latencyValue','trackLabel','pauseBtn','audioBtn']){
   assert.match(html,new RegExp('id="'+id+'"'),page+' keeps '+id);
  }
  assert.match(html,/HOW TO PLAY/);
  assert.match(html,/リズムに合わせて敵を斬れ！/);
  assert.match(html,/短押しでパリィ、長押しで盾を構えてガード/);
  assert.doesNotMatch(html,/id="codexCount"|体遭遇済み/);
  assert.doesNotMatch(html,/id="timingInfo"|id="musicStatus"/);
 }
 const script=fs.readFileSync('assets/game.js','utf8');
 for(const copy of ['敵が踏み込み、刃が届く前に盾を出せ','♫ 拍を聴いて構えを読む',
  '身構え → 踏み込み → 接触','次の力を選ぼう','次は構えと踏み込みを観察しよう']){
  assert.ok(!script.includes(copy),'script should not narrate '+copy);
 }
 assert.doesNotMatch(script,/\$\('musicStatus'\)|\$\('timingInfo'\)/);
 assert.doesNotMatch(script,/\$\('codexCount'\)/);
 assert.match(script,/function getPerfectWindow\(\)\{return \(11\+lvl\('focus'\)\*2\)\*runSkinRules\(\)\.just\}/);
 assert.match(script,/function getParryWindow\(\)\{return \(31\+lvl\('stability'\)\*3\)\*runSkinRules\(\)\.parry\}/);
 assert.match(script,/const PARRY_STARTUP=100/);
});
test('ordinary skill reward omits generic advice and actual unlock notice remains',()=>{
 function clearFirstFloor(g){
  g.press('startBtn');
  for(let i=0;i<2;i++){
   const due=g.state().attackAt;
   g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
  }
  g.frame(g.now+1000);
  assert.equal(g.state().mode,'reward');
 }
 const first=makeHarness();
 clearFirstFloor(first);
 assert.match(first.el.get('rewardNote').textContent,/図鑑登録/);
 assert.equal(first.el.get('rewardNote').hidden,false);
 const seen=JSON.stringify({version:2,seen:{'slime:normal':{encounters:1,firstFloor:1}},defeated:{}});
 const repeat=makeHarness({'parryTowerBestiary_v1':seen});
 clearFirstFloor(repeat);
 assert.equal(repeat.el.get('rewardNote').textContent,'');
 assert.equal(repeat.el.get('rewardNote').hidden,true);
});

test('death menu ignores stray parry taps for 500ms, then restores all actions',()=>{
 const g=makeHarness();
 g.press('startBtn');
 for(let i=0;i<5;i++){
  settleCurrentAttack(g);
 }
 assert.equal(g.state().mode,'gameover');
 const diedAt=g.now;
 const death=g.el.get('deathCover');
 assert.equal(death.hidden,false,'the death screen is visible immediately');
 assert.equal(death.inert,true,'all death-cover descendants, including the shop, are inert');
 for(const id of ['retryBtn','homeBtn','deathCodexBtn','deathUpgradeBtn'])
  assert.equal(g.el.get(id).disabled,true,id+' is disabled at death');
 assert.equal(g.el.get('deathUpgradeBtn').disabled,true,'the upgrade entry is blocked during death grace');
 for(const id of ['retryBtn','homeBtn','deathCodexBtn','deathUpgradeBtn']){
  g.press(id); // Simulated delegated clicks must also be rejected.
  assert.equal(g.state().mode,'gameover',id+' must not respond during grace');
 }
 g.frame(diedAt+499);
 assert.equal(death.inert,true);
 assert.equal(g.el.get('deathCodexBtn').disabled,true);
 g.press('deathCodexBtn');
 assert.equal(g.state().mode,'gameover');
 g.frame(diedAt+500);
 assert.equal(death.inert,false,'all death actions are available after the grace period');
 for(const id of ['retryBtn','homeBtn','deathCodexBtn','deathUpgradeBtn'])
  assert.equal(g.el.get(id).disabled,false,id+' is enabled after grace');
 g.press('deathCodexBtn');
 assert.equal(g.state().mode,'codex');
});
test('retry and home work after the grace period; every new death starts a fresh lock',()=>{
 const g=makeHarness();
 function dieWithoutParries(){
  for(let i=0;i<5;i++)settleCurrentAttack(g);
  assert.equal(g.state().mode,'gameover');
  assert.equal(g.el.get('deathCover').inert,true);
 }
 g.press('startBtn');
 dieWithoutParries();
 const firstDeath=g.now;
 g.frame(firstDeath+500);
 g.press('retryBtn');
 assert.equal(g.state().mode,'combat');
 assert.equal(g.el.get('deathCover').inert,false);
 dieWithoutParries();
 const secondDeath=g.now;
 assert.ok(secondDeath>firstDeath,'death lock follows the second defeat');
 g.press('homeBtn');
 assert.equal(g.state().mode,'gameover','home is blocked on the second death as well');
 g.frame(secondDeath+500);
 g.press('homeBtn');
 assert.equal(g.state().mode,'title');
 assert.equal(g.el.get('deathCover').inert,false);
});
test('death-menu lock is restricted to the overlay, not normal menus or developer entry',()=>{
 for(const devMode of [false,true]){
  const g=makeHarness({},devMode);
  assert.equal(g.el.get('deathCover').inert,false);
  assert.equal(g.el.get('retryBtn').disabled,false);
  g.press('practiceBtn');
  assert.equal(g.state().mode,'codex');
  assert.equal(g.el.get('deathCover').inert,false);
  if(devMode){
   assert.ok(g.dev()?.isolated);
   assert.equal(g.dev().launch(5,'guardian:normal'),true);
   assert.equal(g.state().mode,'combat');
  }
 }
});


test('v0.5.6 uses dedicated upgrades screen, with slot and skill purchase as separate transactions',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:750,life:2,attack:1,ward:1,bestFloor:6,runs:2})};
 const g=makeHarness(seed);
 assert.equal(g.el.get('upgradeCover').hidden,true);
 g.press('upgradeOpenBtn');
 assert.equal(g.state().mode,'upgrade');
 assert.match(g.el.get('upgradeTabs').innerHTML,/data-tab="loadout">スキル装備<\/button>/);
 assert.equal(g.el.get('upgradeCover').hidden,false);
 assert.equal(g.state().permanent.slots,0);
 assert.match(g.el.get('upgradeList').innerHTML,/スロット 1/);
 g.upgradeBuy('slot',0);
 assert.equal(g.state().permanent.slots,1);
 assert.equal(g.state().souls,730);
 g.upgradeTab('skills');
 assert.match(g.el.get('upgradeList').innerHTML,/24/);
 assert.match(g.el.get('upgradeList').innerHTML,/奥義紋/);
 g.upgradeBuy('skill','rune');
 assert.equal(g.state().souls,430,'epic is exactly 300 shards');
 g.upgradeBuy('skill','blood');
 assert.equal(g.state().souls,405);
 g.upgradeBuy('skill','rune');
 assert.equal(g.state().souls,405,'an unlocked skill is not purchasable twice');
 g.upgradeTab('loadout');
 g.upgradeEquip(0,'rune');
 assert.deepEqual(Array.from(g.state().permanent.equipped),['rune',null]);
 g.upgradeBuy('slot',1);
 assert.equal(g.state().souls,340);
 g.upgradeEquip(1,'blood');
 assert.deepEqual(Array.from(g.state().permanent.equipped),['rune','blood']);
 g.upgradeEquip(1,'rune');
 assert.deepEqual(Array.from(g.state().permanent.equipped),['rune','blood'],'duplicate equipment is rejected');
 g.press('upgradeCloseBtn');
 assert.equal(g.state().mode,'title');
 g.press('startBtn');
 assert.equal(g.state().runSkills.rune,1);
 assert.equal(g.state().runSkills.blood,1);
 assert.equal(g.state().maxHp,85,'legacy +20HP upgrade still applies');
 assert.equal(g.state().shield,8,'legacy +8 ward still applies');
 assert.equal(g.state().souls,340);
 const old=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
 assert.equal(old.life,2);
 assert.equal(old.attack,1);
 assert.equal(old.ward,1);
 const permanent=JSON.parse(g.storage.get('parryTowerPermanent_v1'));
 assert.deepEqual(permanent.equipped,['rune','blood']);
});
test('shop purchases prevent insufficient funds, unknown skills, locked slots, and repeated upgrades',()=>{
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:19})});
 g.press('upgradeOpenBtn');
 g.upgradeBuy('slot',0);
 assert.equal(g.state().permanent.slots,0);
 g.upgradeBuy('slot',1);
 g.upgradeBuy('skill','nonexistent');
 assert.equal(g.state().souls,19);
 g.upgradeEquip(0,'blood');
 assert.equal(g.state().permanent.equipped[0],null);
 g.upgradeTab('base');
 g.upgradeBuy('legacy','life');
 assert.equal(g.state().souls,11,'existing life upgrades use the old price formula');
 g.upgradeBuy('extra','regen');
 assert.equal(g.state().souls,11,'cannot buy a 12-shard upgrade with 11 shards');
 g.upgradeBuy('legacy','life');
 assert.equal(g.state().souls,11,'next life level costs 21 shards');
});
test('new survival upgrades heal each floor and grant boss-start barriers',()=>{
 const permanent={regen:3,bossWard:3};
 const g=makeHarness({'parryTowerPermanent_v1':JSON.stringify(permanent)});
 g.press('startBtn');
 settleCurrentAttack(g);
 const hurt=g.state().hp;
 assert.ok(hurt<65);
 for(let i=0;i<4&&g.state().mode==='combat';i++){
  const impact=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(impact+1);
 }
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().hp,Math.min(65,hurt+Math.ceil(65*.15)));
 const dev=makeHarness({'parryTowerPermanent_v1':JSON.stringify(permanent)},true);
 assert.equal(dev.dev().launch(5,'guardian:normal'),true);
 assert.equal(dev.state().shield,15);
});
test('four-choice loot and extra reroll only appear when permanently purchased',()=>{
 const p={'parryTowerPermanent_v1':JSON.stringify({choice4:1,extraReroll:1})};
 const g=makeHarness(p);
 g.press('startBtn');
 assert.equal(g.state().rerolls,2);
 for(let i=0;i<4&&g.state().mode==='combat';i++){
  const impact=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(impact+1);
 }
 assert.equal(g.state().mode,'victory');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'reward');
 assert.equal((g.el.get('rewardCards').innerHTML.match(/class="reward-card/g)||[]).length,4);
 assert.equal(g.el.get('rewardCards').className,'reward-cards four');
 const vanilla=makeHarness();
 vanilla.press('startBtn');
 assert.equal(vanilla.state().rerolls,1);
});
test('soul gains and once-per-run revive apply while preserving combat timing',()=>{
 const p={'parryTowerPermanent_v1':JSON.stringify({soulGain:3,revive:1})};
 const g=makeHarness(p);g.press('startBtn');
 for(let i=0;i<9&&!g.state().reviveUsed;i++)settleCurrentAttack(g);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().reviveUsed,true);
 assert.equal(g.state().hp,Math.ceil(g.state().maxHp*.3));
 for(let i=0;i<10&&g.state().mode==='combat';i++)settleCurrentAttack(g);
 assert.equal(g.state().mode,'gameover','the second fatal blow ends the run');
 assert.equal(g.state().souls,4,'floor one death bonus 3 rounded up by +15%');
 g.frame(g.now+500);
 g.press('deathUpgradeBtn');
 assert.equal(g.state().mode,'upgrade','death menu can open upgrades after the guard');
 g.press('upgradeCloseBtn');
 assert.equal(g.state().mode,'gameover');
});
test('practice and developer page do not write permanent progression',()=>{
 const raw=JSON.stringify({slots:1,unlockedSkills:['blood'],equipped:['blood',null],regen:3,bossWard:3});
 const meta=JSON.stringify({coins:450,life:1,runs:3});
 const seed={'parryTowerPrototype_v1':meta,'parryTowerPermanent_v1':raw,
  'parryTowerBestiary_v1':JSON.stringify({version:2,seen:{'slime:normal':{encounters:1,firstFloor:1}},defeated:{}})};
 const normal=makeHarness(seed);normal.press('practiceBtn');
 normal.clickers.get('slime:normal')();
 assert.equal(normal.state().practice,true);
 assert.deepEqual(Object.keys(normal.state().runSkills),[],'practice uses its original no-starting-skill rules');
 const dev=makeHarness(seed,true);
 dev.press('upgradeOpenBtn');dev.upgradeBuy('slot',1);
 dev.upgradeTab('skills');dev.upgradeBuy('skill','rune');
 assert.equal(dev.storage.get('parryTowerPrototype_v1'),meta);
 assert.equal(dev.storage.get('parryTowerPermanent_v1'),raw);
 dev.press('upgradeCloseBtn');dev.dev().launch(5,'guardian:normal');
 assert.equal(dev.state().runSkills.blood,1);
 assert.equal(dev.state().permanent.unlockedSkills.includes('rune'),true,'read-only dev upgrades are ephemeral');
 assert.equal(dev.storage.get('parryTowerPermanent_v1'),raw);
});


function resolveBloodParry(g,delta=0){
 const impact=g.state().attackAt;
 g.clock(delta<=-40?impact-100+delta:g.bloodTest().timingInfo().target+delta);
 // Historic '-40ms' tests represent the old early guard. Now they must keep
 // holding through the impact to prove the new defensive stance actually works.
 const guarding=delta<=-40;
 if(guarding)g.hold();
 else g.parry();
 g.frame(Math.max(impact,g.bloodTest().timingInfo().target+(guarding?g.bloodTest().timingInfo().parryWindow:delta))+1);
 if(guarding)g.release();
}
test('blood formula scales from 8% to 18%, retains minimum two HP and caps one parry to 25% max HP',()=>{
 const g=makeHarness(),calc=g.bloodTest().bloodHealAmount;
 assert.equal(calc(0,1,0,false,100),0,'no damage means no healing');
 assert.equal(calc(300,0,0,false,100),0,'no blood skill means no healing');
 assert.equal(calc(1,1,0,false,100),2,'minimum two HP');
 assert.equal(calc(100,1,0,false,100),8,'Lv1 recovers eight percent');
 assert.equal(calc(100,6,0,false,100),18,'Lv6 recovers eighteen percent');
 assert.equal(calc(300,6,0,false,100),25,'base 25% max-HP cap');
 assert.equal(calc(300,6,0,false,200),50,'cap scales with maximum HP');
 assert.equal(calc(1,1,0,false,1),1,'cap remains respected for very small max HP');
 const gUi=makeHarness();
 gUi.press('upgradeOpenBtn');gUi.upgradeTab('skills');
 assert.match(gUi.el.get('upgradeList').innerHTML,/パリィ与ダメの 8% 回復/);
});
test('Blood Rhythm adds uncapped combo percentage points to both lifesteal rate and max-HP cap',()=>{
 const g=makeHarness(),calc=g.bloodTest().bloodHealAmount;
 assert.equal(calc(1000,1,0,true,100),25);
 assert.equal(calc(1000,1,5,true,100),30);
 assert.equal(calc(1000,1,10,true,100),35);
 assert.equal(calc(1000,1,20,true,100),45);
 assert.equal(calc(1000,1,50,true,100),75);
 assert.equal(calc(1000,1,100,true,100),125,'combo bonus is NOT capped at 50 or 100');
 assert.equal(calc(1000,1,100,false,100),25,'without fury the combo gives no blood bonus');
 assert.equal(calc(100,1,0,true,100),8,'broken combo loses its blood bonus');
});
test('blood heals once from the sum of actual parry direct hits, including thunder',()=>{
 const g=makeHarness();g.press('startBtn');
 const d=g.bloodTest();
 d.setSkill('blood',1);d.setSkill('thunder',1);
 d.setEnemyHp(1000);d.setHp(10);
 const before=d.info().enemyHp;
 resolveBloodParry(g);
 const actual=before-d.info().enemyHp,expected=Math.min(Math.max(2,Math.round(actual*.08)),Math.ceil(65*.25));
 assert.ok(actual>50,'normal strike and thunder should both damage the target');
 assert.equal(g.state().hp,10+expected,'all direct hits must count toward a single heal');
 assert.equal(d.info().parryDamageActive,false,'transaction closes after parry');
 assert.equal(g.state().mode,'combat');
});
test('blood aggregates echo, resonance, pulse and ultimate on a single parry without per-hit cap resets',()=>{
 const g=makeHarness();g.press('startBtn');
 const d=g.bloodTest();
 for(const [name,l] of [['blood',6],['thunder',1],['echo',1],['rune',1],['precision',1],['pulse',1]])d.setSkill(name,l);
 d.setMaxHp(500);d.setHp(10);d.setEnemyHp(10000);
 d.setCombo(7);d.setCharge(6);
 const before=d.info().enemyHp;
 resolveBloodParry(g);
 const actual=before-d.info().enemyHp;
 const expected=Math.min(Math.max(2,Math.round(actual*.18)),Math.ceil(500*.25));
 assert.ok(actual>200,'the parry should include multiple damage procs and an ultimate');
 assert.equal(g.state().hp,10+expected);
 assert.equal(d.info().parryDamageActive,false);
});
test('a fatal parry heals only from enemy remaining HP, before switching to victory',()=>{
 const g=makeHarness();g.press('startBtn');
 const d=g.bloodTest();d.setSkill('blood',6);
 d.setEnemyHp(40);d.setBaseAttack(200);d.setHp(10);
 resolveBloodParry(g);
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().hp,17,'40 real damage at 18%, not the much larger overkill');
 assert.equal(d.info().parryDamageActive,false);
 const chain=makeHarness();chain.press('startBtn');
 const c=chain.bloodTest();c.setSkill('blood',6);c.setSkill('thunder',1);c.setEnemyHp(45);c.setHp(10);
 resolveBloodParry(chain);
 assert.equal(chain.state().mode,'victory','thunder can deliver the final blow');
 assert.equal(chain.state().hp,18,'count full 45 HP lost across the normal strike and killing thunder');
});
test('guard reflection and burn damage do not grant blood healing; successful parry does',()=>{
 const g=makeHarness();g.press('startBtn');
 const d=g.bloodTest();
 d.setSkill('blood',6);d.setSkill('thorns',2);d.setEnemyHp(1000);d.setHp(30);d.setEnemyAttack(20);
 const before=d.info().enemyHp;
 resolveBloodParry(g,-40);
 assert.equal(d.info().guards,1);
 assert.ok(d.info().enemyHp<before,'guard reflection should damage the enemy');
 assert.equal(g.state().hp,24,'guard reduces incoming 20 to 6, without healing');
 d.setHp(15);d.setBurn(100);
 const afterGuard=d.info().enemyHp;
 g.frame(g.now+55);
 assert.ok(d.info().enemyHp<afterGuard,'burn causes damage over time');
 assert.equal(g.state().hp,15,'burn does not trigger blood healing');
 d.setBurn(0);
 resolveBloodParry(g);
 assert.ok(g.state().hp>15,'the next successful parry can heal');
});
test('real Blood Rhythm uses full high combos and guard only decays (not clears) that bonus',()=>{
 const g=makeHarness();g.press('startBtn');
 const d=g.bloodTest();
 d.setSkill('blood',1);d.setSkill('fury',1);
 d.setEnemyHp(10000);d.setMaxHp(500);d.setHp(10);d.setCombo(100);
 const before=d.info().enemyHp;
 resolveBloodParry(g);
 const dealt=before-d.info().enemyHp,combo=d.info().combo;
 assert.equal(combo,101);
 const expected=d.bloodHealAmount(dealt,1,101,true,500);
 assert.ok(expected>50,'100+ combo should grant more healing than a capped-50 bonus');
 assert.equal(g.state().hp,10+expected);
 d.setHp(250);d.setEnemyAttack(20);
 resolveBloodParry(g,-40);
 assert.equal(d.info().combo,80,'101 combo loses 21 on guard but does not reset');
 const hpAfterGuard=g.state().hp;
 const beforeAgain=d.info().enemyHp;
 resolveBloodParry(g);
 const direct=beforeAgain-d.info().enemyHp;
 assert.equal(d.info().combo,81);
 assert.equal(g.state().hp,hpAfterGuard+d.bloodHealAmount(direct,1,81,true,500));
});
test('blood lifesteal is disabled in immortal practice mode',()=>{
 const seed={'parryTowerBestiary_v1':JSON.stringify({version:2,seen:{'slime:normal':{encounters:1,firstFloor:1}},defeated:{}})};
 const g=makeHarness(seed);g.press('practiceBtn');g.clickers.get('slime:normal')();
 const d=g.bloodTest();d.setSkill('blood',6);d.setEnemyHp(1000);d.setHp(10);
 resolveBloodParry(g);
 assert.equal(g.state().practice,true);
 assert.equal(g.state().hp,10,'practice never heals through blood');
});


test('v0.5.8 registers 24 skills, six new abilities, and six new synergies in both entrypoints',()=>{
 const script=fs.readFileSync('assets/game.js','utf8');
 for(const name of ['不屈','拍動','過充電','血の渇望','氷結','王の一撃',
  '不滅の盾','共鳴心眼','雷霆循環','鮮血連鎖','氷鏡','王の共鳴'])assert.ok(script.includes(name),name);
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  assert.match(html,/v0\.9\.7/);
  assert.match(html,/id="combatBuffs"/);
  assert.match(html,/data-tab="seal"/);
 }
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:1200})});
 g.press('upgradeOpenBtn');g.upgradeTab('skills');
 assert.match(g.el.get('upgradeList').innerHTML,/24/);
 for(const [name,price] of [['fortitude',20],['heartbeat',25],['overcharge',95],
  ['bloodlust',110],['frost',90],['king',300]]){
  const row=g.el.get('upgradeList').innerHTML.match(new RegExp('data-key="'+name+'"[^>]*>([^<]+)<'));
  assert.ok(row,name+' must appear in the generic skill shop');
  assert.equal(row[1],price+' ✧',name+' unlock price');
 }
});
test('Fate Seal purchasing, free selection, removing and reopening retain both cost and settings',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:1000}),
  'parryTowerPermanent_v1':JSON.stringify({slots:1,unlockedSkills:['blood'],equipped:['blood',null]})};
 const g=makeHarness(seed);
 g.press('upgradeOpenBtn');g.upgradeTab('seal');
 assert.match(g.el.get('upgradeList').innerHTML,/運命の封印/);
 g.upgradeBuy('seal','thorns');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),[],'cannot select without a purchased slot');
 g.upgradeBuy('extra','sealSlots');
 assert.equal(g.state().souls,975);
 assert.equal(g.state().permanent.sealSlots,1);
 g.upgradeBuy('seal','blood');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),[],'equipped skill cannot be sealed');
 g.upgradeBuy('seal','thorns');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),['thorns']);
 g.upgradeBuy('seal','overcharge');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),['thorns'],'cannot exceed one seal slot');
 assert.equal(g.state().souls,975,'seal selection is free');
 g.upgradeBuy('seal','thorns');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),[],'free unseal');
 g.upgradeBuy('seal','overcharge');
 g.upgradeBuy('extra','sealSlots');
 g.upgradeBuy('seal','thorns');
 assert.deepEqual(Array.from(g.state().permanent.sealedSkills),['overcharge','thorns']);
 assert.equal(g.state().souls,915,'two slots cost 25+60');
 g.press('upgradeCloseBtn');
 g.press('upgradeOpenBtn');g.upgradeTab('seal');
 assert.match(g.el.get('upgradeList').innerHTML,/封印中/);
 assert.deepEqual(JSON.parse(g.storage.get('parryTowerPermanent_v1')).sealedSkills,['overcharge','thorns']);
 g.press('upgradeCloseBtn');g.press('startBtn');
 assert.deepEqual(Array.from(g.state().sealedSkillIds),['overcharge','thorns']);
 for(let i=0;i<80;i++){
  const pool=g.bloodTest().rewardPool();
  assert.equal(pool.includes('overcharge'),false,'sealed skills must be absent after reroll');
  assert.equal(pool.includes('thorns'),false);
 }
});
test('all four seal slots have increasing costs, equipment never conflicts, and legacy progress is preserved',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:600,life:2,ward:3,runs:7,bestFloor:42}),
  'parryTowerPermanent_v1':JSON.stringify({slots:1,unlockedSkills:['rune'],equipped:['rune',null],regen:2})};
 const g=makeHarness(seed);g.press('upgradeOpenBtn');g.upgradeTab('seal');
 for(const cost of [25,60,120,220]){const before=g.state().souls;g.upgradeBuy('extra','sealSlots');assert.equal(g.state().souls,before-cost)}
 assert.equal(g.state().permanent.sealSlots,4);
 g.upgradeBuy('extra','sealSlots');assert.equal(g.state().permanent.sealSlots,4,'no fifth slot');
 for(const id of ['fortitude','heartbeat','overcharge','bloodlust'])g.upgradeBuy('seal',id);
 assert.equal(g.state().permanent.sealedSkills.length,4);
 g.upgradeBuy('seal','frost');
 assert.equal(g.state().permanent.sealedSkills.length,4);
 g.upgradeBuy('seal','rune');
 assert.equal(g.state().permanent.sealedSkills.length,4,'equipped rune must remain available');
 g.upgradeTab('loadout');
 assert.match(g.el.get('upgradeList').innerHTML,/奥義紋/);
 assert.doesNotMatch(g.el.get('upgradeList').innerHTML,/🦇 血の渇望/);
 g.press('upgradeCloseBtn');g.press('startBtn');
 assert.equal(g.state().runSkills.rune,1);
 assert.equal(g.state().maxHp,85);
 assert.equal(g.state().shield,24);
 const old=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
 assert.equal(old.bestFloor,42);assert.equal(old.runs,7);assert.equal(old.life,2);
 const newer=JSON.parse(g.storage.get('parryTowerPermanent_v1'));
 assert.equal(newer.regen,2);
});
test('Fortitude boosts the next parry after HP damage, consumed once; Immortal Shield triggers on barrier break',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setSkill('fortitude',1);d.setEnemyHp(10000);d.setHp(65);
 d.incoming(20);assert.equal(g.state().hp,45);
 assert.equal(g.state().fortitudeReady,true);
 resolveBloodParry(g);assert.equal(g.state().fortitudeReady,false);
 const boosted=d.hits()[0].dealt;
 d.resetHits();resolveBloodParry(g);
 assert.ok(boosted>d.hits()[0].dealt,'once-only boost should be consumed');
 const withWard=makeHarness();withWard.press('startBtn');const w=withWard.bloodTest();
 w.setEnemyHp(10000);w.setSkill('fortitude',1);w.setSkill('aegis',1);w.setShield(5);
 w.incoming(5);
 assert.equal(withWard.state().hp,65,'barrier absorbs the hit');
 assert.equal(withWard.state().fortitudeReady,true,'broken barrier activates Immortal Shield');
 resolveBloodParry(withWard,20);
 assert.equal(withWard.state().shield,5,'next successful parry restores five ward');
});
test('Heartbeat charges once at three consecutive JUSTs, or twice with Focus synergy',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setSkill('heartbeat',1);d.setEnemyHp(10000);
 resolveBloodParry(g,20);assert.equal(g.state().justStreak,0,'normal parry does not count as JUST');
 resolveBloodParry(g,0);resolveBloodParry(g,0);resolveBloodParry(g,0);
 assert.equal(d.hits().filter(x=>x.label==='拍動').length,1);
 assert.equal(g.state().justStreak,0);
 assert.equal(g.el.get('combatBuffs').hidden,false,'live ability counters shown');
 const synergized=makeHarness();synergized.press('startBtn');const y=synergized.bloodTest();
 y.setSkill('heartbeat',1);y.setSkill('focus',1);y.setEnemyHp(10000);
 resolveBloodParry(synergized,0);resolveBloodParry(synergized,0);
 assert.equal(y.hits().filter(x=>x.label==='拍動').length,1,'Focus synergy shortens JUST chain to two');
});
test('Overcharge works without thunder on every third parry; Thunder synergy fires extra lightning',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setSkill('overcharge',1);d.setEnemyHp(10000);
 resolveBloodParry(g);resolveBloodParry(g);
 assert.equal(d.hits().some(x=>x.label==='過充電'),false);
 assert.equal(g.state().overchargeCount,2);
 resolveBloodParry(g);
 assert.equal(d.hits().filter(x=>x.label==='過充電').length,1);
 assert.equal(g.state().overchargeCount,0);
 const combo=makeHarness();combo.press('startBtn');const c=combo.bloodTest();
 c.setSkill('overcharge',1);c.setSkill('thunder',1);c.setEnemyHp(10000);
 for(let i=0;i<3;i++)resolveBloodParry(combo);
 assert.equal(c.hits().filter(x=>x.label==='過充電').length,1);
 assert.equal(c.hits().filter(x=>x.label==='雷霆').length,1);
 assert.equal(c.hits().filter(x=>x.label==='⚡').length,3);
});
test('Bloodlust converts only real restored HP into a bounded NEXT parry attack, even with Blood synergy',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setSkill('bloodlust',1);d.setEnemyHp(10000);d.setHp(10);
 resolveBloodParry(g);
 assert.equal(g.state().hp,13,'Bloodlust Lv1 heals three');
 assert.equal(g.state().bloodlustPending,5,'3 healed * 1.5, rounded');
 d.resetHits();resolveBloodParry(g);
 assert.equal(g.state().bloodlustPending,5);
 assert.ok(d.hits()[0].dealt>25,'queued damage added to next normal counter');
 const paired=makeHarness();paired.press('startBtn');const x=paired.bloodTest();
 x.setSkill('bloodlust',4);x.setSkill('blood',6);x.setEnemyHp(10000);x.setHp(10);
 resolveBloodParry(paired);
 assert.ok(paired.state().bloodlustPending>0);
 assert.ok(paired.state().bloodlustPending<=paired.state().maxHp,'must not produce unbounded values');
 x.setHp(paired.state().maxHp);
 resolveBloodParry(paired);
 assert.equal(paired.state().bloodlustPending,0,'overheal must not charge future attacks');
});
test('Ice ward mitigates the next incoming hit and Ice Mirror reflects mitigated damage on a MISS',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setSkill('frost',1);d.setEnemyHp(10000);
 for(let i=0;i<4;i++)resolveBloodParry(g);
 assert.equal(g.state().frostWard,true);
 d.incoming(20);
 assert.equal(g.state().hp,50,'25% mitigation reduces 20 to 15');
 assert.equal(g.state().frostWard,false);
 const mirror=makeHarness();mirror.press('startBtn');const m=mirror.bloodTest();
 m.setSkill('frost',1);m.setSkill('thorns',1);m.setEnemyHp(10000);m.setFrostWard(true);
 const before=m.info().enemyHp;
 settleCurrentAttack(mirror);
 assert.equal(mirror.state().hp,65-Math.ceil(mirror.state().enemyAttack*.75),'ice reduces missed attack damage');
 assert.ok(m.info().enemyHp<before,'ice mirror damages the enemy');
 assert.equal(m.hits().filter(x=>x.label==='氷鏡').length,1);
});
test('King Strike procs at ten combos, or simultaneously with Pulse at eight via synergy',()=>{
 const basic=makeHarness();basic.press('startBtn');const b=basic.bloodTest();
 b.setSkill('king',1);b.setEnemyHp(10000);b.setCombo(9);
 resolveBloodParry(basic);
 assert.equal(b.hits().filter(x=>x.label==='王の一撃').length,1);
 const both=makeHarness();both.press('startBtn');const x=both.bloodTest();
 x.setSkill('king',1);x.setSkill('pulse',1);x.setSkill('blood',1);
 x.setEnemyHp(10000);x.setCombo(7);x.setHp(10);x.setMaxHp(500);
 const before=x.info().enemyHp;
 resolveBloodParry(both);
 const hits=x.hits().map(hit=>hit.label);
 assert.ok(hits.includes('王の一撃'),'King synergy triggers at combo eight');
 assert.ok(hits.includes('共鳴波'),'Pulse still fires at combo eight');
 const total=before-x.info().enemyHp;
 assert.equal(both.state().hp,10+Math.min(Math.max(2,Math.round(total*.08)),125),'bonus hits included in one lifesteal transaction');
});
test('new skill mechanics and seals never write to storage on developer test page',()=>{
 const raw=JSON.stringify({slots:1,unlockedSkills:['fortitude'],equipped:['fortitude',null],sealSlots:2,sealedSkills:['king']});
 const meta=JSON.stringify({coins:300,life:1,runs:2});
 const dev=makeHarness({'parryTowerPermanent_v1':raw,'parryTowerPrototype_v1':meta},true);
 dev.press('upgradeOpenBtn');dev.upgradeTab('seal');dev.upgradeBuy('seal','frost');
 assert.equal(dev.state().permanent.sealedSkills.length,2);
 assert.equal(dev.storage.get('parryTowerPermanent_v1'),raw);
 dev.press('upgradeCloseBtn');dev.dev().launch(5,'guardian:normal');
 assert.equal(dev.state().runSkills.fortitude,1);
 assert.equal(dev.state().sealedSkillIds.includes('king'),true);
 assert.equal(dev.storage.get('parryTowerPrototype_v1'),meta);
});


function makeRelicFight(relics=[]){
 const g=makeHarness();
 g.press('startBtn');const d=g.bloodTest();d.setEnemyHp(20000);
 for(const id of relics)assert.equal(d.grantRelic(id),true,'grant '+id);
 return {g,d};
}
test('v0.6.0 relic overlay, module links, status panel and skill rewards are separate',()=>{
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  for(const id of ['relicCover','relicOfferCards','relicReplaceList','relicBackBtn',
   'relicSkipBtn','relicList','relicCount'])assert.ok(html.includes('id="'+id+'"'),id+' in '+page);
  assert.match(html,/src="\.\/assets\/relics\.js\?v=v0\.9\.7"/);
  assert.match(html,/v0\.9\.7/);
 }
 const g=makeHarness({},true);
 assert.equal(g.dev().launch(3,'slime:normal'),true);
 const d=g.bloodTest();d.setEnemyHp(1);
 resolveBloodParry(g);
 assert.equal(g.state().mode,'victory');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'relic','3F gives a relic before normal loot');
 assert.equal(g.el.get('relicCover').hidden,false);
 assert.equal(g.state().relicOffer.length,3);
 const chosen=g.state().relicOffer[0];
 g.relicSelect(chosen);
 assert.equal(g.state().mode,'reward','must still receive normal skill choices');
 assert.deepEqual(Array.from(g.state().relics),[chosen]);
 assert.equal(g.el.get('relicCover').hidden,true);
 assert.equal(g.el.get('relicCount').textContent,'1 / 3');
 assert.equal((g.el.get('rewardCards').innerHTML.match(/class="reward-card/g)||[]).length,3);
 g.press('healBtn');
 assert.equal(g.state().floor,4);
 assert.deepEqual(Array.from(g.state().relics),[chosen]);
});
test('boss fifth floor guarantees relic, player can skip, and next regular reward always appears',()=>{
 const g=makeHarness({},true);
 assert.equal(g.dev().launch(5,'guardian:normal'),true);
 g.bloodTest().setEnemyHp(1);
 resolveBloodParry(g);
 g.frame(g.now+950);
 assert.equal(g.state().mode,'relic');
 assert.ok(g.state().relicOffer.length>0);
 g.press('relicSkipBtn');
 assert.equal(g.state().mode,'reward');
 assert.deepEqual(Array.from(g.state().relics),[]);
});
test('at three slots, choice requires explicit swap or skip and discarded relic cannot be offered again',()=>{
 const {g,d}=makeRelicFight(['reaper_pact','duet_mask','rusty_crest']);
 assert.equal(g.state().maxHp,52,'reaper reduces base 65 HP by 20%');
 d.awardPreview('boss10');
 assert.equal(g.state().mode,'relic');
 const selected=g.state().relicOffer[0];
 assert.equal(g.state().relics.includes(selected),false);
 g.relicSelect(selected);
 assert.equal(g.state().mode,'relic');
 assert.equal(g.state().relicSwapTarget,selected);
 assert.match(g.el.get('relicReplaceList').innerHTML,/死神の盟約/);
 g.press('relicBackBtn');
 assert.equal(g.state().relicSwapTarget,null);
 assert.equal(g.state().relics.length,3,'back leaves all items untouched');
 g.relicSelect(selected);
 g.relicReplace('reaper_pact');
 assert.equal(g.state().mode,'reward');
 assert.equal(g.state().maxHp,65,'taking off Reaper restores normal maxHP');
 assert.equal(g.state().relics.length,3);
 assert.equal(g.state().relics.includes('reaper_pact'),false);
 assert.equal(g.state().relics.includes(selected),true);
 assert.ok(g.state().relicDiscarded.includes('reaper_pact'));
 const R=require('../assets/relics.js');
 assert.equal(R.available(g.state().relics,g.state().relicDiscarded).some(r=>r.id==='reaper_pact'),false);
});
test('reaper pact reduction remains correct on Vital Vessel level-up and never grants free healing on removal',()=>{
 const {g,d}=makeRelicFight(['reaper_pact']);
 d.setHp(10);
 assert.equal(g.state().maxHp,52);
 d.setSkill('heal',1);
 d.setRawMaxHp(80);
 assert.equal(g.state().maxHp,64);
 assert.equal(g.state().hp,10);
 const boosted=d.hits().length;
 resolveBloodParry(g,20);
 assert.ok(d.hits().length>boosted);
});
test('common relic: rusty crest reduces first HP hit only, shielded hits do not consume it',()=>{
 const {g,d}=makeRelicFight(['rusty_crest']);
 d.setShield(20);
 d.incoming(10);assert.equal(g.state().hp,65);
 assert.equal(d.relicInfo().rustyUsed,false);
 d.setShield(0);d.incoming(10);
 assert.equal(g.state().hp,61,'first health hit takes 4 damage');
 assert.equal(d.relicInfo().rustyUsed,true);
 d.incoming(10);assert.equal(g.state().hp,51,'further hits take full damage');
});
test('common relic: stardust whetstone grants +30% to first counter in each floor',()=>{
 const base=makeRelicFight(),boost=makeRelicFight(['stardust_whetstone']);
 resolveBloodParry(base.g,20);resolveBloodParry(boost.g,20);
 assert.ok(boost.d.hits()[0].dealt>=Math.round(base.d.hits()[0].dealt*1.29));
 boost.d.resetHits();resolveBloodParry(boost.g,20);
 assert.equal(boost.d.relicInfo().stardustUsed,true);
 assert.ok(boost.d.hits()[0].dealt<base.d.hits()[0].dealt*1.4,'second parry not boosted');
});
test('common relic: conduit stone procs after four parries, emperor conduit boosts lightning by 25%',()=>{
 const {g,d}=makeRelicFight(['conduit_stone','emperor_conduit']);
 for(let i=0;i<3;i++)resolveBloodParry(g,20);
 assert.equal(d.hits().filter(h=>h.label==='雷導').length,0);
 resolveBloodParry(g,20);
 assert.equal(d.hits().filter(h=>h.label==='雷導').length,1);
 assert.equal(d.hits().find(h=>h.label==='雷導').dealt,15);
 assert.equal(d.relicInfo().counters.conduit_stone,0);
});
test('common relic: ember vial accumulates burn even without Ember skill',()=>{
 const {g,d}=makeRelicFight(['ember_vial']);
 assert.equal(g.state().runSkills.ember,undefined);
 resolveBloodParry(g,20);
 assert.equal(d.relicInfo().burn,3);
});
test('common relic: pilgrim bell heals every four parries and real recovery fuels bounded Bloodlust',()=>{
 const {g,d}=makeRelicFight(['pilgrim_bell']);
 d.setSkill('bloodlust',1);d.setHp(10);
 for(let i=0;i<3;i++)resolveBloodParry(g,20);
 d.setHp(10);
 resolveBloodParry(g,20);
 assert.equal(g.state().hp,17,'Bloodlust +3 and Bell +4');
 assert.equal(g.state().bloodlustPending,11,'actual 7 HP ×1.5');
});
test('common relic: broken gear gives 5 shield on next parry after ultimate only',()=>{
 const {g,d}=makeRelicFight(['broken_gear']);
 d.setCharge(6);
 resolveBloodParry(g,0);
 assert.equal(d.relicInfo().gearReady,true);
 assert.equal(g.state().shield,0,'does not grant shield on the ultimate parry');
 resolveBloodParry(g,20);
 assert.equal(g.state().shield,5);
 assert.equal(d.relicInfo().gearReady,false);
 resolveBloodParry(g,20);
 assert.equal(g.state().shield,5,'no repeated gear shield');
});
test('rare relic: serene crystal reacts to three consecutive JUSTs and ignores normal parries',()=>{
 const {g,d}=makeRelicFight(['serene_crystal']);
 for(let i=0;i<2;i++)resolveBloodParry(g,0);
 assert.equal(g.state().shield,0);
 resolveBloodParry(g,20);
 assert.equal(g.state().shield,0,'normal parry breaks JUST streak');
 for(let i=0;i<3;i++)resolveBloodParry(g,0);
 assert.equal(g.state().shield,8);
 assert.equal(d.relicInfo().justStreak,0);
});
test('rare relic: emperor conduit creates autonomous lightning only when lightning skills are absent',()=>{
 const {g,d}=makeRelicFight(['emperor_conduit']);
 for(let i=0;i<5;i++)resolveBloodParry(g,20);
 assert.deepEqual(Array.from(d.hits().filter(h=>h.label==='雷帝'),h=>h.dealt),[25]);
 const withThunder=makeRelicFight(['emperor_conduit']);
 withThunder.d.setSkill('thunder',1);
 for(let i=0;i<5;i++)resolveBloodParry(withThunder.g,20);
 assert.equal(withThunder.d.hits().some(h=>h.label==='雷帝'),false);
 assert.ok(withThunder.d.hits().filter(h=>h.label==='⚡').every(h=>h.dealt>=28));
});
test('rare relic: silver mirror only mitigates GUARD HP damage, by 20% up to 8',()=>{
 const {g,d}=makeRelicFight(['silver_mirror']);
 d.setShield(0);d.setEnemyAttack(50);
 resolveBloodParry(g,-40);
 assert.equal(g.state().hp,53,'50*30%=15 guard -3 mirror=12 damage');
 resolveBloodParry(g,-40);
 assert.equal(g.state().hp,41);
});
test('rare relic: royal banner awards ten barrier points at 10, 20 etc combo',()=>{
 const {g,d}=makeRelicFight(['royal_banner']);
 d.setCombo(9);resolveBloodParry(g,20);
 assert.equal(g.state().shield,10);
 resolveBloodParry(g,20);
 assert.equal(g.state().shield,10);
 d.setCombo(19);resolveBloodParry(g,20);
 assert.equal(g.state().shield,20);
});
test('rare relic: blood pact chalice heals after first real HP loss per floor, compatible with Bloodlust',()=>{
 const {g,d}=makeRelicFight(['blood_pact_chalice']);
 d.setSkill('bloodlust',1);d.setEnemyAttack(15);
 d.incoming(10);
 assert.equal(d.relicInfo().pactReady,true);
 resolveBloodParry(g,20);
 assert.equal(g.state().hp,65,'three Bloodlust and eight Pact heal to maximum');
 assert.equal(g.state().bloodlustPending,15,'actual ten lost HP restored, not requested eleven');
 assert.equal(d.relicInfo().pactReady,false);
 d.incoming(10);
 assert.equal(d.relicInfo().pactReady,false,'first injury each floor only');
});
test('rare relic: golden festival bell increases regular counters against bosses only',()=>{
 const base=makeHarness({},true),boost=makeHarness({},true);
 assert.equal(base.dev().launch(5,'guardian:normal'),true);
 assert.equal(boost.dev().launch(5,'guardian:normal'),true);
 base.bloodTest().setEnemyHp(20000);boost.bloodTest().setEnemyHp(20000);
 assert.equal(boost.bloodTest().grantRelic('golden_festival_bell'),true);
 resolveBloodParry(base,20);resolveBloodParry(boost,20);
 assert.ok(boost.bloodTest().hits()[0].dealt>=Math.round(base.bloodTest().hits()[0].dealt*1.18));
 const normal=makeRelicFight(['golden_festival_bell']),other=makeRelicFight();
 resolveBloodParry(normal.g,20);resolveBloodParry(other.g,20);
 assert.equal(normal.d.hits()[0].dealt,other.d.hits()[0].dealt,'does not boost normal enemies');
});
test('legendary relic: stopped hand preserves combo on first GUARD each floor, but not the next',()=>{
 const {g,d}=makeRelicFight(['stopped_hand']);
 d.setCombo(10);d.setEnemyAttack(10);
 resolveBloodParry(g,-40);
 assert.equal(g.state().combo,10);
 assert.equal(d.relicInfo().stopUsed,1);
 resolveBloodParry(g,-40);
 assert.equal(g.state().combo,5,'second guard pays the minimum 5-combo penalty');
});
test('legendary relic: duet mask stores exactly one slash on JUST, consumes on next success',()=>{
 const {g,d}=makeRelicFight(['duet_mask']);
 resolveBloodParry(g,0);
 assert.equal(d.relicInfo().maskReady,true);
 d.resetHits();resolveBloodParry(g,20);
 assert.equal(d.hits().filter(h=>h.label==='仮面').length,1);
 assert.equal(d.relicInfo().maskReady,false);
 d.resetHits();resolveBloodParry(g,20);
 assert.equal(d.hits().filter(h=>h.label==='仮面').length,0);
});
test('successful parry relic extra hits share Blood lifesteal cap, guard-only reflection never does',()=>{
 const {g,d}=makeRelicFight(['conduit_stone','duet_mask']);
 d.setSkill('blood',6);d.setEnemyHp(20000);d.setHp(10);d.setMaxHp(200);
 d.setRelicCounter('conduit_stone',3);
 d.setRelicFlag('relicMaskReady',true);
 const before=d.info().enemyHp;
 resolveBloodParry(g,20);
 const damage=before-d.info().enemyHp;
 assert.ok(d.hits().some(h=>h.label==='仮面'));
 assert.ok(d.hits().some(h=>h.label==='雷導'));
 const heal=Math.min(Math.max(2,Math.round(damage*.18)),50);
 assert.equal(g.state().hp,10+heal,'single lifesteal settlement');
});
test('relic collection remains ephemeral and developer session does not write any save',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:23,runs:3}),
  'parryTowerPermanent_v1':JSON.stringify({slots:1,unlockedSkills:['blood'],equipped:['blood',null],sealSlots:1,sealedSkills:['thorns']})};
 const g=makeHarness(seed,true);
 g.dev().launch(3,'slime:normal');
 g.bloodTest().setEnemyHp(1);
 resolveBloodParry(g);g.frame(g.now+950);
 assert.equal(g.state().mode,'relic');
 g.relicSelect(g.state().relicOffer[0]);
 assert.equal(g.storage.get('parryTowerPrototype_v1'),seed.parryTowerPrototype_v1);
 assert.equal(g.storage.get('parryTowerPermanent_v1'),seed.parryTowerPermanent_v1);
 g.press('healBtn');
 assert.equal(g.state().relics.length,1);
 g.dev().reset();
 assert.equal(g.state().relics.length,0,'relics do not survive end of run');
});


test('lethal fourth parry preserves unspent conduit lightning for the next floor',()=>{
 const {g,d}=makeRelicFight(['conduit_stone']);
 d.setRelicCounter('conduit_stone',3);
 d.setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 assert.equal(d.relicInfo().boltDue,true,'fourth parry counted even on immediate kill');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'reward');
 g.press('healBtn');
 assert.equal(g.state().floor,2);
 d.setEnemyHp(20000);d.resetHits();
 resolveBloodParry(g,20);
 assert.equal(d.hits().filter(h=>h.label==='雷導').length,1);
 assert.equal(d.relicInfo().boltDue,false);
});
test('pact from a killing GUARD is retained until the next successful parry on the next floor',()=>{
 const {g,d}=makeRelicFight(['blood_pact_chalice']);
 d.setSkill('thorns',1);d.setEnemyAttack(20);d.setShield(0);d.setEnemyHp(1);
 resolveBloodParry(g,-40);
 assert.equal(g.state().mode,'victory','guard reflection defeated low HP enemy');
 assert.equal(d.relicInfo().pactReady,true);
 g.frame(g.now+950);g.press('healBtn');
 d.setEnemyHp(20000);d.setHp(10);
 resolveBloodParry(g,20);
 assert.equal(g.state().hp,18,'the next parry restores 8 real HP');
 assert.equal(d.relicInfo().pactReady,false);
});
test('relic panel resets on title and repeated starts; relic ownership remains scoped to a challenge',()=>{
 const {g,d}=makeRelicFight(['duet_mask']);
 assert.equal(g.state().relics.length,1);
 assert.match(g.el.get('relicList').innerHTML,/二重奏の仮面/);
 const saved=[...g.storage.keys()];
 assert.equal(saved.some(k=>/relic/i.test(k)),false);
 // Run reset is the same path as the normal home button, not a save mutation.
 const dev=makeHarness({},true);dev.dev().launch(1,'slime:normal');
 dev.bloodTest().grantRelic('conduit_stone');
 assert.equal(dev.state().relics.length,1);
 dev.dev().reset();
 assert.equal(dev.el.get('relicCount').textContent,'0 / 3');
 assert.doesNotMatch(dev.el.get('relicList').innerHTML,/雷導石/);
 dev.dev().launch(1,'slime:normal');
 assert.deepEqual(Array.from(dev.state().relics),[]);
});


test('Reaper Pact changes regular counter damage by 35% while keeping ordinary enemies unaffected by boss-only bell',()=>{
 const base=makeRelicFight(),enhanced=makeRelicFight(['reaper_pact']);
 base.d.setEnemyHp(20000);enhanced.d.setEnemyHp(20000);
 resolveBloodParry(base.g,20);resolveBloodParry(enhanced.g,20);
 const plain=base.d.hits()[0].dealt,buffed=enhanced.d.hits()[0].dealt;
 assert.equal(buffed,Math.round(plain*1.35),'Reaper effect is on regular counter; same combo and attack');
 assert.equal(enhanced.g.state().maxHp,52);
});
test('relic discovery does not consume purchased four-choice ordinary loot or rerolls',()=>{
 const seed={'parryTowerPermanent_v1':JSON.stringify({choice4:1,extraReroll:1})};
 const g=makeHarness(seed,true);
 g.dev().launch(3,'slime:normal');
 g.bloodTest().setEnemyHp(1);
 resolveBloodParry(g);
 g.frame(g.now+950);
 assert.equal(g.state().mode,'relic');
 const beforeRerolls=g.state().rerolls;
 g.press('relicSkipBtn');
 assert.equal(g.state().mode,'reward');
 assert.equal(g.state().rerolls,beforeRerolls,'relic choice cannot spend ordinary rerolls');
 assert.equal((g.el.get('rewardCards').innerHTML.match(/class="reward-card/g)||[]).length,4);
});


function makeCrossroads(floor=4){
 const g=makeHarness({},true);
 assert.equal(g.dev().launch(floor),true);
 assert.equal(g.state().mode,'route');
 assert.equal(g.state().floor,floor);
 return {g,d:g.bloodTest()};
}
test('v0.7.0 crossroads routes, tower coins and both entrypoints render correctly',()=>{
 for(const page of ['index.html','dev.html']){
  const html=fs.readFileSync(page,'utf8');
  for(const id of ['routeCover','routeCards','roomCover','roomActions','roomNote','roomTitle',
   'routeSkillCover','routeSkillCards','towerCoinsLabel'])assert.ok(html.includes('id="'+id+'"'),id+' in '+page);
  for(const asset of ['routes','events'])assert.ok(html.includes('src="./assets/'+asset+'.js?v=v0.9.7"'),asset);
  assert.match(html,/v0\.9\.7/);
 }
 const {g,d}=makeCrossroads(4);
 assert.deepEqual(Array.from(d.getRouteOptions()),['rest','merchant','trial']);
 assert.equal(g.el.get('routeCover').hidden,false);
 assert.equal(String(g.el.get('towerCoinsLabel').textContent),'0');
 assert.match(g.el.get('routeCards').innerHTML,/安息の間/);
 assert.match(g.el.get('routeCards').innerHTML,/行商人の隠れ処/);
 assert.match(g.el.get('routeCards').innerHTML,/血闘の間/);
 const later=makeCrossroads(8);
 assert.deepEqual(Array.from(later.d.getRouteOptions()),['rest','event','trial']);
 assert.match(later.g.el.get('routeCards').innerHTML,/奇遇の間/);
 const next=makeCrossroads(14);
 assert.deepEqual(Array.from(next.d.getRouteOptions()),['rest','merchant','trial']);
});
test('real 3F relic + regular reward leads into 4F crossroads, without a normal enemy spawn',()=>{
 const g=makeHarness({},true);
 g.dev().launch(3,'slime:normal');
 g.bloodTest().setEnemyHp(1);
 resolveBloodParry(g);
 g.frame(g.now+950);
 assert.equal(g.state().mode,'relic');
 g.relicSelect(g.state().relicOffer[0]);
 assert.equal(g.state().mode,'reward');
 g.press('healBtn');
 assert.equal(g.state().floor,4);
 assert.equal(g.state().mode,'route');
 assert.equal(g.state().enemy,undefined);
 assert.equal(g.el.get('routeCover').hidden,false);
});
test('rest recovers 35 percent, consumes room and resets combo, without ordinary skill rewards',()=>{
 const {g,d}=makeCrossroads();
 d.setCombo(18);d.setJustStreak(2);d.setHp(10);
 g.routeSelect('rest');
 assert.equal(g.state().mode,'room');
 assert.equal(g.state().combo,0);
 assert.equal(g.state().justStreak,0);
 const originalSkills=JSON.stringify(g.state().runSkills);
 g.roomChoose('rest:heal');
 assert.equal(g.state().hp,33);
 assert.equal(g.state().roomStage,'result');
 assert.equal(g.state().mode,'room','room stays open until confirmation');
 g.roomChoose('rest:heal');
 assert.equal(g.state().hp,33,'double click cannot heal twice');
 g.press('healBtn');
 assert.equal(g.state().mode,'room','ordinary reward controls cannot be used in room');
 g.roomChoose('continue');
 assert.equal(g.state().floor,5);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().enemy,'guardian');
 assert.equal(JSON.stringify(g.state().runSkills),originalSkills);
 g.roomChoose('continue');
 assert.equal(g.state().floor,5,'late click cannot skip another floor');
});
test('rest meditation grants capped shield and one reroll; future 8F rest leads to fixed 9F elite',()=>{
 const {g,d}=makeCrossroads(8);
 d.setCombo(99);d.setShield(95);
 const rerolls=g.state().rerolls;
 g.routeSelect('rest');
 g.roomChoose('rest:meditate');
 assert.equal(g.state().shield,100,'ward uses regular shield limit');
 assert.equal(g.state().rerolls,rerolls+1);
 g.roomChoose('continue');
 assert.equal(g.state().floor,9);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().encounterElite,true);
 assert.equal(g.state().combo,0);
});
test('blood trial preserves combo, spawns an elite and pays 14 tower coins plus normal loot',()=>{
 const {g,d}=makeCrossroads();
 d.setCombo(9);
 g.routeSelect('trial');
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().routeTrial,true);
 assert.equal(g.state().encounterElite,true);
 assert.equal(g.state().combo,9);
 g.random(.99);
 d.setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().towerCoins,14);
 assert.equal(g.state().towerCoinsEarned,14);
 assert.equal(String(g.el.get('towerCoinsLabel').textContent),'14');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'reward','trial retains normal skill reward');
 g.press('healBtn');
 assert.equal(g.state().floor,5);
 assert.equal(g.state().routeTrial,false);
 assert.equal(g.state().encounterElite,false);
 assert.equal(g.state().encounterKey,'guardian:normal');
});
test('normal, elite/rare, boss victories grant distinct tower coins and no permanent spend',()=>{
 for(const [floor,key,expected] of [[1,'slime:normal',6],[7,'gem_slime:rare',12],
  [9,'knight:elite',12],[5,'guardian:normal',10]]){
  const g=makeHarness({},true);
  g.dev().launch(floor,key);
  g.random(.99);g.bloodTest().setEnemyHp(1);
  resolveBloodParry(g,20);
  assert.equal(g.state().towerCoins,expected,key);
  assert.equal(g.state().souls,0===g.state().souls?0:g.state().souls);
 }
});
test('merchant requires run coins, limits purchases to one per visit and keeps soul currency separate',()=>{
 const {g,d}=makeCrossroads();
 d.setTowerCoins(18);
 const rerolls=g.state().rerolls;
 g.routeSelect('merchant');
 assert.equal(g.state().mode,'room');
 const soul=g.state().souls;
 g.roomChoose('buy:skill');
 assert.equal(g.state().mode,'room','26-coin scroll is unaffordable at 18');
 g.roomChoose('buy:reroll');
 assert.equal(g.state().towerCoins,6);
 assert.equal(g.state().rerolls,rerolls+1);
 assert.equal(g.state().souls,soul);
 assert.equal(g.state().roomStage,'result');
 g.roomChoose('buy:barrier');
 assert.equal(g.state().towerCoins,6,'cannot purchase a second time');
 g.roomChoose('continue');
 assert.equal(g.state().floor,5);
});
test('merchant can buy barrier, or leave with all tower coins without fighting',()=>{
 const first=makeCrossroads();
 first.d.setTowerCoins(20);first.g.routeSelect('merchant');
 first.g.roomChoose('buy:barrier');
 assert.equal(first.g.state().shield,20);
 assert.equal(first.g.state().towerCoins,4);
 first.g.roomChoose('continue');
 const second=makeCrossroads();
 second.d.setTowerCoins(31);second.g.routeSelect('merchant');
 second.g.roomChoose('leave');
 assert.equal(second.g.state().towerCoins,31);
 second.g.roomChoose('continue');
 assert.equal(second.g.state().floor,5);
});
test('merchant skill scroll uses existing sealed skill pool and gives only ONE selectable upgrade',()=>{
 const old={'parryTowerPermanent_v1':JSON.stringify({sealSlots:1,sealedSkills:['blood']})};
 const g=makeHarness(old,true),d=g.bloodTest();
 g.dev().launch(4);d.setTowerCoins(60);g.routeSelect('merchant');
 g.roomChoose('buy:skill');
 assert.equal(g.state().mode,'routeSkill');
 assert.equal(g.state().towerCoins,34);
 assert.equal(g.state().routeSkillSet.includes('blood'),false);
 assert.ok(g.state().routeSkillSet.length>=1);
 const id=g.state().routeSkillSet[0],before=g.state().runSkills[id]||0;
 g.routeSkillSelect('blood');
 assert.equal(g.state().mode,'routeSkill','invalid or sealed choice cannot be purchased');
 g.routeSkillSelect(id);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().floor,5);
 assert.equal(g.state().runSkills[id],before+1);
 assert.equal(g.state().rerolls,1,'no boss reroll or extra standard reward');
});
test('merchant relic chest costs 42, offers nonlegendary relics and never adds an ordinary skill reward',()=>{
 const {g,d}=makeCrossroads();
 d.setTowerCoins(50);g.routeSelect('merchant');
 g.roomChoose('buy:relic');
 assert.equal(g.state().towerCoins,8);
 assert.equal(g.state().mode,'relic');
 const offer=g.state().relicOffer;
 assert.equal(offer.length,3);
 const RR=require('../assets/relics.js');
 assert.ok(offer.every(id=>RR.BY_ID[id].rarity!=='legendary'));
 g.relicSelect(offer[0]);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().floor,5);
 assert.equal(g.state().relics.length,1);
 assert.equal(Object.keys(g.state().runSkills).length,0);
});
test('altar sacrifice spends only HP, never activates injury procs and gives a filtered skill',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('altar');
 d.setHp(15);d.setSkill('fortitude',1);d.grantRelic('blood_pact_chalice');
 g.roomChoose('event:sacrifice');
 assert.equal(g.state().hp,7,'cost is ceil(65 * 12%) = 8');
 assert.equal(g.state().mode,'routeSkill');
 assert.equal(g.state().fortitudeReady,false);
 assert.equal(d.relicInfo().pactReady,false);
 const id=g.state().routeSkillSet[0],before=g.state().runSkills[id]||0;
 g.routeSkillSelect(id);
 assert.equal(g.state().floor,9);
 assert.equal(g.state().runSkills[id],before+1);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().encounterElite,true);
});
test('altar cannot kill, shield alternative is available, and never issues a combat hit',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('altar');d.setHp(7);
 g.roomChoose('event:sacrifice');
 assert.equal(g.state().mode,'room');
 assert.equal(g.state().hp,7);
 g.roomChoose('event:ward');
 assert.equal(g.state().shield,12);
 assert.equal(g.state().hp,7);
 g.roomChoose('event:ward');
 assert.equal(g.state().shield,12,'only once');
 g.roomChoose('continue');
 assert.equal(g.state().floor,9);
});
test('forgotten mirror can exchange a relic without increasing count and marks the old one discarded',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('mirror');
 assert.equal(d.grantRelic('rusty_crest'),true);
 g.roomChoose('event:swap');
 assert.equal(g.state().roomStage,'mirror');
 g.roomChoose('mirror:rusty_crest');
 assert.equal(g.state().mode,'relic');
 const choice=g.state().relicOffer[0];
 g.relicSelect(choice);
 assert.equal(g.state().floor,9);
 assert.equal(g.state().mode,'combat');
 assert.deepEqual(Array.from(g.state().relics),[choice]);
 assert.deepEqual(Array.from(g.state().relicDiscarded),['rusty_crest']);
 assert.equal(g.state().relics.length,1);
});
test('mirror skip returns to the same event, allowing the +12 coin choice',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('mirror');d.grantRelic('rusty_crest');
 g.roomChoose('event:swap');g.roomChoose('mirror:rusty_crest');
 g.press('relicSkipBtn');
 assert.equal(g.state().mode,'room');
 assert.equal(g.state().roomStage,null);
 assert.equal(g.state().relics[0],'rusty_crest');
 g.roomChoose('event:coins');
 assert.equal(g.state().towerCoins,12);
 g.roomChoose('continue');
 assert.equal(g.state().floor,9);
});
test('traveler offers either 18 coins or one reroll and 10 shield, without an extra reward',()=>{
 for(const [action,coins,shield] of [['event:coins',18,0],['event:ward',0,10]]){
  const {g,d}=makeCrossroads(8);
  g.routeSelect('event');d.setEvent('traveler');
  const before=g.state().rerolls;g.roomChoose(action);
  assert.equal(g.state().towerCoins,coins);
  assert.equal(g.state().shield,shield);
  assert.equal(g.state().rerolls,before+(action==='event:ward'?1:0));
  g.roomChoose('continue');
  assert.equal(g.state().mode,'combat');
  assert.equal(g.state().floor,9);
 }
});
test('chest failure never kills, cannot trigger fortitude and cannot be rolled again',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('chest');d.setHp(8);
 d.setSkill('fortitude',1);
 g.random(.99);g.roomChoose('event:open');
 assert.equal(g.state().hp,1);
 assert.equal(g.state().mode,'room');
 assert.equal(g.state().fortitudeReady,false);
 assert.equal(g.state().roomStage,'result');
 g.roomChoose('event:open');
 assert.equal(g.state().hp,1);
 g.roomChoose('continue');
 assert.equal(g.state().floor,9);
});
test('chest success offers a relic on 40% roll and does not invoke ordinary skill rewards',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('event');d.setEvent('chest');
 g.random(0);g.roomChoose('event:open');
 assert.equal(g.state().mode,'relic');
 assert.equal(g.state().relicOffer.length,3);
 g.relicSelect(g.state().relicOffer[0]);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().floor,9);
 assert.equal(g.state().relics.length,1);
});
test('events and merchant purchases never rewrite legacy permanent save; tower coins expire on new run',()=>{
 const raw={'parryTowerPermanent_v1':JSON.stringify({sealSlots:1,sealedSkills:['thorns'],slots:1,unlockedSkills:['blood'],equipped:['blood',null]}),
 'parryTowerPrototype_v1':JSON.stringify({coins:173,runs:2,bestFloor:19,life:1})};
 const {g,d}=makeCrossroads(4);
 d.setTowerCoins(200);g.routeSelect('merchant');g.roomChoose('buy:reroll');g.roomChoose('continue');
 assert.equal(g.storage.has('parryTowerRoutes_v1'),false);
 const dev=makeHarness(raw,true),tester=dev.bloodTest();
 dev.dev().launch(4);tester.setTowerCoins(100);
 dev.routeSelect('merchant');dev.roomChoose('buy:reroll');dev.roomChoose('continue');
 assert.equal(dev.storage.get('parryTowerPermanent_v1'),raw.parryTowerPermanent_v1);
 assert.equal(dev.storage.get('parryTowerPrototype_v1'),raw.parryTowerPrototype_v1);
 dev.dev().reset();
 assert.equal(dev.state().towerCoins,0);
 dev.dev().launch(1,'slime:normal');
 assert.equal(dev.state().towerCoins,0);
 assert.equal(dev.state().runSkills.blood,1);
});


test('animation frame remains inert in route, event and result modes without a spawned enemy',()=>{
 const {g,d}=makeCrossroads(8);
 g.frame(g.now+250);
 assert.equal(g.state().mode,'route');
 assert.equal(g.state().enemy,undefined);
 g.routeSelect('event');d.setEvent('traveler');
 g.frame(g.now+250);
 assert.equal(g.state().mode,'room');
 assert.equal(g.state().enemy,undefined);
 g.roomChoose('event:coins');
 const amount=g.state().towerCoins;
 g.frame(g.now+500);
 assert.equal(g.state().towerCoins,amount,'no automatic reward repetition between frames');
 assert.equal(g.state().mode,'room');
 g.roomChoose('continue');
 assert.equal(g.state().floor,9);
});
test('8F can choose an elite fight while fixed 9F elite and 10F boss remain unchanged',()=>{
 const {g,d}=makeCrossroads(8);
 g.routeSelect('trial');
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().encounterElite,true);
 g.random(.99);d.setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().towerCoins,14);
 g.frame(g.now+950);
 assert.equal(g.state().mode,'reward');
 g.press('healBtn');
 assert.equal(g.state().floor,9);
 assert.equal(g.state().encounterElite,true);
 d.setEnemyHp(1);
 resolveBloodParry(g,20);
 g.frame(g.now+950);
 if(g.state().mode==='relic')g.press('relicSkipBtn');
 assert.equal(g.state().mode,'reward');
 g.press('healBtn');
 assert.equal(g.state().floor,10);
 assert.equal(g.state().encounterKey,'guardian:elite');
});

test('80F summit boss enters second musical phrase only after completed strike',()=>{
 const g=makeHarness({},true),dev=g.dev();
 assert.equal(dev.launch(80,'endking:elite'),true);
 assert.equal(g.state().bossPhase,1);
 assert.deepEqual(Array.from(g.state().enemyRhythm),P.byId.endking.rhythm);
 const hp=g.state().enemyMaxHp;
 g.bloodTest().setEnemyHp(Math.floor(hp*.49)+100);
 g.bloodTest().setBaseAttack(1);
 assert.equal(g.state().bossPhase,1,'the already-telegraphed strike is not altered by HP updates');
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'phase','half HP enters invulnerable cinematic between strikes');
 assert.equal(g.state().bossPhase,2);
 assert.equal(g.state().phaseStage,'rumble');
 assert.deepEqual(Array.from(g.state().enemyRhythm),P.byId.endking.phaseRhythm);
 assert.equal(g.state().attackAt,Infinity,'the old attack is disabled during cinematic');
 const before=g.state().enemyHp,started=g.now;
 g.parry();assert.equal(g.state().enemyHp,before,'parry input is inert during interlude');
 g.frame(started+1499);
 assert.equal(g.state().phaseStage,'rumble');
 g.clearAudioEvents();
 g.frame(started+1500);
 assert.equal(g.state().phaseStage,'countin');
 const drumHits=g.audioEvents();
 // Each of the four scheduled stomps has exactly two pitched layers: a punch and a boom.
 assert.equal(drumHits.length,8,'count-in has four layered drums without melodic voices');
 const punches=drumHits.filter(x=>x.type==='triangle'&&x.frequency===220);
 const booms=drumHits.filter(x=>x.type==='sine'&&x.frequency===135);
 assert.equal(punches.length,4,'mid-bass punch layer remains audible on small speakers');
 assert.equal(booms.length,4,'sub-bass body under every stomp');
 const drumBeat=g.state().beat;
 for(let i=0;i<4;i++){
  assert.ok(Math.abs(punches[i].time-booms[i].time)<.00001,'impact layers start together');
  if(i)assert.ok(Math.abs(punches[i].time-punches[i-1].time-drumBeat)<.00001,
   'each layered stomp starts exactly one beat apart on Web Audio time');
 }
 const countStart=g.state().phaseCountStartAt,beat=g.state().beat*1000;
 assert.ok(countStart>g.now);
 // The count-in presents only the movement title, never a full-screen instruction HUD.
 g.bloodTest().setCombo(18);
 g.bloodTest().clearPhaseDrawLabels();
 g.frame(countStart+2*beat+10);
 const labels=g.bloodTest().phaseDrawLabels();
 assert.ok(labels.some(x=>x.mode==='phase'&&x.label==='第二楽章'));
 assert.ok(!labels.some(x=>/ゴゴ|リズムを取れ|READY|COMBO|^[1-4]$/.test(x.label)),
  'the transition is a quiet title with musical beats, not a numbered cover or combo overlay');
 g.frame(countStart+3*beat+10);
 assert.equal(g.state().mode,'phase','all four count-in beats are safe');
 g.parry();assert.equal(g.state().enemyHp,before,'count-in is never a combat attack');
 g.bloodTest().clearPhaseDrawLabels();
 g.frame(countStart+4*beat+1);
 assert.equal(g.state().mode,'combat','the bar finished before combat restarts');
 const resumeLabels=g.bloodTest().phaseDrawLabels();
 assert.ok(resumeLabels.some(x=>x.mode==='combat'&&x.label==='×18 COMBO'),
  'combo HUD is visible again after the transition');
 assert.ok(!resumeLabels.some(x=>x.label.includes('第二楽章')),
  'the movement title disappears on return and cannot overlap the combo HUD');
 assert.equal(g.state().phaseStage,null);
 assert.equal(g.state().attackBeat,8);
 assert.ok(g.state().attackAt-g.now>=3.9*beat,'fresh telegraph allows a full four beats after count-in');
 assert.equal(g.storage.size,0,'developer run never modifies persistent storage');
});
test('80F defeat is immediately recorded as summit completion and the game can continue to 81F',()=>{
 const g=makeHarness();
 g.press('startBtn');
 g.bloodTest().jumpFloor(80);
 assert.equal(g.state().enemy,'endking');
 assert.equal(g.state().encounterElite,true);
 g.random(.99);
 g.bloodTest().setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().finalClear,true);
 const persisted=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
 assert.equal(persisted.bestFloor,80,'summit clear is recorded before next death');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'relic','final boss continues to the existing relic offer');
 g.press('relicSkipBtn');
 assert.equal(g.state().mode,'reward');
 assert.match(g.el.get('rewardTitle').textContent,/80F制覇/);
 assert.match(g.el.get('rewardNote').textContent,/81Fから無限踏破/);
 g.press('healBtn');
 assert.equal(g.state().floor,81);
 assert.equal(g.state().enemy,'slime','endless floor loops to the original first sector');
 assert.equal(g.state().mode,'combat');
});

test('interlude recovers safely after tab throttling and never resumes on an expired hit',()=>{
 const g=makeHarness({},true);
 g.dev().launch(80,'endking:elite');
 g.bloodTest().setEnemyHp(Math.floor(g.state().enemyMaxHp*.4)+60);
 g.bloodTest().setBaseAttack(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'phase');
 g.frame(g.now+1500);
 const start=g.state().phaseCountStartAt,beat=g.state().beat*1000;
 g.frame(start+9*beat);
 assert.equal(g.state().mode,'phase','missed count-in is rescheduled, not skipped');
 assert.equal(g.state().phaseStage,'countin');
 assert.ok(g.state().phaseCountStartAt>start);
});
test('second movement transition does not change normal bosses, premature thresholds or other enemies',()=>{
 const g=makeHarness({},true);
 g.dev().launch(75,'endking:normal');
 g.bloodTest().setEnemyHp(Math.floor(g.state().enemyMaxHp*.7)+30);
 g.bloodTest().setBaseAttack(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'combat','above half health remains ordinary combat');
 assert.equal(g.state().bossPhase,1);
 g.dev().launch(80,'star_warden:normal');
 g.bloodTest().setEnemyHp(Math.floor(g.state().enemyMaxHp*.4)+30);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'combat','non-final bosses never transition');
});

test('blood trial mystery guest hides identity, uses the current floor stats and awards normal loot without unlock',()=>{
 const {g,d}=makeCrossroads(24);
 g.random(0); // 50% mystery, first eligible future-zone enemy.
 g.routeSelect('trial');
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().routeTrial,true);
 assert.equal(g.state().preview,true);
 assert.equal(g.state().enemy,'？？？');
 assert.equal(g.state().encounterKey,null,'public status does not reveal the guest');
 assert.equal(g.el.get('enemyName').textContent,'？？？');
 assert.equal(g.el.get('enemyBarName').textContent,'？？？');
 assert.equal(g.state().encounterElite,true);
 const guest=P.foreshadowTrialForFloor(24,()=>0);
 assert.equal(g.state().enemyMaxHp,P.baseStats(guest,24).maxHp);
 assert.equal(g.state().enemyAttack,P.baseStats(guest,24).atk);
 assert.deepEqual(Array.from(g.state().enemyRhythm),P.byId.ember_slime.rhythm);
 assert.deepEqual(Array.from(g.state().discovered),[]);
 assert.equal(g.storage.has('parryTowerBestiary_v1'),false,'mystery does not write bestiary');
 g.random(.99);d.setEnemyHp(1);resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().towerCoins,14,'blood trial keeps its 14 coins');
 assert.equal(g.storage.has('parryTowerBestiary_v1'),false,'mystery kill must stay out of bestiary');
 g.frame(g.now+950);
 assert.equal(g.state().mode,'reward','normal skill reward is retained');
 assert.doesNotMatch(g.el.get('rewardNote').textContent,/図鑑登録/);
 g.press('healBtn');
 assert.equal(g.state().floor,25);
});
test('blood trial remains an ordinary elite when mystery chance fails or future zone is unavailable',()=>{
 const early=makeCrossroads(4);
 early.g.random(.99);early.g.routeSelect('trial');
 assert.equal(early.g.state().preview,false);
 assert.equal(early.g.state().enemy,'wraith');
 assert.ok(early.g.state().encounterKey);
 assert.ok(early.g.state().discovered.includes('wraith:elite'),'ordinary blood trial still unlocks the enemy in-memory');
 const late=makeCrossroads(64);
 late.g.random(0);late.g.routeSelect('trial');
 assert.equal(late.g.state().preview,false,'no preview past zone six');
 assert.equal(late.g.state().encounterElite,true);
 assert.ok(late.g.state().encounterKey);
});
test('after the masked 24F teaser, the real 41F encounter reveals its name and unlocks practice',()=>{
 const g=makeHarness(),d=g.bloodTest();
 g.press('startBtn'); // normal mode persists real encounters; dev mode is intentionally read-only
 d.jumpFloor(24);
 assert.equal(g.state().mode,'route');
 g.random(0);g.routeSelect('trial');
 assert.equal(g.el.get('enemyName').textContent,'？？？');
 const initial=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(initial.seen['ember_slime:elite'],undefined);
 d.setEnemyHp(1);resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 const hidden=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(hidden.seen['ember_slime:elite'],undefined,'preview kill not persisted');
 d.jumpFloor(41);
 assert.equal(g.state().enemy,'ember_slime');
 assert.equal(g.state().preview,false);
 assert.equal(g.el.get('enemyName').textContent,'灼熱スライム');
 assert.ok(g.state().discovered.includes('ember_slime:normal'));
 const raw=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(raw.seen['ember_slime:normal'].firstFloor,41);
 assert.equal(raw.seen['ember_slime:elite'],undefined,'masked elite encounter stays hidden');
});

test('hold guard remains raised through repeated hits; early short tap misses instead',()=>{
 const held=makeHarness();held.press('startBtn');
 const d=held.bloodTest();d.setEnemyHp(999999);d.setEnemyAttack(50);
 held.clock(held.state().attackAt-500);held.hold();
 settleCurrentAttack(held);
 assert.equal(held.state().hp,50,'50 attack is 15 blocked damage at 70% reduction');
 assert.equal(held.state().guardHeld,true);
 const enemyHp=held.state().enemyHp,second=held.state().attackAt;
 settleCurrentAttack(held);
 assert.equal(held.state().hp,35,'next attack also guarded without a second press');
 assert.equal(held.state().enemyHp,enemyHp,'guard does not automatically attack');
 held.release();assert.equal(held.state().guardHeld,false);
 settleCurrentAttack(held);
 assert.equal(held.state().mode,'gameover','releasing before impact leaves player vulnerable');
 const short=makeHarness();short.press('startBtn');
 short.clock(short.state().attackAt-500);short.parry();
 assert.equal(short.state().guardHeld,false);
 settleCurrentAttack(short);
 assert.equal(short.state().hp,65-short.state().enemyAttack,'early short tap does not grant guard');
});

test('ultra-fast repeated taps cannot re-arm parry and do not restart the shield animation',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true);
 const due=g.state().attackAt,first=due-650;
 for(let t=first;t<=due-50;t+=5){g.clock(t);g.hold();g.clock(t+1);g.release();}
 assert.equal(g.state().parryAnimAt,first);assert.equal(g.metalEvents().length,0);
 g.frame(due+1);assert.equal(g.state().lastStrikeKind,'miss');assert.equal(g.state().practice,true);
 assert.equal(g.state().hp,g.state().maxHp);assert.equal(g.state().mode,'combat');
});

test('a fresh parry needs both the 300ms action recovery and 120ms fully released gap, including exact boundaries',()=>{
 for(const [delay,expected]of [[299,'miss'],[300,'just']]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true);const due=g.state().attackAt,first=due-400;
  g.clock(first);g.parry();g.clock(first+delay);g.parry();g.frame(due+1);assert.equal(g.state().lastStrikeKind,expected,'recovery '+delay);
 }
 for(const [gap,expected]of [[119,'miss'],[120,'just']]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true);const due=g.state().attackAt;
  g.clock(due-600);g.hold();g.clock(due-100-gap);g.release();g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
  assert.equal(g.state().lastStrikeKind,expected,'release gap '+gap);
 }
});

test('all fingers and keys share re-arm state, duplicate releases cannot shorten it, and rejected presses can still hold guard',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true);const due=g.state().attackAt;
 g.clock(due-500);g.hold(1);g.hold(2);g.keyDown();
 g.clock(due-300);g.release(1);g.keyUp();assert.equal(g.state().guardHeld,true);
 g.clock(due-150);g.release(2);g.release(77);g.keyUp();assert.equal(g.state().guardHeld,false);
 g.clock(due-101);g.keyDown();g.frame(due+1);
 assert.equal(g.state().lastStrikeKind,'guard','blocked fresh parry still becomes defense after its 100ms startup');
 assert.equal(g.state().parryAnimAt,due-500,'secondary keys and pointer edges cannot restart the first attempt');
 const h=makeHarness({},true);h.dev().launch(5,'guardian:normal',true);const hit=h.state().attackAt;
 h.clock(hit-400);h.parry();h.clock(hit-150);h.hold();assert.equal(h.state().parryCooldownRemaining,50);
 h.frame(hit+1);assert.equal(h.state().lastStrikeKind,'guard');
});

test('parry success cancels recovery at contact, and intended inputs still succeed across every enemy fast pattern',()=>{
 for(const e of P.all){
  const g=makeHarness({},true);g.dev().launch(80,e.bookKey||e.id+(e.rare?':rare':':normal'),true);
  for(let i=0;i<16;i++){
   const due=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
   assert.equal(g.state().lastStrikeKind,'just',e.id+' intended consecutive hit '+i);assert.equal(g.state().parryCooldownRemaining,0);
  }
 }
});

test('game draws a sword counter only after successful defense, while guard and miss have shield or hurt recoil',async()=>{
 const g=makeHarness({},true,'adopted');g.dev().launch(5,'guardian:normal',true);await g.readyArt(P.byId.guardian);
 for(const kind of ['guard','miss','parry','just']){
  const due=g.state().attackAt;
  if(kind==='guard'){g.clock(due-400);g.hold();}
  else if(kind!=='miss'){g.clock(due-(kind==='just'?100:80));g.parry();}
  g.frame(due+1);g.frame(due+80);g.release();
  assert.equal(g.state().lastStrikeKind,kind);assert.ok(g.heroPose());
  if(['guard','miss'].includes(kind))assert.equal(g.heroPose().action,0);
  else assert.ok(g.heroPose().action>0);
  if(kind==='guard')assert.ok(g.heroPose().push>0);
  if(kind==='miss')assert.ok(g.heroPose().hurt>0);
 }
});

test('metal feedback fires once at collision, respects mute, and developer sound previews do not affect the fight',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true);const due=g.state().attackAt;
 g.clock(g.bloodTest().timingInfo().target);g.parry();assert.equal(g.metalEvents().length,0);g.frame(due+1);g.frame(due+10);
 assert.deepEqual(g.metalEvents().map(e=>e.kind),['just']);assert.ok(Math.abs(g.metalEvents()[0].when-(due+1)/1000-.003)<.00001);
 const state=JSON.stringify(g.state());assert.equal(g.dev().previewSound('guard'),true);assert.equal(JSON.stringify(g.state()),state);
 g.press('audioBtn');assert.equal(g.dev().previewSound('parry'),false);const count=g.metalEvents().length;
 const next=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(next+1);assert.equal(g.metalEvents().length,count);
});
test('developer volume slider matches adopted production, updates three metal sounds live and leaves BGM and combat unchanged',()=>{
 const g=makeHarness({},true),slider=g.el.get('devSfxVolume'),value=g.el.get('devSfxVolumeValue');
 assert.equal(slider.value,'100');assert.equal(value.textContent,'100%');assert.equal(g.dev().getSfxVolume(),100);
 g.dev().launch(5,'guardian:normal',true);g.dev().previewSound('parry');
 const state=JSON.stringify(g.state()),saved=[...g.storage];
 assert.deepEqual({...g.bloodTest().mixGains()},{bgm:.35,steel:1});
 slider.value='27';slider.listeners.input();assert.equal(value.textContent,'27%');
 assert.match(slider['aria-valuetext'],/^27%/);assert.equal(g.dev().getSfxVolume(),27);
 assert.deepEqual({...g.bloodTest().mixGains()},{bgm:.35,steel:.27});
 for(const kind of ['guard','parry','just'])assert.equal(g.dev().previewSound(kind),true);
 const bus=g.metalEvents()[0].destination;
 assert.ok(g.metalEvents().every(event=>event.destination===bus));assert.equal(bus.gain.value,.27);
 const due=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
 assert.equal(g.metalEvents().at(-1).destination,bus,'real collision uses the audition volume');
 assert.equal(g.state().lastStrikeKind,'just');
 slider.value='0';slider.listeners.input();assert.equal(bus.gain.value,0);
 g.press('devSfxOriginal');assert.equal(slider.value,'100');assert.equal(bus.gain.value,1);
 assert.equal(g.bloodTest().mixGains().bgm,.35);
 assert.deepEqual([...g.storage],saved);assert.equal(JSON.parse(state).scoreOrigin,g.state().scoreOrigin);
});
test('developer volume can be shared in a URL, survives resets and is bounded without affecting normal gameplay',()=>{
 const g=makeHarness({},true,'','?sfxVolume=37');assert.equal(g.dev().getSfxVolume(),37);
 g.dev().reset();assert.equal(g.dev().getSfxVolume(),37);
 assert.equal(g.dev().setSfxVolume(-9),0);assert.equal(g.dev().setSfxVolume(999),100);
 assert.equal(g.dev().setSfxVolume(NaN),100);
 const normal=makeHarness();normal.random(.5);normal.press('startBtn');
 const due=normal.state().attackAt;normal.clock(normal.bloodTest().timingInfo().target);normal.parry();normal.frame(due+1);
 assert.equal(normal.dev(),undefined);assert.equal(normal.tailEvents()[0].destination.gain.value,1,'production effects use the player gain at its approved 100% default');
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/devSfxVolume/);
});
test('Dev BGM-only playback schedules all eight themes without combat or saves, and stops cleanly',()=>{
 const g=makeHarness({},true),saved=[...g.storage];
 assert.equal(g.dev().musicList().length,8);
 for(const s of g.dev().musicList()){
  g.clearAudioEvents();assert.equal(g.dev().previewMusic(s.id),true);
  assert.equal(g.state().mode,'title');assert.equal(g.state().enemy,undefined);assert.equal(g.state().bpm,112);
  for(let i=0;i<8;i++)g.frame(g.now+250);
  assert.ok(g.audioEvents().length>0,s.id+' must actually sound');assert.equal(g.dev().musicState().id,s.id);
  assert.ok(g.el.get('devMusicPosition').textContent.includes('112 BPM'));
  assert.equal(g.dev().stopMusic(),true);assert.equal(g.state().scoreActive,false);
  g.clearAudioEvents();g.frame(g.now+1000);assert.equal(g.audioEvents().length,0);
 }
 assert.deepEqual([...g.storage],saved);
});
test('Dev music switching retires the old bus, preserves tempo and supports every zone in invulnerable practice',()=>{
 const g=makeHarness({},true),saved=[...g.storage];
 assert.equal(g.dev().previewMusic('chapel'),true);const oldBus=g.bloodTest().musicBus();
 assert.equal(g.dev().previewMusic('forge','boss'),true);
 assert.equal(oldBus.gain.value,0);assert.notEqual(g.bloodTest().musicBus(),oldBus);assert.equal(g.state().bpm,136);
 for(const s of g.dev().musicList())for(const mode of ['normal','boss']){
  assert.equal(g.dev().practiceMusic(s.id,mode),true);
  assert.equal(g.state().practice,true);assert.equal(g.state().floor,s.from+(mode==='boss'?4:0));
  assert.equal(g.state().bpm,mode==='boss'?136:112);
  assert.equal(g.dev().musicState().audition,false);assert.equal(g.dev().stopMusic(),false,'never stop a live combat clock via the audition stop button');
  const due=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
  assert.equal(g.state().lastStrikeKind,'just',s.id+' still hits the same beat');
 }
 assert.deepEqual([...g.storage],saved);
});
test('Dev BGM buttons, invalid choices, mute, reset and page hiding keep playback exclusive',()=>{
 const g=makeHarness({},true,'','?music=astral&musicMode=boss');
 assert.equal(g.el.get('devMusicTheme').value,'astral');assert.match(g.el.get('devMusicTitle').textContent,/星図/);
 g.press('devMusicPlay');assert.equal(g.state().bpm,136);assert.equal(g.dev().musicState().audition,true);
 g.hide();assert.equal(g.state().scoreActive,false);assert.equal(g.dev().musicState().audition,false);
 assert.equal(g.dev().previewMusic('__proto__'),false);assert.equal(g.dev().previewMusic('forge','invalid'),false);
 g.press('audioBtn');assert.equal(g.dev().previewMusic('forge'),false);g.press('audioBtn');
 g.press('devMusicPractice');assert.equal(g.state().floor,65);assert.equal(g.state().enemy,'star_warden');
 assert.match(g.el.get('devBalanceInfo').textContent,/星界/);
 g.press('devMusicPlay');assert.equal(g.state().mode,'title');g.press('devMusicStop');assert.equal(g.state().scoreActive,false);
 g.press('devMusicPlay');g.dev().launch(5,'guardian:normal',true);assert.equal(g.dev().musicState().audition,false);
 g.dev().reset();assert.equal(g.state().scoreActive,false);
});

test('royal prototype buttons audition 75F and both 80F arrangements at encounter BPM without saves',()=>{
 const g=makeHarness({},true,'','?music=king-march'),saved=[...g.storage];
 assert.equal(g.dev().musicList().length,8);assert.equal(g.dev().musicReviews().length,3);
 assert.equal(g.el.get('devMusicRoom').open,true);
 for(const [button,id,bpm]of [['devRoyalMarch','king-march',136],['devRoyalAwakening','king-awakening',142],['devRoyalFinale','king-finale',142]]){
  g.clearAudioEvents();g.press(button);
  assert.equal(g.state().mode,'title');assert.equal(g.state().bpm,bpm);
  assert.equal(g.dev().musicState().id,id);assert.equal(g.dev().musicState().bars,16);
  assert.equal(g.el.get('devMusicVariantControl').hidden,true);
  for(let i=0;i<5;i++)g.frame(g.now+100);
  assert.ok(g.audioEvents().some(e=>e.type==='sawtooth'),'new brass and string voices actually reach Web Audio');
  assert.match(g.el.get('devMusicPosition').textContent,/16小節/);
  g.press('devMusicStop');assert.equal(g.state().scoreActive,false);
 }
 assert.deepEqual([...g.storage],saved);
 g.dev().launch(80,'endking:elite',true);
 assert.equal(g.dev().musicState().id,'king-awakening','ordinary Dev launch uses the adopted final boss music');
 assert.equal(g.state().bpm,142);
 assert.match(fs.readFileSync('index.html','utf8'),/final-boss-music/,'adopted music loads in production');
});

test('royal music practice keeps actual 75F/80F enemies, pause, phase transition and four count-in drums',()=>{
 const g=makeHarness({},true),saved=[...g.storage];
 for(const [id,floor,key,bpm]of [['king-march',75,'endking:normal',136],['king-awakening',80,'endking:elite',142]]){
  assert.equal(g.dev().practiceMusic(id),true);
  assert.equal(g.state().floor,floor);assert.equal(g.state().encounterKey,key);assert.equal(g.state().bpm,bpm);
  g.press('pauseBtn');assert.equal(g.state().mode,'pause');g.press('resumeBtn');
  assert.equal(g.dev().musicState().id,id);assert.equal(g.state().bpm,bpm);
 }
 const hp=g.state().enemyMaxHp;g.bloodTest().setEnemyHp(Math.floor(hp*.49)+100);g.bloodTest().setBaseAttack(1);
 resolveBloodParry(g,20);assert.equal(g.state().bossPhase,2);
 g.clearAudioEvents();g.frame(g.now+1500);
 assert.equal(g.state().phaseStage,'countin');assert.equal(g.audioEvents().length,8);
 const count=g.state();g.clearAudioEvents();
 const musicStart=count.phaseCountStartAt+4*count.beat*1000;
 g.frame(musicStart-100);
 assert.equal(g.state().phaseStage,'countin','lookahead happens before the return');
 assert.ok(g.audioEvents().length>0,'reserve the first music downbeat rather than discard it during count-in');
 assert.ok(g.audioEvents().every(e=>e.time>=musicStart/1000-1e-6),'music never leaks into the four count-in kicks');
 assert.ok(g.audioEvents().some(e=>e.type==='triangle'&&e.frequency===220&&Math.abs(e.time-musicStart/1000)<1e-6),'new arrangement begins with its stomp at the boundary');
 const lead=440*Math.pow(2,(74-69)/12)*Math.pow(2,-4/1200);
 assert.ok(g.audioEvents().some(e=>e.type==='sawtooth'&&Math.abs(e.frequency-lead)<1e-5&&Math.abs(e.time-musicStart/1000)<1e-6),'play bar zero fanfare, matching standalone audition');
 g.frame(musicStart+1);
 for(let i=0;i<4;i++)g.frame(g.now+100);
 assert.equal(g.state().mode,'combat');assert.equal(g.state().bpm,142);
 assert.equal(g.dev().musicState().id,'king-awakening');
 assert.equal(g.dev().musicState().bar,1);
 assert.ok(g.audioEvents().some(e=>e.type==='sawtooth'));
 assert.deepEqual([...g.storage],saved);
 g.dev().reset();g.dev().launch(75,'endking:normal',true);assert.equal(g.dev().musicState().id,'king-march');
});

test('developer invulnerable practice permits unseen enemies but never unlocks or saves them',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:77,runs:3})},g=makeHarness(seed,true);
 const saved=[...g.storage];assert.equal(g.dev().launch(75,'endking:normal',true),true);
 assert.equal(g.state().practice,true);assert.equal(g.state().enemy,'endking');assert.equal(g.state().floor,75);
 for(let i=0;i<4;i++)settleCurrentAttack(g);
 assert.equal(g.state().mode,'combat');assert.equal(g.state().hp,g.state().maxHp);assert.deepEqual([...g.storage],saved);
 assert.equal(g.state().discovered.length,0);assert.match(g.el.get('practiceEnemy').innerHTML,/gem_slime:rare/);
 g.el.get('practiceEnemy').value='guardian:normal';g.el.get('practiceEnemy').listeners.change();assert.equal(g.state().enemy,'guardian');
 assert.deepEqual([...g.storage],saved);
});
test('holding guard reduces 80F boss damage to maxHP 40%; combo decays but is not wiped',()=>{
 const g=makeHarness({},true),d=g.bloodTest();g.dev().launch(80,'endking:elite');
 d.setEnemyHp(999999);d.setMaxHp(205);d.setHp(205);d.setShield(0);d.setCombo(80);
 d.setEnemyAttack(501);
 g.clock(g.state().attackAt-400);g.hold();
 settleCurrentAttack(g);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().hp,123,'maxHP40%=82 guard damage');
 assert.equal(g.state().combo,64,'80 combo loses exactly 20%');
 assert.equal(d.info().charge,0,'guard does not generate ultimate');
 g.release();d.setEnemyAttack(100);
 d.setCombo(4);d.setHp(205);
 g.clock(g.state().attackAt-400);g.hold();
 settleCurrentAttack(g);
 assert.equal(g.state().combo,0,'minimum five-combo penalty');
});
test('held defense is reset on release, cancel, blur, pause, cinematic and new floor',()=>{
 const g=makeHarness({},true),d=g.bloodTest();
 g.dev().launch(75,'endking:normal');
 g.hold();assert.equal(g.state().guardHeld,true);
 g.cancel();assert.equal(g.state().guardHeld,false);
 g.hold();g.hide();
 assert.equal(g.state().guardHeld,false,'background tab releases the held shield');
 assert.equal(g.state().mode,'pause','existing visibility handler auto-pauses combat');
 g.press('resumeBtn');assert.equal(g.state().mode,'combat');
 g.hold();g.blur();assert.equal(g.state().guardHeld,false);
 g.hold();g.press('pauseBtn');
 assert.equal(g.state().mode,'pause','manual pause suspends combat');
 assert.equal(g.state().guardHeld,false);
 g.keyDown('Escape');assert.equal(g.state().mode,'combat');assert.equal(g.state().guardHeld,false);
 g.keyDown();assert.equal(g.state().guardHeld,true);
 g.keyUp();assert.equal(g.state().guardHeld,false);
 g.keyDown();g.keyDown();g.keyUp();assert.equal(g.state().guardHeld,false,'repeated keydown cannot latch guard');
 d.setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().guardHeld,false,'victory stops holding shield');
 const second=makeHarness({},true),sd=second.bloodTest();
 second.dev().launch(80,'endking:elite');
 sd.setEnemyHp(Math.floor(second.state().enemyMaxHp*.4)+100);sd.setBaseAttack(1);
 resolveBloodParry(second,20);
 assert.equal(second.state().mode,'phase');
 assert.equal(second.state().guardHeld,false);
});
test('press at existing just/parry timing beats hold-guard fallback',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();
 d.setEnemyHp(999999);d.setEnemyAttack(40);
 const due=g.state().attackAt;
 g.clock(g.bloodTest().timingInfo().target);g.hold();
 g.frame(due+1);
 assert.equal(g.state().hp,65,'on-time press triggers parry, no guard damage');
 assert.ok(g.state().combo>=1);
 g.release();
});

test('combo HUD and floor entry title have non-overlapping, stable lanes on desktop and mobile',()=>{
 for(const [width,height] of [[800,500],[320,355],[260,345]]){
  const g=makeHarness({},true),d=g.bloodTest();
  g.resize(width,height);
  g.dev().launch(11,'sentinel:normal');
  d.setCombo(42);
  d.clearHudDrawLabels();
  g.frame(g.now+20);
  const labels=d.hudDrawLabels();
  const floor=labels.find(x=>x.label==='FLOOR 11');
  const combo=labels.find(x=>x.label==='×42 COMBO');
  assert.ok(floor&&combo,'both titles render on floor entry at '+width+'×'+height);
  assert.ok(combo.y+combo.size/2+5<floor.y-floor.size/2,
   'at least 5px visible clearance between combo and floor title at '+width+'×'+height);
  d.clearHudDrawLabels();
  g.frame(g.now+1400);
  const after=d.hudDrawLabels();
  assert.equal(after.some(x=>x.label.startsWith('FLOOR ')),false,'floor hint expires');
  assert.equal(after.find(x=>x.label==='×42 COMBO')?.y,combo.y,
   'combo remains at a fixed y when the floor title disappears');
 }
});

test('legacy 5/5 purchases continue seamlessly through v0.9.3 new tiers, then stop at cap',()=>{
 const prev={coins:10000,life:5,attack:5,ward:5,bestFloor:60,runs:25};
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify(prev)});
 g.press('upgradeOpenBtn');g.upgradeTab('base');
 let html=g.el.get('upgradeList').innerHTML;
 assert.match(html,/生命の祝福[^]*?Lv.5\/12/);
 assert.match(html,/剣の研鑽[^]*?Lv.5\/8/);
 assert.match(html,/守護の祈り[^]*?Lv.5\/12/);
 assert.match(html,/現在：最大HP \+50 → Lv.6：\+60/);
 assert.match(html,/現在：基礎反撃ダメージ \+15 → Lv.6：\+17/);
 assert.match(html,/現在：初期障壁 \+40 → Lv.6：\+48/);
 assert.match(html,/class="upgrade-progress" role="progressbar"/);
 g.upgradeBuy('legacy','life');
 g.upgradeBuy('legacy','attack');
 g.upgradeBuy('legacy','ward');
 assert.equal(g.state().souls,9650,'first extra HP/attack/ward tiers cost 100+150+100');
 for(let i=0;i<6;i++){g.upgradeBuy('legacy','life');g.upgradeBuy('legacy','ward')}
 for(let i=0;i<2;i++)g.upgradeBuy('legacy','attack');
 const expected=10000-((1740-230)*2)-(875-230);
 assert.equal(g.state().souls,expected);
 const saved=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
 assert.deepEqual([saved.life,saved.attack,saved.ward],[12,8,12]);
 assert.equal(saved.bestFloor,60);
 assert.equal(saved.runs,25);
 assert.deepEqual(JSON.parse(g.storage.get('parryTowerPermanent_v1')),{...PR.defaults(),skinRecords:{normal:{bestFloor:60,bestCombo:0,runs:25}}},
  'legacy upgrades preserve equipment and migrate only the pre-skin normal record');
 html=g.el.get('upgradeList').innerHTML;
 assert.match(html,/Lv.12\/12/);
 assert.match(html,/Lv.8\/8/);
 assert.match(html,/最大強化/);
 assert.equal((html.match(/>MAX<\/button>/g)||[]).length,3);
 assert.equal((html.match(/aria-valuenow="12"/g)||[]).length,2);
 assert.equal((html.match(/aria-valuenow="8"/g)||[]).length,1);
 g.upgradeBuy('legacy','life');g.upgradeBuy('legacy','attack');g.upgradeBuy('legacy','ward');
 g.upgradeBuy('legacy','invalid');
 assert.equal(g.state().souls,expected,'a maxed or unknown upgrade cannot spend currency');
 g.press('upgradeCloseBtn');g.press('startBtn');
 assert.equal(g.state().maxHp,185,'12 HP levels give +120 HP');
 assert.equal(g.state().shield,96,'12 ward levels give +96 initial shield');
 assert.equal(g.state().souls,expected);
 const d=g.bloodTest();
 assert.equal(d.info().baseAtk,46,'five original +3 and three new +2 levels give 25+21 attack');
 d.setEnemyHp(100000);d.setCombo(0);
 resolveBloodParry(g,20);
 assert.ok(g.state().enemyHp<100000,'new attack tiers preserve normal parry damage');
});
test('new base tiers stay affordable only at exact price and maintain old first five prices',()=>{
 const seed={'parryTowerPrototype_v1':JSON.stringify({coins:99,life:5})};
 const g=makeHarness(seed);g.press('upgradeOpenBtn');g.upgradeTab('base');
 g.upgradeBuy('legacy','life');
 assert.equal(g.state().souls,99,'99 cannot buy the 100-cost sixth tier');
 const fresh=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:8})});
 fresh.press('upgradeOpenBtn');fresh.upgradeTab('base');fresh.upgradeBuy('legacy','life');
 assert.equal(fresh.state().souls,0,'existing level 1 price remains 8');
 assert.equal(JSON.parse(fresh.storage.get('parryTowerPrototype_v1')).life,1);
});
test('old meta values survive load, excess levels are capped, and dev edits stay read-only',()=>{
 const seeded={coins:1000,life:11,attack:5,ward:12,bestFloor:42,bestCombo:87,runs:9};
 const seed={'parryTowerPrototype_v1':JSON.stringify(seeded)};
 const normal=makeHarness(seed);
 normal.press('startBtn');
 assert.equal(normal.state().maxHp,175);
 assert.equal(normal.state().shield,96);
 const dev=makeHarness(seed,true);
 dev.press('upgradeOpenBtn');dev.upgradeTab('base');dev.upgradeBuy('legacy','life');
 assert.equal(dev.storage.get('parryTowerPrototype_v1'),JSON.stringify(seeded));
 assert.equal(dev.state().souls,640,'level 12 costs 360 shards');
 const invalid=makeHarness({'parryTowerPrototype_v1':JSON.stringify({life:999,ward:999,attack:999,coins:10})});
 invalid.press('startBtn');
 assert.equal(invalid.state().maxHp,185);
 assert.equal(invalid.state().shield,96);
});

function loseRun(g){
 if(g.state().mode==='title')g.press('startBtn');
 for(let i=0;i<12&&g.state().mode==='combat';i++)settleCurrentAttack(g);
 assert.equal(g.state().mode,'gameover','player must eventually die without parries');
}
test('v0.9.3 phase 2 shop expands only recovery, boss shield and soul gain, leaving older prices intact',()=>{
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:2200}),
  'parryTowerPermanent_v1':JSON.stringify({regen:3,bossWard:3,soulGain:3})});
 g.press('upgradeOpenBtn');g.upgradeTab('base');
 const before=g.el.get('upgradeList').innerHTML;
 for(const [name,max] of [['再生力',5],['守護の備え',6],['魂の共鳴',5]]){
  assert.match(before,new RegExp(name+'[^]*?Lv.3/'+max));
 }
 for(const [id,n] of [['regen',2],['bossWard',3],['soulGain',2]])
  for(let i=0;i<n;i++)g.upgradeBuy('extra',id);
 assert.equal(g.state().souls,2200-(80+140+90+155+235+150+225));
 assert.equal(g.state().permanent.regen,5);
 assert.equal(g.state().permanent.bossWard,6);
 assert.equal(g.state().permanent.soulGain,5);
 const saved=JSON.parse(g.storage.get('parryTowerPermanent_v1'));
 assert.deepEqual([saved.regen,saved.bossWard,saved.soulGain],[5,6,5]);
 const after=g.el.get('upgradeList').innerHTML;
 assert.match(after,/階層クリア時 HP 20%回復/);
 assert.match(after,/ボス戦開始時 障壁 \+55/);
 assert.match(after,/獲得する魂の欠片 \+25%/);
 const coins=g.state().souls;
 for(const id of ['regen','bossWard','soulGain'])g.upgradeBuy('extra',id);
 assert.equal(g.state().souls,coins,'MAX upgrades never spend souls');
 const dev=makeHarness({'parryTowerPermanent_v1':JSON.stringify(saved)},true);
 assert.equal(dev.dev().launch(5,'guardian:normal'),true);
 assert.equal(dev.state().shield,55,'boss receives new +55 ward');
});
test('fifth regeneration tier heals 20% after clearing a floor',()=>{
 const seed={'parryTowerPermanent_v1':JSON.stringify({regen:5})};
 const g=makeHarness(seed);g.press('startBtn');
 const d=g.bloodTest();
 settleCurrentAttack(g);
 assert.equal(g.state().hp,51);
 d.setEnemyHp(1);
 resolveBloodParry(g,20);
 assert.equal(g.state().mode,'victory');
 assert.equal(g.state().hp,64,'65 max HP regains ceil(65*.20)=13 on floor clear');
});
test('rescue payments at 3, 8, and 15 defeated attempts are one-time and use saved run count',()=>{
 const cases=[
  {runs:2,mask:0,bonus:20,nextMask:1},
  {runs:7,mask:1,bonus:35,nextMask:3},
  {runs:14,mask:3,bonus:60,nextMask:7},
  {runs:25,mask:0,bonus:115,nextMask:7},
  {runs:25,mask:7,bonus:0,nextMask:7}
 ];
 for(const item of cases){
  const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({
   coins:100,runs:item.runs,rescueClaimMask:item.mask,life:0,attack:0,ward:0
  })});
  assert.equal(g.state().souls,100,'old save is not unexpectedly changed on page load');
  loseRun(g);
  const result=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
  assert.equal(result.runs,item.runs+1);
  assert.equal(result.rescueClaimMask,item.nextMask);
  assert.equal(result.coins,103+item.bonus,'floor one death grants 3 basic plus fixed rescue reward');
  if(item.bonus){
   assert.match(g.el.get('deathSummary').innerHTML,new RegExp('累計挑戦ボーナス \\+'+item.bonus));
  }else{
   assert.doesNotMatch(g.el.get('deathSummary').innerHTML,/累計挑戦ボーナス/);
  }
  g.frame(g.now+500);g.press('retryBtn');
  loseRun(g);
  const again=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
  assert.equal(again.coins,106+item.bonus,'same milestone never pays twice');
  assert.equal(again.rescueClaimMask,item.nextMask);
 }
});
test('rescue grants are separate from soul gain and developer mode never persists them',()=>{
 const permanent=JSON.stringify({soulGain:5});
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:0,runs:2}),
  'parryTowerPermanent_v1':permanent});
 loseRun(g);
 const save=JSON.parse(g.storage.get('parryTowerPrototype_v1'));
 assert.equal(save.coins,24,'ceil(3*1.25)=4 base plus flat 20 rescue');
 const prev=JSON.stringify({coins:70,runs:14,rescueClaimMask:3});
 const dev=makeHarness({'parryTowerPrototype_v1':prev,'parryTowerPermanent_v1':permanent},true);
 loseRun(dev);
 assert.equal(dev.storage.get('parryTowerPrototype_v1'),prev,'developer never writes rescue reward');
});

test('base upgrade panel advertises run milestones and updates claimed states after defeat',()=>{
 const g=makeHarness({'parryTowerPrototype_v1':JSON.stringify({coins:0,runs:2})});
 g.press('upgradeOpenBtn');g.upgradeTab('base');
 const early=g.el.get('upgradeList').innerHTML;
 assert.match(early,/累計挑戦応援（現在 2回）/);
 assert.match(early,/○ 未受取 3回：\+20 ✧/);
 assert.match(early,/○ 未受取 8回：\+35 ✧/);
 assert.match(early,/○ 未受取 15回：\+60 ✧/);
 g.press('upgradeCloseBtn');loseRun(g);
 g.frame(g.now+500);g.press('deathUpgradeBtn');g.upgradeTab('base');
 const after=g.el.get('upgradeList').innerHTML;
 assert.match(after,/累計挑戦応援（現在 3回）/);
 assert.match(after,/✓ 受取済 3回：\+20 ✧/);
 assert.match(after,/○ 未受取 8回：\+35 ✧/);
});


test('production music follows every zone boundary and repeats with the existing tower map',()=>{
 const g=makeHarness();g.random(.5);g.press('startBtn');
 const themes=require('../assets/stage-music').themes;
 for(const cycle of [0,80])for(const theme of themes)for(const floor of [theme.from+cycle,theme.to+cycle]){
  g.bloodTest().jumpFloor(floor);assert.equal(g.state().mode,'combat');
  const expected=P.findByKey(g.state().encounterKey).finalBoss?'king-awakening':theme.id;
  assert.equal(g.bloodTest().musicTheme(),expected,'floor '+floor);
  const enemy=P.findByKey(g.state().encounterKey),bpm=(enemy.boss?136:enemy.kind==='rogue'?124:112)+(enemy.elite?6:0);
  assert.equal(g.state().bpm,bpm);assert.equal(g.bloodTest().mixGains().bgm,.35);
  if(!theme.original)assert.ok(g.el.get('trackLabel').textContent.includes(require('../assets/final-boss-music').get(expected)?.name||theme.name));
  const due=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);
  assert.equal(g.state().lastStrikeKind,'just','same hit clock on '+floor);
 }
});

test('adopted production music survives pause and Dev ordinary launch returns to automatic stage selection',()=>{
 const g=makeHarness();g.press('startBtn');g.bloodTest().jumpFloor(51);
 const oldBus=g.bloodTest().musicBus();g.press('pauseBtn');
 assert.equal(g.state().scoreActive,false);assert.equal(oldBus.gain.value,0);
 g.press('resumeBtn');assert.equal(g.bloodTest().musicTheme(),'frost');
 assert.notEqual(g.bloodTest().musicBus(),oldBus);assert.equal(g.state().bpm,112);
 const d=makeHarness({},true);d.dev().previewMusic('void','boss');
 d.dev().launch(11,'rogue:normal',true);
 assert.equal(d.dev().musicState().id,'barracks');assert.equal(d.state().bpm,124);
 assert.equal(d.dev().musicState().audition,false);
 assert.equal(d.dev().launch(25,P.zoneForFloor(25).boss+':normal',true),true);
 assert.equal(d.dev().musicState().id,'chapel');
});


test('bonus tab requires exactly 1000 fragments, unlocks once and persists free on/off switches across reloads',()=>{
 const key='parryTowerPrototype_v1',perm='parryTowerPermanent_v1';
 const poor=makeHarness({[key]:JSON.stringify({coins:999})});poor.press('upgradeOpenBtn');poor.upgradeTab('bonus');
 assert.match(poor.el.get('upgradeList').innerHTML,/>1000 ✧<\/button>/);assert.doesNotMatch(poor.el.get('upgradeList').innerHTML,/で解放/);assert.match(poor.el.get('upgradeList').innerHTML,/disabled/);
 poor.upgradeBuy('bonus-toggle','legacyVisual');poor.upgradeBuy('bonus-buy','__proto__');poor.upgradeBuy('bonus-buy','legacyVisual');
 assert.equal(poor.state().souls,999);assert.equal(poor.state().permanent.unlockedExtras.length,0);
 const rich=makeHarness({[key]:JSON.stringify({coins:3000})});rich.press('upgradeOpenBtn');rich.upgradeTab('bonus');
 rich.upgradeBuy('bonus-buy','legacyVisual');rich.upgradeBuy('bonus-buy','legacyVisual');assert.equal(rich.state().souls,2000,'owned item cannot charge again even with enough funds');
 const g=makeHarness({[key]:JSON.stringify({coins:1000,life:2,bestFloor:24})});
 g.upgradeBuy('bonus-buy','legacyVisual');assert.equal(g.state().souls,1000,'purchase only in shop');
 g.press('upgradeOpenBtn');g.upgradeTab('bonus');assert.match(g.el.get('upgradeTabs').innerHTML,/data-tab="bonus"/);
 g.upgradeBuy('bonus-buy','legacyVisual');assert.equal(g.state().souls,0);assert.equal(g.state().permanent.unlockedExtras[0],'legacyVisual');
 assert.equal(g.state().permanent.enabledExtras.length,0,'purchase starts OFF');
 g.upgradeBuy('bonus-buy','legacyVisual');assert.equal(g.state().souls,0,'no repeat charge');
 assert.match(g.el.get('upgradeList').innerHTML,/購入済み · OFF/);
 g.upgradeBuy('bonus-toggle','legacyVisual');assert.equal(g.artMode(),'legacy');assert.equal(g.state().souls,0);
 assert.match(g.el.get('upgradeList').innerHTML,/aria-pressed="true"/);
 let saved=JSON.parse(g.storage.get(perm));assert.deepEqual(saved.enabledExtras,['legacyVisual']);
 const reload=makeHarness(Object.fromEntries(g.storage));assert.equal(reload.artMode(),'legacy');
 reload.press('upgradeOpenBtn');reload.upgradeTab('bonus');reload.upgradeBuy('bonus-toggle','legacyVisual');
 assert.equal(reload.artMode(),'illustrated');assert.equal(reload.state().souls,0);
 saved=JSON.parse(reload.storage.get(perm));assert.deepEqual(saved.unlockedExtras,['legacyVisual']);assert.deepEqual(saved.enabledExtras,[]);
 const meta=JSON.parse(reload.storage.get(key));assert.equal(meta.life,2);assert.equal(meta.bestFloor,24);
});

test('legacy bonus changes both renderers while preserving combat and BGM; switching off restores adopted art',async()=>{
 const key='parryTowerPermanent_v1',owned={unlockedExtras:['legacyVisual'],enabledExtras:['legacyVisual']};
 const seed={[key]:JSON.stringify(owned)},legacy=makeHarness(seed,true,'adopted'),current=makeHarness({},true,'adopted');
 for(const g of [legacy,current]){await g.readyArt(P.byId.guardian);g.dev().launch(5,'guardian:normal',true);await g.readyArt(P.byId.guardian);}
 for(const g of [legacy,current]){const due=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(due+1);}
 assert.deepEqual(legacy.artDrawCounts(),{hero:0,enemy:0});assert.ok(current.artDrawCounts().hero>0);assert.ok(current.artDrawCounts().enemy>0);
 for(const name of ['mode','enemy','hp','bpm','attackAt','lastStrikeKind','enemyHp'])assert.equal(legacy.state()[name],current.state()[name],name);
 assert.deepEqual(legacy.audioEvents(),current.audioEvents());
 const before=[...legacy.storage];legacy.dev().reset();legacy.press('upgradeOpenBtn');legacy.upgradeTab('bonus');legacy.upgradeBuy('bonus-toggle','legacyVisual');
 legacy.press('upgradeCloseBtn');legacy.dev().launch(5,'guardian:normal',true);await legacy.readyArt(P.byId.guardian);legacy.frame(legacy.now+1);
 assert.ok(legacy.artDrawCounts().hero>0);assert.ok(legacy.artDrawCounts().enemy>0);assert.deepEqual([...legacy.storage],before,'Dev never writes bonus preferences');
});


test('additional bonus purchases and color selection remain independent and persist through normal shop operations',()=>{
 const key='parryTowerPrototype_v1',perm='parryTowerPermanent_v1',g=makeHarness({[key]:JSON.stringify({coins:2500})});
 g.press('upgradeOpenBtn');g.upgradeTab('bonus');g.upgradeOption('slashTint','jade');assert.equal(g.state().permanent.extraOptions.slashTint,'crimson');
 assert.match(g.el.get('upgradeList').innerHTML,/コンボの残光/);assert.match(g.el.get('upgradeList').innerHTML,/data-bonus-sample="slashTint"/);
 for(const id of ['slashTint','comboGlow'])g.upgradeBuy('bonus-buy',id);assert.equal(g.state().souls,800);
 for(const id of ['slashTint','comboGlow'])g.upgradeBuy('bonus-toggle',id);
 g.upgradeOption('slashTint','violet');assert.equal(g.state().permanent.extraOptions.slashTint,'violet');
 g.upgradeOption('slashTint','missing');assert.equal(g.state().permanent.extraOptions.slashTint,'violet');
 g.upgradeBuy('bonus-toggle','slashTint');assert.deepEqual([...g.state().permanent.enabledExtras],['comboGlow']);
 const reloaded=makeHarness(Object.fromEntries(g.storage));assert.equal(reloaded.state().permanent.extraOptions.slashTint,'violet');assert.equal(reloaded.state().souls,800);
 assert.deepEqual(JSON.parse(g.storage.get(perm)).unlockedExtras,['slashTint','comboGlow']);
});

test('equipped dye reaches the actual hero crescent and combo glow is drawn without changing combat or audio',async()=>{
 for(const legacy of [false,true]){
  const active=['slashTint','comboGlow',...(legacy?['legacyVisual']:[])],perm={unlockedExtras:active,enabledExtras:active,extraOptions:{slashTint:'violet'}};
  const g=makeHarness({parryTowerPermanent_v1:JSON.stringify(perm)},true,'adopted'),control=makeHarness({parryTowerPermanent_v1:JSON.stringify(legacy?{unlockedExtras:['legacyVisual'],enabledExtras:['legacyVisual']}:{})},true,'adopted');
  for(const h of [g,control]){await h.readyArt(P.byId.guardian);h.dev().launch(5,'guardian:normal',true);await h.readyArt(P.byId.guardian);h.bloodTest().setEnemyHp(100000);h.bloodTest().setCombo(50);const due=h.state().attackAt;h.clock(h.bloodTest().timingInfo().target);h.parry();h.frame(due+110);}
  assert.ok(g.bonusArtEvents().some(e=>e.kind==='slashTint'&&e.tint==='violet'),legacy?'legacy wave':'painted hero wave');
  assert.ok(g.bonusArtEvents().some(e=>e.kind==='comboGlow'&&e.tier===3));
  assert.ok(!control.bonusArtEvents().some(e=>e.kind==='comboGlow'));
  for(const name of ['mode','combo','hp','enemyHp','attackAt','bpm','lastStrikeKind'])assert.equal(g.state()[name],control.state()[name],name);
  assert.deepEqual(g.audioEvents(),control.audioEvents());
 }
});


test('skin shop keeps artwork previews and one purchase or equip button per card without trial controls',()=>{
 const seed={parryTowerPrototype_v1:JSON.stringify({coins:2345}),parryTowerPermanent_v1:JSON.stringify({unlockedSkins:['chick'],equippedSkin:'chick',unlockedExtras:['slashTint'],enabledExtras:['slashTint'],extraOptions:{slashTint:'jade'}})};
 const g=makeHarness(seed),saved=[...g.storage],initial=JSON.stringify(g.state().permanent);
 g.press('upgradeOpenBtn');g.upgradeTab('bonus');g.upgradeBuy('bonus-section','skins');
 const html=g.el.get('upgradeList').innerHTML,cards=[...html.matchAll(/<article class="skin-card ([^"]*)"[^>]*>([\s\S]*?)<\/article>/g)];
 assert.equal(cards.length,4);
 for(const [i,card]of cards.entries()){
  const skin=PR.SKINS[i],owned=['normal','chick'].includes(skin.id),body=card[2];
  assert.ok(body.includes('data-skin-sample="'+skin.id+'"'),'standing artwork stays visible');
  const buttons=[...body.matchAll(/<button[^>]*data-action="([^"]+)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(buttons.map(b=>[b[1],b[2]]),[[owned?'skin-equip':'skin-buy',owned?'装備する':skin.cost+' ✧']]);
  assert.equal(card[1]==='selected',skin.id==='chick','outline follows equipped skin');
  assert.doesNotMatch(body,/<a |プレビュー|効果あり|装備中|skin-ready|skin-tag|skin-card-top/);
 }
 assert.doesNotMatch(html,/skin-price|skin-sale|購入する|欠片<\/strong>/);assert.match(html,/>600 ✧<\/button>/);
 g.upgradeBuy('skin-preview','fundoshi');g.upgradeBuy('bonus-section','invalid');
 assert.equal(g.el.get('upgradeList').innerHTML,html);
 assert.equal(g.state().souls,2345);assert.equal(JSON.stringify(g.state().permanent),initial);assert.deepEqual([...g.storage],saved);
 g.upgradeBuy('bonus-section','items');assert.match(g.el.get('upgradeList').innerHTML,/data-action="bonus-buy"/);
});

test('all real Dev skin renderers preserve combat, score, damage and saves across guard, hit and counterattack',async()=>{
 for(const skin of PR.SKINS){
  const g=makeHarness({},true,'adopted'),control=makeHarness({},true,'adopted');
  for(const h of [g,control]){await h.readyArt(P.byId.guardian);h.random(.5);}
  g.dev().launch(5,'guardian:normal',true,skin.id);control.dev().launch(5,'guardian:normal',true);
  await g.readyArt(P.byId.guardian);await control.readyArt(P.byId.guardian);
  assert.equal(g.dev().previewSkin(),skin.id);
  for(const kind of ['just','guard','miss','parry']){
   for(const h of [g,control]){
    const due=h.state().attackAt;h.frame(due-280);h.frame(due-160);
    if(['just','parry'].includes(kind)){h.clock(due-(kind==='just'?100:80));h.parry()}
    else if(kind==='guard'){h.clock(due-150);h.hold()}
    h.frame(due+1);h.release();h.frame(due+110);
   }
   assert.equal(g.heroSkin(),skin.id);assert.ok(g.artDrawCounts().hero>0);
   assert.deepEqual(JSON.parse(JSON.stringify(g.state())),JSON.parse(JSON.stringify(control.state())),skin.id+' / '+kind);
   assert.deepEqual(g.audioEvents(),control.audioEvents());assert.deepEqual([...g.storage],[...control.storage]);
  }
 }
});

test('Dev skin URLs populate the selector and the launch button waits for new skin artwork before starting',async()=>{
 const g=makeHarness({},true,'adopted','?floor=5&enemy=guardian&practice=1&skin=fundoshi');await g.readyArt(P.byId.guardian);
 assert.equal(g.el.get('devSkin').value,'fundoshi');g.press('devLaunch');
 assert.equal(g.state().mode,'loading');assert.equal(g.state().scoreActive,false);
 await g.readyArt(P.byId.guardian);assert.equal(g.state().mode,'combat');g.frame(g.now+1);
 assert.equal(g.heroSkin(),'fundoshi');assert.ok(g.artDrawCounts().hero>0);assert.equal(g.storage.size,0);
});

test('skin purchases charge approved prices once, preserve currency on failure, equip one costume and survive reload',()=>{
 const g=makeHarness({parryTowerPrototype_v1:JSON.stringify({coins:1300,bestFloor:12,bestCombo:18,runs:4})});
 g.press('upgradeOpenBtn');g.upgradeTab('bonus');g.upgradeBuy('bonus-section','skins');
 g.upgradeBuy('skin-buy','chick');assert.equal(g.state().souls,1250);assert.equal(g.state().permanent.equippedSkin,'chick');
 g.upgradeBuy('skin-buy','chick');assert.equal(g.state().souls,1250);
 g.upgradeBuy('skin-buy','fundoshi');assert.equal(g.state().souls,650);g.upgradeBuy('skin-buy','spacetime');assert.equal(g.state().souls,50);
 assert.equal(g.state().permanent.equippedSkin,'spacetime');assert.deepEqual(Array.from(g.state().permanent.unlockedSkins),['chick','fundoshi','spacetime']);
 g.press('upgradeCloseBtn');assert.doesNotMatch(g.el.get('titleRecords').innerHTML,/時空のスキン/);assert.match(g.el.get('titleRecords').innerHTML,/最高到達 <b>0F<\/b>/);g.press('upgradeOpenBtn');g.upgradeTab('bonus');g.upgradeBuy('bonus-section','skins');
 const saved=[...g.storage];g.upgradeBuy('skin-buy','__proto__');assert.deepEqual([...g.storage],saved);
 const reload=makeHarness(Object.fromEntries(g.storage));assert.equal(reload.state().permanent.equippedSkin,'spacetime');
 assert.equal(reload.state().permanent.skinRecords.normal.bestFloor,12,'old record migrated');
 g.upgradeBuy('skin-equip','normal');assert.equal(g.state().souls,50);assert.equal(g.state().permanent.equippedSkin,'normal');
 const poor=makeHarness({parryTowerPrototype_v1:JSON.stringify({coins:49})});poor.press('upgradeOpenBtn');poor.upgradeTab('bonus');poor.upgradeBuy('bonus-section','skins');
 poor.upgradeBuy('skin-buy','chick');poor.upgradeBuy('skin-equip','chick');assert.equal(poor.state().souls,49);assert.equal(poor.state().permanent.equippedSkin,'normal');
 const equipped=makeHarness({parryTowerPermanent_v1:JSON.stringify({unlockedSkins:['chick'],equippedSkin:'chick'})});equipped.press('startBtn');assert.equal(equipped.state().maxHp,98);
 equipped.upgradeBuy('skin-equip','normal');assert.equal(equipped.state().maxHp,98,'changing equipment outside the shop cannot change an active run');
});

test('chick effect scales HP and updated health builds, widens both windows, and leaves input rearm in place',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',false,'chick',true);
 assert.equal(g.state().maxHp,98);assert.equal(g.state().hp,98);assert.equal(g.dev().skinState().parryWindow,93);assert.equal(g.dev().skinState().justWindow,22);
 g.bloodTest().gainSkill('heal');assert.equal(g.state().maxHp,120);assert.equal(g.state().hp,120);
 g.bloodTest().grantRelic('reaper_pact');assert.equal(g.state().maxHp,96);
 g.bloodTest().setSkill('focus',4);g.bloodTest().setSkill('stability',4);assert.equal(g.dev().skinState().justWindow,38);assert.equal(g.dev().skinState().parryWindow,129);
 const due=g.state().attackAt;g.clock(due-200);g.parry();assert.ok(g.state().parryCooldownRemaining>0);g.clock(due-190);g.parry();assert.equal(g.state().parryAnimAt,due-200);
 const visual=makeHarness({},true);visual.dev().launch(5,'guardian:normal',false,'chick',false);assert.equal(visual.state().maxHp,65);assert.equal(visual.dev().skinState().parryWindow,31);
 for(const [delta,kind]of [[20,'just'],[70,'parry']]){
  const h=makeHarness({},true);h.dev().launch(5,'guardian:normal',false,'chick',true);const hit=h.state().attackAt;h.clock(hit-100-delta);h.parry();h.frame(hit+1);assert.equal(h.state().lastStrikeKind,kind);
 }
 const late=makeHarness({},true);late.dev().launch(5,'guardian:normal',false,'chick',true);late.bloodTest().setSkill('stability',4);
 const contact=late.state().attackAt;late.frame(contact+1);assert.equal(late.state().hp,98);
 late.clock(contact+25);late.parry();late.frame(contact+30);assert.equal(late.state().lastStrikeKind,'parry');assert.equal(late.state().hp,98,'full widened late edge remains usable');
});

test('fundoshi fails on guards and hits through barriers, frost, reduction, reflection and revival, but not whiffs or parries',()=>{
 for(const kind of ['guard','miss']){
  const g=makeHarness({parryTowerPermanent_v1:JSON.stringify({revive:1})},true);g.dev().launch(5,'guardian:normal',false,'fundoshi',true);
  const d=g.bloodTest();d.setShield(100000);d.setSkill('frost',6);d.setFrostWard(true);d.setSkill('thorns',5);d.grantRelic('rusty_crest');
  const before=g.state().enemyHp,hit=g.state().attackAt;g.clock(hit-150);if(kind==='guard')g.hold();g.frame(hit+1);
  assert.equal(g.state().mode,'gameover');assert.equal(g.state().hp,0);assert.equal(g.state().reviveUsed,false);assert.equal(g.state().enemyHp,before);
 }
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',false,'fundoshi',true);g.clock(g.now+10);g.parry();assert.equal(g.state().mode,'combat');
 const hit=g.state().attackAt;g.clock(g.bloodTest().timingInfo().target);g.parry();g.frame(hit+1);assert.equal(g.state().lastStrikeKind,'just');assert.equal(g.state().mode,'combat');assert.equal(g.state().hp,65);
 const practice=makeHarness({},true);practice.dev().launch(5,'guardian:normal',true,'fundoshi',true);settleCurrentAttack(practice);assert.equal(practice.state().hp,65);assert.equal(practice.state().mode,'combat');
});

test('spacetime rolls +12,0,-12 per encounter against each base tempo and retains it through pause and restart',()=>{
 for(const elite of [false,true])for(const [id,base]of [['knight',112],['rogue',124],['guardian',136]])for(const [r,offset]of [[.1,12],[.5,0],[.9,-12]]){
  const g=makeHarness({},true);g.random(r);g.dev().launch(5,id+(elite?':elite':':normal'),false,'spacetime',true);
  assert.equal(g.state().bpm,base+(elite?6:0)+offset);assert.equal(g.dev().skinState().tempoOffset,offset);assert.equal(g.dev().skinState().parryWindow,31);
  const due=g.state().scoreOrigin+g.state().attackBeat*g.state().beat;assert.ok(Number.isFinite(due));assert.equal(g.state().attackSpan,4*60000/(base+(elite?6:0)+offset));
  g.random(.9);g.press('pauseBtn');g.frame(g.now+3000);g.press('pauseBtn');assert.equal(g.state().bpm,base+(elite?6:0)+offset);assert.equal(g.dev().skinState().tempoOffset,offset);
  g.bloodTest().jumpFloor(5);const next=P.findByKey(g.state().encounterKey),nextBase=(next.boss?136:next.kind==='rogue'?124:112)+(next.elite?6:0);
  assert.equal(g.state().bpm,nextBase-12,'next encounter starts from its own base, not previous tempo');
 }
});

test('spacetime keeps its rolled tempo through the summit second movement',()=>{
 const g=makeHarness({},true);g.random(.1);g.dev().launch(80,'endking:elite',false,'spacetime',true);assert.equal(g.state().bpm,154);
 g.bloodTest().setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);g.bloodTest().setBaseAttack(1);resolveBloodParry(g,20);assert.equal(g.state().phaseStage,'rumble');
 g.random(.9);g.frame(g.now+1500);assert.equal(g.state().phaseStage,'countin');assert.equal(g.state().bpm,154);assert.equal(g.dev().skinState().tempoOffset,12);
 g.frame(g.state().phaseCountStartAt+g.state().beat*4000+1);assert.equal(g.state().mode,'combat');assert.equal(g.state().bpm,154);
});

test('skin records keep normal history and per-costume attempts separate while rewards stay shared',()=>{
 const seed={parryTowerPrototype_v1:JSON.stringify({coins:0,bestFloor:12,bestCombo:19,runs:4}),parryTowerPermanent_v1:JSON.stringify({unlockedSkins:['fundoshi'],equippedSkin:'fundoshi'})};
 const g=makeHarness(seed);g.press('startBtn');settleCurrentAttack(g);assert.equal(g.state().mode,'gameover');
 const p=g.state().permanent;assert.equal(p.skinRecords.normal.bestFloor,12);assert.equal(p.skinRecords.normal.runs,4);assert.equal(p.skinRecords.fundoshi.runs,1);assert.equal(p.skinRecords.fundoshi.bestFloor,1);assert.ok(g.state().souls>0);
 const dev=makeHarness(seed,true);const saved=[...dev.storage];dev.dev().launch(5,'guardian:normal',false,'fundoshi',true);settleCurrentAttack(dev);assert.deepEqual([...dev.storage],saved);
});


function revisitMerchant(g,coins=150){
 const d=g.bloodTest();d.jumpFloor(14);d.setTowerCoins(coins);g.routeSelect('merchant');
 assert.equal(g.state().mode,'room');return d;
}
function buyTarget(g,item,target){g.roomChoose('buy:'+item);g.roomChoose('target:'+target);}

test('v0.9.7 all 24 skills enforce normal caps and exactly two immediate limit breaks per run',()=>{
 const expected={blade:20,thunder:12,ember:10,precision:10,heal:10,aegis:10,blood:8,frost:6,focus:6,stability:6};
 const first=makeCrossroads(),catalog=first.d.skillCatalog();assert.equal(catalog.length,24);
 for(const skill of catalog){
  const {g,d}=makeCrossroads();assert.equal(skill.max,expected[skill.id]||({double:5,tempo:4,fortitude:4,heartbeat:4,overcharge:5,bloodlust:4,king:4}[skill.id]||6),skill.id);
  d.setSkill(skill.id,skill.max);assert.equal(d.gainSkill(skill.id),false);
  d.setTowerCoins(150);g.routeSelect('merchant');
  for(let n=1;n<=2;n++){
   if(n===2)revisitMerchant(g);
   buyTarget(g,'breakthrough',skill.id);
   assert.equal(g.state().runSkills[skill.id],skill.max+n,skill.id);
   assert.equal(g.state().skillBreaks[skill.id],n);
   assert.equal(d.skillCap(skill.id),skill.max+n);
   assert.equal(g.state().towerCoins,90);assert.equal(d.gainSkill(skill.id),false);
   g.roomChoose('target:'+skill.id);assert.equal(g.state().towerCoins,90,'duplicate click free');
  }
  revisitMerchant(g);buyTarget(g,'breakthrough',skill.id);
  assert.equal(g.state().towerCoins,150);assert.equal(g.state().runSkills[skill.id],skill.max+2);
  for(const other of catalog)d.setSkill(other.id,d.skillCap(other.id));
  assert.deepEqual(Array.from(d.rewardPool()),[]);
  d.setSkill(skill.id,skill.max+1);
  assert.deepEqual(Array.from(d.rewardPool()),[skill.id],'all reward pools respect effective cap');
  assert.equal(d.gainSkill(skill.id),true);assert.equal(d.gainSkill(skill.id),false);
  g.dev().launch(1);assert.deepEqual({...g.state().skillBreaks},{});assert.equal(d.skillCap(skill.id),skill.max);
 }
});

test('targeted merchant purchases cancel freely, reject stale/fake targets, recheck funds and consume one visit',()=>{
 const {g,d}=makeCrossroads();d.setSkill('blade',3);d.setTowerCoins(60);g.routeSelect('merchant');
 g.roomChoose('buy:training');assert.equal(g.state().towerCoins,60);
 assert.match(g.el.get('roomActions').innerHTML,/Lv.3 → 4/);
 for(const id of ['unknown','constructor','__proto__']){assert.equal(d.gainSkill(id),false);assert.equal(d.skillCap(id),0);}
 g.roomChoose('target:unknown');g.roomChoose('target:thunder');assert.equal(g.state().towerCoins,60);
 g.roomChoose('back');assert.equal(g.state().roomStage,null);g.roomChoose('buy:constructor');assert.equal(g.state().towerCoins,60);
 g.roomChoose('buy:training');d.setTowerCoins(33);g.roomChoose('target:blade');assert.equal(g.state().runSkills.blade,3);
 d.setTowerCoins(60);d.setSkill('blade',20);g.roomChoose('target:blade');assert.equal(g.state().towerCoins,60);
 g.roomChoose('back');buyTarget(g,'breakthrough','blade');
 assert.equal(g.state().runSkills.blade,21);assert.equal(g.state().towerCoins,0);
 g.roomChoose('buy:elixir');g.roomChoose('target:blade');assert.equal(g.state().charge,0);
 g.roomChoose('continue');assert.equal(g.state().floor,5);
});

test('training raises a chosen owned skill with HP recalculation; exhausted goods are disabled',()=>{
 const {g,d}=makeCrossroads();d.setTowerCoins(100);g.routeSelect('merchant');
 assert.match(g.el.get('roomActions').innerHTML,/data-room-action="buy:training" disabled/);
 assert.match(g.el.get('roomActions').innerHTML,/data-room-action="buy:breakthrough" disabled/);
 assert.match(g.el.get('roomActions').innerHTML,/data-room-action="buy:polish" disabled/);
 g.roomChoose('buy:training');assert.equal(g.state().towerCoins,100);
 d.gainSkill('heal');d.setHp(10);buyTarget(g,'training','heal');
 assert.equal(g.state().runSkills.heal,2);assert.equal(g.state().maxHp,95);assert.equal(g.state().hp,37);assert.equal(g.state().towerCoins,66);
});

test('elixir caps at seven and waits until the next successful counter to trigger ultimate',()=>{
 const {g,d}=makeCrossroads();d.setCharge(6);d.setTowerCoins(50);g.routeSelect('merchant');
 g.roomChoose('buy:elixir');assert.equal(g.state().charge,7);assert.equal(g.state().towerCoins,32);
 assert.equal(d.hits().length,0);g.roomChoose('continue');d.setEnemyHp(100000);
 resolveBloodParry(g,20);assert.equal(d.hits().filter(x=>x.label==='奥義').length,1);assert.equal(g.state().charge,0);
 revisitMerchant(g);d.setCharge(7);g.roomChoose('buy:elixir');assert.equal(g.state().towerCoins,150);
});

test('frost and input windows have bounded useful effects through both limit breaks, including chick late input',()=>{
 for(const [level,percent] of [[6,75],[7,80],[8,85]]){
  const {g,d}=makeRelicFight();d.setSkill('frost',level);d.setFrostWard(true);d.setMaxHp(1000);d.setHp(1000);d.incoming(100);
  assert.equal(g.state().hp,1000-100+percent);assert.equal(g.state().frostWard,false);
  assert.match(d.skillCatalog().find(s=>s.id==='frost').desc(level),new RegExp('-'+percent+'%'));
 }
 for(const [skin,just,parry]of [['normal',27,55],['chick',54,165]]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',false,skin,true);
  const d=g.bloodTest();d.setSkill('focus',8);d.setSkill('stability',8);
  assert.equal(g.dev().skinState().justWindow,just);assert.equal(g.dev().skinState().parryWindow,parry);
 }
 const late=makeHarness({},true);late.dev().launch(5,'guardian:normal',false,'chick',true);
 late.bloodTest().setSkill('stability',8);late.bloodTest().setEnemyHp(100000);
 const due=late.state().attackAt;late.frame(due+64);assert.equal(late.state().lastStrikeKind,'miss');
 late.clock(due+64);late.parry();late.frame(due+66);assert.equal(late.state().lastStrikeKind,'parry');
});

test('every relic can be polished once, previews upgraded copy, survives floors and loses refinement on replacement/new run',()=>{
 const R=require('../assets/relics.js');
 for(const relic of R.RELICS){
  const {g,d}=makeCrossroads();d.grantRelic(relic.id);d.setTowerCoins(100);g.routeSelect('merchant');
  g.roomChoose('buy:polish');assert.match(g.el.get('roomActions').innerHTML,new RegExp(relic.polishedDesc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  g.roomChoose('back');assert.equal(g.state().towerCoins,100);
  buyTarget(g,'polish',relic.id);assert.deepEqual(Array.from(g.state().polishedRelics),[relic.id]);assert.equal(g.state().towerCoins,64);
  assert.ok(g.el.get('relicList').innerHTML.includes(relic.polishedDesc));
  g.roomChoose('continue');assert.equal(g.state().polishedRelics[0],relic.id);
  revisitMerchant(g);buyTarget(g,'polish',relic.id);assert.equal(g.state().towerCoins,150);
  d.grantRelic(R.RELICS.find(r=>r.id!==relic.id).id);d.grantRelic(R.RELICS.find(r=>!g.state().relics.includes(r.id)).id);
  d.awardPreview('boss10');g.relicSelect(g.state().relicOffer[0]);g.relicReplace(relic.id);
  assert.equal(g.state().polishedRelics.includes(relic.id),false);
  g.dev().launch(1);assert.deepEqual(Array.from(g.state().polishedRelics),[]);
 }
});

function polishedFight(id){
 const {g,d}=makeCrossroads();d.grantRelic(id);d.setTowerCoins(100);g.routeSelect('merchant');buyTarget(g,'polish',id);g.roomChoose('continue');
 d.jumpFloor(1);d.setEnemyHp(100000);g.random(.99);return {g,d};
}

test('polished relics apply their improved damage, recovery, shields and guard rules in real combat',()=>{
 let x=polishedFight('rusty_crest');x.d.incoming(10);assert.equal(x.g.state().hp,64);x.d.incoming(10);assert.equal(x.g.state().hp,54);
 x=polishedFight('stardust_whetstone');resolveBloodParry(x.g,20);assert.equal(x.d.hits()[0].dealt,37);
 x=polishedFight('conduit_stone');for(let n=0;n<4;n++)resolveBloodParry(x.g,20);assert.equal(x.d.hits().find(h=>h.label==='雷導').dealt,18);
 x=polishedFight('ember_vial');resolveBloodParry(x.g,20);assert.equal(x.d.relicInfo().burn,5);
 x=polishedFight('pilgrim_bell');x.d.setHp(10);for(let n=0;n<4;n++)resolveBloodParry(x.g,20);assert.equal(x.g.state().hp,16);
 x=polishedFight('broken_gear');x.d.setCharge(6);resolveBloodParry(x.g,20);resolveBloodParry(x.g,20);assert.equal(x.g.state().shield,8);
 x=polishedFight('serene_crystal');for(let n=0;n<3;n++)resolveBloodParry(x.g,0);assert.equal(x.g.state().shield,12);
 x=polishedFight('emperor_conduit');for(let n=0;n<5;n++)resolveBloodParry(x.g,20);assert.equal(x.d.hits().find(h=>h.label==='雷帝').dealt,42);
 x.d.setSkill('thunder',1);x.d.resetHits();resolveBloodParry(x.g,20);assert.ok(x.d.hits().find(h=>h.label==='⚡').dealt>=31);
 x=polishedFight('silver_mirror');x.d.setEnemyAttack(50);resolveBloodParry(x.g,-40);assert.equal(x.g.state().hp,54);
 x=polishedFight('royal_banner');x.d.setCombo(9);resolveBloodParry(x.g,20);assert.equal(x.g.state().shield,15);
 x=polishedFight('blood_pact_chalice');x.d.setHp(40);x.d.incoming(10);resolveBloodParry(x.g,20);assert.equal(x.g.state().hp,42);
 x=polishedFight('golden_festival_bell');x.d.jumpFloor(5);x.d.setEnemyHp(100000);resolveBloodParry(x.g,20);assert.equal(x.d.hits()[0].dealt,33);
 x=polishedFight('stopped_hand');x.d.setCombo(10);x.d.setEnemyAttack(10);resolveBloodParry(x.g,-40);resolveBloodParry(x.g,-40);assert.equal(x.g.state().combo,10);resolveBloodParry(x.g,-40);assert.equal(x.g.state().combo,5);
 x=polishedFight('reaper_pact');assert.equal(x.g.state().maxHp,52);resolveBloodParry(x.g,20);assert.equal(x.d.hits()[0].dealt,38);
 x=polishedFight('duet_mask');resolveBloodParry(x.g,0);x.d.resetHits();resolveBloodParry(x.g,20);assert.equal(x.d.hits().find(h=>h.label==='仮面').dealt,15);
});

test('Dev merchant buttons launch meaningful presets without saving, and ordinary entry exposes no merchant cheat',()=>{
 const g=makeHarness({},true),before=JSON.stringify([...g.storage]);g.dev().launch(1);assert.equal(g.state().scoreActive,true);g.press('devMerchantGrowing');
 assert.equal(g.state().currentRoom,'merchant');assert.equal(g.state().runSkills.blade,3);assert.equal(g.state().towerCoins,150);assert.equal(g.state().scoreActive,false);
 buyTarget(g,'training','blade');assert.equal(g.state().runSkills.blade,4);g.roomChoose('continue');assert.equal(g.state().mode,'combat');assert.equal(g.state().scoreActive,true);
 g.press('devMerchantCapped');buyTarget(g,'breakthrough','focus');assert.equal(g.state().runSkills.focus,7);
 assert.equal(JSON.stringify([...g.storage]),before);
 assert.equal(makeHarness().dev(),undefined);
});


test('tempo levels lower normal and elite shared BPM by two each without adding beats to the rhythm',()=>{
 for(const elite of [false,true])for(const [enemy,base]of [['knight',112],['rogue',124],['guardian',136]])for(let level=0;level<=6;level++){
  const g=makeHarness({},true);g.dev().launch(5,enemy+(elite?':elite':':normal'),true,'normal',true,level);
  const before=g.state();assert.equal(before.bpm,base+(elite?6:0)-level*2);assert.ok(Math.abs(before.attackSpan-4*60000/before.bpm)<1e-6);
  assert.equal(g.dev().skinState().tempoReduction,level*2);
  assert.match(g.el.get('trackLabel').textContent,new RegExp(before.bpm+' BPM'));
  for(const step of P.byId[enemy].rhythm){
   const beat=g.state().attackBeat;resolveBloodParry(g,20);
   assert.equal(g.state().attackBeat-beat,step,'the original rhythm stays intact');
   assert.ok(Math.abs(g.state().attackSpan-step*60000/before.bpm)<1e-6);
  }
 }
});

test('production practice applies elite BPM once across the whole codex and keeps beat contact and windup timing',()=>{
 const entries=P.codexEntries(),book={version:2,seen:Object.fromEntries(entries.map(e=>[e.bookKey,{encounters:1,firstFloor:1}])),defeated:{}};
 const g=makeHarness({parryTowerBestiary_v1:JSON.stringify(book)});assert.equal(g.dev(),undefined);g.press('practiceBtn');
 const saved=[...g.storage];
 for(const e of entries){
  g.clickers.get(e.bookKey)();
  const base=e.boss?136:e.kind==='rogue'?124:112,expected=base+(e.elite?6:0),s=g.state();
  assert.equal(s.bpm,expected,e.bookKey);assert.deepEqual(Array.from(s.enemyRhythm),e.rhythm);
  assert.match(g.el.get('trackLabel').textContent,new RegExp(expected+' BPM'));
  assert.ok(Math.abs(s.attackSpan-4*60000/expected)<1e-6);
  const t=g.bloodTest().timingInfo();assert.ok(Math.abs(t.target-s.attackAt)<1e-6);
  assert.ok(Math.abs(t.windupLead-1.5*60000/expected)<1e-6);
  g.clock(s.attackAt);g.parry();g.frame(s.attackAt+.001);assert.equal(g.state().lastStrikeKind,'just');
  g.press('pauseBtn');g.frame(g.now+1000);g.press('resumeBtn');assert.equal(g.state().bpm,expected,'resume '+e.bookKey);
  g.press('exitPracticeBtn');g.press('practiceBtn');
 }
 assert.deepEqual([...g.storage],saved);
});

test('elite +6 and frozen spacetime/curse modifiers survive current and legacy checkpoints without accumulating',()=>{
 const seed={parryTowerPermanent_v1:JSON.stringify({unlockedSkins:['spacetime'],equippedSkin:'spacetime'})};
 const g=makeHarness(seed);g.random(.1);g.press('startBtn');const d=g.bloodTest();d.setSkill('tempo',6);d.setBreaks('tempo',2);d.jumpFloor(10);
 assert.equal(g.state().encounterElite,true);assert.equal(g.state().bpm,142);
 g.press('pauseBtn');g.press('suspendBtn');const saved=g.storage.get(RUN_KEY);
 for(const legacy of [false,true]){
  const record=JSON.parse(saved);if(legacy)delete record.game.tempoBpmReduction;
  g.storage.set(RUN_KEY,JSON.stringify(record));const re=reloadHarness(g);re.random(.9);re.press('continueBtn');
  assert.equal(re.state().bpm,142);assert.equal(re.state().encounterElite,true);
  assert.ok(Math.abs(re.state().attackSpan-4*60000/142)<1e-6);
  for(let i=0;i<2;i++){re.press('pauseBtn');re.frame(re.now+1000);re.press('resumeBtn');assert.equal(re.state().bpm,142);}
  assert.equal(re.state().runSkills.tempo,6);
 }
});


test('tempo stacks with each spacetime roll once and freezes until the next enemy',()=>{
 for(const [roll,shift]of [[.1,12],[.5,0],[.9,-12]]){
  const g=makeHarness({},true);g.random(roll);g.dev().launch(5,'guardian:normal',true,'spacetime',true,6);
  assert.equal(g.state().bpm,136+shift-12);assert.equal(g.dev().skinState().tempoOffset,shift);
  g.bloodTest().setSkill('tempo',1);g.random(.99);g.press('pauseBtn');g.frame(g.now+1500);g.press('resumeBtn');
  assert.equal(g.state().bpm,136+shift-12,'resume must not reapply or change the encounter reduction');
  g.el.get('practiceEnemy').value='knight:normal';g.el.get('practiceEnemy').listeners.change();
  assert.equal(g.state().bpm,112-12-2,'the next enemy uses the current skill, without accumulating old reductions');
 }
});

test('tempo preserves its shared clock through the boss second movement and keeps audition independent',()=>{
 const g=makeHarness({},true);g.dev().launch(80,'endking:elite',false,'normal',true,6);
 const d=g.bloodTest();d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);d.setBaseAttack(1);resolveBloodParry(g,20);
 assert.equal(g.state().phaseStage,'rumble');g.frame(g.now+1501);
 assert.equal(g.state().phaseStage,'countin');assert.equal(g.state().bpm,130);
 g.frame(g.state().phaseCountStartAt+4*g.state().beat*1000+1);assert.equal(g.state().mode,'combat');assert.equal(g.state().bpm,130);
 assert.equal(g.state().attackSpan,4*60000/130);
 g.dev().previewMusic('crypt','boss');assert.equal(g.state().bpm,136,'BGM-only audition uses the original tempo');
});

test('tempo checkpoint restores the frozen reduction and upgrades old checkpoints without it',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();d.setSkill('tempo',6);d.setBreaks('tempo',2);d.jumpFloor(5);
 assert.equal(g.state().bpm,124);g.press('pauseBtn');g.press('suspendBtn');
 const saved=g.storage.get(RUN_KEY);assert.equal(JSON.parse(saved).game.tempoBpmReduction,12);
 for(const legacy of [false,true]){
  const record=JSON.parse(saved);if(legacy)delete record.game.tempoBpmReduction;
  g.storage.set(RUN_KEY,JSON.stringify(record));const re=reloadHarness(g);re.press('continueBtn');
  assert.equal(re.state().bpm,124);assert.equal(re.state().runSkills.tempo,6);assert.equal(re.state().attackSpan,4*60000/124);
 }
 for(const invalid of [-2,1,14]){
  const record=JSON.parse(saved);record.game.tempoBpmReduction=invalid;g.storage.set(RUN_KEY,JSON.stringify(record));
  assert.equal(reloadHarness(g).el.get('continueBtn').hidden,true);
 }
});

test('Dev tempo selector presets and launches every level without saving',()=>{
 const g=makeHarness({},true,'','?floor=5&enemy=guardian&practice=1&tempo=6'),before=JSON.stringify([...g.storage]);
 assert.equal(g.el.get('devTempo').value,'6');g.press('devLaunch');assert.equal(g.state().bpm,124);assert.equal(g.state().runSkills.tempo,6);assert.equal(g.state().skillBreaks.tempo,2);
 g.el.get('devTempo').value='0';g.press('devLaunch');assert.equal(g.state().bpm,136);assert.equal(g.state().runSkills.tempo,undefined);
 assert.equal(JSON.stringify([...g.storage]),before);
 const equipped=makeHarness({parryTowerPermanent_v1:JSON.stringify({slots:1,unlockedSkills:['tempo'],equipped:['tempo',null]})},true,'','?floor=5&enemy=guardian&tempo=0');
 equipped.dev().launch(5,'guardian:normal');assert.equal(equipped.state().bpm,134,'API callers without an override retain equipped skills');
 equipped.press('devLaunch');assert.equal(equipped.state().bpm,136,'the explicit None selection overrides an equipped curse');
});

test('double remains below certainty at its breakthrough cap',()=>{
 for(const [roll,multiplier]of [[.769,2],[.77,1],[.99,1]]){
  const {g,d}=makeRelicFight();d.setSkill('double',7);g.random(roll);resolveBloodParry(g,20);
  assert.equal(d.hits()[0].dealt,Math.round(25*1.012*multiplier));
 }
});


const RUN_KEY='parryTowerRun_v1',SETTINGS_KEY='parryTowerSettings_v1';
function reloadHarness(g,dev=false){return makeHarness(Object.fromEntries(g.storage),dev)}
test('clock recovery keeps music and attacks advancing when only the output context timestamp freezes',()=>{
 const g=makeHarness({parryTowerInputOffset_v1:'45'});g.random(.5);g.press('startBtn');const d=g.bloodTest(),start=g.now,before=g.state(),ac=d.audioContext();
 const frozen=ac.currentTime;ac.getOutputTimestamp=()=>({contextTime:frozen,performanceTime:g.now});
 for(let t=start+50;t<=start+6000;t+=50)g.frame(t);
 const after=g.state();assert.equal(after.mode,'combat');assert.equal(after.scoreActive,true);
 assert.ok(after.attackBeat>4);assert.ok(after.hp<before.hp);assert.equal(after.clock.source,'audio');assert.ok(after.clock.fallbacks>=1);
 assert.equal(after.encounterKey,before.encounterKey);assert.ok(g.audioEvents().length>20);
 assert.equal(after.offset,45);assert.equal(g.storage.get('parryTowerInputOffset_v1'),'45');
 assert.ok(after.attackAt-g.now<after.attackSpan+200,'attack deadline does not keep escaping');
});
test('clock recovery tolerates throwing, nonfinite or entirely frozen output samples during combat',()=>{
 for(const mode of ['throw','invalid','frozen']){
  const g=makeHarness();g.random(.5);g.press('startBtn');const ac=g.bloodTest().audioContext(),start=g.now;
  ac.getOutputTimestamp=()=>{if(mode==='throw')throw Error('output unavailable');return mode==='invalid'?{contextTime:NaN,performanceTime:Infinity}:{contextTime:start/1000,performanceTime:start};};
  for(let t=start+100;t<=start+4000;t+=100)g.frame(t);
  assert.equal(g.state().mode,'combat');assert.ok(g.state().attackBeat>4);assert.ok(Number.isFinite(g.state().attackAt));assert.equal(g.state().clock.source,'audio');
 }
});
test('clock recovery pauses a stalled audio clock before damage and resumes the same encounter with four beats',()=>{
 const g=makeHarness();g.random(.5);g.press('startBtn');const d=g.bloodTest(),ac=d.audioContext(),start=g.now,before=g.state();
 Object.defineProperty(ac,'currentTime',{configurable:true,get:()=>start/1000});
 for(let t=start+200;t<=start+1400;t+=200)g.frame(t);
 const paused=g.state();assert.equal(paused.mode,'pause');assert.equal(paused.scoreActive,false);assert.equal(paused.hp,before.hp);
 assert.equal(paused.clock.reason,'audio-stalled');assert.equal(paused.clock.pauses,1);assert.equal(g.el.get('pauseStatus').hidden,false);
 Object.defineProperty(ac,'currentTime',{configurable:true,get:()=>g.now/1000});g.press('resumeBtn');
 const resumed=g.state();assert.equal(resumed.mode,'combat');assert.equal(resumed.attackBeat,4);assert.ok(resumed.attackAt>g.now+2000);
 for(const key of ['hp','enemyHp','shield','encounterKey','bpm','souls','towerCoins','skinTempoOffset'])assert.equal(resumed[key],before[key],key);
 assert.equal(g.el.get('pauseStatus').hidden,true);
});
test('clock recovery safely pauses interrupted or closed contexts and recreates a closed context on resume',()=>{
 for(const state of ['interrupted','closed']){
  const g=makeHarness();g.press('startBtn');const ac=g.bloodTest().audioContext(),hp=g.state().hp;ac.state=state;g.frame(g.now+50);
  assert.equal(g.state().mode,'pause');assert.equal(g.state().hp,hp);
  if(state==='interrupted')ac.state='running';g.press('resumeBtn');
  assert.equal(g.state().mode,'combat');assert.ok(g.state().attackAt>g.now+2000);
  if(state==='closed')assert.notEqual(g.bloodTest().audioContext(),ac);
 }
});
test('clock recovery preserves second-movement boss state and restarts its count-in',()=>{
 const g=makeHarness({},true),d=g.bloodTest();g.dev().launch(80,'endking:elite');d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);d.setBaseAttack(1);resolveBloodParry(g,20);
 g.frame(g.now+1501);assert.equal(g.state().phaseStage,'countin');const before=g.state(),ac=d.audioContext();ac.state='interrupted';g.frame(g.now+1);
 assert.equal(g.state().mode,'pause');ac.state='running';g.press('resumeBtn');assert.equal(g.state().mode,'phase');assert.equal(g.state().phaseStage,'countin');
 assert.equal(g.state().bossPhase,2);assert.equal(g.state().enemyHp,before.enemyHp);assert.equal(g.state().hp,before.hp);
 assert.deepEqual(Array.from(g.state().enemyRhythm),Array.from(before.enemyRhythm));
 g.frame((g.state().scoreOrigin+4*g.state().beat)*1000+1);assert.equal(g.state().mode,'combat');assert.equal(g.state().attackBeat,8);
});
test('clock recovery cancels measurement safely when audio stops and leaves the manual offset unchanged',()=>{
 const g=makeHarness({parryTowerInputOffset_v1:'45'});g.press('settingsBtn');g.press('calibrationStart');const d=g.bloodTest(),ac=d.audioContext(),start=g.now;
 Object.defineProperty(ac,'currentTime',{configurable:true,get:()=>start/1000});
 for(let t=start+100;t<=start+1500;t+=100)g.frame(t);
 assert.equal(d.calibrationInfo(),null);assert.equal(g.state().offset,45);assert.equal(g.el.get('calibrationPulse').textContent,'♫');
 assert.match(g.el.get('calibrationStatus').textContent,/中断/);assert.equal(g.storage.get('parryTowerInputOffset_v1'),'45');
});
test('wallet shows independent tower coins and total soul fragments through purchases and defeat rewards',()=>{
 const g=makeHarness({parryTowerPrototype_v1:JSON.stringify({coins:200})});assert.equal(Number(g.el.get('soulFragmentsLabel').textContent),200);
 g.press('upgradeOpenBtn');g.upgradeTab('bonus');g.upgradeBuy('bonus-section','skins');g.upgradeBuy('skin-buy','chick');
 assert.equal(Number(g.el.get('soulFragmentsLabel').textContent),150);g.press('upgradeCloseBtn');g.press('startBtn');g.bloodTest().setTowerCoins(37);
 assert.equal(Number(g.el.get('towerCoinsLabel').textContent),37);assert.equal(Number(g.el.get('soulFragmentsLabel').textContent),150);
 g.bloodTest().setHp(1);settleCurrentAttack(g);assert.equal(g.state().mode,'gameover');
 assert.equal(Number(g.el.get('soulFragmentsLabel').textContent),g.state().souls);assert.ok(g.state().souls>150);
});
test('player settings use current gains at 100%, persist 0-200 independently and pause combat safely',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest(),due=g.state().attackAt;
 g.press('settingsBtn');assert.equal(g.state().mode,'settings');assert.equal(g.state().scoreActive,false);
 g.el.get('bgmVolume').value='200';g.el.get('bgmVolume').listeners.input();
 g.el.get('sfxVolume').value='35';g.el.get('sfxVolume').listeners.input();
 assert.deepEqual({...JSON.parse(g.storage.get(SETTINGS_KEY))},{bgm:200,sfx:35,shake:true,flash:true});
 assert.equal(d.preferences().sfxGain,.35);g.frame(due+5000);assert.equal(g.state().hp,65);
 g.press('settingsCloseBtn');assert.equal(g.state().mode,'pause');g.press('resumeBtn');assert.equal(d.mixGains().bgm,.7);
 const re=reloadHarness(g);re.press('settingsBtn');assert.equal(re.el.get('bgmVolume').value,'200');assert.equal(re.el.get('sfxVolume').value,'35');
 const dev=makeHarness({},true);dev.press('settingsBtn');dev.el.get('sfxVolume').value='0';dev.el.get('sfxVolume').listeners.input();assert.equal(dev.storage.has(SETTINGS_KEY),false);
});


test('input calibration preserves enemy draw timing, BGM scheduling and the fixed shield startup across offsets',()=>{
 const frames=[];
 for(const offset of [-180,0,180]){
  const drawn=[];
  const art={preloadSources(){},readyFor:()=>true,layout:()=>({hitX:220,hitY:330,base:1}),drawHero:()=>true,drawEnemy(ctx,data){drawn.push({now:data.now,attackAt:data.attackAt,attackSpan:data.attackSpan,lastImpactAt:data.lastImpactAt,index:data.e.index});return true}};
  const g=makeHarness({parryTowerInputOffset_v1:String(offset)},true,'','',art);g.random(.5);g.dev().launch(5,'guardian:normal',true);
  const before=g.state(),beat=(before.scoreOrigin+before.attackBeat*before.beat)*1000;
  assert.ok(Math.abs(before.attackAt-beat-100)<1e-6);
  assert.ok(Math.abs(g.bloodTest().timingInfo().target-beat-offset)<1e-6);
  g.clearAudioEvents();g.frame(before.attackAt-300);g.frame(before.attackAt-50);
  const times=drawn.slice(-2);const audio=g.audioEvents();
  const slider=g.el.get('latencySlider');slider.listeners.input({target:{value:String(-offset)}});g.frame(before.attackAt-25);
  assert.equal(g.state().attackAt,before.attackAt,'moving the slider cannot move contact');
  assert.equal(g.state().attackSpan,before.attackSpan);
  assert.equal(g.bloodTest().timingInfo().telegraphStart,before.attackAt-before.attackSpan);
  slider.listeners.input({target:{value:String(offset)}});g.frame(before.attackAt+50);times.push(drawn.at(-1));
  frames.push({times,audio});
 }
 assert.deepEqual(frames[0],frames[1]);assert.deepEqual(frames[1],frames[2]);
});

test('corrected input windows accept both inclusive edges and never damage before the late edge',()=>{
 for(const offset of [-180,0,180])for(const delta of [-31,-11,0,11,31]){
  const g=makeHarness({parryTowerInputOffset_v1:String(offset)},true);g.dev().launch(5,'guardian:normal');
  const at=g.state().attackAt,hp=g.state().hp,target=g.bloodTest().timingInfo().target,press=target+delta;
  if(press>=at){g.frame(at);assert.equal(g.state().hp,hp);g.frame(press);assert.equal(g.state().hp,hp,'inclusive endpoint is still open')}
  g.clock(press);g.parry();g.frame(Math.max(at+1,press+1));
  assert.equal(g.state().lastStrikeKind,Math.abs(delta)<=11?'just':'parry',offset+'/'+delta);
  assert.equal(g.state().hp,hp);assert.equal(g.state().combo,1);
  if(press>at)assert.equal(g.bloodTest().timingInfo().lastDeflectAt,press,'late feedback starts on its accepted input');
 }
 const g=makeHarness({parryTowerInputOffset_v1:'180'},true);g.dev().launch(5,'guardian:normal');
 const at=g.state().attackAt,end=g.bloodTest().timingInfo().target+31,hp=g.state().hp;
 g.frame(at);g.frame(end);assert.equal(g.state().hp,hp);
 g.frame(end+1);assert.ok(g.state().hp<hp);assert.equal(g.state().lastStrikeKind,'miss');const after=g.state().hp;
 g.frame(end+2);assert.equal(g.state().hp,after,'one damage result per attack');
});

test('late calibration remembers guards at contact but cannot retroactively raise a guard',()=>{
 for(const heldAtContact of [true,false]){
  const g=makeHarness({parryTowerInputOffset_v1:'180'},true);g.dev().launch(5,'guardian:normal');
  const at=g.state().attackAt,end=g.bloodTest().timingInfo().target+31;
  if(heldAtContact){g.clock(at-200);g.hold()}
  g.frame(at);assert.equal(g.bloodTest().timingInfo().guardAtImpact,heldAtContact);
  if(heldAtContact){g.clock(at+10);g.release()}else{g.clock(at+10);g.hold()}
  g.frame(end+1);assert.equal(g.state().lastStrikeKind,heldAtContact?'guard':'miss');
 }
});


test('a release between frames preserves the guard already held at physical contact',()=>{
 for(const release of ['release','cancel','blur']){
  const g=makeHarness({parryTowerInputOffset_v1:'180'},true);g.dev().launch(5,'guardian:normal');
  const at=g.state().attackAt,end=g.bloodTest().timingInfo().target+31;
  g.clock(at-200);g.hold();g.clock(at+10);g[release]();
  assert.equal(g.bloodTest().timingInfo().guardAtImpact,true);
  g.frame(end+1);assert.equal(g.state().lastStrikeKind,'guard',release);
 }
});

test('input correction keeps count-ins and encounter tempo unchanged across pause and second movement',()=>{
 for(const offset of [-180,180]){
  const g=makeHarness({parryTowerInputOffset_v1:String(offset)},true);g.dev().launch(80,'endking:elite');
  const d=g.bloodTest();d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);d.setBaseAttack(1);
  const contact=g.state().attackAt,press=d.timingInfo().target+20;
  if(press>contact)g.frame(contact);
  g.clock(press);g.parry();g.frame(Math.max(contact,press)+1);
  g.frame(g.now+1501);assert.equal(g.state().phaseStage,'countin');
  const count=g.state();assert.ok(Math.abs(count.phaseCountStartAt-count.scoreOrigin*1000)<1e-6);
  g.frame(count.phaseCountStartAt+4*count.beat*1000+1);assert.equal(g.state().mode,'combat');
  g.press('pauseBtn');g.frame(g.now+400);g.press('resumeBtn');
  const resumed=g.state();assert.equal(resumed.bpm,count.bpm);assert.equal(resumed.offset,offset);
  assert.ok(Math.abs(resumed.attackAt-(resumed.scoreOrigin+4*resumed.beat)*1000-100)<1e-6);
 }
});

test('old offsets convert without touching their save and the new input setting takes precedence',()=>{
 for(const [legacy,expected]of [['100',0],['120',20],['0',-100],['-180',-180],['broken',0]]){
  const g=makeHarness({parryTowerAudioOffset_v05:legacy});assert.equal(g.state().offset,expected);
  assert.equal(g.storage.get('parryTowerAudioOffset_v05'),legacy);assert.equal(g.storage.has('parryTowerInputOffset_v1'),false);
 }
 const g=makeHarness({parryTowerAudioOffset_v05:'120',parryTowerInputOffset_v1:'-25'});
 assert.equal(g.state().offset,-25);g.el.get('latencySlider').listeners.input({target:{value:'35'}});
 assert.equal(g.storage.get('parryTowerAudioOffset_v05'),'120');assert.equal(g.storage.get('parryTowerInputOffset_v1'),'35');
 assert.equal(reloadHarness(g).state().offset,35);
 const d=makeHarness({parryTowerAudioOffset_v05:'120'},true);d.el.get('latencySlider').listeners.input({target:{value:'35'}});
 assert.equal(d.storage.has('parryTowerInputOffset_v1'),false);assert.equal(d.storage.get('parryTowerAudioOffset_v05'),'120');
});

test('calibration samples pointer-down like combat and ignores the following release click',()=>{
 const g=makeHarness();g.press('settingsBtn');g.press('calibrationStart');const d=g.bloodTest(),targets=d.calibrationInfo().targets,button=g.el.get('calibrationTap');
 for(const t of targets.slice(4)){
  g.frame(t+20);button.listeners.pointerdown({button:0,preventDefault(){}});
  g.clock(t+80);button.listeners.click({detail:1});
 }
 assert.deepEqual(Array.from(d.calibrationInfo().errors),Array(16).fill(20));
 g.frame(targets.at(-1)+400);assert.equal(d.calibrationInfo().result.candidate,20);
});

test('tap recommendation measures shared-clock beats, tries without changing manual offset and saves only on Apply',()=>{
 const g=makeHarness();g.press('settingsBtn');g.press('calibrationStart');const d=g.bloodTest(),targets=d.calibrationInfo().targets;
 assert.equal(targets.length,20);
 assert.equal(g.el.get('calibrationTap').disabled,true);
 for(const [i,label] of ['3','2','1','GO'].entries()){
  g.frame(targets[i]+20);assert.equal(g.el.get('calibrationPulse').textContent,label);
  assert.equal(g.el.get('calibrationTap').disabled,true);
  g.press('calibrationTap');assert.equal(d.calibrationInfo().errors.length,0,'count-in taps are excluded');
 }
 g.frame(targets[4]-1);g.press('calibrationTap');assert.equal(d.calibrationInfo().errors.length,0,'GO is a full count-in beat');
 g.frame(targets[4]);assert.equal(g.el.get('calibrationPulse').textContent,'♫');assert.equal(g.el.get('calibrationTap').disabled,false);
 assert.match(g.el.get('calibrationStatus').textContent,/0 \/ 16/);
 for(const t of targets.slice(4)){g.frame(t+20);g.press('calibrationTap')}
 assert.equal(d.calibrationInfo().errors.length,16);assert.match(g.el.get('calibrationStatus').textContent,/16 \/ 16/);
 g.frame(targets.at(-1)+400);assert.equal(d.calibrationInfo().result.candidate,20);assert.equal(g.state().offset,0);
 g.press('calibrationTry');assert.equal(g.state().offset,0);g.clock(d.calibrationInfo().targets[0]+20);g.press('calibrationTap');assert.match(g.el.get('calibrationStatus').textContent,/JUST!/);g.press('calibrationApply');assert.equal(g.state().offset,20);assert.equal(g.storage.get('parryTowerInputOffset_v1'),'20');
 g.press('calibrationStart');g.frame(d.calibrationInfo().targets[3]+20);g.press('calibrationCancel');assert.equal(g.state().offset,20);assert.equal(d.calibrationInfo(),null);
 assert.equal(g.el.get('calibrationPulse').textContent,'♫');assert.equal(g.el.get('calibrationTap').disabled,true);
});

test('local checkpoint restores combat on a fresh clock without new encounter rolls or duplicate boss shields',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();d.jumpFloor(5);d.setEnemyHp(10000);d.setSkill('focus',7);d.setBreaks('focus',1);
 d.grantRelic('rusty_crest');d.checkpoint();const original=g.state(),stored=JSON.parse(g.storage.get(RUN_KEY));
 assert.equal(stored.game.attackAt,undefined);assert.equal(stored.game.artLoading,undefined);
 const re=reloadHarness(g);assert.equal(re.el.get('continueBtn').hidden,false);re.random(.99);re.press('continueBtn');
 assert.equal(re.state().mode,'combat');assert.equal(re.state().encounterKey,original.encounterKey);assert.equal(re.state().shield,original.shield);assert.equal(re.state().enemyHp,10000);assert.equal(re.state().runSkills.focus,7);assert.equal(re.state().skillBreaks.focus,1);
 assert.equal(re.state().attackBeat,4);assert.ok(re.state().attackAt>re.now);assert.equal(re.state().scoreActive,true);
});

test('saved rewards, paid merchant selections and refinement resume without rerolls, refunds or another payment',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();d.jumpFloor(14);d.setTowerCoins(150);d.setSkill('blade',20);g.routeSelect('merchant');
 buyTarget(g,'breakthrough','blade');const re=reloadHarness(g);re.press('continueBtn');assert.equal(re.state().roomStage,'result');assert.equal(re.state().towerCoins,90);assert.equal(re.state().runSkills.blade,21);
 re.roomChoose('buy:breakthrough');assert.equal(re.state().towerCoins,90);re.roomChoose('continue');re.bloodTest().setEnemyHp(1);resolveBloodParry(re,20);re.frame(re.now+950);
 const relic=reloadHarness(re);relic.press('continueBtn');assert.equal(relic.state().mode,'relic');assert.deepEqual(Array.from(relic.state().relicOffer),Array.from(re.state().relicOffer));
 relic.press('relicSkipBtn');const cards=relic.el.get('rewardCards').innerHTML;
 const reward=reloadHarness(relic);reward.random(.99);reward.press('continueBtn');assert.equal(reward.state().mode,'reward');assert.equal(reward.el.get('rewardCards').innerHTML,cards);
 const scroll=makeHarness();scroll.press('startBtn');scroll.bloodTest().jumpFloor(14);scroll.bloodTest().setTowerCoins(100);scroll.routeSelect('merchant');scroll.roomChoose('buy:skill');
 const restore=reloadHarness(scroll);restore.press('continueBtn');assert.equal(restore.state().mode,'routeSkill');assert.equal(restore.state().towerCoins,74);assert.deepEqual(Array.from(restore.state().routeSkillSet),Array.from(scroll.state().routeSkillSet));
});

test('new challenge asks before replacing a save, death clears it, practice and Dev never overwrite it',()=>{
 const g=makeHarness();g.press('startBtn');const before=g.storage.get(RUN_KEY),r=reloadHarness(g);r.press('startBtn');assert.equal(r.state().mode,'confirm');assert.equal(r.storage.get(RUN_KEY),before);r.press('newRunCancel');assert.equal(r.state().mode,'title');
 r.press('startBtn');r.press('newRunConfirm');assert.equal(r.state().mode,'combat');r.bloodTest().setHp(1);r.bloodTest().incoming(100);assert.equal(r.storage.has(RUN_KEY),false);
 const dev=makeHarness({[RUN_KEY]:before},true);dev.dev().merchant('capped');dev.roomChoose('buy:elixir');assert.equal(dev.storage.get(RUN_KEY),before);
 const bad=makeHarness({[RUN_KEY]:'{broken'});assert.equal(bad.el.get('continueBtn').hidden,true);
});

test('first-floor tutorial survives mistakes including fundoshi, teaches guard and parry, then offers normal loot and proceeds to floor 2',()=>{
 const save={parryTowerPermanent_v1:JSON.stringify({unlockedSkins:['fundoshi'],equippedSkin:'fundoshi'})};
 const g=makeHarness(save);g.press('tutorialBtn');const d=g.bloodTest();assert.equal(d.tutorialInfo().active,true);assert.equal(g.state().floor,1);
 d.setEnemyAttack(999999);d.incoming(999999);assert.equal(g.state().hp,g.state().maxHp);resolveBloodParry(g,-40);assert.equal(g.state().mode,'combat');assert.equal(d.tutorialInfo().step,1);
 d.setEnemyHp(1);resolveBloodParry(g,20);assert.equal(d.tutorialInfo().step,2);assert.equal(g.state().mode,'combat');
 g.press('tutorialNext');resolveBloodParry(g,20);assert.equal(g.state().mode,'victory');assert.equal(d.tutorialInfo().active,false);g.frame(g.now+950);assert.equal(g.state().mode,'reward');g.press('healBtn');assert.equal(g.state().floor,2);assert.equal(g.state().mode,'combat');
 assert.doesNotMatch(g.el.get('titleRecords').innerHTML,/いつもの主人公|赤ふんどし/);
});


test('checkpoint keeps challenge modifiers fixed after shop changes and settings do not erase a suspended run',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();d.checkpoint();
 const saved=g.storage.get(RUN_KEY),permanent=JSON.stringify({regen:5,bossWard:6,soulGain:5,choice4:1});
 const re=makeHarness({...Object.fromEntries(g.storage),parryTowerPermanent_v1:permanent});re.press('settingsBtn');re.press('settingsCloseBtn');assert.equal(re.storage.get(RUN_KEY),saved);re.press('continueBtn');
 re.bloodTest().setHp(10);re.bloodTest().setEnemyHp(1);resolveBloodParry(re,20);assert.equal(re.state().hp,10,'new shop regeneration waits until a new challenge');
 re.frame(re.now+950);assert.equal((re.el.get('rewardCards').innerHTML.match(/data-skill=/g)||[]).length,3,'new four-choice upgrade does not alter an existing challenge');
});


test('paused second movement resumes with its retained phase, rhythm, counters and tempo',()=>{
 const g=makeHarness();g.press('startBtn');const d=g.bloodTest();d.jumpFloor(80);d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49));d.setBaseAttack(1);resolveBloodParry(g,20);
 assert.equal(g.state().phaseStage,'rumble');g.frame(g.now+1500);g.frame(g.state().phaseCountStartAt+g.state().beat*4000+1);assert.equal(g.state().mode,'combat');assert.equal(g.state().bossPhase,2);
 const before=g.state();g.press('pauseBtn');g.press('suspendBtn');const re=reloadHarness(g);re.press('continueBtn');assert.equal(re.state().bossPhase,2);assert.deepEqual(Array.from(re.state().enemyRhythm),Array.from(before.enemyRhythm));assert.equal(re.state().attackBeat,4);assert.equal(re.state().bpm,g.state().bpm);
});


test('route, mirror exchange and polished relic checkpoints keep their exact selection and upgraded effect',()=>{
 const g=makeHarness();g.press('startBtn');g.bloodTest().jumpFloor(4);let re=reloadHarness(g);re.press('continueBtn');assert.equal(re.state().mode,'route');
 re.bloodTest().jumpFloor(8);re.routeSelect('event');re.bloodTest().setEvent('mirror');re.bloodTest().grantRelic('rusty_crest');re.roomChoose('event:swap');
 let mirror=reloadHarness(re);mirror.press('continueBtn');assert.equal(mirror.state().roomStage,'mirror');mirror.roomChoose('mirror:rusty_crest');
 const exchange=reloadHarness(mirror);exchange.press('continueBtn');assert.equal(exchange.state().relicReturn,'mirror');assert.equal(exchange.state().relicMirrorTarget,'rusty_crest');exchange.press('relicSkipBtn');assert.equal(exchange.state().mode,'room');assert.deepEqual(Array.from(exchange.state().relics),['rusty_crest']);
 revisitMerchant(exchange,100);buyTarget(exchange,'polish','rusty_crest');const polished=reloadHarness(exchange);polished.press('continueBtn');assert.equal(polished.state().towerCoins,64);assert.deepEqual(Array.from(polished.state().polishedRelics),['rusty_crest']);polished.roomChoose('continue');polished.bloodTest().incoming(10);assert.equal(polished.state().hp,64);
});


test('storage failure keeps combat playable, surfaces the failed save and removes any stale checkpoint',()=>{
 const g=makeHarness({},false,'','',null,true);g.press('startBtn');assert.equal(g.state().mode,'combat');assert.equal(g.el.get('saveWarning').hidden,false);assert.equal(g.storage.has(RUN_KEY),false);
});
test('resuming an illustrated challenge retains its chosen art after legacy visual is selected in the shop',()=>{
 const g=makeHarness();g.press('startBtn');const saved=Object.fromEntries(g.storage);
 saved.parryTowerPermanent_v1=JSON.stringify({unlockedExtras:['legacyVisual'],enabledExtras:['legacyVisual']});const re=makeHarness(saved);assert.equal(re.artMode(),'legacy');re.press('continueBtn');assert.equal(re.artMode(),'illustrated');
});


test('beat-contact candidate puts every attack on its score beat through complete patterns and tempo changes',()=>{
 const g=makeHarness({},true);g.random(.5);
 for(const e of P.all)for(const tempo of [0,6]){
  g.dev().launch(5,e.id+(e.rare?':rare':':normal'),true,'normal',false,tempo,'beat',0);
  for(let i=0;i<e.rhythm.length*2;i++){
   const state=g.state(),B=(state.scoreOrigin+state.attackBeat*state.beat)*1000,timing=g.dev().timingState();
   assert.ok(Math.abs(state.attackAt-B)<1e-6,e.id+' / '+tempo+' / '+state.attackBeat);
   assert.ok(Math.abs(timing.targetAt-B)<1e-6);assert.equal(timing.contactDelta,0);
   g.clock(B);g.parry();g.frame(B+1);assert.equal(g.state().lastStrikeKind,'just',e.id);
  }
  g.press('pauseBtn');g.frame(g.now+500);g.press('resumeBtn');const re=g.state();
  assert.ok(Math.abs(re.attackAt-(re.scoreOrigin+4*re.beat)*1000)<1e-6);
 }
});

test('beat-contact candidate keeps corrected inclusive input windows and guard preparation independent',()=>{
 for(const offset of [-180,0,180])for(const delta of [-31,-11,0,11,31]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'normal',false,0,'beat',offset);
  const timing=g.dev().timingState(),C=timing.contactAt,press=timing.targetAt+delta;
  if(press>=C){g.frame(C);g.frame(press);assert.equal(g.state().lastStrikeKind,'miss');assert.equal(g.state().combo,0);}
  g.clock(press);g.parry();g.frame(Math.max(C,press)+1);
  assert.equal(g.state().lastStrikeKind,Math.abs(delta)<=11?'just':'parry',offset+'/'+delta);
 }
 for(const [lead,expected]of [[101,'guard'],[99,'miss']]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'normal',false,0,'beat',0);
  const C=g.state().attackAt;g.clock(C-lead);g.hold();g.frame(C+32);assert.equal(g.state().lastStrikeKind,expected);
 }
});

test('beat-contact shield is fully presented on successful contact for all skins and relaxes without a held guard',async()=>{
 for(const skin of PR.SKINS){
  const g=makeHarness({},true,'adopted');g.dev().launch(5,'guardian:normal',true,skin.id,false,0,'beat',0);await g.readyArt(P.byId.guardian);
  const C=g.state().attackAt;g.frame(C-50);assert.equal(g.heroPose().lift,0);
  g.clock(C);g.parry();g.frame(C);assert.equal(g.state().lastStrikeKind,'just');assert.equal(g.heroPose().lift,1,skin.id);
  assert.equal(g.heroPose().heldLift,0);assert.equal(g.heroPose().action,1);
  g.frame(C+180);assert.equal(g.heroPose().lift,0);assert.equal(g.state().guardHeld,false);
 }
 const early=makeHarness({},true,'adopted');early.dev().launch(5,'guardian:normal',true,'normal',false,0,'beat',-180);await early.readyArt(P.byId.guardian);
 const C=early.state().attackAt;early.clock(C-180);early.parry();early.frame(C-1);assert.equal(early.heroPose().lift,1,'accepted early input keeps its shield ready');
 early.frame(C+1);assert.equal(early.heroPose().lift,1);
});

test('beat-contact logs frame quantization separately and produces feedback at the first frame after contact',()=>{
 for(const fps of [30,60,120])for(const skip of [0,85]){
  const g=makeHarness({},true),step=1000/fps;g.dev().launch(5,'guardian:normal',true,'normal',false,0,'beat',0);
  const C=g.state().attackAt;for(let t=C-200+step*.37;t<C;t+=step)g.frame(t);
  g.clock(C);g.parry();const first=C+step*.37+skip;g.frame(first);
  assert.equal(g.state().lastStrikeKind,'just');assert.equal(g.dev().timingState().contactDelta,0);
  assert.ok(Math.abs(g.dev().timingState().firstContactFrameMs-(first-C))<1e-6);
  assert.ok(Math.abs(g.metalEvents().at(-1).when-first/1000-.003)<1e-6,'SFX generation follows the observed frame, without another 100ms');
 }
});

test('beat-contact Dev URL and comparison controls are unsaved and cannot change the main game defaults',()=>{
 const seed={parryTowerAudioOffset_v05:'120',parryTowerInputOffset_v1:'45'};
 const g=makeHarness(seed,true,'','?floor=5&enemy=guardian&practice=1&timingMode=beat&inputOffset=0');
 assert.equal(g.el.get('devTimingMode').value,'half');assert.equal(g.el.get('devInputOffset').value,'0');
 g.press('devLaunch');const fresh=g.state();assert.equal(g.dev().timingState().mode,'half');assert.equal(fresh.offset,0);
 g.frame(g.now+1);assert.match(g.el.get('devTimingInfo').textContent,/接触−拍 \+0ms/);
 g.el.get('devTimingMode').value='previous';g.el.get('devInputOffset').value='45';g.press('devLaunch');
 const old=g.state();assert.equal(g.dev().timingState().mode,'previous');assert.equal(old.offset,45);
 assert.ok(Math.abs(old.attackAt-(old.scoreOrigin+old.attackBeat*old.beat)*1000-100)<1e-6);
 assert.deepEqual([...g.storage],Object.entries(seed));
 const normal=makeHarness(seed);normal.press('startBtn');const n=normal.state();assert.ok(Math.abs(n.attackAt-(n.scoreOrigin+n.attackBeat*n.beat)*1000)<1e-6);
});

test('beat-contact candidate keeps the final second movement and its four-beat return on the same beat',()=>{
 for(const mode of ['beat','half','full','onehalf']){
 const g=makeHarness({},true);g.dev().launch(80,'endking:elite',false,'normal',false,6,mode,0);
 const d=g.bloodTest();d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);d.setBaseAttack(1);
 const C=g.state().attackAt;g.clock(C);g.parry();g.frame(C+1);g.frame(g.now+1501);assert.equal(g.state().phaseStage,'countin');
 const count=g.state();g.frame(count.phaseCountStartAt+4*count.beat*1000+1);const resumed=g.state();assert.equal(resumed.mode,'combat');
 assert.ok(Math.abs(resumed.attackAt-(resumed.scoreOrigin+resumed.attackBeat*resumed.beat)*1000)<1e-6);assert.equal(resumed.bpm,130);assert.equal(g.dev().timingState().windup,true);
 }
});


test('beat-contact candidate shares all eight music grids and trusted output latency without a contact offset',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'normal',false,0,'beat',0);
 const ac=g.bloodTest().audioContext();let delay=0;ac.getOutputTimestamp=()=>({performanceTime:g.now,contextTime:g.now/1000-delay/1000});
 for(const theme of g.dev().musicList())for(const variant of ['normal','boss'])for(delay of [0,50,150]){
  g.dev().practiceMusic(theme.id,variant);const s=g.state(),audioBeat=(s.scoreOrigin+s.attackBeat*s.beat)*1000,heardBeat=audioBeat+delay;
  assert.ok(Math.abs(s.attackAt-heardBeat)<1e-6,theme.id+'/'+variant+'/'+delay);
  assert.ok(Math.abs(g.dev().timingState().targetAt-heardBeat)<1e-6);
  g.clearAudioEvents();g.frame(audioBeat-100);
  assert.ok(g.audioEvents().some(event=>Math.abs(event.time*1000-audioBeat)<1e-6));
 }
});

test('beat-contact candidate combines skin rules and tempo while keeping input at the heard beat',()=>{
 const g=makeHarness({},true);g.random(.1);
 for(const skin of PR.SKINS){
  g.dev().launch(5,'guardian:normal',true,skin.id,true,6,'beat',0);const s=g.state();assert.equal(s.bpm,skin.id==='spacetime'?136:124);
  const beat=(s.scoreOrigin+s.attackBeat*s.beat)*1000;assert.ok(Math.abs(s.attackAt-beat)<1e-6);
  g.clock(beat);g.parry();g.frame(beat+1);assert.equal(g.state().lastStrikeKind,'just');
 }
});

test('cue comparison plays the windup at the chosen beat lead across every enemy pattern and tempo',()=>{
 const g=makeHarness({},true);g.random(.5);
 for(const mode of ['half','full','onehalf'])for(const e of P.all)for(const tempo of [0,6]){
  g.dev().launch(5,e.id+(e.rare?':rare':':normal'),true,'normal',false,tempo,mode,0);
  for(let i=0;i<e.rhythm.length*2;i++){
   const s=g.state(),timing=g.dev().timingState(),lead=s.beat*1000*(mode==='half'?.5:mode==='full'?1:1.5),cueAt=s.attackAt-lead,hasWindup=i===0||s.attackSpan/(s.beat*1000)>1.5+1e-6;
   assert.equal(timing.mode,mode);assert.equal(timing.windup,hasWindup);if(hasWindup)assert.ok(Math.abs(timing.windupLead-lead)<1e-6,e.id+'/'+mode);else assert.equal(timing.windupLead,null);
   assert.ok(timing.swingLead>0&&timing.swingLead<lead);
   assert.equal(timing.contactDelta,0);assert.ok(Math.abs(timing.targetAt-s.attackAt)<1e-6);
   // A one-beat phrase can begin exactly on the preceding impact, which was already processed.
   if(i===0)g.clearAudioEvents();if(cueAt-.01>=g.now)g.frame(cueAt-.01);
   const windups=()=>g.audioEvents().filter(a=>a.frequency===(e.boss?135:195)&&a.type==='triangle'&&Math.abs(a.time*1000-cueAt)<.1);
   if(g.now<cueAt)assert.equal(windups().length,0,e.id+' / no early cue');
   g.frame(Math.max(g.now,cueAt+.01));assert.equal(windups().length,hasWindup?1:0,e.id+' / '+mode+' / '+tempo+' / '+i+' / score cue');
   g.frame(g.now+.01);assert.equal(windups().length,hasWindup?1:0,e.id+' / no repeated cue');
   g.clock(s.attackAt);g.parry();g.frame(s.attackAt+.001);assert.equal(g.state().lastStrikeKind,'just',e.id);
  }
 }
});

test('cue comparison starts the real illustrated preparation with its sound and keeps authored contact geometry',async()=>{
 for(const mode of ['half','full','onehalf'])for(const id of ['knight','rogue','guardian']){
  const g=makeHarness({},true,'adopted');g.dev().launch(5,id+':normal',true,'normal',false,0,mode,0);await g.readyArt(P.byId[id]);
  const s=g.state(),lead=g.dev().timingState().windupLead;
  g.frame(s.attackAt-lead-1);assert.equal(g.enemySample().t.prep,0);
  g.frame(s.attackAt-lead+1);assert.ok(g.enemySample().t.prep>0);
  g.frame(s.attackAt-.001);const contact=g.enemySample();assert.ok(contact.t.p>.9999);assert.ok(contact.t.drive>.9999);
  assert.ok(Math.abs(contact.x-contact.l.contactX)<.05,'actual cutout reaches the same contact position');
  g.clock(s.attackAt);g.parry();g.frame(s.attackAt+.001);assert.equal(g.heroPose().lift,1);
  assert.ok(g.artDrawCounts().enemy>0);assert.ok(g.artDrawCounts().hero>0);
 }
});

test('cue comparison URL, switching, correction and pause preserve production timing and saved values',()=>{
 const seed={parryTowerInputOffset_v1:'45',parryTowerAudioOffset_v05:'145'};
 for(const mode of ['half','full','onehalf','previous']){
  const g=makeHarness(seed,true,'','?floor=5&enemy=guardian&practice=1&timingMode='+mode+'&inputOffset=0');
  assert.equal(g.el.get('devTimingMode').value,mode);g.press('devLaunch');
  let s=g.state(),t=g.dev().timingState();assert.equal(t.mode,mode);assert.equal(t.contactDelta,mode==='previous'?100:0);
  if(mode==='previous'){assert.equal(t.windupLead,980);assert.equal(t.swingLead,360);assert.ok(Math.abs(t.contactAt-t.targetAt-100)<1e-6);}
  const B=(s.scoreOrigin+s.attackBeat*s.beat)*1000;assert.ok(Math.abs(t.targetAt-B)<1e-6);
  g.press('pauseBtn');g.frame(g.now+500);g.press('resumeBtn');
  s=g.state();t=g.dev().timingState();assert.equal(t.mode,mode);assert.equal(s.attackBeat,4);
  g.clock(t.targetAt);g.parry();g.frame(t.contactAt);assert.equal(g.state().lastStrikeKind,'just');
  g.el.get('devTimingMode').value=mode==='half'?'full':'half';g.el.get('devInputOffset').value='45';g.press('devLaunch');
  assert.equal(g.dev().timingState().mode,g.el.get('devTimingMode').value);assert.equal(g.dev().timingState().inputDelta,45);
  assert.deepEqual([...g.storage],Object.entries(seed));
 }
 const main=makeHarness(seed);main.press('startBtn');const s=main.state();
 assert.ok(Math.abs(s.attackAt-(s.scoreOrigin+s.attackBeat*s.beat)*1000)<1e-6);
 assert.ok(!fs.readFileSync('index.html','utf8').includes('devTimingMode'));
});

test('cue comparison previews the next phrase once while miss, guard or corrected late input is unresolved',()=>{
 for(const mode of ['onehalf'])for(const action of ['miss','guard','late']){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'chick',true,0,mode,180);
  const s=g.state(),C=s.attackAt,beat=s.beat*1000,cueAt=C+2*beat-g.dev().timingState().windupLead;
  if(action==='guard'){g.clock(C-200);g.hold();}
  g.frame(C-1);g.clearAudioEvents();g.frame(cueAt+.01);
  assert.ok(Math.abs(g.state().attackAt-C)<1e-6,'previous attack still awaits input');
  const windups=()=>g.audioEvents().filter(a=>a.frequency===135&&a.type==='triangle');
  assert.equal(windups().length,1,mode+'/'+action);assert.ok(Math.abs(windups()[0].time*1000-cueAt)<.02);
  if(action==='late'){g.clock(C+250);g.parry();g.frame(C+250.01);assert.equal(g.state().lastStrikeKind,'parry');}
  else{g.frame(C+180+g.dev().skinState().parryWindow+.01);assert.equal(g.state().lastStrikeKind,action==='guard'?'guard':'miss');}
  g.frame(g.now+1);assert.equal(windups().length,1,'advancing to the previewed attack cannot replay its cue');
  g.press('pauseBtn');const count=windups().length;g.frame(g.now+1000);assert.equal(windups().length,count);
  g.press('resumeBtn');const re=g.state();g.frame(re.attackAt-g.dev().timingState().windupLead+.01);
  assert.equal(windups().length,count+1,'new count-in has a fresh cue');
 }
});

test('cue comparison follow-ups omit actual cutout preparation and windup sound, and resume restores an opening',async()=>{
 for(const mode of ['half','full','onehalf'])for(const id of ['knight','rogue','guardian']){
  const g=makeHarness({},true,'adopted');g.dev().launch(5,id+':normal',true,'normal',false,0,mode,0);await g.readyArt(P.byId[id]);
  let count=0;
  for(let i=0;i<P.byId[id].rhythm.length+2;i++){
   const s=g.state(),timing=g.dev().timingState();
   if(!timing.windup){
    count++;g.clearAudioEvents();const t=s.attackAt-timing.swingLead-1;
    if(t>g.now){g.frame(t);assert.equal(g.enemySample().t.prep,0);assert.equal(g.enemySample().q.charge,0);}
    g.frame(s.attackAt-.001);
    assert.equal(g.audioEvents().filter(a=>a.frequency===(id==='guardian'?135:195)&&a.type==='triangle').length,0,'follow-up has no low windup cue');
    assert.equal(g.enemySample().t.prep,0);
    g.press('pauseBtn');g.frame(g.now+100);g.press('resumeBtn');
    assert.equal(g.dev().timingState().windup,true,'four-beat return always has an opening cue');
    const re=g.state();g.clock(re.attackAt);g.parry();g.frame(re.attackAt+.001);
   }else{g.clock(s.attackAt);g.parry();g.frame(s.attackAt+.001);}
  }
  assert.ok(count>0,id+' includes a short follow-up');
 }
});

test('guardian short follow-ups finish recovery before their real cutout swing after JUST, guard and miss',async()=>{
 for(const variant of ['normal','elite'])for(const tempo of [0,6])for(const result of ['just','guard','miss']){
  const g=makeHarness({},true,'adopted');g.dev().launch(5,'guardian:'+variant,true,'normal',false,tempo,'onehalf',0);await g.readyArt(P.byId.guardian);
  for(let i=0;i<3;i++){
   const C=g.state().attackAt;
   if(result==='just'){g.clock(C);g.parry();g.frame(C+.001);}
   else{
    if(result==='guard'){g.clock(C-150);g.hold();}
    g.frame(C+g.bloodTest().timingInfo().parryWindow+1);
    if(result==='guard')g.release();
   }
   assert.equal(g.state().lastStrikeKind,result);
  }
  const s=g.state(),timing=g.dev().timingState(),m=g.bloodTest().timingInfo();
  assert.ok(Math.abs(s.attackSpan-s.beat*1000)<1e-6,'fourth hit remains exactly one beat after third');
  assert.equal(timing.windup,false);
  assert.ok(m.recovery<=s.attackSpan-timing.swingLead+1e-6);
  g.frame(s.attackAt-timing.swingLead+.01);
  assert.equal(g.enemySample().t.rec,0,'old recovery has ended when the new whoosh starts');
  assert.equal(g.enemySample().q.keyFrame,'ready','do not hold the old contact drawing during the next release');
  assert.equal(g.enemySample().q.placements.strikePose.phaseVisible,false);
  g.frame(s.attackAt-timing.swingLead*.45);
  assert.equal(g.enemySample().q.keyFrame,'ready');
  assert.ok(g.enemySample().q.inbetween>0,'authored middle pose is no longer suppressed by old recovery');
  g.frame(s.attackAt-.001);
  assert.equal(g.enemySample().q.keyFrame,'contact');
  assert.equal(g.enemySample().q.placements.strikePose.phaseVisible,true);
  assert.equal(g.state().attackAt,s.attackAt,'visual recovery never moves the attack clock');
 }
});

test('long guardian phrases and former timing retain authored recovery; late input remains accepted',()=>{
 for(const mode of ['previous','half','full','onehalf']){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'normal',false,0,mode,0);
  assert.equal(g.bloodTest().timingInfo().recovery,520,'opening recovery unchanged');
  const s=g.state(),press=g.bloodTest().timingInfo().target+15;g.clock(press);g.parry();g.frame(Math.max(s.attackAt,press)+.001);
  assert.equal(g.state().lastStrikeKind,'parry','positive input window unchanged');
  assert.equal(g.bloodTest().timingInfo().recovery,520,'two-beat recovery unchanged');
 }
});

test('Dev contact stays on the beat while normal and chick guard/miss results wait for their full window',async()=>{
 for(const skin of ['normal','chick'])for(const kind of ['guard','miss']){
  const g=makeHarness({},true,'adopted');g.dev().launch(5,'guardian:normal',false,skin,true,0,'onehalf',0);await g.readyArt(P.byId.guardian);
  const s=g.state(),C=s.attackAt,window=g.dev().skinState().parryWindow,hp=s.hp;
  g.frame(C-160);if(kind==='guard'){g.clock(C-150);g.hold();}
  assert.equal(g.contactEvents().length,1);assert.ok(Math.abs(g.contactEvents()[0].when-C/1000)<1e-6);
  g.frame(C+1);const contact=g.bloodTest().presentation().contact;
  assert.equal(contact.at,C);assert.equal(contact.result,null);assert.equal(g.state().hp,hp);
  g.frame(C+25);const lean=g.enemySample().q.lean;
  g.frame(C+window+1);assert.equal(g.state().lastStrikeKind,kind);
  assert.ok(g.state().hp<hp,'damage is committed only after the full window');
  assert.equal(g.bloodTest().presentation().contact.at,C);
  assert.equal(g.bloodTest().presentation().clash.at,C,'result cannot restart the contact flash');
  assert.equal(g.enemySample().q.lean,lean,'guard/miss resolution cannot change neutral recoil');
  assert.equal(g.contactEvents().length,1);assert.equal(g.metalEvents().length,0);
  assert.equal(g.tailEvents().length,kind==='guard'?1:0);
  assert.equal(g.audioEvents().some(e=>e.frequency===145&&e.type==='sawtooth'),false,'no delayed second hit');
 }
});

test('Dev accepts corrected late chick parries after contact without repeating the impact',()=>{
 for(const offset of [-180,0,180]){
  const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',false,'chick',true,6,'onehalf',offset);
  g.bloodTest().setSkill('stability',8);const s=g.state(),C=s.attackAt;
  const input=C+offset+g.dev().skinState().parryWindow-1;
  g.frame(Math.min(C-160,input-1));
  if(input>C)g.frame(C+1);
  g.clock(input);g.parry();g.frame(Math.max(C,input)+.01);
  assert.equal(g.state().lastStrikeKind,'parry');assert.equal(g.state().hp,s.hp);
  assert.equal(g.contactEvents().length,1);assert.equal(g.tailEvents().length,1);
  assert.ok(Math.abs(g.tailEvents()[0].contactAt-C/1000)<1e-6);
  assert.equal(g.bloodTest().presentation().contact.at,C);
  assert.equal(g.bloodTest().presentation().clash.at,C);
 }
});

test('Dev cancels only future contact audio on pause and keeps current victory feedback',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',true,'chick',true,0,'onehalf',0);
 const C=g.state().attackAt;g.frame(C-100);assert.equal(g.contactEvents().length,1);
 g.press('pauseBtn');assert.equal(g.contactEvents()[0].cancelled,true);
 g.frame(C+100);assert.equal(g.contactEvents().length,1);
 g.press('resumeBtn');const next=g.state().attackAt;
 g.frame(next-100);g.bloodTest().setEnemyHp(1);g.clock(next);g.parry();g.frame(next+.01);
 assert.equal(g.state().mode,'victory');assert.equal(g.contactEvents()[1].cancelled,false);
 assert.equal(g.tailEvents().at(-1).kind,'just');
 const count=g.contactEvents().length;g.frame(g.now+300);assert.equal(g.contactEvents().length,count);
});

test('Dev mute consumes a contact event and timestamp refinement cannot lose a later result',()=>{
 const g=makeHarness({},true);g.dev().launch(5,'guardian:normal',false,'chick',true,0,'onehalf',0);
 const C=g.state().attackAt;g.press('audioBtn');g.frame(C-100);g.frame(C+1);
 assert.equal(g.contactEvents().length,0);g.press('audioBtn');g.frame(C+10);
 assert.equal(g.contactEvents().length,0,'unmute cannot play an old contact');
 const ac=g.bloodTest().audioContext();ac.getOutputTimestamp=()=>({performanceTime:g.now+.5,contextTime:g.now/1000});
 g.clock(C+70);g.parry();g.frame(C+70.01);
 assert.equal(g.state().lastStrikeKind,'parry');
 assert.equal(g.bloodTest().presentation().contact.result,'parry','match by score identity rather than floating-point contact time');
 assert.equal(g.bloodTest().presentation().clash.at,C);
});

test('production adopts the approved 1.5 beat notation for every enemy without a Dev API',()=>{
 const book={version:2,seen:Object.fromEntries(P.all.map(e=>[P.enemyKey(e),{encounters:1,firstFloor:1}])),defeated:{}};
 const g=makeHarness({parryTowerBestiary_v1:JSON.stringify(book)});assert.equal(g.dev(),undefined);g.press('practiceBtn');
 for(const e of P.all){
  g.clickers.get(P.enemyKey(e))();
  for(let i=0;i<e.rhythm.length*2;i++){
   const s=g.state(),t=g.bloodTest().timingInfo(),beat=(s.scoreOrigin+s.attackBeat*s.beat)*1000,windup=i===0||s.attackSpan/(s.beat*1000)>1.5+1e-6,lead=1.5*s.beat*1000;
   assert.ok(Math.abs(s.attackAt-beat)<1e-6,e.id);assert.ok(Math.abs(t.target-beat)<1e-6);assert.equal(t.windup,windup);assert.ok(Math.abs(t.windupLead-lead)<1e-6);
   g.clearAudioEvents();if(s.attackAt-lead+.01>=g.now)g.frame(s.attackAt-lead+.01);g.frame(s.attackAt-.001);
   assert.equal(g.audioEvents().filter(a=>a.frequency===(e.boss?135:195)&&a.type==='triangle').length,windup?1:0,e.id+' / windup notation');
   g.clock(beat);g.parry();g.frame(beat+.001);assert.equal(g.state().lastStrikeKind,'just');
  }
  g.press('pauseBtn');g.frame(g.now+100);g.press('resumeBtn');assert.equal(g.bloodTest().timingInfo().windup,true);
  g.press('exitPracticeBtn');g.press('practiceBtn');
 }
});

test('production preserves saved input centers and restores approved windups from a checkpoint',async()=>{
 for(const offset of [-180,0,180]){
  const seed={parryTowerInputOffset_v1:String(offset),parryTowerAudioOffset_v05:'120'};
  const g=makeHarness(seed,false,'adopted');g.press('startBtn');await g.readyArt(P.byId.slime);
  const s=g.state(),t=g.bloodTest().timingInfo();assert.ok(Math.abs(t.target-s.attackAt-offset)<1e-6);
  const press=t.target;g.clock(press);g.parry();g.frame(Math.max(press,s.attackAt)+.001);assert.equal(g.state().lastStrikeKind,'just');assert.equal(g.heroPose().lift,1);
  g.bloodTest().checkpoint();const re=reloadHarness(g);re.press('continueBtn');const restored=re.state(),timing=re.bloodTest().timingInfo();
  assert.equal(restored.offset,offset);assert.ok(Math.abs(restored.attackAt-(restored.scoreOrigin+4*restored.beat)*1000)<1e-6);assert.equal(timing.windup,true);
  assert.equal(re.storage.get('parryTowerInputOffset_v1'),String(offset));assert.equal(re.storage.get('parryTowerAudioOffset_v05'),'120');
 }
});

test('production final movement and all equipped skins retain beat contact and a fresh 1.5 beat opening',async()=>{
 for(const skin of PR.SKINS){
  const seed={parryTowerPermanent_v1:JSON.stringify({unlockedSkins:[skin.id],equippedSkin:skin.id}),parryTowerInputOffset_v1:'0'};
  const g=makeHarness(seed,false,'adopted');g.random(.5);g.press('startBtn');await g.readyArt(P.byId.slime);
  const d=g.bloodTest();d.setSkill('tempo',6);d.setBreaks('tempo',2);d.jumpFloor(80);await g.readyArt(P.byId.endking);
  g.frame(g.now+1);assert.equal(g.heroSkin(),skin.id);assert.equal(g.state().bpm,130);assert.equal(d.musicTheme(),'king-awakening');const C=g.state().attackAt;
  assert.ok(Math.abs(C-(g.state().scoreOrigin+g.state().attackBeat*g.state().beat)*1000)<1e-6);
  d.setEnemyHp(Math.floor(g.state().enemyMaxHp*.49)+100);d.setBaseAttack(1);
  g.clock(C);g.parry();g.frame(C+.001);assert.equal(g.heroPose().lift,1);g.frame(g.now+1501);
  const count=g.state();assert.equal(count.phaseStage,'countin');assert.equal(d.musicTheme(),'king-finale');
  const musicAt=count.phaseCountStartAt+4*count.beat*1000;g.clearAudioEvents();g.frame(musicAt-100);
  assert.ok(g.audioEvents().length>0);assert.ok(g.audioEvents().every(e=>e.time>=musicAt/1000-1e-6));g.frame(musicAt+1);
  assert.equal(g.state().mode,'combat');assert.equal(d.timingInfo().windup,true);assert.ok(Math.abs(d.timingInfo().windupLead-1.5*g.state().beat*1000)<1e-6);
  g.press('pauseBtn');g.press('resumeBtn');assert.equal(d.musicTheme(),'king-finale');assert.equal(g.state().bpm,130);
  d.checkpoint();const re=reloadHarness(g);re.press('continueBtn');assert.equal(re.state().bossPhase,2);assert.equal(re.bloodTest().musicTheme(),'king-finale');assert.equal(re.state().bpm,130);
 }
});

test('production selects royal encounters on each cycle and their training variants without changing surrounding music',()=>{
 const g=makeHarness();g.random(.5);g.press('startBtn');
 for(const [floor,id]of [[73,'void'],[75,'king-march'],[76,'void'],[79,'void'],[80,'king-awakening'],[81,'crypt'],[155,'king-march'],[160,'king-awakening'],[161,'crypt']]){
  g.bloodTest().jumpFloor(floor);assert.equal(g.bloodTest().musicTheme(),id,'floor '+floor);
  const bpm=g.state().bpm;g.press('pauseBtn');g.press('resumeBtn');assert.equal(g.bloodTest().musicTheme(),id);assert.equal(g.state().bpm,bpm);
 }
 const book={version:2,seen:Object.fromEntries(['endking:normal','endking:elite'].map(key=>[key,{encounters:1,firstFloor:75}])),defeated:{}};
 const p=makeHarness({parryTowerBestiary_v1:JSON.stringify(book)});p.press('practiceBtn');
 p.clickers.get('endking:normal')();
 for(const [key,id]of [['endking:normal','king-march'],['endking:elite','king-awakening']]){
  p.el.get('practiceEnemy').value=key;p.el.get('practiceEnemy').listeners.change();assert.equal(p.bloodTest().musicTheme(),id);
 }
});

test('production contact remains on the beat with wide chick windows, corrected late inputs and neutral recoil',async()=>{
 for(const skin of ['normal','chick'])for(const offset of [-180,0,180])for(const kind of ['guard','miss','parry']){
  const seed={parryTowerPermanent_v1:JSON.stringify({unlockedSkins:[skin],equippedSkin:skin}),parryTowerInputOffset_v1:String(offset)};
  const g=makeHarness(seed,false,'adopted');g.random(.5);g.press('startBtn');await g.readyArt(P.byId.slime);
  const d=g.bloodTest();d.jumpFloor(5);await g.readyArt(P.byId.guardian);d.setMaxHp(10000);d.setHp(10000);
  const C=g.state().attackAt,window=d.timingInfo().parryWindow,input=C+offset+window-1;
  assert.equal(window,skin==='chick'?93:31);
  if(kind==='guard'){g.clock(C-400);g.hold();}
  g.frame(Math.min(C-160,input-1));
  if(kind==='parry'){
   if(input>C)g.frame(C+1);g.clock(input);g.parry();g.frame(Math.max(C,input)+.01);
  }else{g.frame(C+1);const pending=d.presentation().contact;assert.equal(pending.at,C);g.frame(Math.max(C+1,C+offset+window+1));}
  assert.equal(g.state().lastStrikeKind,kind,skin+'/'+offset+'/'+kind);
  assert.equal(g.contactEvents().length,1);assert.ok(Math.abs(g.contactEvents()[0].when-C/1000)<1e-6);
  assert.equal(d.presentation().clash.at,C);assert.equal(g.metalEvents().length,0);
  assert.equal(g.tailEvents().length,kind==='miss'?0:1);
  assert.equal(g.audioEvents().some(e=>e.frequency===145&&e.type==='sawtooth'),false);
 }
});

test('production cancels future contacts, consumes muted hits and retains current victory feedback',()=>{
 const g=makeHarness();g.press('startBtn');let C=g.state().attackAt;
 g.frame(C-100);g.press('pauseBtn');assert.equal(g.contactEvents()[0].cancelled,true);
 g.press('resumeBtn');C=g.state().attackAt;g.press('audioBtn');g.frame(C-100);g.frame(C+1);g.press('audioBtn');g.frame(C+10);
 assert.equal(g.contactEvents().length,1,'unmute does not replay old contact');g.frame(C+40);
 C=g.state().attackAt;g.frame(C-100);g.bloodTest().setEnemyHp(1);g.clock(C);g.parry();g.frame(C+.01);
 assert.equal(g.state().mode,'victory');assert.equal(g.contactEvents().at(-1).cancelled,false);assert.equal(g.tailEvents().at(-1).kind,'just');
 const count=g.contactEvents().length;g.frame(g.now+300);assert.equal(g.contactEvents().length,count);
});

test('production keeps fighting with legacy or unavailable combat SFX instead of failing in a frame',()=>{
 for(const legacy of [false,true]){
  const g=makeHarness();g.bloodTest().fallbackSfx(legacy);g.press('startBtn');const C=g.state().attackAt,hp=g.state().hp;
  g.frame(C-100);g.clock(C);g.parry();g.frame(C+1);
  assert.equal(g.state().lastStrikeKind,'just');assert.equal(g.state().hp,hp);assert.ok(g.state().attackAt>C);
  assert.equal(g.contactEvents().length,0);assert.equal(g.tailEvents().length,0);
  if(legacy)assert.equal(g.metalEvents().at(-1).kind,'just');else assert.ok(g.audioEvents().length>0);
 }
});
