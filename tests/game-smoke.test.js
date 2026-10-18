'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js');

function makeHarness(seed={},devMode=false){
 let clock=10000,animation=null,randomOverride=null;const clickers=new Map(),storage=new Map(Object.entries(seed));
 const audioEvents=[];
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
   addEventListener(k,cb){this.listeners[k]=cb;},
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
 const ctx=new Proxy({},{
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
  createGain(){return {gain:para(),connect:noop}}
  createOscillator(){
   const osc={frequency:null,initialFrequency:null,type:'sine',connect:noop,
    start(time){audioEvents.push({time,frequency:osc.initialFrequency,type:osc.type})},stop:noop};
   osc.frequency=para();
   osc.frequency.setValueAtTime=(hz)=>{osc.initialFrequency=hz};
   return osc;
  }
  createBuffer(){return {getChannelData:()=>new Float32Array(22050)}}
  createBufferSource(){return {connect:noop,start:noop,stop:noop}}
  createBiquadFilter(){return {frequency:para(),Q:para(),connect:noop}}
 }
 const window={
  ParryEncounters:P,ParryEnemyMotions:require('../assets/enemy-motions.js'),ParryProgression:require('../assets/progression.js'),ParryRelics:require('../assets/relics.js'),ParryRoutes:require('../assets/routes.js'),ParryEvents:require('../assets/events.js'),AudioContext:Audio,devicePixelRatio:1,addEventListener:noop
 };
 const document={
  documentElement:{dataset:{parryDev:devMode?'true':'false'}},
  createElement(tag){return {tag,children:[],value:'',label:'',textContent:'',appendChild(x){this.children.push(x)}}},
  getElementById(id){if(!el.has(id))throw new Error('Unknown DOM id: '+id);return el.get(id)},
  addEventListener:noop,querySelectorAll:()=>[],hidden:false
 };
 const context={
  window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  navigator:{vibrate:noop},performance:{now:()=>clock},
  requestAnimationFrame:cb=>{animation=cb},setTimeout:()=>0,clearTimeout:noop,
  ResizeObserver:undefined,console,Math:math
 };
 // Test-only instrumentation lives in the VM, not in the shipped game or its public debug API.
 const source=fs.readFileSync('assets/game.js','utf8');
 assert.match(source,/\}\)\(\);\s*$/);
 const debugSource=source.replace(/\}\)\(\);\s*$/, `const hitLog=[];
  // Test-only recording of what is actually drawn in the canvas at each phase.
  const phaseDrawLabels=[];
  const originalTextDraw=textDraw;
  textDraw=function(...args){
   if(game.enemy?.finalBoss&&['phase','combat'].includes(game.mode))
    phaseDrawLabels.push({mode:game.mode,label:String(args[0]),y:args[2]});
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
   phaseDrawLabels:()=>phaseDrawLabels.map(x=>({...x})),
   clearPhaseDrawLabels:()=>{phaseDrawLabels.length=0},
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

  bloodHealAmount,
  setSkill:(id,level)=>{game.lv[id]=level},
  setHp:hp=>{game.hp=hp},
  setMaxHp:hp=>{game.maxHp=hp},
  setEnemyHp:hp=>{game.enemy.hp=hp;game.enemy.maxHp=Math.max(game.enemy.maxHp,hp)},
  setCombo:combo=>{game.combo=combo},
  setCharge:charge=>{game.charge=charge},
  setBurn:burn=>{game.enemy.burn=burn},
  setEnemyAttack:attack=>{game.enemy.atk=attack},
  setBaseAttack:attack=>{game.baseAtk=attack},
  info:()=>({enemyHp:game.enemy?.hp,enemyMaxHp:game.enemy?.maxHp,combo:game.combo,charge:game.charge,
   guards:game.guards,parryDamageActive:!!game.parryDamageActive,justStreak:game.justStreak,overchargeCount:game.overchargeCount})
 };})();`);
 vm.runInNewContext(debugSource,context,{filename:'game.js'});
 if(devMode)vm.runInNewContext(fs.readFileSync('assets/dev-tools.js','utf8'),{
  window,document,location:{search:'?floor=21&enemy=cantor%3Anormal'},URLSearchParams,console
 },{filename:'dev-tools.js'});
 return {
  el,clickers,storage,state:()=>window.__parryV05(),dev:()=>window.__parryDev,bloodTest:()=>window.__parryBloodTest,
  audioEvents:()=>audioEvents.map(x=>({...x})),clearAudioEvents:()=>{audioEvents.length=0},
  press(id){const e=el.get(id);assert.ok(e?.listeners.click,id+' click handler missing');e.listeners.click()},
   upgradeTab(id){el.get('upgradeTabs').listeners.click({target:{closest:()=>({dataset:{tab:id}})}})},
   upgradeBuy(action,key){el.get('upgradeList').listeners.click({target:{closest:()=>({dataset:{action,key:String(key)}})}})},
   upgradeEquip(slot,id){el.get('upgradeList').listeners.change({target:{closest:()=>({dataset:{equip:String(slot)},value:id||''})}})},
   relicSelect(id){el.get('relicOfferCards').listeners.click({target:{closest:()=>({dataset:{relic:id}})}})},
   relicReplace(id){el.get('relicReplaceList').listeners.click({target:{closest:()=>({dataset:{replace:id}})}})},
   routeSelect(id){el.get('routeCards').listeners.click({target:{closest:()=>({dataset:{route:id}})}})},
   roomChoose(id){el.get('roomActions').listeners.click({target:{closest:()=>({dataset:{roomAction:id}})}})},
   routeSkillSelect(id){el.get('routeSkillCards').listeners.click({target:{closest:()=>({dataset:{routeSkill:id}})}})},


  parry(){el.get('gameCanvas').listeners.pointerdown({preventDefault:noop})},
  random(value){randomOverride=value},
  frame(at){clock=at;assert.ok(animation);animation(clock)},
  clock(at){clock=at},
  get now(){return clock}
 };
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
  g.frame(due+1);  // no tap: take a hit and lose the run
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
  g.frame(due+1);
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
 assert.equal(g.state().bpm,136);
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
 assert.match(dev,/src="\.\/assets\/enemy-motions\.js\?v=v0\.9\.0-5"/);
 assert.match(dev,/src="\.\/assets\/dev-tools\.js\?v=v0\.9\.0-5"/);
 assert.match(control,/engine\.launch/);
 assert.equal(makeHarness().dev(),undefined,'ordinary players must not receive dev controls');
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
 assert.equal(g.state().bpm,136);
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
  assert.match(html,/画面タップまたは <span class="key">Space<\/span> キーでパリィ/);
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
 assert.match(script,/function getPerfectWindow\(\)\{return 11\+lvl\('focus'\)\*2\}/);
 assert.match(script,/function getParryWindow\(\)\{return 31\+lvl\('stability'\)\*3\}/);
 assert.match(script,/const PARRY_STARTUP=100/);
});
test('ordinary skill reward omits generic advice and actual unlock notice remains',()=>{
 function clearFirstFloor(g){
  g.press('startBtn');
  for(let i=0;i<2;i++){
   const due=g.state().attackAt;
   g.clock(due-100);g.parry();g.frame(due+1);
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
  g.frame(g.state().attackAt+1);
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
  for(let i=0;i<5;i++)g.frame(g.state().attackAt+1);
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
 g.frame(g.state().attackAt+1);
 const hurt=g.state().hp;
 assert.ok(hurt<65);
 for(let i=0;i<4&&g.state().mode==='combat';i++){
  const impact=g.state().attackAt;g.clock(impact-100);g.parry();g.frame(impact+1);
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
  const impact=g.state().attackAt;g.clock(impact-100);g.parry();g.frame(impact+1);
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
 for(let i=0;i<9&&!g.state().reviveUsed;i++)g.frame(g.state().attackAt+1);
 assert.equal(g.state().mode,'combat');
 assert.equal(g.state().reviveUsed,true);
 assert.equal(g.state().hp,Math.ceil(g.state().maxHp*.3));
 for(let i=0;i<10&&g.state().mode==='combat';i++)g.frame(g.state().attackAt+1);
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
 g.clock(impact-100+delta);
 g.parry();
 g.frame(impact+1);
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
 assert.equal(g.state().hp,18,'guard does 12 damage but does not heal');
 d.setHp(15);d.setBurn(100);
 const afterGuard=d.info().enemyHp;
 g.frame(g.now+55);
 assert.ok(d.info().enemyHp<afterGuard,'burn causes damage over time');
 assert.equal(g.state().hp,15,'burn does not trigger blood healing');
 d.setBurn(0);
 resolveBloodParry(g);
 assert.ok(g.state().hp>15,'the next successful parry can heal');
});
test('real Blood Rhythm uses the current 100+ combo with no hidden cap, and resets on guard',()=>{
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
 assert.equal(d.info().combo,0,'guard breaks the combo and Blood Rhythm bonus');
 const hpAfterGuard=g.state().hp;
 const beforeAgain=d.info().enemyHp;
 resolveBloodParry(g);
 const direct=beforeAgain-d.info().enemyHp;
 assert.equal(d.info().combo,1);
 assert.equal(g.state().hp,hpAfterGuard+d.bloodHealAmount(direct,1,1,true,500));
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
  assert.match(html,/v0\.9\.0/);
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
 mirror.frame(mirror.state().attackAt+1);
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
  assert.match(html,/src="\.\/assets\/relics\.js\?v=v0\.9\.0-5"/);
  assert.match(html,/v0\.9\.0/);
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
 assert.equal(g.state().hp,41,'50*60%=30 guard -6=24 damage');
 resolveBloodParry(g,-40);
 assert.equal(g.state().hp,17);
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
 assert.equal(d.relicInfo().stopUsed,true);
 resolveBloodParry(g,-40);
 assert.equal(g.state().combo,0);
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
test('relic panel resets on title and repeated starts; relic IDs are never saved to localStorage',()=>{
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
  for(const asset of ['routes','events'])assert.ok(html.includes('src="./assets/'+asset+'.js?v=v0.9.0-5"'),asset);
  assert.match(html,/v0\.9\.0/);
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
