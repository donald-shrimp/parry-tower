'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js');

function makeHarness(seed={},devMode=false){
 let clock=10000,animation=null;const clickers=new Map(),storage=new Map(Object.entries(seed));
 const html=fs.readFileSync(devMode?'dev.html':'index.html','utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const required=['codexCover','practiceBtn','practiceEnemy','codexList','zoneLabel','gameCanvas','upgradeCover','upgradeList','upgradeTabs'];
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
  createOscillator(){return {frequency:para(),type:'sine',connect:noop,start:noop,stop:noop}}
  createBuffer(){return {getChannelData:()=>new Float32Array(22050)}}
  createBufferSource(){return {connect:noop,start:noop,stop:noop}}
  createBiquadFilter(){return {frequency:para(),Q:para(),connect:noop}}
 }
 const window={
  ParryEncounters:P,ParryEnemyMotions:require('../assets/enemy-motions.js'),ParryProgression:require('../assets/progression.js'),AudioContext:Audio,devicePixelRatio:1,addEventListener:noop
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
  ResizeObserver:undefined,console
 };
 vm.runInNewContext(fs.readFileSync('assets/game.js','utf8'),context,{filename:'game.js'});
 if(devMode)vm.runInNewContext(fs.readFileSync('assets/dev-tools.js','utf8'),{
  window,document,location:{search:'?floor=21&enemy=cantor%3Anormal'},URLSearchParams,console
 },{filename:'dev-tools.js'});
 return {
  el,clickers,storage,state:()=>window.__parryV05(),dev:()=>window.__parryDev,
  press(id){const e=el.get(id);assert.ok(e?.listeners.click,id+' click handler missing');e.listeners.click()},
   upgradeTab(id){el.get('upgradeTabs').listeners.click({target:{closest:()=>({dataset:{tab:id}})}})},
   upgradeBuy(action,key){el.get('upgradeList').listeners.click({target:{closest:()=>({dataset:{action,key:String(key)}})}})},
   upgradeEquip(slot,id){el.get('upgradeList').listeners.change({target:{closest:()=>({dataset:{equip:String(slot)},value:id||''})}})},
  parry(){el.get('gameCanvas').listeners.pointerdown({preventDefault:noop})},
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
 assert.match(dev,/src="\.\/assets\/enemy-motions\.js"/);
 assert.match(dev,/src="\.\/assets\/dev-tools\.js"/);
 assert.match(control,/engine\.launch/);
 assert.equal(makeHarness().dev(),undefined,'ordinary players must not receive dev controls');
});
test('developer page jumps to arbitrary floor and enemy without writing the public saves',()=>{
 const oldMeta=JSON.stringify({coins:27,bestFloor:12,bestCombo:3,runs:2,life:1,attack:0,ward:0});
 const oldBook=JSON.stringify({version:2,seen:{'slime:normal':{encounters:3,firstFloor:1}},defeated:{}});
 const seed={'parryTowerPrototype_v1':oldMeta,'parryTowerBestiary_v1':oldBook,'parryTowerAudioOffset_v05':'5'};
 const g=makeHarness(seed,true),dev=g.dev();
 assert.ok(dev?.isolated);
 assert.equal(dev.list().length,26);
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
