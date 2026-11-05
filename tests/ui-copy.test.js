'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');

test('run choices show the consequences of spending, replacing or discarding items',()=>{
 const game=read('assets/game.js');
 const routes=read('assets/routes.js');
 assert.match(game,/room\.risk/);
 assert.match(game,/交換が確定するまで、元の遺物は失われません。/);
 assert.match(game,/取り外した遺物は、このランでは再取得できません。/);
 assert.match(game,/イベントの支払いは被弾扱いになりません。/);
 assert.match(game,/失敗してもHP1で生存。/);
 assert.match(game,/戦利品の抽選から除外/);
 assert.match(game,/ラン中の通常抽選は変わりません/);
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
