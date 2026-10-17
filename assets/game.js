(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const KEY='parryTowerPrototype_v1';const OFFSET_KEY='parryTowerAudioOffset_v05'; // v0.1と同じ保存領域で恒久育成を引き継ぐ
const baseMeta={coins:0,bestFloor:0,bestCombo:0,runs:0,life:0,attack:0,ward:0};
let meta={...baseMeta};try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');for(const k of Object.keys(baseMeta))if(Number.isFinite(s[k]))meta[k]=Math.max(0,Math.floor(s[k]));}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(meta))}catch(e){}};
const SKILLS=[
{id:'blade',icon:'🗡️',name:'剛剣',rarity:'common',max:12,desc:l=>`基礎反撃ダメージ +${25*l}%`,hint:'基礎攻撃'},
{id:'thunder',icon:'⚡',name:'落雷',rarity:'common',max:8,desc:l=>`パリィで雷撃 ${10+12*l} ダメージ`,hint:'連鎖の起点'},
{id:'echo',icon:'🌀',name:'残響',rarity:'rare',max:6,desc:l=>`パリィ後、追撃 ${Math.round(25+l*13)}%`,hint:'雷撃と共鳴'},
{id:'blood',icon:'🩸',name:'吸血',rarity:'common',max:6,desc:l=>`パリィするたびHPを ${l+1} 回復`,hint:'生存能力'},
{id:'fury',icon:'🔥',name:'狂戦士',rarity:'rare',max:6,desc:l=>`コンボごとの攻撃補正 +${l*2}%`,hint:'吸血と共鳴'},
{id:'aegis',icon:'🛡️',name:'魔法障壁',rarity:'common',max:6,desc:l=>`ジャストで障壁を ${3+3*l} 獲得`,hint:'反射と共鳴'},
{id:'thorns',icon:'🪞',name:'反射',rarity:'rare',max:6,desc:l=>`ガード時に攻撃力の ${30+l*18}% を反射`,hint:'障壁と共鳴'},
{id:'precision',icon:'🎯',name:'一点集中',rarity:'common',max:6,desc:l=>`ジャスト反撃倍率 +${l*35}%`,hint:'奥義と共鳴'},
{id:'focus',icon:'👁️',name:'心眼',rarity:'common',max:4,desc:l=>`ジャスト判定を ±${11+l*2}ms に拡張`,hint:'操作補助'},
{id:'stability',icon:'🍀',name:'静かな呼吸',rarity:'common',max:4,desc:l=>`通常パリィを ±${31+l*3}ms に拡張`,hint:'操作補助'},
{id:'ember',icon:'☄️',name:'灼熱',rarity:'common',max:6,desc:l=>`パリィで炎の継続ダメージ +${l*7}`,hint:'処刑と共鳴'},
{id:'execute',icon:'💀',name:'処刑人',rarity:'rare',max:6,desc:l=>`残HP35%以下の敵への攻撃 +${l*23}%`,hint:'炎と共鳴'},
{id:'tempo',icon:'⏳',name:'緩慢の呪い',rarity:'rare',max:4,desc:l=>`敵の攻撃間隔が ${l*7}% 長くなる`,hint:'テンポ操作'},
{id:'pulse',icon:'🌟',name:'共鳴波',rarity:'rare',max:6,desc:l=>`${8}コンボごとに衝撃波 +${l*42} ダメージ`,hint:'コンボ特化'},
{id:'rune',icon:'🔮',name:'奥義紋',rarity:'epic',max:6,desc:l=>`奥義の威力 +${l*45}%`,hint:'集中と共鳴'},
{id:'gamble',icon:'🥀',name:'背水',rarity:'rare',max:6,desc:l=>`自分のHPが半分未満なら攻撃 +${l*30}%`,hint:'危険な火力'},
{id:'heal',icon:'💗',name:'生命の器',rarity:'common',max:6,desc:l=>`最大HP +${l*15}、取得時にも回復`,hint:'持久戦'},
{id:'double',icon:'🎲',name:'双撃',rarity:'epic',max:5,desc:l=>`${14+l*9}% の確率で反撃が2倍`,hint:'一撃の爆発力'}
];
const SK=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const SYNERGIES=[
 {a:'thunder',b:'echo',name:'⚡ 雷鳴残響',desc:'追撃のたびに雷が再落下'},
 {a:'blood',b:'fury',name:'🩸 血の律動',desc:'コンボ数に応じて吸血量増加'},
 {a:'aegis',b:'thorns',name:'🪞 鏡壁の反撃',desc:'ジャスト時に障壁の一部を攻撃に転換'},
 {a:'ember',b:'execute',name:'☄️ 紅蓮処刑',desc:'瀕死の敵に炎の蓄積を一気に放出'},
 {a:'rune',b:'precision',name:'🔮 時空切断',desc:'奥義の発動時に追加の斬撃'}
];
const ENEMIES=[
 {id:'slime',name:'残響スライム',kind:'slime',rhythm:[4,4],color:'#76dec5'},
 {id:'knight',name:'錆びた騎士',kind:'knight',rhythm:[2,2,3,1],color:'#d0a5da'},
 {id:'rogue',name:'影の暗殺者',kind:'rogue',rhythm:[1.5,1.5,2,3],color:'#ee819a'},
 {id:'wraith',name:'塔の亡霊',kind:'wraith',rhythm:[3,2,2,4],color:'#89b0fa'}
];
const BOSS={id:'guardian',name:'鐘楼の守護者',kind:'guardian',rhythm:[2,2,1,3,1,3],color:'#ffcc86'};
let game={mode:'title'},w=800,h=500,dpr=1,lastT=performance.now(),particles=[],texts=[],shake=0,flash=0,flashColor='#fff',audioEnabled=true,audioContext=null,choiceSet=[],cuePlayed=false;
let pausedFrom='combat',pauseAt=0,screenOffset=0;
// Visual effects use the wall-clock only; never modify AudioContext, strike timestamps or hitboxes.
let clashFX=null;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// 盾が動き始めてから刃を弾くまでの先行入力。瞬間反応ではなく、モーションを覚える設計。
const PARRY_STARTUP=100;
// 攻撃の発生タイミングはすべて「武器／身体が盾に触れる瞬間」。
// 攻撃モーションの長さだけを種類ごとに変え、判定時刻は同じ基準に揃える。
const MOTIONS={
 slime:{swing:315,prepare:830,reach:49,stage:110,recovery:410,accent:'#8ef9de'},
 knight:{swing:270,prepare:850,reach:110,stage:130,recovery:380,accent:'#eee0ff'},
 rogue:{swing:175,prepare:635,reach:110,stage:155,recovery:330,accent:'#ffc0d2'},
 wraith:{swing:300,prepare:790,reach:108,stage:110,recovery:440,accent:'#a2dbff'},
 guardian:{swing:360,prepare:980,reach:130,stage:145,recovery:520,accent:'#ffdb92'}
};
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const motionFor=e=>MOTIONS[e.kind]||MOTIONS.knight;
// ---- Music and combat share a Web Audio clock. Every impact is on a beat or half-beat. ----
const score={active:false,origin:0,visualOriginPerf:0,beat:60/112,nextStep:0,boss:false,theme:0,bus:null,noise:null,
 get bpm(){return Math.round(60/this.beat)}};
let latencyOffset=0;try{latencyOffset=clamp(Number(localStorage.getItem(OFFSET_KEY))||0,-180,180)}catch(e){}
$('latencySlider').value=latencyOffset;$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';
$('latencySlider').addEventListener('input',e=>{latencyOffset=Number(e.target.value);$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';try{localStorage.setItem(OFFSET_KEY,String(latencyOffset))}catch(e){} });
function ensureAudio(){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});if(!score.bus){score.bus=audioContext.createGain();score.bus.gain.value=.35;score.bus.connect(audioContext.destination)}if(!score.noise){const ac=audioContext,b=ac.createBuffer(1,Math.ceil(ac.sampleRate*.5),ac.sampleRate),ch=b.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;score.noise=b;}return true}catch(e){return false}}
function scoreTone(f,d,vol,t,type='triangle',bend=0){if(!audioEnabled||!audioContext||!score.bus)return;const ac=audioContext,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(25,f),t);if(bend)o.frequency.exponentialRampToValueAtTime(Math.max(25,f+bend),t+d*.8);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(score.bus);o.start(t);o.stop(t+d+.015)}
function scoreNoise(t,d,vol,hpf=1800){if(!audioEnabled||!audioContext||!score.noise)return;const ac=audioContext,src=ac.createBufferSource(),flt=ac.createBiquadFilter(),g=ac.createGain();src.buffer=score.noise;flt.type='highpass';flt.frequency.value=hpf;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(flt);flt.connect(g);g.connect(score.bus);src.start(t);src.stop(t+d+.01)}
const NOTES=[73.42,82.41,87.31,98,110,116.54,130.81,146.83,164.81,174.61,196,220,233.08,261.63,293.66,329.63,349.23,392,440,466.16,523.25,587.33];
function playMusicStep(n,t){if(!audioEnabled)return;const ix=n%8,bar=Math.floor(n/8),root=score.boss?[0,3,2,5][Math.floor(bar/2)%4]:[0,5,3,2][Math.floor(bar/2)%4];const low=NOTES[root];
 // quarter-note drums, eighth-note hats, and offbeat melodic answers
 if(ix%2===0){const b=(n/2)%4;scoreTone(b===0?140:110,.19,b===0?.26:.13,t,'sine',-90);if(b===1||b===3){scoreNoise(t,.12,score.boss?.26:.17,600);scoreTone(155,.075,.06,t,'triangle',-30)}}
 scoreNoise(t,ix%2?.045:.055,ix%2?.062:.085,3500);
 if(ix===0||ix===4)scoreTone(low,score.beat*(score.boss?.86:1.45),score.boss?.23:.16,t,'sawtooth',-4);
 if((ix===2||ix===6)&&score.boss)scoreTone(low*2,.15,.085,t,'square',-12);
 if(ix===3||ix===7){const melody=score.boss?[1,5,7,4][bar%4]:[3,7,5,9][bar%4];scoreTone(NOTES[Math.min(NOTES.length-1,root+melody)],score.beat*.43,score.boss?.12:.09,t,'triangle',8)}
 if(ix===0&&bar%2===0){scoreTone(low*4,score.beat*3.5,.042,t,'sine');scoreTone(low*6,score.beat*3.5,.025,t,'sine')}
 if(score.boss&&(ix===1||ix===5))scoreTone(low*2,.12,.04,t,'sawtooth',-45);
}
function stopScore(){score.active=false;score.nextStep=0;if(score.bus&&audioContext){score.bus.gain.cancelScheduledValues(audioContext.currentTime);score.bus.gain.setTargetAtTime(0,audioContext.currentTime,.025)}}
function startScore(enemy){if(!ensureAudio()){score.active=false;return}const ac=audioContext;score.active=true;score.boss=!!enemy.boss;score.beat=60/(score.boss?136:enemy.kind==='rogue'?124:112);score.origin=ac.currentTime+.17;score.visualOriginPerf=performance.now()+170;score.nextStep=0;score.theme++;score.bus.gain.cancelScheduledValues(ac.currentTime);score.bus.gain.setTargetAtTime(audioEnabled?.35:0,ac.currentTime,.018);$('trackLabel').textContent=(score.boss?'BOSS / IRON WALTZ':enemy.kind==='rogue'?'SHADOW BREAKS':'DUNGEON GROOVE')+' · '+score.bpm+' BPM';$('musicStatus').textContent='4拍カウントイン →';scheduleScore()}
function scheduleScore(){if(!score.active||!audioContext||audioContext.state==='suspended')return;const now=audioContext.currentTime,until=now+.17;let n=0;while(score.origin+score.nextStep*score.beat/2<until&&n++<24){const t=score.origin+score.nextStep*score.beat/2;if(t>=now-.025)playMusicStep(score.nextStep,t>now?t:now+.002);score.nextStep++}}
function scoreToPerf(t){if(audioContext&&audioContext.state!=='suspended'){if(audioContext.getOutputTimestamp){const ts=audioContext.getOutputTimestamp();if(ts&&ts.performanceTime>0&&ts.contextTime>0)return ts.performanceTime+(t-ts.contextTime)*1000+latencyOffset}return performance.now()+(t-audioContext.currentTime)*1000+latencyOffset}return score.visualOriginPerf+(t-score.origin)*1000+latencyOffset}
function syncAttackClock(){if(!score.active||!game.enemy)return;game.attackAt=scoreToPerf(score.origin+game.attackBeat*score.beat);game.telegraphStart=game.attackAt-game.attackSpan}
function musicParry(kind){
 if(!audioEnabled||!audioContext||!score.bus||!score.noise)return;
 const t=audioContext.currentTime+.003;
 // Musical response to a successful parry. All notes use the BGM's AudioContext clock.
 if(kind==='just'){
  scoreNoise(t,.085,.12,2900);
  scoreTone(784,.16,.11,t,'triangle',125);
  scoreTone(1175,.20,.085,t+.045,'sine',95);
  scoreTone(1568,.22,.055,t+.092,'sine',-125);
 }else if(kind==='parry'){
  scoreNoise(t,.058,.085,2400);
  scoreTone(659,.13,.082,t,'triangle',120);
  scoreTone(988,.13,.038,t+.034,'sine',-45);
 }else if(kind==='guard'){
  scoreTone(245,.11,.060,t,'triangle',-60);
 }else{
  scoreNoise(t,.13,.065,650);
  scoreTone(128,.16,.065,t,'sawtooth',-65);
 }
}

function sound(freq=500,dur=.13,type='sine',vol=.06,slide=0){if(!audioEnabled)return;try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const t=audioContext.currentTime,o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(50,freq+slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}}
function chord(){/* The bright chord is scheduled by musicParry on the BGM clock. */}
// 剣が動き始める音。250ms前の電子音ではなく斬撃に追従する風切り音。
function sfxSwing(){if(!audioEnabled)return;try{
 audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
 if(audioContext.state==='suspended')audioContext.resume();
 const ac=audioContext,t=ac.currentTime,dur=.17;
 const buffer=ac.createBuffer(1,Math.ceil(dur*ac.sampleRate),ac.sampleRate);
 const ch=buffer.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;
 const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=buffer;filter.type='bandpass';filter.Q.value=.7;
 filter.frequency.setValueAtTime(1050,t);filter.frequency.exponentialRampToValueAtTime(320,t+dur);
 gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.09,t+.055);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.connect(filter);filter.connect(gain);gain.connect(ac.destination);src.start(t);src.stop(t+dur);
}catch(e){}}
function upgradeCount(){return Object.values(game.lv||{}).reduce((a,b)=>a+b,0)}
function lvl(id){return game.lv?.[id]||0}
function has(a,b){return lvl(a)>0&&lvl(b)>0}
function getPerfectWindow(){return 11+lvl('focus')*2}
function getParryWindow(){return 31+lvl('stability')*3}
function setMode(mode){game.mode=mode;$('practiceTools').hidden=!game.practice||!['combat','pause'].includes(mode);$('exitPracticeBtn').hidden=!game.practice;for(const name of ['title','reward','death','pause'])$(name+'Cover').hidden=name!==({title:'title',reward:'reward',gameover:'death',pause:'pause'}[mode]);$('pauseBtn').disabled=!['combat','pause'].includes(mode);$('pauseBtn').textContent=mode==='pause'?'▶ 再開':'Ⅱ 一時停止';$('runStateLabel').textContent={title:'READY',combat:'IN BATTLE',victory:'CLEARED',reward:'LEVEL UP',gameover:'GAME OVER',pause:'PAUSED'}[mode]||'';}
function syncHUD(){const enemy=game.enemy;$('floorNumber').textContent=String(game.floor||1).padStart(2,'0');$('floorBadge').textContent=enemy?.boss?'✦ BOSS':'';$('enemyName').textContent=enemy?.name||'塔の入口';$('comboLabel').textContent=game.combo||0;$('hpText').textContent=`${Math.ceil(game.hp||0)} / ${game.maxHp||100}`;$('hpFill').style.width=clamp(100*(game.hp||0)/(game.maxHp||100),0,100)+'%';$('shieldText').textContent=game.shield>0?`＋🛡${Math.ceil(game.shield)}`:'';$('enemyBarName').textContent=enemy?.name||'ENEMY';$('enemyHpText').textContent=enemy?`${Math.ceil(Math.max(0,enemy.hp))} / ${enemy.maxHp}`:'—';$('enemyHpFill').style.width=enemy?clamp(enemy.hp/enemy.maxHp*100,0,100)+'%':'0%';$('perfectStat').textContent=game.perfects||0;$('damageStat').textContent=formatCompact(game.damage||0);$('bestComboStat').textContent=game.peakCombo||0;$('chargeStat').textContent=`${game.charge||0} / 7`;$('buildCount').textContent=`${upgradeCount()} LEVELS`;$('timingInfo').textContent=game.practice?'稽古中 · 敵を切り替えて比較可能':'身構え → 踏み込み → 接触'}
function formatCompact(n){if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return Math.floor(n).toLocaleString('ja-JP')}
function renderBuild(){const active=SKILLS.filter(s=>lvl(s.id));$('buildList').innerHTML=active.length?active.map(s=>`<div class="build-item"><span class="build-symbol">${s.icon}</span><div style="min-width:0"><div class="build-name">${s.name}</div><div class="build-desc">${s.desc(lvl(s.id))}</div></div><span class="level">Lv.${lvl(s.id)}</span></div>`).join(''):'<div class="empty">まだスキルはありません。<br>1階を突破して能力を獲得しよう。</div>';$('synergyList').innerHTML=SYNERGIES.filter(s=>has(s.a,s.b)).map(s=>`<div class="synergy"><b>${s.name}</b><small>${s.desc}</small></div>`).join('');}
function records(){return `<span>最高到達 <b>${meta.bestFloor}F</b></span><span>最高コンボ <b>${meta.bestCombo}</b></span><span>挑戦 <b>${meta.runs}回</b></span>`}
function shopCost(key){return 8+meta[key]*10+meta[key]*meta[key]*3}
function renderShop(){const offers=[{k:'life',icon:'♡',name:'生命の祝福',desc:'ラン開始時の最大HP +10',max:5},{k:'attack',icon:'⚔',name:'剣の研鑽',desc:'初期反撃ダメージ +3',max:5},{k:'ward',icon:'🛡',name:'守護の祈り',desc:'ラン開始時の障壁 +8',max:5}];const html=`<div class="shop"><div class="shop-head"><span>✦ 恒久強化（死亡後も引き継ぎ）</span><span>魂の欠片：<b>${meta.coins}</b> ✧</span></div>${offers.map(o=>{const full=meta[o.k]>=o.max,cost=shopCost(o.k);return `<div class="shop-row"><div><div class="shop-name">${o.icon} ${o.name} <span class="muted">Lv.${meta[o.k]}/${o.max}</span></div><div class="shop-desc">${o.desc}</div></div><button class="buy" data-buy="${o.k}" ${full||meta.coins<cost?'disabled':''}>${full?'MAX':cost+' ✧'}</button></div>`}).join('')}</div>`;for(const id of ['titleShop','deathShop'])$(id).innerHTML=(id==='titleShop'&&meta.coins===0&&meta.life+meta.attack+meta.ward===0)?'':html;for(const b of document.querySelectorAll('[data-buy]'))b.addEventListener('click',()=>{const k=b.dataset.buy;if(!['life','attack','ward'].includes(k)||meta[k]>=5||meta.coins<shopCost(k))return;meta.coins-=shopCost(k);meta[k]++;save();renderShop();$('titleRecords').innerHTML=records();sound(740,.19,'triangle',.06,190)})}
function title(){stopScore();clashFX=null;game={mode:'title',floor:1,maxHp:65,hp:65,shield:0,lv:{},combo:0,perfects:0,damage:0,charge:0};setMode('title');$('titleRecords').innerHTML=records();renderShop();syncHUD();renderBuild()}
function start(practice=false){const t=performance.now();particles=[];texts=[];clashFX=null;game={mode:'combat',practice,practiceEnemy:practice?$('practiceEnemy').value:null,floor:1,maxHp:65+10*meta.life,hp:65+10*meta.life,shield:8*meta.ward,baseAtk:25+meta.attack*3,lv:{},enemy:null,combo:0,peakCombo:0,perfects:0,parries:0,damage:0,charge:0,runs:0,bossKills:0,rerolls:1,whiffUntil:0,parryAnimAt:-9999,parryAnimKind:'',lastDeflectAt:-9999,lastDamageAt:-9999,misses:0,whiffs:0,guards:0,notice:'',noticeAt:0,lastHitAt:0,feedback:'',feedbackAt:0,clearAt:0,flash:false,playStartedAt:t,pendingKind:null,inputLocked:false,lastAttemptDelta:null,lastImpactAt:-99999,lastStrikeKind:'miss'};spawnEnemy(t);setMode('combat');syncHUD();renderBuild();sound(270,.20,'triangle',.07,160)}
function spawnEnemy(t){clashFX=null;const boss=game.floor%5===0;const archetype=game.practice?(ENEMIES.find(e=>e.id===(game.practiceEnemy||'knight'))||(game.practiceEnemy==='guardian'?BOSS:ENEMIES[1])):boss?BOSS:game.floor===1?ENEMIES[0]:ENEMIES[(Math.floor((game.floor-2)/2)+Math.floor(rand(0,3)))%ENEMIES.length];const maxHp=game.practice?999999:Math.round(49*Math.pow(1.18,game.floor-1)*(boss?2.15:1));const atk=Math.max(13,Math.round(14*Math.pow(1.09,game.floor-1)*(boss?1.25:1)));game.enemy={...archetype,boss:boss||(game.practice&&archetype.id==='guardian'),maxHp,hp:maxHp,atk,burn:0,index:0};startScore(game.enemy);game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.attackAt=t+game.attackSpan+170;game.telegraphStart=t;game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;game.lastAttemptDelta=null;game.lastStrike=0;game.feedback='';game.feedbackAt=0;game.nextFloorHint=boss?'BOSS FLOOR':'FLOOR '+game.floor;game.nextFloorHintAt=t;syncAttackClock();syncHUD()}
function nextStrike(){const e=game.enemy;if(!e)return;const step=e.rhythm[e.index%e.rhythm.length];e.index++;const extra=lvl('tempo')?Math.ceil(lvl('tempo')*.5):0;const beats=step+extra;game.attackBeat+=beats;game.attackSpan=beats*score.beat*1000;syncAttackClock();game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;game.lastAttemptDelta=null}
function showText(text,x,y,color='#fff',size=21){texts.push({text,x,y,t:performance.now(),life:850,color,size});if(texts.length>45)texts.shift()}
function puff(x,y,color='#fff',count=16,power=1){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),v=rand(.6,3.7)*power;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-rand(0,.6),color,life:rand(400,1100),max:1100,size:rand(1.4,4.1)})}if(particles.length>180)particles.splice(0,particles.length-180)}
function feedback(label,color){game.feedback=label;game.feedbackAt=performance.now();showText(label,w*.5,h*.27,color,27)}
function damageEnemy(n,color='#fff',label){const e=game.enemy;if(!e||e.hp<=0)return;const damage=Math.max(1,Math.round(n));e.hp=Math.max(0,e.hp-damage);game.damage+=damage;const x=w*.71+rand(-22,22),y=h*.43+rand(-25,18);showText(label?`${label} ${formatCompact(damage)}`:formatCompact(damage),x,y,color,label?15:19);puff(w*.71,h*.60,color,Math.min(22,4+damage/14),.72);if(e.hp<=0)clearFloor();}
function heal(n){const a=game.hp;game.hp=Math.min(game.maxHp,game.hp+n);if(game.hp>a+.1)showText('+'+Math.round(game.hp-a),w*.27,h*.47,'#8aefbd',18)}
function getAttackMultiplier(){let m=(1+lvl('blade')*.25)*(1+Math.min(game.combo,120)*(.012+lvl('fury')*.02));if(game.hp<game.maxHp*.5)m*=1+lvl('gamble')*.30;if(game.enemy?.hp/game.enemy?.maxHp<.35)m*=1+lvl('execute')*.23;return m}
function strikeResult(kind,at){const e=game.enemy;if(!e||game.mode!=='combat')return;game.attackResolved=true;game.lastImpactAt=at;game.lastStrikeKind=kind;musicParry(kind);game.lateReported=false;game.lastHitAt=at;triggerClashFX(kind,at,e.kind);if(game.practice){if(kind==='miss')feedback(game.lastAttemptDelta===null?'入力なし':((game.lastAttemptDelta<0?'早い ':'遅い ')+Math.abs(Math.round(game.lastAttemptDelta))+'ms'),'#f7ca8e');else feedback(kind==='just'?'JUST!':kind==='parry'?'PARRY!':'GUARD',kind==='just'?'#84effa':'#ecd3a1');}const perfect=kind==='just';if(kind==='guard'){
  game.combo=0;game.guards++;if(!lvl('aegis'))game.charge=0;applyDamage(e.atk*.60,'GUARD');if(game.mode!=='combat')return;
  if(lvl('thorns')){let reflect=e.atk*(.30+lvl('thorns')*.18);if(has('aegis','thorns'))reflect+=game.shield*.4;damageEnemy(reflect,'#dbb7ff','反射')}feedback('GUARD','#f6c473');sound(250,.08,'triangle',.055,-80);
}else if(kind==='miss'){
  game.combo=0;game.misses++;game.charge=0;game.lastDamageAt=at;applyDamage(e.atk,'MISS');if(game.mode!=='combat')return;if(!game.practice)feedback('HIT!','#ff8295');sound(145,.21,'sawtooth',.045,-85);shake=12;
}else{
  game.lastDeflectAt=at;game.combo++;game.peakCombo=Math.max(game.peakCombo,game.combo);game.parries++;if(perfect){game.perfects++;game.charge=Math.min(7,game.charge+2)}else{game.charge=Math.min(7,game.charge+1)}
  let val=game.baseAtk*getAttackMultiplier()*(perfect?(1.6+lvl('precision')*.35):1);if(lvl('double')&&Math.random()<(.14+lvl('double')*.09)){val*=2;showText('DOUBLE!',w*.51,h*.22,'#fdd99d',18)}
  damageEnemy(val,perfect?'#93eafa':'#fff5cb');if(game.mode!=='combat')return;
  if(lvl('thunder')){const thunder=10+12*lvl('thunder');damageEnemy(thunder*(1+game.combo*.018),'#86e8ff','⚡');if(game.mode!=='combat')return}
  if(lvl('echo')){let echo=val*(.25+lvl('echo')*.13);damageEnemy(echo,'#d8baff','残響');if(game.mode!=='combat')return;if(has('thunder','echo'))damageEnemy((10+12*lvl('thunder'))*(1+lvl('echo')*.24),'#86e8ff','雷鳴');if(game.mode!=='combat')return}
  if(lvl('ember')){e.burn+=lvl('ember')*7;showText('炎 +'+lvl('ember')*7,w*.75,h*.33,'#ffba83',13);if(has('ember','execute')&&e.hp/e.maxHp<.35){damageEnemy(e.burn*2,'#ff996f','紅蓮');e.burn=0;if(game.mode!=='combat')return}}
  if(lvl('blood'))heal((lvl('blood')+1)*(has('blood','fury')?1+Math.min(game.combo,50)*.06:1));
  if(perfect&&lvl('aegis')){game.shield=Math.min(100+20*lvl('aegis'),game.shield+3+3*lvl('aegis'));if(has('aegis','thorns')){damageEnemy(game.shield*.28,'#c5adff','鏡壁');if(game.mode!=='combat')return}}
  if(lvl('pulse')&&game.combo%8===0){damageEnemy(42*lvl('pulse')*(1+game.combo*.02),'#ffe298','共鳴波');if(game.mode!=='combat')return}
  if(game.charge>=7){game.charge=0;const ult=(game.baseAtk*1.5+lvl('rune')*45)*getAttackMultiplier();damageEnemy(ult,'#dcafff','奥義');if(game.mode!=='combat')return;if(has('rune','precision')){damageEnemy(ult*.65,'#d2b0ff','時空切断');if(game.mode!=='combat')return}flash=.75;flashColor='#d6c0ff';puff(w*.7,h*.55,'#dbb5fb',28,1.5);sound(660,.33,'sawtooth',.05,-340)}
  if(!game.practice)feedback(perfect?'JUST PARRY!':'PARRY!',perfect?'#8beaff':'#ffe1a0');if(perfect){chord();if(navigator.vibrate)navigator.vibrate(15);flash=.67;flashColor='#a0e8ff';shake=Math.max(shake,5)}else{flash=Math.max(flash,.18);flashColor='#9accff'};
}
if(game.mode==='combat')nextStrike();syncHUD();}
function clearFloor(){if(game.mode!=='combat')return;stopScore();game.mode='victory';game.clearAt=performance.now();game.enemy.hp=0;game.bossKills+=Number(game.enemy.boss);puff(w*.72,h*.58,game.enemy.color,40,1.8);flash=1;flashColor='#f6cb84';sound(450,.24,'triangle',.05,300);setTimeout(()=>sound(790,.28,'triangle',.045,230),120);syncHUD();}
function applyDamage(n,tag){let damage=game.practice?0:Math.max(1,Math.ceil(n));const used=Math.min(game.shield,damage);game.shield=Math.max(0,game.shield-used);damage-=used;if(damage>0)game.hp=Math.max(0,game.hp-damage);showText(damage?'−'+damage:'BLOCK!',w*.27,h*.49,damage?'#ff818f':'#c4b4ff',21);puff(w*.28,h*.64,damage?'#ff879c':'#c5b0fa',12,1);shake=Math.max(shake,damage?11:4);if(game.hp<=0)die();syncHUD();}
function die(){if(game.mode==='gameover')return;stopScore();const coins=Math.max(3,Math.floor(game.floor*2+game.bossKills*3));meta.coins+=coins;meta.bestFloor=Math.max(meta.bestFloor,game.floor);meta.bestCombo=Math.max(meta.bestCombo,game.peakCombo);meta.runs++;save();$('deathSummary').innerHTML=`<b>${game.floor}F</b>で力尽きた。<br>ジャストパリィ <b>${game.perfects}回</b> / 被弾 <b>${game.misses}回</b> / 空振り <b>${game.whiffs}回</b><br>最大コンボ <b>${game.peakCombo}</b> · 次は構えと踏み込みを観察しよう。<br>獲得した魂の欠片 <b style="color:#f4cf86">+${coins} ✧</b>`;$('deathRecords').innerHTML=records();renderShop();setMode('gameover');sound(200,.42,'sawtooth',.05,-130)}
function choosePool(){const available=SKILLS.filter(s=>lvl(s.id)<s.max),taken=[];for(let k=0;k<Math.min(3,available.length);k++){const rarityWeight={common:5.4,rare:2.9,epic:1.05};const weights=available.map(s=>rarityWeight[s.rarity]*(lvl(s.id)?1.17:1));let r=Math.random()*weights.reduce((a,b)=>a+b,0),idx=0;for(;idx<weights.length-1;idx++){r-=weights[idx];if(r<=0)break}taken.push(available.splice(idx,1)[0])}return taken}
function showRewards(){if(game.mode!=='victory')return;game.mode='reward';choiceSet=choosePool();renderRewards();setMode('reward');}
function renderRewards(){const rar={common:'COMMON',rare:'RARE',epic:'EPIC'};$('rewardTitle').textContent=`${game.floor}F 突破 — 戦利品`;$('rewardCards').innerHTML=choiceSet.map(s=>`<button class="reward-card ${s.rarity}" data-skill="${s.id}"><span class="rarity">${rar[s.rarity]} · ${lvl(s.id)?'LEVEL UP':'NEW SKILL'}</span><span class="emoji">${s.icon}</span><span class="rname">${s.name} <span class="muted" style="font-size:10px">Lv.${lvl(s.id)+1}</span></span><span class="rdesc">${s.desc(lvl(s.id)+1)}</span><span class="rtag">${s.hint}</span></button>`).join('');for(const btn of $('rewardCards').querySelectorAll('[data-skill]'))btn.addEventListener('click',()=>takeSkill(btn.dataset.skill));$('rerollBtn').textContent=`↻ 引き直す (残 ${game.rerolls})`;$('rerollBtn').disabled=game.rerolls<=0;$('healBtn').textContent=`♡ 強化せずHPを ${Math.round(game.maxHp*.2)} 回復`;$('rewardNote').textContent=game.floor%5===0?'ボス突破！ 引き直し回数 +1':'能力は同じものを重ねると強くなります。組合せ進化も発見しよう。'}
function takeSkill(id){const s=SK[id];if(game.mode!=='reward'||!choiceSet.find(v=>v.id===id)||lvl(id)>=s.max)return;const prevMax=game.maxHp;game.lv[id]=(game.lv[id]||0)+1;if(id==='heal'){game.maxHp=65+10*meta.life+lvl('heal')*15;game.hp+=game.maxHp-prevMax+12}if(game.floor%5===0)game.rerolls++;sound(790,.17,'triangle',.06,140);advance()}
function advance(){game.floor++;game.hp=Math.min(game.hp,game.maxHp);spawnEnemy(performance.now());setMode('combat');renderBuild();syncHUD()}
function showHeal(){if(game.mode!=='reward')return;heal(Math.round(game.maxHp*.2));if(game.floor%5===0)game.rerolls++;advance()}
function tap(){
 if(game.mode!=='combat')return;
 const t=performance.now();syncAttackClock();
 // 衝突後に押しても次の攻撃の『早すぎ』にならない。直前の攻撃への遅れとして扱う。
 if(game.lastStrikeKind==='miss'&&t-game.lastImpactAt>=0&&t-game.lastImpactAt<220&&!game.lateReported){
  game.lateReported=true;
  feedback('遅い '+Math.round(t-(game.lastImpactAt-PARRY_STARTUP))+'ms','#f7ca8e');
  return;
 }
 if(t<game.whiffUntil||game.attackResolved||game.inputLocked)return;
 // 入力したその場では倒れない。攻撃が盾に届いた瞬間だけ判定と衝突演出を発生させる。
 const delta=t-(game.attackAt-PARRY_STARTUP),perfect=getPerfectWindow(),parry=getParryWindow();
 game.lastAttemptDelta=delta;game.parryAnimAt=t;
 if(Math.abs(delta)<=perfect){game.pendingKind='just';game.inputLocked=true;game.parryAnimKind='just'}
 else if(Math.abs(delta)<=parry){game.pendingKind='parry';game.inputLocked=true;game.parryAnimKind='parry'}
 else if(delta>=-parry-24&&delta< -parry){game.pendingKind='guard';game.inputLocked=true;game.parryAnimKind='guard'}
 else{
  game.parryAnimKind='whiff';game.whiffs++;game.whiffUntil=t+400;
  sound(190,.09,'triangle',.015,-80);
 }
}
function togglePause(){if(game.mode==='combat'){pauseAt=performance.now();stopScore();setMode('pause');$('musicStatus').textContent='一時停止'}else if(game.mode==='pause'){const now=performance.now();game.whiffUntil=0;game.parryAnimAt=-99999;game.lastDeflectAt=-99999;game.lastDamageAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.pendingKind=null;game.inputLocked=false;game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;startScore(game.enemy);game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.nextFloorHintAt=now;syncAttackClock();setMode('combat')}}
function resize(){const r=canvas.getBoundingClientRect();w=Math.max(260,r.width);h=Math.max(300,r.height);dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);
function round(x,y,r,fill,stroke='',lw=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}
function fillPoly(points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function textDraw(t,x,y,size,color='#fff',align='center',weight='bold'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillStyle=color;ctx.fillText(t,x,y)}
function drawBackground(now){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#10152c');g.addColorStop(.6,'#1a1b35');g.addColorStop(1,'#132135');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const center=w*.52;
  for(let i=0;i<6;i++){let x=(i/5)*w-30;ctx.fillStyle=i%2?'#141c31':'#151d33';ctx.fillRect(x,0,Math.max(18,w*.07),h*.79);ctx.fillStyle='#29304c';ctx.fillRect(x+7,0,2,h*.8)}
  const doorW=Math.min(w*.4,260);ctx.fillStyle='#0d1429';ctx.beginPath();ctx.moveTo(center-doorW/2,h*.79);ctx.lineTo(center-doorW/2,h*.28);ctx.quadraticCurveTo(center-doorW/2,h*.09,center,h*.08);ctx.quadraticCurveTo(center+doorW/2,h*.09,center+doorW/2,h*.28);ctx.lineTo(center+doorW/2,h*.79);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#48506b';ctx.stroke();let shine=ctx.createRadialGradient(center,h*.35,10,center,h*.35,doorW*.65);shine.addColorStop(0,'#60547477');shine.addColorStop(1,'#43335100');ctx.fillStyle=shine;ctx.fillRect(center-doorW,h*.09,doorW*2,h*.75);
  for(let i=0;i<4;i++){let cx=(i%2===0?w*.09:w*.91)+(Math.floor(i/2)?25:-25),cy=h*(i<2?.23:.51);round(cx,cy,4,'#f6bc73');round(cx,cy,15,'#e9b36a22')}
  for(let i=0;i<30;i++){const x=((i*97+29)%1000)/1000*w,y=(i*163%600)/600*h*.75+Math.sin(now*.00065+i)*7;round(x,y,1.1+((i*3)%3)*.33,i%4?'#b7adc350':'#edd0ac80')}
  const floorY=h*.80;const gr=ctx.createLinearGradient(0,floorY,0,h);gr.addColorStop(0,'#3e3d4d');gr.addColorStop(.1,'#272b43');gr.addColorStop(1,'#11192a');ctx.fillStyle=gr;ctx.fillRect(0,floorY,w,h-floorY);ctx.fillStyle='#626078';ctx.fillRect(0,floorY,w,3);ctx.strokeStyle='#ffffff0e';ctx.lineWidth=1;for(let i=0;i<9;i++){const x=i*w/8;line([[x,floorY],[w*.5+(x-w*.5)*1.6,h]],'#ffffff0e',1)}for(let y=floorY+26;y<h;y+=28)line([[0,y],[w,y]],'#ffffff12',1);
  if(game.enemy?.boss){let gl=ctx.createRadialGradient(w*.71,h*.56,4,w*.71,h*.56,h*.55);gl.addColorStop(0,'#d77f4537');gl.addColorStop(1,'#f59f4800');ctx.fillStyle=gl;ctx.fillRect(0,0,w,h)}
}
function hero(now){
 const s=Math.min(w/550,h/470)*1.23,x=w*.28,y=h*.80;
 const since=now-(game.parryAnimAt||-99999);
 const lift=clamp(since/95,0,1)*clamp((300-since)/130,0,1);
 const action=clamp(1-(now-(game.lastHitAt||-99999))/240,0,1);
 const hurt=clamp(1-(now-(game.lastDamageAt||-99999))/250,0,1);
 const age=now-(game.lastDeflectAt||-99999),push=(age>=0&&age<160?Math.sin(Math.PI*age/160):0)*(game.lastStrikeKind==='just'?1:.45);
 ctx.save();ctx.translate(x-hurt*8-push*4,y+Math.sin(now/390)*1.6+hurt*5+push*2);ctx.scale(s,s);
 ctx.fillStyle='#080d20aa';ctx.beginPath();ctx.ellipse(0,0,44,10,0,0,Math.PI*2);ctx.fill();
 fillPoly([[-11,-69],[-34,-59],[-52,-7],[-29,-16],[-11,-24]],'#315b78');fillPoly([[-8,-66],[-29,-53],[-42,-8],[-23,-17]],'#3f8ca4');
 fillPoly([[-15,-34],[-1,-34],[-3,0],[-19,0]],'#778aa5');fillPoly([[1,-35],[15,-35],[22,0],[6,0]],'#657793');
 fillPoly([[-21,-5],[-2,-5],[-1,2],[-23,2]],'#29384c');fillPoly([[5,-5],[25,-5],[29,2],[4,2]],'#29384c');
 fillPoly([[-19,-83],[13,-85],[26,-40],[9,-30],[-18,-37]],'#738aa8');fillPoly([[-12,-78],[7,-78],[7,-40],[-8,-40]],'#263950');line([[-18,-68],[24,-54]],'#bad9e1',2.6);round(3,-57,5,'#eac791');
 fillPoly([[-17,-107],[6,-117],[20,-98],[13,-80],[-14,-81]],'#b7c6d4');fillPoly([[-16,-107],[-7,-115],[4,-118],[1,-91],[-18,-91]],'#526781');fillPoly([[4,-101],[18,-98],[13,-89],[3,-90]],'#142b3f');round(9,-95,2,'#76eff3');
 // 盾は敵のいる右側。入力から100ms程度で迎撃位置まで上げる。
 ctx.save();ctx.translate(21+lift*18-push*5,-48-lift*10+push*2);ctx.rotate(-.16+lift*.18-push*.23);
 fillPoly([[-16,-25],[17,-25],[14,5],[0,24],[-14,5]],'#b5ced9');
 fillPoly([[-11,-19],[12,-19],[10,4],[0,17],[-10,4]],'#273d59');line([[0,-13],[0,10]],'#8ff0f3',3);line([[-8,-2],[8,-2]],'#8ff0f3',3);
 if(game.lastStrikeKind==='just'&&now-game.lastImpactAt<170){ctx.shadowColor='#8ef4ff';ctx.shadowBlur=32;round(0,0,23,'#74deff35','#dcfaff',3);ctx.shadowBlur=0}
 ctx.restore();
 ctx.save();ctx.translate(12,-65);ctx.rotate(action*.65+.07-lift*.1);line([[0,6],[12,-43]],'#edfcff',7);line([[0,6],[12,-43]],'#77d7ec',3);line([[-12,7],[12,10]],'#e8c28f',6);line([[0,7],[-2,23]],'#554b5e',6);ctx.restore();ctx.restore();
}
function enemy(now){
 const e=game.enemy;if(!e)return;
 const m=motionFor(e),d=game.attackAt-now,span=game.attackSpan||1900;
 const base=Math.min(w/550,h/470)*1.23,scale=base*(e.boss?1.34:1);
 const heroX=w*.28,restX=w*.73,hitX=heroX+39*base,hitY=h*.80-58*base;
 const prepare=Math.min(m.prepare,Math.max(m.swing+120,span-130));
 const prep=smooth((prepare-d)/(prepare-m.swing));
 const p=clamp((m.swing-d)/m.swing,0,1);
 // 速度に明確な変化をつける。弾速を表示するゲージではなく、動きの重さが予兆になる。
 const dash=p*p*(1+.12*(1-p));
 const after=now-(game.lastImpactAt||-99999);
 const rec=after>=0&&after<m.recovery?1-smooth(after/m.recovery):0;
 const contactBodyX=hitX+m.reach*scale;
 const stageX=contactBodyX+m.stage*scale;
 const preparedX=mix(restX,stageX,prep);
 const normalX=mix(preparedX,contactBodyX,dash);
 const x=mix(normalX,contactBodyX,rec);
 const impact=after>=0&&after<175;
 const charge=prep*(1-p)*(1-rec);
 const action=Math.max(p,rec); // 衝突直後も突き出した形を維持し、自然に引き戻す
 const hover=e.kind==='wraith'?Math.sin(now/180)*5:Math.sin(now/480+1)*1.1;
 const ground=h*.80;
 const y=ground+hover*(1-action)*(1-rec);
 const squishHit=impact?Math.sin(Math.PI*smooth(after/175))*.12:0;
 // 共通の足元と接地演出。接近速度は地面を移動する量として必ず表現する。
 ctx.save();ctx.fillStyle='#050916a0';ctx.beginPath();ctx.ellipse(x,ground+3,Math.max(26,37*scale)*(1+.25*prep),9*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
 if(action>.15&&action<1){
  ctx.save();ctx.globalAlpha=.12+.18*action;
  const dustX=x+scale*(e.kind==='slime'?-15:8);
  for(let j=0;j<3;j++){round(dustX+(j*19+6)*scale,ground-(j%2)*7*scale,3.8*scale,m.accent)}
  ctx.restore();
 }
 ctx.save();ctx.translate(x,y);ctx.scale(-scale,scale);
 // A physical recoil only after contact; fades before the next telegraph.
 const deflectAge=now-(game.lastDeflectAt||-99999);
 const recoilTime=Math.min(195,Math.max(75,(game.attackAt-now-145)));
 const recoilPhase=clamp(deflectAge/recoilTime,0,1);
 const recoil=(deflectAge>=0&&deflectAge<recoilTime&&['just','parry'].includes(game.lastStrikeKind))
  ?Math.sin(Math.PI*recoilPhase)*(game.lastStrikeKind==='just'?1:.5):0;
 const recoilDist=e.kind==='slime'?36:e.kind==='rogue'?29:e.kind==='wraith'?22:e.kind==='guardian'?16:24;
 ctx.translate(-recoil*recoilDist,0);
 if(e.kind==='slime')ctx.scale(1+recoil*.20,1-recoil*.22);
 else if(e.kind==='wraith')ctx.globalAlpha=1-recoil*.33;
 else ctx.rotate(-recoil*(e.kind==='guardian'?.075:.13));
 const color=m.accent;
 if(e.kind==='slime'){
  // スライムは「圧縮→前傾→頭から飛びかかる」。盾に当たるのは左前方のこぶ。
  // 先端のローカル座標(+49,-58)を全員共通のhitX/hitYに揃える。
  const bulge=charge*.30,leap=smooth(p),stretch=leap*.23;
  const flatten=charge*.29;
  const backX=-38-charge*9-leap*15;
  const crestX=m.reach-11*(1-leap);
  const crestY=-58+28*charge+8*(1-leap);
  const topY=-82+31*charge-5*leap;
  ctx.fillStyle='#42ada5';ctx.beginPath();
  ctx.moveTo(backX,0);
  ctx.bezierCurveTo(backX-14,-18,-40,-59+19*charge,-21,topY+3);
  ctx.bezierCurveTo(-2,topY-10,crestX-22,topY-13,crestX,crestY);
  ctx.bezierCurveTo(crestX+2,crestY+17,38+10*stretch,-18,43,0);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#b0ffe4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(crestX-12,crestY-10);ctx.quadraticCurveTo(crestX-3,crestY-14,crestX,crestY);ctx.stroke();
  // 接触点に達する柔らかい突起。輪郭が盾の高さまで来ているのを示す。
  if(leap>.03){fillPoly([[crestX-9,crestY+8],[crestX,crestY],[crestX-4,crestY-10]],'#81e9d0')}
  const eyeX=-9+8*leap,eyeY=-45+16*charge-7*leap;
  round(eyeX,eyeY,7,'#f7f4d7');round(eyeX+24,eyeY,7,'#f7f4d7');
  round(eyeX+2,eyeY+1,3,'#173344');round(eyeX+26,eyeY+1,3,'#173344');
  line([[eyeX+10,eyeY+18],[eyeX+19,eyeY+18]],'#226a67',3.2);
  round(-19,-63+20*charge,7,'#b5fdeb60');
  if(charge>.1){line([[-25,1],[24,1]],'#6fe5b78a',3)}
 }else if(e.kind==='wraith'){
  // 亡霊は溜めで体が上がり、腕と爪が鞭のように伸びる。
  const lift=charge*14,lean=action*10;
  fillPoly([[-33,-63+lift],[-16,-97-lift],[13,-103-lift],[32,-74+lift],[33,-24],[44,0],[18,-10],[0,-2],[-17,-15],[-39,2]],'#6269a5');
  fillPoly([[-22,-87-lift],[0,-111-lift],[20,-82-lift],[13,-52],[-16,-52]],'#2a2e60');
  round(-8,-77-lift,3.7,'#8be9ff');round(8,-77-lift,3.7,'#8be9ff');
  const handX=22+69*action-recoil*11,handY=-38-19*charge-19*action+recoil*13;
  const tipX=32+(m.reach-32)*action-recoil*14,tipY=-89+31*action+recoil*15;
  line([[18,-62-lift],[handX,handY]],'#8595d2',10);
  line([[handX,handY],[tipX,tipY]],'#b8d8ff',7);
  for(const off of [-7,0,7])line([[tipX-8,tipY+off*.3],[tipX,tipY+off]],'#d9f8ff',2.6);
  if(action>.1){ctx.globalAlpha=action*.35;line([[12,-69],[tipX-14,tipY-12]],'#8cd9ff',14);ctx.globalAlpha=1}
 }else if(e.kind==='rogue'){
  // 暗殺者は低い溜めから短剣を一直線に突く。軌道は盾の中央で止まる。
  const crouch=charge*19,cushion=impact?squishHit*15:0;
  fillPoly([[-26,-78+crouch],[-42,-52+crouch],[-35,-4],[-8,-12],[26,0],[18,-68+crouch]],'#562c49');
  fillPoly([[-10,-41+crouch],[-4,-37+crouch],[-8,0],[-22,0]],'#565a74');
  fillPoly([[6,-39+crouch],[18,-33+crouch],[29,0],[10,0]],'#80819a');
  fillPoly([[-23,-83+crouch],[15,-84+crouch],[25,-47+crouch],[-14,-39+crouch]],'#62667f');
  fillPoly([[-18,-110+crouch],[-3,-120+crouch],[18,-108+crouch],[17,-86+crouch],[-16,-85+crouch]],'#322b46');
  line([[-9,-97+crouch],[9,-97+crouch]],'#f19ec6',3.3);
  // 刀身は行動開始時に胸元で止まり、踏み込みと共に水平に伸びる。
  const fistX=22+41*action-recoil*22-cushion,fistY=-53+7*charge-5*action-recoil*6;
  const tipX=50+(m.reach-50)*action-recoil*28-cushion,tipY=-68+10*action-recoil*20;
  line([[11,-48+crouch],[fistX,fistY]],'#9b829d',10);
  line([[fistX,fistY],[tipX,tipY]],'#ffcfed',6.5);
  line([[fistX,fistY],[tipX,tipY]],'#fff8ff',1.7);
  line([[fistX-5,fistY-10],[fistX+5,fistY+10]],'#846580',5);
  if(action>.1){ctx.globalAlpha=action*.32;line([[fistX-20,fistY+12],[tipX-13,tipY+10]],'#ff9dbf',9);ctx.globalAlpha=1}
 }else{
  // 騎士とボスは肩・腕・剣が一体で旋回する。剣先が盾に届く時刻だけが命中判定。
  const isBoss=e.kind==='guardian',lean=charge*8+action*10;
  fillPoly([[-18,-76],[-30-charge*9,-60],[-36,-4],[-8,-11],[27,0],[19,-68]],isBoss?'#7d5048':'#645676');
  fillPoly([[-14,-37],[-4,-34],[-7,0],[-23,0]],'#76738b');
  fillPoly([[3,-36],[16,-32],[24,0],[9,0]],'#777d96');
  fillPoly([[-22,-84-lean],[17,-83-lean],[27,-42-lean],[-16,-36-lean]],isBoss?'#b99571':'#7e8fa4');
  fillPoly([[-17,-108-lean],[0,-119-lean],[19,-107-lean],[17,-85-lean],[-15,-83-lean]],isBoss?'#b9ac9d':'#b5baca');
  line([[-8,-96-lean],[8,-96-lean]],isBoss?'#ffd392':'#ed98d0',4);
  if(isBoss){fillPoly([[-17,-108-lean],[-36,-134-lean],[-23,-129-lean],[-7,-112-lean]],'#e9b98d');fillPoly([[16,-107-lean],[37,-132-lean],[26,-109-lean]],'#e9b98d');round(0,-69-lean,8,'#ffe8ae40')}
  const bladeLength=isBoss?108:88;
  const shoulder=[11,-70-lean];
  const hand=[22,-58/(isBoss?1.34:1)];
  // 振り上げた刃が頭上で一瞬溜まり、最後に盾の高さまで下りてくる。
  const actualAngle=p>0?mix(-2.16,0,smooth(p*p)):(charge>0?mix(-.92,-2.16,charge):-.92);
  const a=mix(actualAngle,0,rec)-recoil*(isBoss?.32:.53);
  const tipX=22+bladeLength*Math.cos(a),tipY=hand[1]+bladeLength*Math.sin(a);
  line([shoulder,[hand[0]-7,hand[1]-3]],isBoss?'#d2b08d':'#a8a1b5',12);
  round(hand[0]-7,hand[1]-3,6,isBoss?'#eed2a1':'#b7bbca');
  if(action>.1&&action<1){ctx.globalAlpha=.1+.25*action;line([[22,hand[1]],[tipX-12,tipY-6]],isBoss?'#ffba72':'#dcc4ff',17);ctx.globalAlpha=1}
  line([[22,hand[1]],[tipX,tipY]],isBoss?'#ffe0ab':'#e5dfed',isBoss?11:8);
  line([[22,hand[1]],[tipX,tipY]],isBoss?'#ffbb78':'#fffaff',2.4);
  line([[14,hand[1]-11],[30,hand[1]+11]],'#c1a6a1',7);
  if(isBoss&&charge>.55){ctx.save();ctx.globalAlpha=(charge-.55)*.7;round(-17,-105,5,'#ffcc8a');ctx.restore()}
 }
 ctx.restore();

}

function triggerClashFX(kind,at,enemyKind){
 clashFX={kind,at,enemyKind,combo:game.combo+(kind==='just'||kind==='parry'?1:0)};
 const scale=Math.min(w/550,h/470)*1.23;
 const x=w*.28+39*scale,y=h*.80-58*scale;
 if(kind==='just')puff(x,y,'#b2f5ff',27,1.65);
 else if(kind==='parry')puff(x,y,'#9fcbff',15,1.05);
 else if(kind==='miss')puff(x,y,'#db718b',9,.55);
}
function drawClashFX(now){
 if(!clashFX)return;
 const age=now-clashFX.at;if(age<0||age>255)return;
 const just=clashFX.kind==='just',normal=clashFX.kind==='parry',miss=clashFX.kind==='miss';
 const base=Math.min(w/550,h/470)*1.23;
 const x=w*.28+39*base,y=h*.80-58*base;
 const energy=just?Math.min(1.55,1+(clashFX.combo||0)*.018):1;
 const color=just?'#b8f6ff':normal?'#96cdff':miss?'#cf667f':'#d5bb8b';
 // If the next windup has begun, fade away instead of masking a readable attack.
 const cueLead=game.enemy?motionFor(game.enemy).swing:180;
 const untilNext=game.mode==='combat'?game.attackAt-now:99999;
 const clarity=clamp((untilNext-cueLead+65)/100,0,1);
 const fade=(1-clamp(age/(just?255:175),0,1))*(just?1:normal?.82:.47)*clarity;
 if(fade<=0)return;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 // White-blue center pop, horizontal lens flare, and two expanding circular shockwaves.
 if(just&&age<110){
  const a=fade*(1-clamp(age/110,0,1))*.6;
  const glow=ctx.createRadialGradient(x,y,1,x,y,Math.max(w,h)*.55);
  glow.addColorStop(0,'rgba(224,251,255,.44)');glow.addColorStop(.25,'rgba(66,204,255,.15)');glow.addColorStop(1,'rgba(35,108,255,0)');
  ctx.globalAlpha=a;ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 }
 ctx.globalAlpha=fade;
 const rings=just?2:normal?1:0;
 for(let i=0;i<rings;i++){
  const t=clamp((age-i*33)/(just?220:165),0,1);if(age<i*33)continue;
  const radius=(10+t*(just?Math.min(w,h)*.66:Math.min(w,h)*.35))*energy;
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.strokeStyle=i===0?color:'#7c86ff';ctx.lineWidth=(just?4.6:2.8)*(1-t)*base;
  ctx.shadowBlur=just?14:7;ctx.shadowColor=color;ctx.globalAlpha=fade*(1-t)*(.72-i*.22);ctx.stroke();
 }
 ctx.shadowBlur=0;
 if(just&&age<150){
  ctx.globalAlpha=fade*(1-age/150)*.8;
  ctx.strokeStyle='#d9faff';ctx.lineWidth=(8-age*.035)*base;
  ctx.beginPath();ctx.moveTo(x-w*.29,y+h*.13);ctx.lineTo(x+w*.36,y-h*.20);ctx.stroke();
  ctx.strokeStyle='#558fff';ctx.lineWidth=2*base;ctx.beginPath();ctx.moveTo(x-w*.33,y+h*.16);ctx.lineTo(x+w*.39,y-h*.22);ctx.stroke();
 }
 const n=just?20:normal?11:5;
 for(let i=0;i<n;i++){
  const a=i*2.399963+(.12*i),distance=(9+age*(just?.34:.19))*(.62+(i%7)*.105)*energy;
  const dx=Math.cos(a),dy=Math.sin(a);
  const len=(just?18:9)*(1-clamp(age/220,0,1))*(.55+(i%4)*.2);
  ctx.globalAlpha=fade*(just?.9:.68);ctx.strokeStyle=i%5===0?'#ffffff':color;ctx.lineWidth=(just?2.3:1.4)*base;
  ctx.beginPath();ctx.moveTo(x+dx*distance,y+dy*distance);ctx.lineTo(x+dx*(distance+len),y+dy*(distance+len));ctx.stroke();
 }
 ctx.restore();
}

function combatPoseTime(now){
 // Freeze *only the character poses* for 40ms, never game time, BGM or attack scheduling.
 if(!clashFX||clashFX.kind!=='just'||game.mode!=='combat'||game.enemy?.kind!==clashFX.enemyKind)return now;
 const age=now-clashFX.at;
 return age>=0&&age<40&&game.attackAt-now>220?clashFX.at:now;
}

function drawScreen(now){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));drawBackground(now);const poseTime=combatPoseTime(now);enemy(poseTime);hero(poseTime);ctx.restore();drawClashFX(now);
 const boss=game.enemy?.boss;if(game.mode==='combat'){if(now-game.nextFloorHintAt<1300){const alpha=clamp(1-(now-game.nextFloorHintAt-500)/800,0,1);ctx.globalAlpha=alpha;textDraw(game.nextFloorHint,w*.5,h*.14,Math.min(30,w*.075),boss?'#ffe0a2':'#cfdff5');ctx.globalAlpha=1}
 if(game.practice)textDraw('稽古場 · 被弾しても倒れない',w*.5,h*.2,Math.min(14,w*.036),'#b9f3ec');if(game.combo>1){textDraw('×'+game.combo+' COMBO',w*.5,h*.12,Math.min(19,w*.045),'#d4f5ed')}
 if(!game.enemy?.boss&&game.floor===1&&game.parries===0&&!game.practice){textDraw('敵が踏み込み、刃が届く前に盾を出せ',w*.5,h*.74,Math.min(13,w*.035),'#f8d59b')}
 }
 if(game.mode==='victory'){textDraw('FLOOR CLEARED',w*.5,h*.26,Math.min(34,w*.075),'#ffe3ad');textDraw('次の力を選ぼう',w*.5,h*.36,16,'#f6eeee')}
 if(flash>0){ctx.globalAlpha=flash*.18;ctx.fillStyle=flashColor;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);round(p.x,p.y,p.size,p.color)}ctx.globalAlpha=1;
 for(const a of texts){const age=now-a.t,alpha=clamp(1-age/a.life,0,1);ctx.globalAlpha=alpha;ctx.shadowColor=a.color;ctx.shadowBlur=8;textDraw(a.text,a.x,a.y-age*.043,a.size,a.color);ctx.shadowBlur=0}ctx.globalAlpha=1;
}
function update(now,dt){const m=game.mode;if(m==='combat'){scheduleScore();syncAttackClock();if(score.active&&audioContext&&audioContext.currentTime>score.origin+score.beat*2)$('musicStatus').textContent='♫ 拍を聴いて構えを読む';
 if(!game.windupPlayed&&now>=game.attackAt-Math.min(motionFor(game.enemy).prepare,game.attackSpan*.83)){
  game.windupPlayed=true;sound(game.enemy.boss?135:195,.14,'triangle',.026,-65);
 }
 if(!game.cuePlayed&&now>=game.attackAt-motionFor(game.enemy).swing){
  game.cuePlayed=true;sfxSwing();
 }
 if(game.enemy?.burn>0){const burnTick=game.enemy.burn*dt/1000*.55;if(burnTick>0){game.enemy.hp-=burnTick;game.damage+=burnTick;if(game.enemy.hp<=0){game.enemy.hp=0;clearFloor()}}}
 if(game.mode==='combat'&&!game.attackResolved&&now>=game.attackAt)strikeResult(game.pendingKind||'miss',game.attackAt);
 }else if(m==='victory'&&now-game.clearAt>900)showRewards();
 shake=Math.max(0,shake-dt*.08);flash=Math.max(0,flash-dt*.003);particles=particles.filter(p=>{p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vx*=.985;p.vy+=.025;p.life-=dt;return p.life>0});texts=texts.filter(a=>now-a.t<a.life);
}
function frame(now){const dt=clamp(now-lastT,0,55);lastT=now;if(game.mode!=='pause'&&game.mode!=='title'&&game.mode!=='reward'&&game.mode!=='gameover')update(now,dt);drawScreen(game.mode==='pause'?pauseAt:now);if(['combat','victory'].includes(game.mode))syncHUD();requestAnimationFrame(frame)}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();tap()});document.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&['combat'].includes(game.mode)){e.preventDefault();if(!e.repeat)tap()}else if(e.code==='Escape'&&['combat','pause'].includes(game.mode)){e.preventDefault();togglePause()}});
$('practiceEnemy').addEventListener('change',()=>{if(game.practice&&game.mode==='combat'){game.practiceEnemy=$('practiceEnemy').value;game.combo=0;game.charge=0;particles=[];texts=[];spawnEnemy(performance.now());game.parryAnimAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.whiffUntil=0;syncHUD()}});$('startBtn').addEventListener('click',()=>start(false));$('practiceBtn').addEventListener('click',()=>start(true));$('exitPracticeBtn').addEventListener('click',title);$('retryBtn').addEventListener('click',()=>start(false));$('homeBtn').addEventListener('click',title);$('pauseBtn').addEventListener('click',togglePause);$('resumeBtn').addEventListener('click',togglePause);$('rerollBtn').addEventListener('click',()=>{if(game.mode!=='reward'||game.rerolls<1)return;game.rerolls--;choiceSet=choosePool();renderRewards();sound(490,.13,'sine',.04,100)});$('healBtn').addEventListener('click',showHeal);$('audioBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('audioBtn').textContent=audioEnabled?'♫ SOUND ON':'♫ SOUND OFF';if(score.bus&&audioContext)score.bus.gain.setTargetAtTime(audioEnabled?.35:0,audioContext.currentTime,.025);if(audioEnabled)sound(600,.10,'sine',.04,160)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='combat')togglePause()});
window.__parryV05=()=>({mode:game.mode,floor:game.floor,enemy:game.enemy?.id,bpm:score.bpm,attackBeat:game.attackBeat,attackAt:game.attackAt,beat:score.beat,scoreOrigin:score.origin,audioNow:audioContext?.currentTime,scoreActive:score.active,combo:game.combo,hp:game.hp,attackSpan:game.attackSpan,offset:latencyOffset});resize();title();requestAnimationFrame(frame);
})();
