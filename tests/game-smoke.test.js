'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js');

function makeHarness(seed={}){
 let clock=10000,animation=null;const clickers=new Map(),storage=new Map(Object.entries(seed));
 const html=fs.readFileSync('index.html','utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const required=['codexCover','practiceBtn','practiceEnemy','codexList','zoneLabel','gameCanvas'];
 for(const id of required)assert.ok(ids.includes(id),id+' is missing in index.html');
 const el=new Map();
 function node(id){
  const n={
   id,hidden:false,dataset:{},style:{},innerHTML:'',textContent:'',value:id==='practiceEnemy'?'knight':id==='codexFilter'?'all':'',disabled:false,listeners:{},
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
  ParryEncounters:P,AudioContext:Audio,devicePixelRatio:1,addEventListener:noop
 };
 const document={
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
 return {
  el,clickers,storage,state:()=>window.__parryV05(),
  press(id){const e=el.get(id);assert.ok(e?.listeners.click,id+' click handler missing');e.listeners.click()},
  parry(){el.get('gameCanvas').listeners.pointerdown({preventDefault:noop})},
  frame(at){clock=at;assert.ok(animation);animation(clock)},
  clock(at){clock=at},
  get now(){return clock}
 };
}
test('title exposes the encyclopedia and only previously encountered enemies become trainable',()=>{
 const g=makeHarness();
 assert.equal(g.state().mode,'title');
 assert.equal(g.el.get('codexCover').hidden,true);
 assert.equal(g.el.get('zoneLabel').textContent,'忘れられた地下墓地');
 assert.match(g.el.get('codexCount').textContent,/0体遭遇済み/);
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
