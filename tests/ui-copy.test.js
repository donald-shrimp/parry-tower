'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');

test('run choices show the consequences of spending, replacing or discarding items',()=>{
 const routes=read('assets/routes.js');
 const roomView=require('../assets/room-view.js'),RT=require('../assets/routes.js'),EV=require('../assets/events.js');
 const roomInput={room:RT.ROOMS.event,status:{coins:0,hp:65,maxHp:65,shield:0}};
 const shop=require('../assets/shop-view.js');
 const shopInput={meta:{coins:0},permanent:require('../assets/progression.js').defaults(),
  bonusView:'items',skillContext:{baseAtk:25,bladeLevel:0,baseHp:65}};
 assert.match(roomView.routes(RT.options(4)),/通常スキル報酬なし・コンボ維持/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.mirror,stage:'mirror'}).description,/交換が確定するまで、元の遺物は失われません。/);
 const relicView=require('../assets/rewards-view.js').relics({
  offered:[],selected:require('../assets/relics.js').RELICS[0],held:[],heldCount:3
 });
 assert.match(relicView.hint,/取り外した遺物は、このランでは再取得できません。/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.altar,options:[{id:'sacrifice',available:true,value:8}]}).actionsHtml,/イベントの支払いは被弾扱いになりません。/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.chest,options:[{id:'open',available:true,hasRelics:true}]}).actionsHtml,/失敗してもHP1で生存。/);
 assert.match(shop.render({...shopInput,tab:'seal'}).listHtml,/戦利品の抽選から除外/);
 assert.match(shop.render({...shopInput,tab:'loadout'}).listHtml,/ラン中の通常抽選は変わりません/);
 assert.match(routes,/通常スキル報酬なし・コンボ維持/);
 assert.match(routes,/ラン限定の強化/);
});

test('setup and Dev disclose save replacement and practice exceptions',()=>{
 for(const page of ['index.html','dev.html']){
  const html=read(page);
  assert.match(html,/今の中断データを置き換え、1Fから始めます/);
 }
 const dev=read('dev.html');
 assert.match(dev,/無敵練習中はふんどしでも死にません/);
 assert.match(dev,/入力補正は保存しません/);
});
