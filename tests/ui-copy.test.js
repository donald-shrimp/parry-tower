'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');

test('route selection is self-explanatory, without duplicated HP/coins or instruction',()=>{
 const game=read('assets/game.js');
 for(const page of ['index.html','dev.html']){
  const html=read(page);
  assert.doesNotMatch(html,/id="routeHint"|進む道を選べ。/);
  assert.doesNotMatch(html,/この報酬では引き直し・HP回復はできません。/);
  assert.match(html,/id="hpText"/);
  assert.match(html,/id="towerCoinsLabel"/);
 }
 assert.doesNotMatch(game,/\$\('routeHint'\)|現在HP .*進む道を選べ/);
 assert.match(game,/room\.risk/,'risk/reward consequences remain visible on route options');
});

test('redundant hints and tags are absent, while effect and risk details remain',()=>{
 const game=read('assets/game.js');
 const css=read('assets/style.css');
 for(const phrase of [
  '各候補の効果を確認しよう',
  'この階の通常スキル報酬はありません。',
  '塔貨を次の商人まで温存する',
  '実際の不足分だけ',
  '遺物を交換しない',
  '成功確率40%。',
  '手放す遺物を選ぼう。',
  '交換する →',
 ]){
  assert.ok(!game.includes(phrase),phrase);
 }
 assert.doesNotMatch(game,/class="rtag"/);
 assert.doesNotMatch(css,/\.reward-card \.rtag|\.relic-replace-card>span:last-child/);
 assert.match(game,/class="rdesc"/);
 assert.match(game,/class="relic-reward-desc"/);
 assert.match(game,/class="relic-replace-card"/);
 assert.match(game,/交換が確定するまで、元の遺物は失われません。/);
 assert.match(game,/取り外した遺物は、このランでは再取得できません。/);
 assert.match(game,/イベントの支払いは被弾扱いになりません。/);
 assert.match(game,/失敗してもHP1で生存。/);
 assert.match(game,/ラン中の通常抽選は変わりません。/);
 assert.match(game,/初期装備中のスキルは封印できません。/);
});
