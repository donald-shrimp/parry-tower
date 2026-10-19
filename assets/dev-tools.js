/* Developer test console — loaded by dev.html only. Not authentication. */
(() => {
 'use strict';
 const engine=window.__parryDev;
 if(!engine){document.getElementById('devStatus').textContent='開発者APIを読み込めませんでした。';return}
 const $=id=>document.getElementById(id);
 const floor=$('devFloor'),enemy=$('devEnemy'),status=$('devStatus'),balance=$('devBalanceInfo');
 const options=engine.list();
 const group=(title,predicate)=>{
  const optgroup=document.createElement('optgroup');optgroup.label=title;
  for(const item of options.filter(predicate)){
   const opt=document.createElement('option');opt.value=item.key;opt.textContent=item.name+
    (item.rare?' ✦ RARE':item.elite?' ◆ ELITE':item.boss?' ♛ BOSS':'');
   optgroup.appendChild(opt);
  }
  return optgroup;
 };
 enemy.append(group('通常敵',x=>!x.boss&&!x.rare&&!x.elite),
  group('精鋭敵',x=>x.elite&&!x.boss),group('ボス',x=>x.boss),
  group('レア敵',x=>x.rare));
 function renderBalance(){
  const details=engine.preview(floor.value,enemy.value);
  if(!details){balance.textContent='指定した敵のステータスが取得できません';return}
  const multiplier=n=>'×'+n.toFixed(2);
  balance.textContent=details.floor+'F · '+details.name+
   '　HP '+details.maxHp+' ('+multiplier(details.hpMultiplier)+')'+
   '　攻撃力 '+details.atk+' ('+multiplier(details.atkMultiplier)+')'+
   '　※階層・ボス・精鋭倍率適用済み';
 }
 floor.addEventListener('input',renderBalance);
 enemy.addEventListener('change',renderBalance);
 function launch(){
  const f=Math.max(1,Math.min(999,Math.floor(Number(floor.value)||1)));
  floor.value=String(f);
  const key=enemy.value;
  const ok=engine.launch(f,key);
  status.textContent=ok?('開始 '+f+'F / '+(key||'フロア通常抽選')+' — 記録は保存しません'):'指定した敵が見つかりません';
  renderBalance();
 }
 $('devLaunch').addEventListener('click',launch);
 $('devReset').addEventListener('click',()=>{
  engine.reset();
  status.textContent='初期画面に戻りました。ゲーム内の保存データは変更していません。';
 });
 // Support explicit test URLs without starting audio until the player presses Launch.
 const params=new URLSearchParams(location.search),targetFloor=Number(params.get('floor'));
 if(Number.isFinite(targetFloor)&&targetFloor>=1&&targetFloor<=999)floor.value=String(Math.floor(targetFloor));
 const requestedEnemy=params.get('enemy');
 const requestedKey=options.find(v=>v.key===requestedEnemy)?.key||options.find(v=>v.key===requestedEnemy+':normal')?.key||options.find(v=>v.key===requestedEnemy+':rare')?.key;
 if(requestedKey)enemy.value=requestedKey;
 renderBalance();
 window.__parryDevUI={launch,renderBalance,enemyCount:options.length};
})();
