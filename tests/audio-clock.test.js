'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{create}=require('../assets/audio-clock');
const input=(perf,extra={})=>({audio:perf/1000,perf,state:'running',stamp:{contextTime:perf/1000,performanceTime:perf},...extra});
test('healthy output mapping retains real output delay and a fixed attack deadline',()=>{
 const c=create();
 for(let perf=10000;perf<=20000;perf+=50){
  const s=c.sample(input(perf,{stamp:{contextTime:perf/1000-.12,performanceTime:perf}}));
  assert.equal(s.source,'output');assert.ok(Math.abs(15000+s.offset-15120)<.001);
 }
 assert.equal(c.snapshot().fallbacks,0);
});
test('a moving performance timestamp with a frozen context timestamp cannot chase the attack into the future',()=>{
 const c=create();
 for(let perf=10000;perf<=20000;perf+=50){
  const s=c.sample(input(perf,{stamp:{contextTime:10,performanceTime:perf}}));
  assert.equal(s.healthy,true);
  if(perf>=10100){assert.equal(s.source,'audio');assert.ok(Math.abs(s.offset)<.001);}
 }
 assert.equal(c.snapshot().fallbacks,1);
 const restored=c.sample(input(20050));assert.equal(restored.source,'output');
 assert.equal(c.snapshot().events.at(-1).kind,'recovered');
});
test('a completely frozen output timestamp is discarded while the audio clock advances',()=>{
 const c=create();c.sample(input(10000));
 const s=c.sample(input(10600,{stamp:{contextTime:10,performanceTime:10000}}));
 assert.equal(s.source,'audio');assert.equal(s.reason,'timestamp-stalled');assert.equal(s.offset,0);
});
test('invalid, future, reversed and throwing timestamps cannot poison a usable audio clock',()=>{
 for(const extra of [
  {stamp:{contextTime:NaN,performanceTime:Infinity}},
  {stamp:{contextTime:0,performanceTime:0}},
  {stamp:{contextTime:50,performanceTime:10000}},
  {stamp:{contextTime:10,performanceTime:20000}},
  {stampError:true},
 ]){
  const c=create(),s=c.sample(input(10000,extra));assert.equal(s.source,'audio');assert.equal(s.healthy,true);assert.ok(Number.isFinite(s.offset));
 }
 const c=create();c.sample(input(10000));assert.equal(c.sample(input(10100,{stamp:{contextTime:9,performanceTime:9900}})).source,'audio');
});
test('stopped, interrupted, nonfinite or discontinuous audio clocks request a safe stop',()=>{
 const c=create();c.sample(input(10000));c.sample(input(10500,{audio:10}));
 assert.equal(c.sample(input(11001,{audio:10})).reason,'audio-stalled');
 c.paused(11001);assert.equal(c.snapshot().pauses,1);
 for(const extra of [{state:'suspended'},{state:'interrupted'},{state:'closed'},{audio:NaN},{audio:9},{audio:40}]){
  c.reset();c.sample(input(10000));assert.equal(c.sample(input(10050,extra)).healthy,false);
 }
 c.reset();assert.equal(c.sample(input(30000)).healthy,true);assert.equal(c.snapshot().pauses,1);
});
test('fallback preserves the last trusted output delay and never learns increasing delays from duplicate samples',()=>{
 const c=create();c.sample(input(10000,{stamp:{contextTime:9.88,performanceTime:10000}}));
 c.sample(input(10050,{stamp:{contextTime:9.88,performanceTime:10050}}));
 const s=c.sample(input(10200,{stamp:{contextTime:9.88,performanceTime:10200}}));
 assert.equal(s.source,'audio');assert.ok(Math.abs(s.offset-120)<.001);
 const initial=create().sample(input(10000,{stamp:null,latencyHint:75}));assert.equal(initial.offset,75);
});
test('diagnostics are bounded and repeated bad samples do not grow the log',()=>{
 const c=create();for(let i=0;i<30;i++){c.reset();c.sample(input(10000,{stampError:true}));c.paused(10000);}
 const before=c.snapshot();assert.equal(before.events.length,8);
 for(let i=0;i<100;i++)c.sample(input(10000,{stampError:true}));
 assert.deepEqual(c.snapshot(),before);
 const copy=c.snapshot();copy.events[0].reason='edited';assert.notEqual(c.snapshot().events[0].reason,'edited');
});
