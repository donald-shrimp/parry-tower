'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../assets/encounters.js');

function makeHarness(){
 let clock=10000,animation=null;const clickers=new Map(),storage=new Map();
 const html=fs.readFileSync('index.html','utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const required=['codexCover','arenaResultCover','codexBtn','arenaAgainBtn','zoneLabel','gameCanvas'];
 for(const id of required)assert.ok(ids.includes(id),id+' is missing in index.html');
 const el=new Map();
 function node(id){
  const n={
   id,hidden:false,dataset:{},style:{},innerHTML:'',textContent:'',value:id==='practiceEnemy'?'knight':id==='codexFilter'?'all':'',disabled:false,listeners:{},
   addEventListener(k,cb){this.listeners[k]=cb;},
   getBoundingClientRect(){return {width:800,height:500}},
   querySelectorAll(selector){
    if(selector==='[data-arena]'){
     return [...this.innerHTML.matchAll(/data-arena="([^"]+)"/g)].map(m=>{
      const key=m[1],b={dataset:{arena:key},addEventListener(type,cb){clickers.set(key,cb)}};return b;
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
test('loaded game starts at title with all new overlays hidden',()=>{
 const g=makeHarness();
 assert.equal(g.state().mode,'title');
 assert.equal(g.el.get('codexCover').hidden,true);
 assert.equal(g.el.get('arenaResultCover').hidden,true);
 assert.equal(g.el.get('zoneLabel').textContent,'忘れられた地下墓地');
 assert.match(g.el.get('codexCount').textContent,/0体登録/);
});
test('tower victory registers defeated enemy; unlocked arena replay does not grant souls',()=>{
 const g=makeHarness();
 g.press('startBtn');
 assert.equal(g.state().enemy,'slime');
 assert.equal(g.state().arena,false);
 for(let i=0;i<2;i++){
  const due=g.state().attackAt;
  g.clock(due-100);g.parry();
  g.frame(due+1);
 }
 assert.ok(g.state().discovered.includes('slime:normal'));
 const saved=JSON.parse(g.storage.get('parryTowerBestiary_v1'));
 assert.equal(saved.defeated['slime:normal'].wins,1);
 const beforeSouls=g.state().souls;
 g.press('homeBtn');g.press('codexBtn');
 assert.equal(g.state().mode,'codex');
 assert.match(g.el.get('codexList').innerHTML,/data-arena="slime:normal"/);
 g.clickers.get('slime:normal')();
 assert.equal(g.state().arena,true);
 for(let i=0;i<2;i++){
  const due=g.state().attackAt;
  g.clock(due-100);g.parry();g.frame(due+1);
 }
 assert.equal(g.state().mode,'arenaresult');
 assert.equal(g.state().souls,beforeSouls);
 assert.equal(JSON.parse(g.storage.get('parryTowerBestiary_v1')).defeated['slime:normal'].wins,1);
 g.press('arenaReturnBtn');
 assert.equal(g.state().mode,'codex');
});
