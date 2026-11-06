'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../../assets/encounters.js');
const root=path.join(__dirname,'../..');
const readProjectFile=file=>fs.readFileSync(path.join(root,file),'utf8');

function makeHarness(seed={},devMode=false,artMode='',devSearch='?floor=21&enemy=cantor%3Anormal',artGate=null,failRunSave=false){
 let clock=10000,animation=null,randomOverride=null;const clickers=new Map(),storage=new Map(Object.entries(seed));
 const audioEvents=[],metalEvents=[],contactEvents=[],tailEvents=[],blackouts=[],artDrawCounts={hero:0,enemy:0};let lastHeroPose=null,lastHeroSkin=null,lastEnemySample=null;const bonusArtEvents=[];
 const math=Object.create(Math);math.random=()=>randomOverride===null?Math.random():randomOverride;
 const html=readProjectFile(devMode?'dev.html':'index.html');
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
    if(id==='codexTabs'&&selector==='[data-codex-tab]'){
     if(!this.children.length)this.children=['monsters','skills'].map(tab=>({
      dataset:{codexTab:tab},className:'upgrade-tab',attributes:{},
      setAttribute(k,value){this.attributes[k]=value}
     }));
     return this.children;
    }
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
   if(k==='fillRect')return (...args)=>{if(String(target.fillStyle).startsWith('rgba(3,6,18,'))blackouts.push({color:target.fillStyle,args});};
   if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop:noop});
   if(k==='measureText')return ()=>({width:36});
   return target[k]??noop;
  },set(target,k,v){target[k]=v;return true;}
 });
 el.get('gameCanvas').getContext=()=>ctx;
 const para=()=>({value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop,linearRampToValueAtTime:noop,cancelScheduledValues:noop,setTargetAtTime:noop});
 class Audio{
  // This fake checks scheduling. The SFX unit tests exercise PCM at real output rates.
  constructor(){this.state='running';this.sampleRate=8000;this.destination={}}
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
  ParryAudioClock:require('../../assets/audio-clock.js'),
  ParryPlayerSettings:require('../../assets/player-settings.js'),ParryRunCheckpoint:require('../../assets/run-checkpoint.js'),ParryEncounters:P,ParryEnemyMotions:require('../../assets/enemy-motions.js'),ParryProgression:require('../../assets/progression.js'),ParryRelics:require('../../assets/relics.js'),ParryRoutes:require('../../assets/routes.js'),ParryEvents:require('../../assets/events.js'),AudioContext:Audio,devicePixelRatio:1,addEventListener:(type,listener)=>{windowListeners[type]=listener}
 };
 window.ParryStageMusic=require('../../assets/stage-music');
 window.ParryFinalBossMusic=require('../../assets/final-boss-music');
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
 vm.runInNewContext(readProjectFile('assets/save-store.js'),context,{filename:'save-store.js'});
 vm.runInNewContext(readProjectFile('assets/combat-math.js'),context,{filename:'combat-math.js'});
 vm.runInNewContext(readProjectFile('assets/skills.js'),context,{filename:'skills.js'});
 vm.runInNewContext(readProjectFile('assets/run-state.js'),context,{filename:'run-state.js'});
 vm.runInNewContext(readProjectFile('assets/music.js'),context,{filename:'music.js'});
 vm.runInNewContext(readProjectFile('assets/audio-session.js'),context,{filename:'audio-session.js'});
 vm.runInNewContext(readProjectFile('assets/combat-sfx.js'),context);
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
   vm.runInNewContext(readProjectFile('assets/'+name+'.js'),context,{filename:name+'.js'});
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
 const source=readProjectFile('assets/game.js');
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
  const strikeForAnalysis=kind=>strikeResult(kind,performance.now());
  window.__parryBloodTest={
   survivalAnalysis:{
    configure({skills,maxHp,shield,baseAttack,relics,wardInheritance}){
     Object.assign(game,{lv:{...skills},maxHp,hp:maxHp,rawMaxHp:maxHp,shield,baseAtk:baseAttack,
      combo:0,charge:0,reviveUsed:true,relics:[...relics]});
     game.bonuses={regen:0,revive:0,bossWard:0,wardInheritance};
    },
    strike:strikeForAnalysis,
    replenishRelicShield:amount=>relicShield(amount),
    beginTrials(){
     // Only used in a dedicated analysis harness. Keep combat ordering while
     // skipping presentation, scheduling, saves and the game-over screen.
     const noop=()=>{};
     showText=puff=feedback=syncHUD=musicParry=triggerClashFX=sound=chord=nextStrike=checkpoint=noop;
     die=()=>{game.mode='gameover';};
     const template=JSON.stringify(game);
     return {
      reset(){game=JSON.parse(template);game.mode='combat';},
      strike(kind){
       strikeForAnalysis(kind);
       // Enter the second movement without waiting through the countdown.
       if(game.mode==='phase'){game.mode='combat';game.enemy.phase=2;}
       return game.mode;
      }
     };
    }
   },
   presentation:()=>({contact:attackPresentation.contact?{...attackPresentation.contact}:null,clash:clashFX?{...clashFX}:null}),
   fallbackSfx:legacy=>{if(legacy){delete window.ParryCombatSfx.playContact;delete window.ParryCombatSfx.playTail;}else window.ParryCombatSfx=null;},
   musicTheme:()=>score.music,
   musicBus:()=>score.bus,audioContext:()=>audio.context,
   mixGains:()=>({bgm:score.bus?.gain.value,steel:audio.devBus?.gain.value}),
   phaseDrawLabels:()=>phaseDrawLabels.map(x=>({...x})),
   clearPhaseDrawLabels:()=>{phaseDrawLabels.length=0},
   hudDrawLabels:()=>hudDrawLabels.map(x=>({...x})),
   clearHudDrawLabels:()=>{hudDrawLabels.length=0},
   hits:()=>hitLog.map(h=>({...h})),
   resetHits:()=>{hitLog.length=0},
   rewardPool:()=>choosePool().map(skill=>skill.id),
   incoming:n=>applyDamage(n,'TEST'),
   setShield:ward=>{game.shield=ward},
   setRunBonus:(id,value)=>{game.bonuses[id]=value},
   recoverOutside:amount=>heal(amount),
   bonus:id=>runBonus(id),
   bulwarkUsed:()=>!!game.relicBulwarkUsed,
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

  preferences:()=>({...preferences,sfxGain:audio.playerBus?.gain.value}),
  checkpoint:()=>{checkpoint();return readCheckpoint()},
  tutorialInfo:()=>({active:game.tutorial,step:game.tutorialStep,finishing:game.tutorialFinishing}),
  calibrationInfo:()=>calibration?{kind:calibration.kind,targets:calibration.targets?.map(t=>scoreToPerf(t,0)),result:calibration.result,errors:calibration.errors?[...calibration.errors]:[]}:null,
  timingInfo:()=>({windup:!motionFor(game.enemy).noWindup,windupLead:motionFor(game.enemy).cuePrepare,recovery:motionFor(game.enemy).recovery,parryWindow:getParryWindow(),target:inputTargetAt(),telegraphStart:game.telegraphStart,guardAtImpact:game.guardAtImpact,lastDeflectAt:game.lastDeflectAt}),
  skillCatalog:()=>SKILLS.map(s=>({id:s.id,max:s.max,desc:level=>describeSkill(s.id,level)})),
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
 if(devMode)vm.runInNewContext(readProjectFile('assets/dev-tools.js'),{
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
  blackouts:()=>blackouts.map(x=>({...x})),clearBlackouts:()=>{blackouts.length=0},
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

module.exports={makeHarness};
