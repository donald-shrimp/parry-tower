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
 assert.doesNotMatch(game,/初期装備中のスキルは封印できません。/);
 assert.match(game,/装備中/,'equipped items retain a clear unavailable state');
});

test('shop, routes and room interactions show outcomes without redundant instructions',()=>{
 const game=read('assets/game.js');
 const progression=read('assets/progression.js');
 const routes=read('assets/routes.js');
 const redundant=[
  '変更は無料。','（最大強化）','封印と解除は何度でも無料。',
  '枠使用中（最大4枠）','封印中 · 戦利品に出現しません',
  '購入済み · ','塔貨は消費しません','対象を選んで購入',
  'Lv.+1する習得済みスキルを選択','研磨する所持遺物を選択'
 ];
 for(const text of redundant)assert.ok(!game.includes(text),text);
 assert.match(game,/装備したスキルはLv.1で開始/);
 assert.match(game,/ラン中の通常抽選は変わりません/);
 assert.match(game,/封印枠 /);
 assert.match(game,/戦利品の抽選から除外/);
 assert.match(game,/equipped=permanent\.equipped\.includes\(skill\.id\)/,'equipped seals are still blocked in game logic'); 
 assert.match(game,/取り外した遺物は、このランでは再取得できません/);
 assert.match(game,/const rescue=grantRescueRewards\(\)/,'rescue payments remain wired');
 assert.match(game,/累計挑戦ボーナス/,'existing gameover reward presentation stays');
 assert.doesNotMatch(routes,/塔貨が続く限り連続購入可|戦闘なし・/);
 assert.match(routes,/通常スキル報酬なし・コンボ維持/);
 assert.match(routes,/ラン限定の強化/);
 assert.doesNotMatch(progression,/紅・紫・翠から選べます/);
 assert.match(progression,/いつものルールで塔に挑戦。/,'normal-skin flavor is preserved');
 assert.match(progression,/か、かわいい〜〜〜！！/,'skin flavor is preserved');
});

test('setup and developer controls omit self-evident instructions but keep special rules',()=>{
 for(const page of ['index.html','dev.html']){
  const html=read(page);
  assert.doesNotMatch(html,/音の拍に合わせて押して、おすすめの補正を測れます/);
  assert.match(html,/おすすめ補正を測る/);
  assert.match(html,/今の中断データを置き換え、1Fから始めます/);
 }
 const dev=read('dev.html');
 assert.doesNotMatch(dev,/設定を変えたら「指定条件で開始」|選んで「指定条件で開始」/);
 assert.doesNotMatch(dev,/ボタンで音楽だけを試聴できます|戦闘中も変更できます/);
 assert.match(dev,/無敵練習中はふんどしでも死にません/);
 assert.match(dev,/入力補正は保存しません/);
 assert.match(dev,/認証付き管理画面ではありません/);
});
