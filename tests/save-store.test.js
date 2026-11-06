'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../assets/save-store.js');

test('storage round-trips JSON and raw offsets without changing existing keys or fallback semantics',()=>{
 const entries=new Map();
 const store=create({storage:()=>({
  getItem:key=>entries.has(key)?entries.get(key):null,
  setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)
 })});
 assert.equal(store.readJson('missing').value,null);
 assert.deepEqual(store.readJson('missing',{}).value,{});
 assert.equal(store.writeJson('run',{version:1,game:{hp:65}}).ok,true);
 assert.deepEqual(store.readJson('run').value,{version:1,game:{hp:65}});
 store.writeText('offset',-35);
 assert.equal(store.readText('offset').value,'-35');
 entries.set('empty','');entries.set('null','null');entries.set('broken','{');
 assert.deepEqual(store.readJson('empty',{}).value,{});
 assert.equal(store.readJson('null',{}).value,null);
 assert.equal(store.readText('empty').value,'');
 assert.equal(store.readJson('broken').ok,false);
 assert.equal(store.readJson('broken').value,null);
 assert.equal(store.remove('run').ok,true);
 assert.equal(entries.has('run'),false);
});

test('unavailable storage and serialization failures return errors instead of escaping',()=>{
 const blocked=new Error('blocked');
 const denied=create({storage:()=>{throw blocked;}});
 for(const result of [denied.readText('x'),denied.readJson('x'),denied.writeJson('x',{}),denied.remove('x')]){
  assert.equal(result.ok,false);assert.equal(result.error,blocked);
 }
 let writes=0;
 const store=create({storage:()=>({setItem(){writes++;}})});
 const cycle={};cycle.self=cycle;
 assert.equal(store.writeJson('cycle',cycle).ok,false);
 assert.equal(writes,0);
});

test('read-only Dev store permits reads but neither serializes nor accesses storage for mutations',()=>{
 let accesses=0;
 const store=create({writable:false,storage:()=>{accesses++;return {getItem:()=>'{"coins":10}'};}});
 assert.equal(store.readJson('meta').value.coins,10);
 const value={toJSON(){throw Error('must not serialize');}};
 for(const result of [store.writeJson('meta',value),store.writeText('offset',12),store.remove('run'),store.writeCheckpoint('run',value,{discardOnFailure:true})]){
  assert.equal(result.ok,true);assert.equal(result.skipped,true);
 }
 assert.equal(accesses,1);
});

test('failed auto-save discards stale checkpoint but manual suspension preserves it',()=>{
 const quota=new Error('quota'),cleanupError=new Error('remove denied');
 let removals=0,failCleanup=false;
 const store=create({storage:()=>({
  setItem(){throw quota;},removeItem(){removals++;if(failCleanup)throw cleanupError;}
 })});
 assert.equal(store.writeCheckpoint('run',{}).error,quota);
 assert.equal(removals,0);
 const auto=store.writeCheckpoint('run',{},{discardOnFailure:true});
 assert.equal(auto.error,quota);assert.equal(auto.cleanup.ok,true);assert.equal(removals,1);
 failCleanup=true;
 const failed=store.writeCheckpoint('run',{},{discardOnFailure:true});
 assert.equal(failed.error,quota);assert.equal(failed.cleanup.error,cleanupError);
});
