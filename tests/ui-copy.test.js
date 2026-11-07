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
 const routeCards=roomView.routes(RT.options(4));
 assert.doesNotMatch(routeCards,/route-warning|通常スキル報酬なし|コンボ維持/);
 assert.match(routeCards,/route-card-heading/);
 assert.match(routeCards,/HP35%回復/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.mirror,stage:'mirror'}).description,/交換が確定するまで、元の遺物は失われません。/);
 const relicView=require('../assets/rewards-view.js').relics({
  offered:[],selected:require('../assets/relics.js').RELICS[0],held:[],heldCount:3
 });
 assert.match(relicView.hint,/取り外した遺物は、このランでは再取得できません。/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.altar,options:[{id:'sacrifice',available:true,value:8}]}).actionsHtml,/イベントの支払いは被弾扱いになりません。/);
 assert.match(roomView.render({...roomInput,event:EV.BY_ID.chest,options:[{id:'open',available:true,hasRelics:true}]}).actionsHtml,/失敗してもHP1で生存。/);
 assert.match(shop.render({...shopInput,tab:'seal'}).listHtml,/戦利品の抽選から除外/);
 assert.match(shop.render({...shopInput,tab:'loadout'}).listHtml,/ラン中の通常抽選は変わりません/);
 assert.match(routes,/ラン限定の強化/);
});

test('short reward headings also clean up restored legacy titles and event gains remain accurate',()=>{
 const rewards=require('../assets/rewards-view.js'),rooms=require('../assets/room-view.js');
 const RT=require('../assets/routes.js'),EV=require('../assets/events.js');
 for(const source of ['秘伝の巻物','血の祭壇','共鳴の聖堂']){
  const view=rewards.eventSkills({choices:[],levels:{},title:source+' — スキルをひとつ選べ'});
  assert.equal(view.title,source);
 }
 assert.equal(rewards.eventSkills({choices:[],levels:{},title:'スキルをひとつ選べ'}).title,'スキル獲得');
 const result=rooms.render({room:RT.ROOMS.event,event:EV.BY_ID.scales,
  status:{coins:20,hp:65,maxHp:65,shield:0},
  options:[{id:'toSouls',available:true,value:25},{id:'toCoins',available:true,value:35}]});
 assert.equal((result.actionsHtml.match(/魂の欠片\+25/g)||[]).length,1);
 assert.ok((result.actionsHtml.match(/塔貨\+35/g)||[]).length>=1);
 assert.match(result.actionsHtml,/死亡しない/);
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
