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
  const practice=$('devPractice').checked;
  const ok=engine.launch(f,key,practice,$('devSkin').value,$('devSkinEffects').checked);
  status.textContent=ok?('開始 '+f+'F / '+(key||'フロア通常抽選')+(practice?' — 無敵練習・記録しません':' — 記録は保存しません')):'指定した敵が見つかりません';
  renderBalance();
 }
 $('devLaunch').addEventListener('click',launch);
 for(const [id,profile]of [['devMerchantGrowing','growing'],['devMerchantCapped','capped']])$(id).addEventListener('click',()=>{
  engine.merchant(profile,$('devSkin').value,$('devSkinEffects').checked);
  status.textContent='行商人の試遊 · 塔貨150 / '+(profile==='capped'?'上限到達ビルド':'育成途中ビルド')+'。1品購入して次の戦闘へ。保存しません。';
 });
 $('devReset').addEventListener('click',()=>{
  engine.reset();
  status.textContent='初期画面に戻りました。ゲーム内の保存データは変更していません。';
 });
 // Support explicit test URLs without starting audio until the player presses Launch.
 const params=new URLSearchParams(location.search),targetFloor=Number(params.get('floor'));
 $('devSkinEffects').checked=params.get('skinEffects')!=='0';
 if(window.ParryProgression.SKINS.some(skin=>skin.id===params.get('skin')))$('devSkin').value=params.get('skin');
 const sfxVolume=$('devSfxVolume'),sfxValue=$('devSfxVolumeValue');
 function setSfxVolume(percent){
  const value=engine.setSfxVolume(percent);sfxVolume.value=String(value);sfxValue.textContent=value+'%';
  sfxVolume.setAttribute('aria-valuetext',value+'%（現在の本編を100%）');
 }
 setSfxVolume(params.has('sfxVolume')?params.get('sfxVolume'):engine.getSfxVolume());
 sfxVolume.addEventListener('input',()=>setSfxVolume(sfxVolume.value));
 $('devSfxOriginal').addEventListener('click',()=>setSfxVolume(100));
 if(Number.isFinite(targetFloor)&&targetFloor>=1&&targetFloor<=999)floor.value=String(Math.floor(targetFloor));
 const requestedEnemy=params.get('enemy');
 const requestedKey=options.find(v=>v.key===requestedEnemy)?.key||options.find(v=>v.key===requestedEnemy+':normal')?.key||options.find(v=>v.key===requestedEnemy+':rare')?.key;
 if(requestedKey)enemy.value=requestedKey;
 $('devPractice').checked=params.get('practice')==='1';
 for(const [id,kind]of [['soundGuard','guard'],['soundParry','parry'],['soundJust','just']]){
  $(id).addEventListener('click',()=>{status.textContent=engine.previewSound(kind)?({'guard':'ガン · ガード','parry':'ガキン！ · パリィ','just':'ジャキーン！ · ジャスト'}[kind]+' を試聴中'):'SOUND ONにしてから試してください';});
 }
 const musicThemes=engine.musicList?.()||[],musicTheme=$('devMusicTheme'),musicVariant=$('devMusicVariant');
 for(const theme of musicThemes){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.from+'–'+theme.to+'F · '+theme.zone;musicTheme.appendChild(option);}
 musicTheme.value=musicThemes.some(t=>t.id===params.get('music'))?params.get('music'):'crypt';
 musicVariant.value=params.get('musicMode')==='boss'?'boss':'normal';
 function renderMusic(){
  const theme=musicThemes.find(t=>t.id===musicTheme.value);
  $('devMusicTitle').textContent=theme?theme.name+(theme.original?' · 現行曲':' · 採用曲'):'BGMを読み込めませんでした';
  $('devMusicDescription').textContent=theme?.description||'';
  $('devMusicInstruments').textContent=theme?'楽器：'+theme.instruments+' · 8小節ループ':'';
  $('devMusicTitle').style.color=theme?.color||'';
 }
 let lastMusicKey='';
 function updateMusic(){
  const skinState=engine.skinState?.();
  if(skinState){const skin=window.ParryProgression.SKINS.find(s=>s.id===skinState.id);
   const text=(skin?.name||'通常')+' · '+(skinState.effects?'効果ON':'外見のみ')+' · HP×'+skinState.hpMultiplier+' / パリィ ±'+skinState.parryWindow+'ms / ジャスト ±'+skinState.justWindow+'ms'+(skinState.id==='spacetime'?' / 遭遇BPM補正 '+(skinState.tempoOffset>0?'+':'')+skinState.tempoOffset:'');
   if($('devSkinStatus').textContent!==text)$('devSkinStatus').textContent=text;
  }
  const state=engine.musicState?.();if(!state)return;
  const key=[state.active,state.audition,state.id,state.bpm,state.bar,state.beat].join(':');if(key===lastMusicKey)return;lastMusicKey=key;
  const name=musicThemes.find(t=>t.id===state.id)?.name||'';
  $('devMusicPulse').dataset.beat=state.active?String(state.beat):'';
  $('devMusicPosition').textContent=state.active?state.bar+' / 8小節 · '+state.beat+'拍目 · '+state.bpm+' BPM':'停止中';
  $('devMusicStop').disabled=!state.audition;
  $('devMusicStatus').textContent=state.active?(state.audition?'試聴中：':'練習中：')+name:'再生ボタンで聴き比べられます。';
 }
 musicTheme.addEventListener('change',renderMusic);
 $('devMusicPlay').addEventListener('click',()=>{
  if(!engine.previewMusic?.(musicTheme.value,musicVariant.value)){$('devMusicStatus').textContent='SOUND ONにしてから試してください。';return;}
  updateMusic();
 });
 $('devMusicStop').addEventListener('click',()=>{engine.stopMusic?.();updateMusic();});
 $('devMusicPractice').addEventListener('click',()=>{
  if(!engine.practiceMusic?.(musicTheme.value,musicVariant.value))return;
  const current=engine.state();floor.value=String(current.floor);enemy.value=current.variant;$('devPractice').checked=true;
  renderBalance();updateMusic();status.textContent='選択したBGMで無敵練習中 · 記録しません';
 });
 if(!musicThemes.length){$('devMusicPlay').disabled=true;$('devMusicPractice').disabled=true;}
 renderMusic();updateMusic();
 renderBalance();
 window.__parryDevUI={launch,renderBalance,updateMusic,enemyCount:options.length};
})();
