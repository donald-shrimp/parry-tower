'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const RT=require('../assets/routes.js');
test('crossroads replace only positions 4 and 8, every ten floors, preserving 3F, 5F, 9F, 10F',()=>{
 for(let cycle=0;cycle<25;cycle++){
  for(let position=1;position<=10;position++){
   const floor=cycle*10+position;
   const expected=position===4?'first':position===8?'second':null;
   assert.equal(RT.branchKind(floor),expected,`floor ${floor}`);
  }
 }
 for(const value of [0,-1,NaN,Infinity,4.5,'4',null])assert.equal(RT.branchKind(value),null);
});
test('4F and 8F offer three specific rooms and never inject bosses or hardcoded enemy overwrites',()=>{
 assert.deepEqual(RT.options(4).map(x=>x.id),['rest','merchant','trial']);
 assert.deepEqual(RT.options(8).map(x=>x.id),['rest','event','trial']);
 assert.deepEqual(RT.options(14).map(x=>x.id),['rest','merchant','trial']);
 assert.deepEqual(RT.options(18).map(x=>x.id),['rest','event','trial']);
 assert.deepEqual(RT.options(3),[]);
 assert.equal(RT.ROOMS.trial.risk.includes('戦闘あり'),true);
 assert.equal(RT.isBattle('trial'),true);
 for(const id of ['rest','merchant','event'])assert.equal(RT.isBattle(id),false);
});
test('run tower coins reward normal enemies 6, elite/rare 12, bosses 10, selected trial 14',()=>{
 assert.equal(RT.towerCoins({}),6);
 assert.equal(RT.towerCoins({elite:true}),12);
 assert.equal(RT.towerCoins({rare:true}),12);
 assert.equal(RT.towerCoins({boss:true,elite:true}),10);
 assert.equal(RT.towerCoins({elite:true},true),14);
 assert.equal(RT.towerCoins(null),0);
 assert.equal(RT.towerCoins({boss:true},true),14);
});

test('trial route hints at unknown elites without changing existing rewards or branching',()=>{
 assert.match(RT.ROOMS.trial.risk,/正体不明/);
 assert.equal(RT.towerCoins({elite:true,preview:true},true),14);
 assert.deepEqual(RT.options(4).map(x=>x.id),['rest','merchant','trial']);
});
