(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const DEV_MODE=document.documentElement.dataset.parryDev==='true';
let devPreviewSkin='normal';
const STAGE_MUSIC=window.ParryStageMusic;
const VARIANT_MOTIONS=window.ParryEnemyMotions;
// Adopted fine pixel art and score-driven cutout motion; explicit art pilots remain available.
const CHARACTER_ART=window.ParryCharacterArt;
const CHARACTER_SVG=window.ParryCharacterSvg;
const CHARACTER_FLAT=window.ParryHeroFlat;
const CHARACTER_TRACE=window.ParryHeroTrace;
const CHARACTER_READY=window.ParryHeroReady;
const CHARACTER_KNIGHT=window.ParryKnightTrace;
const COMBAT_ART=window.ParryCombatArt;
const KNIGHT_PUPPET=window.ParryKnightPuppet;
const ILLUSTRATED_ENABLED=!/(?:^|[?&])art=/.test(window.location?.search||'')||/(?:^|[?&])art=illustrated(?:&|$)/.test(window.location?.search||'');
const CHARACTER_RIG=window.ParryCharacterRig;
const CHARACTER_RIG_ENABLED=/(?:^|[?&])art=rework(?:&|$)/.test(window.location?.search||'');
const COMBAT_ART_ENABLED=/(?:^|[?&])art=impact(?:&|$)/.test(window.location?.search||'');
if(COMBAT_ART_ENABLED)document.documentElement.dataset.parryArt='impact';
if(CHARACTER_RIG_ENABLED)document.documentElement.dataset.parryArt='rework';
const CHARACTER_KNIGHT_ENABLED=/(?:^|[?&])art=knight-trace(?:&|$)/.test(window.location?.search||'');
const CHARACTER_READY_ENABLED=/(?:^|[?&])art=ready(?:&|$)/.test(window.location?.search||'');
const CHARACTER_TRACE_ENABLED=/(?:^|[?&])art=trace(?:&|$)/.test(window.location?.search||'');
const CHARACTER_FLAT_ENABLED=/(?:^|[?&])art=flat(?:&|$)/.test(window.location?.search||'');
const CHARACTER_SVG_ENABLED=/(?:^|[?&])art=svg(?:&|$)/.test(window.location?.search||'');
const CHARACTER_ART_ENABLED=/(?:^|[?&])art=prototype(?:&|$)/.test(window.location?.search||'');
const P=window.ParryEncounters;if(!P)throw Error('Missing assets/encounters.js');
const PR=window.ParryProgression;if(!PR)throw Error('Missing assets/progression.js');
const RR=window.ParryRelics;if(!RR)throw Error('Missing assets/relics.js');
const RT=window.ParryRoutes;if(!RT)throw Error('Missing assets/routes.js');
const EV=window.ParryEvents;if(!EV)throw Error('Missing assets/events.js');
const KEY='parryTowerPrototype_v1';const OFFSET_KEY='parryTowerAudioOffset_v05';const BOOK_KEY='parryTowerBestiary_v1';const PERMANENT_KEY='parryTowerPermanent_v1'; // v0.1と同じ保存領域で恒久育成を引き継ぐ
const baseMeta={coins:0,bestFloor:0,bestCombo:0,runs:0,life:0,attack:0,ward:0,rescueClaimMask:0};
let meta={...baseMeta};try{
 const s=JSON.parse(localStorage.getItem(KEY)||'{}');
 for(const k of Object.keys(baseMeta)){
  if(PR.BASE_UPGRADES.some(def=>def.id===k)){meta[k]=PR.baseLevel(s,k);}
  else if(k==='rescueClaimMask')meta[k]=PR.rescueMask(s[k]);
  else if(typeof s[k]==='number'&&Number.isFinite(s[k]))meta[k]=Math.max(0,Math.floor(s[k]));
 }
}catch(e){}
const save=()=>{if(DEV_MODE)return;try{localStorage.setItem(KEY,JSON.stringify(meta))}catch(e){}};
const savePermanent=()=>{if(DEV_MODE)return;try{localStorage.setItem(PERMANENT_KEY,JSON.stringify(permanent))}catch(e){}};
let book=P.emptyBook();try{book=P.normalizeBook(JSON.parse(localStorage.getItem(BOOK_KEY)||'{}'))}catch(e){}
const saveBook=()=>{if(DEV_MODE)return;try{localStorage.setItem(BOOK_KEY,JSON.stringify(book))}catch(e){}};
const SKILLS=[
{id:'blade',icon:'🗡️',name:'剛剣',rarity:'common',max:12,desc:l=>`基礎反撃ダメージ +${25*l}%`,hint:'基礎攻撃'},
{id:'thunder',icon:'⚡',name:'落雷',rarity:'common',max:8,desc:l=>`パリィで雷撃 ${10+12*l} ダメージ`,hint:'連鎖の起点'},
{id:'echo',icon:'🌀',name:'残響',rarity:'rare',max:6,desc:l=>`パリィ後、追撃 ${Math.round(25+l*13)}%`,hint:'雷撃と共鳴'},
{id:'blood',icon:'🩸',name:'吸血',rarity:'common',max:6,desc:l=>`パリィ与ダメの ${6+l*2}% 回復（最低2・上限HP25%）`,hint:'与ダメージ吸収'},
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
{id:'double',icon:'🎲',name:'双撃',rarity:'epic',max:5,desc:l=>`${14+l*9}% の確率で反撃が2倍`,hint:'一撃の爆発力'},
 {id:'fortitude',icon:'🛡️',name:'不屈',rarity:'common',max:4,startCost:20,desc:l=>`HP被弾後、次の反撃 +${15+10*l}%`,hint:'被弾からの反撃'},
 {id:'heartbeat',icon:'🎵',name:'拍動',rarity:'common',max:4,startCost:25,desc:l=>`3連続ジャストで奥義+1・基礎攻撃の ${20+15*l}% 追撃`,hint:'連続ジャスト'},
 {id:'overcharge',icon:'⚡',name:'過充電',rarity:'rare',max:5,startCost:95,desc:l=>`成功パリィ3回ごとに基礎攻撃 ${(0.7+0.4*l).toFixed(1)}倍 の雷撃`,hint:'雷撃ビルド'},
 {id:'bloodlust',icon:'🦇',name:'血の渇望',rarity:'rare',max:4,startCost:110,desc:l=>`パリィ時HP+${2+l}、実回復×${(1+0.5*l).toFixed(1)}を次の反撃に蓄積`,hint:'回復から火力'},
 {id:'frost',icon:'❄️',name:'氷結',rarity:'rare',max:4,startCost:90,desc:l=>`4パリィで氷の加護。次の被攻撃 -${15+10*l}%`,hint:'被ダメージ軽減'},
 {id:'king',icon:'👑',name:'王の一撃',rarity:'epic',max:4,startCost:300,desc:l=>`10コンボごとに基礎攻撃 ${2+l}倍 の追撃`,hint:'コンボ特化'}
];
const SK=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
// Keep ownership and equipment in a separate, versioned save; legacy currency and stats remain untouched.
let permanent=PR.defaults();try{permanent=PR.normalize(JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}'),SKILLS)}catch(e){}
function legacyVisualEnabled(){return PR.extraEnabled(permanent,'legacyVisual')}
function useIllustratedArt(){return (DEV_MODE&&devPreviewSkin!=='normal')||(ILLUSTRATED_ENABLED&&!legacyVisualEnabled())}
function syncArtMode(){
 document.documentElement.dataset.parryArt=legacyVisualEnabled()?'legacy':ILLUSTRATED_ENABLED?'illustrated':COMBAT_ART_ENABLED?'impact':CHARACTER_RIG_ENABLED?'rework':'legacy';
 if(useIllustratedArt())KNIGHT_PUPPET?.preloadSources?.();
}
syncArtMode();
let upgradeTab='loadout',upgradeReturnMode='title',bonusView='items',skinPreview='normal';
const SYNERGIES=[
 {a:'thunder',b:'echo',name:'⚡ 雷鳴残響',desc:'追撃のたびに雷が再落下'},
 {a:'blood',b:'fury',name:'🩸 血の律動',desc:'1コンボごとに吸血率・回復上限 +1%pt（無制限）'},
 {a:'aegis',b:'thorns',name:'🪞 鏡壁の反撃',desc:'ジャスト時に障壁の一部を攻撃に転換'},
 {a:'ember',b:'execute',name:'☄️ 紅蓮処刑',desc:'瀕死の敵に炎の蓄積を一気に放出'},
 {a:'rune',b:'precision',name:'🔮 時空切断',desc:'奥義の発動時に追加の斬撃'},
  {a:'fortitude',b:'aegis',name:'🛡️ 不滅の盾',desc:'障壁破壊でも不屈が発動・反撃後に障壁+5'},
  {a:'heartbeat',b:'focus',name:'🎵 共鳴心眼',desc:'拍動が2連続ジャストで発動'},
  {a:'overcharge',b:'thunder',name:'⚡ 雷霆循環',desc:'過充電時に落雷の基礎ダメージ50%を追加'},
  {a:'bloodlust',b:'blood',name:'🦇 鮮血連鎖',desc:'回復からの蓄積ダメージ×1.5（上限は維持）'},
  {a:'frost',b:'thorns',name:'❄️ 氷鏡',desc:'氷結で軽減したダメージの50%を反射'},
  {a:'king',b:'pulse',name:'👑 王の共鳴',desc:'王の一撃が8コンボごとに発動'}
];
const ENEMIES=P.monsters.slice(0,4);
const BOSS=P.byId.guardian;
let game={mode:'title'},w=800,h=500,dpr=1,lastT=performance.now(),particles=[],texts=[],shake=0,flash=0,flashColor='#fff',audioEnabled=true,audioContext=null,choiceSet=[],cuePlayed=false;
let devSfxVolume=1,devSfxBus=null;
let devMusicTheme='auto',devMusicAudition=false;
function steelDestination(){
 if(!DEV_MODE)return audioContext.destination;
 if(!devSfxBus){devSfxBus=audioContext.createGain();devSfxBus.gain.value=devSfxVolume;devSfxBus.connect(audioContext.destination);}
 return devSfxBus;
}
let pausedFrom='combat',pauseAt=0,screenOffset=0;
// Visual effects use the wall-clock only; never modify AudioContext, strike timestamps or hitboxes.
let clashFX=null;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// 盾が動き始めてから刃を弾くまでの先行入力。瞬間反応ではなく、モーションを覚える設計。
const PARRY_STARTUP=100;
const PARRY_REARM_MS=300,PARRY_RELEASE_MS=120;
// Guard activates after the shield is physically raised; hold to cover repeated attacks.
const GUARD_DAMAGE_RATIO=.30;
const GUARD_MAX_HP_RATIO=.40;
const GUARD_COMBO_LOSS_RATIO=.20;
const GUARD_MIN_COMBO_LOSS=5;
const heldGuardInputs=new Set();
function clearGuardInput(){
 const wasHeld=heldGuardInputs.size>0||game?.guardHeld;
 heldGuardInputs.clear();
 if(game){game.guardHeld=false;game.guardStartedAt=0;if(wasHeld)game.guardReleasedAt=performance.now();}
}
function resetParryInput(){game.parryReadyAt=0;game.guardReleasedAt=-99999;game.parryBlockedAt=-99999;}
function beginGuardInput(source){
 if(game.mode!=='combat'||heldGuardInputs.has(source))return;
 const wasHeld=heldGuardInputs.size>0;
 heldGuardInputs.add(source);
 if(!wasHeld){
  const now=performance.now(),releasedEnough=now-(game.guardReleasedAt??-99999)>=PARRY_RELEASE_MS;
  game.guardHeld=true;
  game.guardStartedAt=now;
  tap(releasedEnough); // Rejected parry edges may still become a held guard.
 }
}
function endGuardInput(source){
 const removed=heldGuardInputs.delete(source);
 if(removed&&heldGuardInputs.size===0&&game){game.guardHeld=false;game.guardStartedAt=0;game.guardReleasedAt=performance.now();}
}
function guardReadyAt(impact){
 return !!game.guardHeld&&game.guardStartedAt+PARRY_STARTUP<=impact;
}
function guardComboAfterHit(combo){
 return Math.max(0,combo-Math.max(GUARD_MIN_COMBO_LOSS,Math.ceil(combo*GUARD_COMBO_LOSS_RATIO)));
}
// Second movement: a dramatic rumble, a full four-beat musical count, then a safe wind-up.
const FINAL_PHASE_RUMBLE_MS=1500;
const FINAL_PHASE_COUNT_BEATS=4;
// Ignore the next parry tap(s) for a moment after defeat so they cannot activate death-menu buttons.
const DEATH_INPUT_GRACE_MS=500;
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
const score={active:false,origin:0,visualOriginPerf:0,beat:60/112,nextStep:0,boss:false,theme:0,music:'crypt',bus:null,noise:null,
 get bpm(){return Math.round(60/this.beat)}};
let latencyOffset=0;try{latencyOffset=clamp(Number(localStorage.getItem(OFFSET_KEY))||0,-180,180)}catch(e){}
$('latencySlider').value=latencyOffset;$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';
$('latencySlider').addEventListener('input',e=>{latencyOffset=Number(e.target.value);$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';if(!DEV_MODE)try{localStorage.setItem(OFFSET_KEY,String(latencyOffset))}catch(e){} });
function ensureAudio(){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
 // Warm the longer steel tails before startScore establishes its beat origin.
 window.ParryCombatSfx?.prepare?.(audioContext);
 if(!score.bus){score.bus=audioContext.createGain();score.bus.gain.value=.35;score.bus.connect(audioContext.destination)}if(!score.noise){const ac=audioContext,b=ac.createBuffer(1,Math.ceil(ac.sampleRate*.5),ac.sampleRate),ch=b.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;score.noise=b;}return true}catch(e){return false}}
function scoreTone(f,d,vol,t,type='triangle',bend=0){if(!audioEnabled||!audioContext||!score.bus)return;const ac=audioContext,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(25,f),t);if(bend)o.frequency.exponentialRampToValueAtTime(Math.max(25,f+bend),t+d*.8);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(score.bus);o.start(t);o.stop(t+d+.015)}
function scoreNoise(t,d,vol,hpf=1800){if(!audioEnabled||!audioContext||!score.noise)return;const ac=audioContext,src=ac.createBufferSource(),flt=ac.createBiquadFilter(),g=ac.createGain();src.buffer=score.noise;flt.type='highpass';flt.frequency.value=hpf;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(flt);flt.connect(g);g.connect(score.bus);src.start(t);src.stop(t+d+.01)}
// Cinematic giant-footstep drums: audible impact on small speakers + deep body + short rumble.
// Four identical hits, slightly accented first. Every layer is scheduled on the same Web Audio beat.
function scoreFinalKick(t,accent=false){
 if(!audioEnabled||!audioContext||!score.bus)return;
 const ac=audioContext,level=accent?1.12:1;
 // Mid-bass punch (220→92Hz) gives the "DON!" definition that sub-bass alone lacks.
 const punch=ac.createOscillator(),punchGain=ac.createGain();
 punch.type='triangle';
 punch.frequency.setValueAtTime(220,t);
 punch.frequency.exponentialRampToValueAtTime(92,t+.11);
 punchGain.gain.setValueAtTime(.0001,t);
 punchGain.gain.exponentialRampToValueAtTime(.34*level,t+.005);
 punchGain.gain.exponentialRampToValueAtTime(.0001,t+.19);
 punch.connect(punchGain);punchGain.connect(score.bus);
 punch.start(t);punch.stop(t+.20);
 // Chest-sized boom (135→55Hz) hangs under the sharp stomp without masking the next beat.
 const boom=ac.createOscillator(),boomGain=ac.createGain();
 boom.type='sine';
 boom.frequency.setValueAtTime(135,t);
 boom.frequency.exponentialRampToValueAtTime(55,t+.17);
 boomGain.gain.setValueAtTime(.0001,t);
 boomGain.gain.exponentialRampToValueAtTime(.46*level,t+.014);
 boomGain.gain.exponentialRampToValueAtTime(.0001,t+.35);
 boom.connect(boomGain);boomGain.connect(score.bus);
 boom.start(t);boom.stop(t+.36);
 if(score.noise){
  // Short midrange crack makes every beat distinguishable on phone speakers.
  const crack=ac.createBufferSource(),crackFilter=ac.createBiquadFilter(),crackGain=ac.createGain();
  crack.buffer=score.noise;crackFilter.type='bandpass';crackFilter.frequency.value=950;
  crackFilter.Q.value=.7;
  crackGain.gain.setValueAtTime(.0001,t);
  crackGain.gain.exponentialRampToValueAtTime(.19*level,t+.004);
  crackGain.gain.exponentialRampToValueAtTime(.0001,t+.07);
  crack.connect(crackFilter);crackFilter.connect(crackGain);crackGain.connect(score.bus);
  crack.start(t);crack.stop(t+.08);
  // A low, brief dust-cloud tail supplies weight like a huge creature landing.
  const dust=ac.createBufferSource(),dustFilter=ac.createBiquadFilter(),dustGain=ac.createGain();
  dust.buffer=score.noise;dustFilter.type='lowpass';dustFilter.frequency.value=380;
  dustGain.gain.setValueAtTime(.0001,t);
  dustGain.gain.exponentialRampToValueAtTime(.11*level,t+.014);
  dustGain.gain.exponentialRampToValueAtTime(.0001,t+.24);
  dust.connect(dustFilter);dustFilter.connect(dustGain);dustGain.connect(score.bus);
  dust.start(t);dust.stop(t+.25);
 }
}
const NOTES=[73.42,82.41,87.31,98,110,116.54,130.81,146.83,164.81,174.61,196,220,233.08,261.63,293.66,329.63,349.23,392,440,466.16,523.25,587.33];
function playMusicStep(n,t){
 // Leave the four count-in beats for the kick alone: no pitched melody, hi-hats or snare.
 if(!audioEnabled||(game.mode==='phase'&&game.phaseStage==='countin'))return;
 if(STAGE_MUSIC&&score.music!=='crypt'){
  for(const event of STAGE_MUSIC.step(score.music,n,score.beat,score.boss)){
   const at=t+event.offset;
   if(event.kind==='noise')scoreNoise(at,event.duration,event.volume,event.cutoff);
   else if(event.kind==='bell')for(const [ratio,level,decay]of [[1,1,1],[2.76,.20,.55],[5.4,.065,.25]])
    scoreTone(event.frequency*ratio,event.duration*decay,event.volume*level,at,'sine');
   else scoreTone(event.frequency,event.duration,event.volume,at,event.type,event.bend);
  }
  return;
 }
 const ix=n%8,bar=Math.floor(n/8),root=score.boss?[0,3,2,5][Math.floor(bar/2)%4]:[0,5,3,2][Math.floor(bar/2)%4];const low=NOTES[root];
 // quarter-note drums, eighth-note hats, and offbeat melodic answers
 if(ix%2===0){const b=(n/2)%4;scoreTone(b===0?140:110,.19,b===0?.26:.13,t,'sine',-90);if(b===1||b===3){scoreNoise(t,.12,score.boss?.26:.17,600);scoreTone(155,.075,.06,t,'triangle',-30)}}
 scoreNoise(t,ix%2?.045:.055,ix%2?.062:.085,3500);
 if(ix===0||ix===4)scoreTone(low,score.beat*(score.boss?.86:1.45),score.boss?.23:.16,t,'sawtooth',-4);
 if((ix===2||ix===6)&&score.boss)scoreTone(low*2,.15,.085,t,'square',-12);
 if(ix===3||ix===7){const melody=score.boss?[1,5,7,4][bar%4]:[3,7,5,9][bar%4];scoreTone(NOTES[Math.min(NOTES.length-1,root+melody)],score.beat*.43,score.boss?.12:.09,t,'triangle',8)}
 if(ix===0&&bar%2===0){scoreTone(low*4,score.beat*3.5,.042,t,'sine');scoreTone(low*6,score.beat*3.5,.025,t,'sine')}
 if(score.boss&&(ix===1||ix===5))scoreTone(low*2,.12,.04,t,'sawtooth',-45);
}
function stopScore(){score.active=false;score.nextStep=0;if(score.bus&&audioContext){score.bus.gain.cancelScheduledValues(audioContext.currentTime);score.bus.gain.setTargetAtTime(0,audioContext.currentTime,.025);
 const retired=score.bus;score.bus=null;setTimeout(()=>retired.disconnect?.(),200);
}}
function startScore(enemy){if(!ensureAudio()){score.active=false;return}const ac=audioContext;score.active=true;score.boss=!!enemy.boss;score.music=DEV_MODE&&devMusicTheme!=='auto'?devMusicTheme:STAGE_MUSIC?.themes[P.ZONES.indexOf(P.zoneForFloor(game.floor||1))]?.id||'crypt';score.beat=60/(score.boss?136:enemy.kind==='rogue'?124:112);score.origin=ac.currentTime+.17;score.visualOriginPerf=performance.now()+170;score.nextStep=0;score.theme++;score.bus.gain.cancelScheduledValues(ac.currentTime);score.bus.gain.setTargetAtTime(audioEnabled?.35:0,ac.currentTime,.018);const selected=STAGE_MUSIC?.get(score.music);$('trackLabel').textContent=(selected&&!selected.original?selected.name:score.boss?'BOSS / IRON WALTZ':enemy.kind==='rogue'?'SHADOW BREAKS':'DUNGEON GROOVE')+' · '+score.bpm+' BPM';scheduleScore()}
function scheduleScore(){if(!score.active||!audioContext||audioContext.state==='suspended')return;const now=audioContext.currentTime,until=now+.17;let n=0;while(score.origin+score.nextStep*score.beat/2<until&&n++<24){const t=score.origin+score.nextStep*score.beat/2;if(t>=now-.025)playMusicStep(score.nextStep,t>now?t:now+.002);score.nextStep++}}
function scoreToPerf(t){if(audioContext&&audioContext.state!=='suspended'){if(audioContext.getOutputTimestamp){const ts=audioContext.getOutputTimestamp();if(ts&&ts.performanceTime>0&&ts.contextTime>0)return ts.performanceTime+(t-ts.contextTime)*1000+latencyOffset}return performance.now()+(t-audioContext.currentTime)*1000+latencyOffset}return score.visualOriginPerf+(t-score.origin)*1000+latencyOffset}
function syncAttackClock(){if(!score.active||!game.enemy)return;game.attackAt=scoreToPerf(score.origin+game.attackBeat*score.beat);game.telegraphStart=game.attackAt-game.attackSpan}
function musicParry(kind){
 if(!audioEnabled||!audioContext)return;
 if(window.ParryCombatSfx?.PROFILES[kind]){window.ParryCombatSfx.play(audioContext,kind,audioContext.currentTime+.003,steelDestination());return;}
 if(!score.bus||!score.noise)return;
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
// Lock the entire death overlay (including dynamically rendered shop buttons).
// Keep the retry / home / bestiary buttons natively disabled for keyboard and accessibility.
function deathInputBlocked(now=performance.now()){
 return game.mode==='gameover'&&now<(game.deathInputUnlockAt||0);
}
function syncDeathInputLock(now=performance.now()){
 const blocked=deathInputBlocked(now);
 $('deathCover').inert=blocked;
 for(const id of ['retryBtn','homeBtn','deathCodexBtn','deathUpgradeBtn'])$(id).disabled=blocked;
}
function setMode(mode){
 if(mode==='combat'&&game.artLoading)mode='loading';
 if(mode!=='combat')clearGuardInput();
 game.mode=mode;
 $('practiceTools').hidden=!game.practice||!['combat','pause'].includes(mode);
 $('exitPracticeBtn').hidden=!game.practice||!['combat','pause'].includes(mode);
 $('exitPracticeBtn').textContent='稽古を終了';
 const covers={title:'title',reward:'reward',relic:'relic',route:'route',room:'room',routeSkill:'routeSkill',gameover:'death',pause:'pause',codex:'codex',upgrade:'upgrade'};
 for(const name of ['title','reward','relic','route','room','routeSkill','death','pause','codex','upgrade'])$(name+'Cover').hidden=name!==covers[mode];
 $('pauseBtn').disabled=!['combat','pause'].includes(mode);
 $('pauseBtn').textContent=mode==='pause'?'▶ 再開':'Ⅱ 一時停止';
 syncDeathInputLock();
 $('runStateLabel').textContent={title:'READY',loading:'LOADING',combat:game.practice?'PRACTICE':'IN BATTLE',phase:'SECOND MOVEMENT',victory:'CLEARED',reward:'LEVEL UP',relic:'RELIC OFFER',route:'CROSSROADS',room:'EVENT ROOM',routeSkill:'SKILL GIFT',gameover:'GAME OVER',pause:'PAUSED',codex:'BESTIARY',upgrade:'UPGRADES'}[mode]||'';
}
function syncHUD(){const enemy=game.enemy;$('floorNumber').textContent=game.practice?'--':String(game.floor||1).padStart(2,'0');
 $('floorBadge').textContent=game.practice?'⚔ PRACTICE':enemy?.rare?'✦ RARE':enemy?.boss?(enemy.elite?'✦ ELITE BOSS':'✦ BOSS'):enemy?.elite?'◆ ELITE':'';
 $('zoneLabel').textContent=game.practice?'稽古場':P.zoneForFloor(game.floor||1).name;
 $('zoneLabel').style.color=game.practice?'#f4d68d':P.zoneForFloor(game.floor||1).accent;$('enemyName').textContent=enemy?.name||'塔の入口';$('comboLabel').textContent=game.combo||0;$('hpText').textContent=`${Math.ceil(game.hp||0)} / ${game.maxHp||100}`;$('hpFill').style.width=clamp(100*(game.hp||0)/(game.maxHp||100),0,100)+'%';$('shieldText').textContent=game.shield>0?`＋🛡${Math.ceil(game.shield)}`:'';$('enemyBarName').textContent=enemy?.name||'ENEMY';$('enemyHpText').textContent=enemy?`${Math.ceil(Math.max(0,enemy.hp))} / ${enemy.maxHp}`:'—';$('enemyHpFill').style.width=enemy?clamp(enemy.hp/enemy.maxHp*100,0,100)+'%':'0%';$('perfectStat').textContent=game.perfects||0;$('damageStat').textContent=formatCompact(game.damage||0);$('bestComboStat').textContent=game.peakCombo||0;$('chargeStat').textContent=`${game.charge||0} / 7`;$('buildCount').textContent=`${upgradeCount()} LEVELS`;$('towerCoinsLabel').textContent=game.towerCoins||0;renderCombatBuffs();}
function renderCombatBuffs(){
 const parts=[];
 if(lvl('fortitude')&&game.fortitudeReady)parts.push('🛡 不屈 準備');
 if(lvl('heartbeat'))parts.push('🎵 ジャスト '+(game.justStreak||0)+'/'+(has('heartbeat','focus')?2:3));
 if(lvl('overcharge'))parts.push('⚡ 過充電 '+(game.overchargeCount||0)+'/3');
 if(lvl('frost'))parts.push(game.frostWard?'❄ 氷の加護 準備':'❄ 氷結 '+(game.frostCount||0)+'/4');
 if(lvl('king')){const step=has('king','pulse')?8:10;parts.push('👑 王の一撃 あと'+(step-(game.combo||0)%step));}
 if(lvl('bloodlust')&&game.bloodlustPending>0)parts.push('🦇 渇望 +'+Math.round(game.bloodlustPending));
 const el=$('combatBuffs');el.hidden=!parts.length;el.textContent=parts.join('　·　');
}
function formatCompact(n){if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return Math.floor(n).toLocaleString('ja-JP')}
function renderBuild(){const active=SKILLS.filter(s=>lvl(s.id));$('buildList').innerHTML=active.length?active.map(s=>`<div class="build-item"><span class="build-symbol">${s.icon}</span><div style="min-width:0"><div class="build-name">${s.name}</div><div class="build-desc">${s.desc(lvl(s.id))}</div></div><span class="level">Lv.${lvl(s.id)}</span></div>`).join(''):'<div class="empty">スキルなし</div>';$('synergyList').innerHTML=SYNERGIES.filter(s=>has(s.a,s.b)).map(s=>`<div class="synergy"><b>${s.name}</b><small>${s.desc}</small></div>`).join('');renderRelicInventory();}

function hasRelic(id){return !game.practice&&!!game.relics?.includes(id)}
function relicCounter(id){return game.relicCounters?.[id]||0}
function relicBump(id,threshold){
 const next=relicCounter(id)+1;
 game.relicCounters[id]=next>=threshold?0:next;
 return next>=threshold;
}
function relicShield(amount){
 const cap=100+20*lvl('aegis');
 game.shield=Math.min(cap,game.shield+amount);
}
function adjustRelicMaxHp(){
 const base=game.rawMaxHp||game.maxHp;
 game.maxHp=hasRelic('reaper_pact')?Math.max(1,Math.floor(base*.8)):base;
 game.hp=Math.min(game.maxHp,game.hp);
}
function renderRelicInventory(){
 const items=RR.validIds(game.relics||[]).map(id=>RR.BY_ID[id]);
 $('relicCount').textContent=items.length+' / '+RR.MAX_HELD;
 $('relicList').innerHTML=items.length?items.map(r=>`<div class="relic-owned ${r.rarity}"><span class="relic-owned-icon">${r.icon}</span><div><div class="relic-owned-title">${r.name}</div><div class="relic-owned-desc">${r.desc}</div></div></div>`).join(''):'<div class="empty">遺物なし</div>';
}
function records(){return `<span>最高到達 <b>${meta.bestFloor}F</b></span><span>最高コンボ <b>${meta.bestCombo}</b></span><span>挑戦 <b>${meta.runs}回</b></span>`}

function soulReward(n){return Math.ceil(n*(1+PR.value(permanent,'soulGain')/100))}
// Deferred until defeat: avoids unexpectedly rewriting old saves on page load.
// Prior completed attempts still count when an older save first earns a bonus.
function grantRescueRewards(){
 const reward=PR.rescueReward(meta.runs,meta.rescueClaimMask);
 if(reward.bonus){
  meta.rescueClaimMask=reward.mask;
  meta.coins+=reward.bonus; // Flat amount, not amplified by 魂の共鳴.
 }
 return reward.bonus;
}
const LEGACY_OFFERS=PR.BASE_UPGRADES;
function upgradeRow(o){
 const full=o.level>=o.max,price=full?Infinity:o.cost;
 const progress=o.action==='legacy'
  ?`<div class="upgrade-progress" role="progressbar" aria-label="${o.name} 強化進捗" aria-valuemin="0" aria-valuemax="${o.max}" aria-valuenow="${o.level}">${Array.from({length:o.max},(_,i)=>`<span class="${i<o.level?'filled':''}"></span>`).join('')}</div>`
  :'';
 return `<div class="upgrade-row ${o.rarity||''}"><div class="upgrade-main"><span class="upgrade-symbol">${o.icon}</span><div><div class="upgrade-name">${o.name} <span class="muted">Lv.${o.level}/${o.max}</span></div><div class="upgrade-effect">${o.desc}</div>${progress}</div></div><button type="button" class="upgrade-buy" data-action="${o.action}" data-key="${o.id}" ${full||meta.coins<price?'disabled':''}>${full?'MAX':price+' ✧'}</button></div>`;
}
function bonusNavigation(){
 return '<div class="bonus-nav" role="group" aria-label="おまけの種類">'+[['items','演出のおまけ'],['skins','主人公スキン']].map(([id,name])=>'<button type="button" class="upgrade-tab '+(bonusView===id?'active':'')+'" data-action="bonus-section" data-key="'+id+'" aria-pressed="'+(bonusView===id)+'">'+name+'</button>').join('')+'</div>';
}
function renderSkinPicker(){
 for(const skin of PR.SKINS)window.ParryHeroPuppet?.preloadSkin?.(skin.id);
 const selected=PR.SKINS.find(skin=>skin.id===skinPreview)||PR.SKINS[0];
 return bonusNavigation()+'<div class="skin-picker-head"><h3>主人公スキン</h3><p class="upgrade-note">スキンは1着ずつ個別購入し、購入済みから1着を装備します。現在は販売準備中で、欠片は消費しません。</p><p class="skin-preview-status" role="status">プレビュー：'+selected.name+'</p></div><div class="skin-grid">'+PR.SKINS.map(skin=>{
  const chosen=skin.id===selected.id,normal=skin.id==='normal';
  const price=normal?'無料':Number.isFinite(skin.cost)?skin.cost.toLocaleString('ja-JP')+' 欠片':'価格未定';
  const sale='<div class="skin-sale"><strong class="skin-price">'+price+'</strong><span>'+(normal?'標準スキン':'個別販売')+'</span></div>';
  const buy=normal?'':'<button type="button" class="upgrade-buy skin-buy" data-action="skin-buy" data-key="'+skin.id+'" disabled aria-label="'+skin.name+' '+price+' 販売準備中">購入（準備中）</button>';
  return '<article class="skin-card '+(chosen?'selected':'')+'" style="--skin-color:'+skin.color+'"><div class="skin-card-top"><span class="skin-tag">'+skin.tag+'</span><span class="skin-ready">外見レビュー可</span></div><canvas class="skin-art-sample" data-skin-sample="'+skin.id+'" width="480" height="300" role="img" aria-label="'+skin.name+'の立ち絵"></canvas><h4>'+skin.name+'</h4><p class="skin-look">'+skin.look+'</p><p class="skin-rule">'+skin.rule+'</p>'+sale+'<div class="skin-actions">'+buy+'<button type="button" class="upgrade-buy" data-action="skin-preview" data-key="'+skin.id+'" aria-pressed="'+chosen+'">'+(chosen?'✓ プレビュー中':'選んで見る')+'</button><a class="upgrade-buy" href="./skin-preview.html?skin='+skin.id+'">モーションを見る ↗</a></div></article>';
 }).join('')+'</div>';
}
function renderUpgradeScreen(){
 $('upgradeCoins').textContent=meta.coins+' ✧';
 const tabs=[['loadout','スキル装備'],['skills','スキル解放'],['base','基礎強化'],['special','特殊強化'],['seal','運命の封印'],['bonus','おまけ']];
 $('upgradeTabs').innerHTML=tabs.map(([id,name])=>`<button type="button" class="upgrade-tab ${upgradeTab===id?'active':''}" aria-pressed="${upgradeTab===id}" data-tab="${id}">${name}</button>`).join('');
 if(upgradeTab==='loadout'){
  const owned=SKILLS.filter(skill=>permanent.unlockedSkills.includes(skill.id)&&!permanent.sealedSkills.includes(skill.id));
  const rows=PR.SLOT_COSTS.map((cost,i)=>{
   if(i>=permanent.slots){
    return `<div class="upgrade-row locked"><div class="upgrade-main"><span class="upgrade-symbol">🔒</span><div><div class="upgrade-name">スロット ${i+1}</div><div class="upgrade-effect">未解放</div></div></div><button type="button" class="upgrade-buy" data-action="slot" data-key="${i}" ${i!==permanent.slots||meta.coins<cost?'disabled':''}>${cost} ✧</button></div>`;
   }
   const selected=permanent.equipped[i];
   const options=owned.filter(skill=>!permanent.equipped.some((id,j)=>j!==i&&id===skill.id))
    .map(skill=>`<option value="${skill.id}" ${selected===skill.id?'selected':''}>${skill.icon} ${skill.name} · Lv.1</option>`).join('');
   return `<div class="upgrade-slot"><div class="upgrade-slot-head"><span class="upgrade-slot-label">スロット ${i+1}</span><span class="upgrade-cost">解放済み</span></div><select class="upgrade-equip" data-equip="${i}" aria-label="スロット ${i+1} の初期装備"><option value="" ${!selected?'selected':''}>— 装備なし —</option>${options}</select></div>`;
  }).join('');
  $('upgradeList').innerHTML=`<p class="upgrade-note">装備したスキルはLv.1で開始。変更は無料。</p><div class="upgrade-slots">${rows}</div>${owned.length?'':'<div class="upgrade-empty">「スキル解放」から装備するスキルを購入</div>'}`;
 }else if(upgradeTab==='bonus'&&bonusView==='skins'){
  $('upgradeList').innerHTML=renderSkinPicker();
 }else if(upgradeTab==='bonus'){
  $('upgradeList').innerHTML=bonusNavigation()+'<p class="upgrade-note">購入は一度だけ。購入後はここで無料でオン・オフできます。</p>'+PR.EXTRAS.map(item=>{
   const owned=permanent.unlockedExtras.includes(item.id),enabled=PR.extraEnabled(permanent,item.id);
   const choice=item.choices?'<label class="bonus-choice">斬撃の色 <select data-extra-option="'+item.id+'" '+(!owned?'disabled':'')+'>'+item.choices.map(choice=>'<option value="'+choice.id+'" '+(PR.extraOption(permanent,item.id).id===choice.id?'selected':'')+'>'+choice.name+'</option>').join('')+'</select></label>':'';
   return '<div class="upgrade-row bonus-row"><div class="upgrade-main"><span class="upgrade-symbol">'+item.icon+'</span><div><div class="upgrade-name">'+item.name+'</div><div class="upgrade-effect">'+item.description+'</div><div class="upgrade-effect">'+(owned?'購入済み · '+(enabled?'ON':'OFF'):'未購入')+'</div>'+(['slashTint','comboGlow'].includes(item.id)?'<canvas class="bonus-sample" width="180" height="74" data-bonus-sample="'+item.id+'" aria-label="'+item.name+'の見本"></canvas>':'')+choice+'</div></div><button type="button" class="upgrade-buy" data-action="'+(owned?'bonus-toggle':'bonus-buy')+'" data-key="'+item.id+'" '+(owned?'aria-pressed="'+enabled+'"':meta.coins<item.cost?'disabled':'')+'>'+(owned?(enabled?'ON → OFF':'OFF → ON'):item.cost.toLocaleString('ja-JP')+' ✧ で解放')+'</button></div>';
  }).join('');
 }else if(upgradeTab==='skills'){
  const unlocked=SKILLS.filter(skill=>permanent.unlockedSkills.includes(skill.id)).length;
  $('upgradeList').innerHTML=`<p class="upgrade-note">初期装備用の解放：${unlocked} / ${SKILLS.length}　ラン中の通常抽選は変わりません。</p>`+
   SKILLS.map(skill=>{
    const owned=permanent.unlockedSkills.includes(skill.id),cost=PR.skillPrice(skill);
    return `<div class="upgrade-row ${skill.rarity}"><div class="upgrade-main"><span class="upgrade-symbol">${skill.icon}</span><div><div class="upgrade-name">${skill.name} <span class="muted">${String(skill.rarity||'common').toUpperCase()}</span></div><div class="upgrade-effect">${skill.desc(1)}</div></div></div><button type="button" class="upgrade-buy" data-action="skill" data-key="${skill.id}" ${owned||meta.coins<cost?'disabled':''}>${owned?'解放済み':cost+' ✧'}</button></div>`;
   }).join('');
 }else if(upgradeTab==='seal'){
  const limit=PR.value(permanent,'sealSlots'),seals=permanent.sealedSkills;
  const nextCost=PR.costNext(permanent,'sealSlots'),full=!Number.isFinite(nextCost);
  const upgrade=`<div class="upgrade-row"><div class="upgrade-main"><span class="upgrade-symbol">🔮</span><div><div class="upgrade-name">封印枠 ${limit}/4</div><div class="upgrade-effect">戦利品の抽選から除外。封印と解除は何度でも無料。</div></div></div><button type="button" class="upgrade-buy" data-action="extra" data-key="sealSlots" ${full||meta.coins<nextCost?'disabled':''}>${full?'MAX':nextCost+' ✧'}</button></div>`;
  const rows=SKILLS.map(skill=>{
   const sealed=seals.includes(skill.id),equipped=permanent.equipped.includes(skill.id);
   const blocked=!sealed&&(equipped||seals.length>=limit);
   const label=sealed?'封印を解く':equipped?'装備中':limit===0?'枠未解放':seals.length>=limit?'枠が満杯':'封印する';
   return `<div class="upgrade-row ${skill.rarity} ${sealed?'sealed':''}"><div class="upgrade-main"><span class="upgrade-symbol">${skill.icon}</span><div><div class="upgrade-name">${skill.name} <span class="muted">${String(skill.rarity||'common').toUpperCase()}</span></div><div class="upgrade-effect">${sealed?'🔮 封印中 · 戦利品に出現しません':skill.desc(1)}</div></div></div><button type="button" class="upgrade-buy" data-action="seal" data-key="${skill.id}" aria-pressed="${sealed}" ${blocked?'disabled':''}>${label}</button></div>`;
  }).join('');
  $('upgradeList').innerHTML=`<p class="upgrade-note">🔮 運命の封印　${seals.length} / ${limit} 枠使用中（最大4枠）。出撃前ならいつでも変更可能。初期装備中のスキルは封印できません。</p>`+upgrade+rows;
 }else{
  const legacy=upgradeTab==='base'?LEGACY_OFFERS.map(o=>{
   const level=PR.baseLevel(meta,o.id),now=PR.baseValue(meta,o.id);
   const next=PR.baseValue({...meta,[o.id]:level+1},o.id);
   return upgradeRow({...o,level,action:'legacy',cost:PR.baseCostNext(meta,o.id),
    desc:`現在：${o.effect} +${now}${level===o.max?'（最大強化）':` → Lv.${level+1}：+${next}`}`});
  }):[];
  const extra=PR.UPGRADES.filter(o=>o.group===upgradeTab&&o.id!=='sealSlots').map(o=>{
   const level=permanent[o.id],nextValue=o.values[Math.min(level,o.values.length-1)];
   return upgradeRow({id:o.id,icon:o.icon,name:o.name,level,max:o.costs.length,cost:PR.costNext(permanent,o.id),action:'extra',desc:o.description(nextValue)});
  });
  // Make rescue milestones discoverable; claiming still happens only on game over.
  const rescueNote=upgradeTab==='base'
   ?`<p class="upgrade-note">🎁 累計挑戦応援（現在 ${meta.runs}回）<br>${PR.RUN_RESCUE_MILESTONES.map((m,i)=>`${meta.rescueClaimMask&(1<<i)?'✓ 受取済':'○ 未受取'} ${m.runs}回：+${m.bonus} ✧`).join('　·　')}<br>達成済みの未受取報酬は、次のゲームオーバー時にまとめて受け取れます。</p>`
   :'';
  $('upgradeList').innerHTML=rescueNote+legacy.concat(extra).join('');
 }
}
function openUpgrade(){
 if(deathInputBlocked()||!['title','gameover'].includes(game.mode))return;
 upgradeReturnMode=game.mode;upgradeTab='loadout';setMode('upgrade');renderUpgradeScreen();
}
function closeUpgrade(){if(game.mode!=='upgrade')return;setMode(upgradeReturnMode)}
function buyUpgrade(action,key){
 if(game.mode!=='upgrade')return;
 if(action==='bonus-toggle'){
  const next=PR.toggleExtra(permanent,key,!PR.extraEnabled(permanent,key),SKILLS);if(!next)return;
  permanent=next;savePermanent();syncArtMode();renderUpgradeScreen();sound(650,.12,'triangle',.04,140);return;
 }
 if(action==='seal'){
  const next=PR.seal(permanent,key,!permanent.sealedSkills.includes(key),SKILLS);
  if(!next)return;
  permanent=next;savePermanent();renderUpgradeScreen();sound(650,.12,'triangle',.04,140);return;
 }
 let cost=Infinity,apply=null;
 if(action==='slot'){
  const index=Number(key);
  if(Number.isInteger(index)&&index===permanent.slots&&index<PR.SLOT_COSTS.length){
   cost=PR.SLOT_COSTS[index];apply=()=>{permanent.slots++};
  }
 }else if(action==='bonus-buy'){
  const item=PR.EXTRAS.find(item=>item.id===key);
  if(item&&!permanent.unlockedExtras.includes(key)){cost=item.cost;apply=()=>{permanent.unlockedExtras.push(key)};}
 }else if(action==='skill'){
  const skill=SK[key];
  if(skill&&!permanent.unlockedSkills.includes(skill.id)){
   cost=PR.skillPrice(skill);apply=()=>{permanent.unlockedSkills.push(skill.id)};
  }
 }else if(action==='legacy'){
  const def=LEGACY_OFFERS.find(o=>o.id===key);
  if(def&&PR.baseLevel(meta,key)<def.max){
   cost=PR.baseCostNext(meta,key);
   apply=()=>{meta[key]=PR.baseLevel(meta,key)+1};
  }
 }else if(action==='extra'){
  const def=PR.UPGRADES.find(o=>o.id===key);
  if(def&&permanent[key]<def.costs.length){
   cost=PR.costNext(permanent,key);apply=()=>{permanent[key]++};
  }
 }
 if(!apply||!Number.isFinite(cost)||meta.coins<cost)return;
 meta.coins-=cost;apply();save();savePermanent();renderUpgradeScreen();sound(740,.19,'triangle',.06,190);
}
function title(){stopScore();devMusicAudition=false;devMusicTheme='auto';clashFX=null;game={mode:'title',floor:1,maxHp:65,hp:65,shield:0,lv:{},relics:[],towerCoins:0,combo:0,perfects:0,damage:0,charge:0};setMode('title');$('titleRecords').innerHTML=records();syncHUD();renderBuild();}
function start(practice=false,practiceKey=null,devOptions=null){
 if(DEV_MODE){if(score.active&&(devMusicAudition||score.music!=='crypt'))stopScore();devMusicAudition=false;devMusicTheme=STAGE_MUSIC?.get(devOptions?.musicId)?devOptions.musicId:'auto';}
 if(practice&&((!book.seen[practiceKey]&&!(DEV_MODE&&devOptions?.allowUnseenPractice))||!P.findByKey(practiceKey)))return;
 if(practice)populatePracticeEnemies(practiceKey,DEV_MODE&&devOptions?.allowUnseenPractice);
 const initial=practice?{}:PR.initialLevels(permanent,SKILLS);const sealedSkillIds=practice?[]:PR.activeSeals(permanent,SKILLS);const startingHp=65+PR.baseValue(meta,'life')+15*(initial.heal||0);const t=performance.now();particles=[];texts=[];clashFX=null;game={mode:'combat',guardHeld:false,guardStartedAt:0,practice,practiceKey:practice?practiceKey:null,bonusSouls:0,towerCoins:0,towerCoinsEarned:0,routeTrial:false,currentRoom:null,roomStage:null,roomLocked:false,eventId:null,routeSkillSet:[],relicReturn:null,relicMirrorTarget:null,lastRareFloor:-9999,lastDiscovered:false,floor:DEV_MODE&&devOptions?.floor?Math.min(999,Math.max(1,Math.floor(Number(devOptions.floor)))):1,devOverride:DEV_MODE?devOptions?.enemyKey||null:null,maxHp:startingHp,hp:startingHp,shield:PR.baseValue(meta,'ward'),baseAtk:25+PR.baseValue(meta,'attack'),lv:initial,sealedSkillIds,relics:[],relicDiscarded:[],relicCounters:{},relicOffer:[],relicRewardKind:null,relicSwapTarget:null,rawMaxHp:startingHp,relicRustyUsed:false,relicStardustUsed:false,relicStopUsed:false,relicPactConsumed:false,relicPactReady:false,relicMaskReady:false,relicGearReady:false,relicBellDue:false,relicBoltDue:false,relicEmperorDue:false,relicJustStreak:0,enemy:null,combo:0,peakCombo:0,perfects:0,parries:0,damage:0,charge:0,runs:0,bossKills:0,rerolls:1+(practice?0:PR.value(permanent,'extraReroll')),reviveUsed:false,justStreak:0,overchargeCount:0,frostCount:0,frostWard:false,fortitudeReady:false,bloodlustPending:0,parryRecoveryActive:false,parryDamageActive:false,parryDamage:0,whiffUntil:0,parryAnimAt:-9999,parryAnimKind:'',lastDeflectAt:-9999,lastDamageAt:-9999,misses:0,whiffs:0,guards:0,notice:'',noticeAt:0,lastHitAt:0,feedback:'',feedbackAt:0,clearAt:0,flash:false,playStartedAt:t,pendingKind:null,inputLocked:false,lastAttemptDelta:null,lastImpactAt:-99999,lastStrikeKind:'miss'};enterFloor(t);syncHUD();renderBuild();sound(270,.20,'triangle',.07,160)}
// The 4F/8F rooms replace ordinary combat on each ten-floor route cycle.
function enterFloor(at=performance.now()){
 if(!game.practice&&!(DEV_MODE&&game.devOverride)&&RT.branchKind(game.floor)){
  showRoutes();return;
 }
 spawnEnemy(at);setMode('combat');
}
function showRoutes(){
 const options=RT.options(game.floor);
 if(!options.length){spawnEnemy(performance.now());setMode('combat');return;}
 game.enemy=null;game.routeTrial=false;game.currentRoom=null;
 game.routeKind=RT.branchKind(game.floor);
 setMode('route');
 $('routeCards').innerHTML=options.map(room=>`<button type="button" class="route-card" data-route="${room.id}">
 <span class="route-symbol">${room.icon}</span><span class="route-card-body"><b>${room.name}</b><small>${room.tag} · ${room.desc}</small><span class="route-warning">${room.risk}</span></span><span aria-hidden="true">›</span></button>`).join('');
 syncHUD();
}
function resetNoncombatCombo(){
 game.combo=0;game.justStreak=0;game.relicJustStreak=0;
}
function selectRoute(id){
 if(game.mode!=='route'||!RT.options(game.floor).some(r=>r.id===id))return;
 game.currentRoom=id;
 if(id==='trial'){
  game.routeTrial=true;spawnEnemy(performance.now());setMode('combat');syncHUD();return;
 }
 resetNoncombatCombo();
 game.roomLocked=false;game.roomStage=null;game.roomResult='';game.eventId=id==='event'?EV.randomEvent().id:null;
 setMode('room');renderRoom();syncHUD();
}
function roomActionButton(id,label,detail='',disabled=false){
 return `<button type="button" class="room-choice" data-room-action="${id}" ${disabled?'disabled':''}>
  <span><b>${label}</b>${detail?`<small>${detail}</small>`:''}</span><span aria-hidden="true">›</span></button>`;
}
function renderRoom(){
 if(game.mode!=='room')return;
 const id=game.currentRoom,room=RT.ROOMS[id],event=id==='event'?EV.BY_ID[game.eventId]:null;
 if(!room||id==='trial'||(id==='event'&&!event))return;
 $('roomKicker').textContent=id==='event'?'MYSTERIOUS ENCOUNTER':id==='merchant'?'TRAVELLING MERCHANT':'A MOMENT OF RESPITE';
 $('roomIcon').textContent=event?.icon||room.icon;
 $('roomTitle').textContent=event?.name||room.name;
 $('roomDescription').textContent=event?.description||room.desc;
 $('roomNote').textContent='🪙 塔貨 '+game.towerCoins+'　♡ '+Math.ceil(game.hp)+' / '+game.maxHp+'　🛡 '+Math.ceil(game.shield);
 if(game.roomStage==='result'){
  $('roomDescription').textContent=game.roomResult;
  $('roomActions').innerHTML=roomActionButton('continue','次の階へ進む');
  return;
 }
 if(id==='rest'){
  $('roomActions').innerHTML=[
   roomActionButton('rest:heal','🔥 休息','最大HPの35%を回復'),
   roomActionButton('rest:meditate','🛡 瞑想','障壁+20、スキル報酬の引き直し+1')
  ].join('');
 }else if(id==='merchant'){
  $('roomActions').innerHTML=EV.ITEMS.map(item=>{
   const exhausted=item.id==='skill'&&!choosePool().length||
    item.id==='relic'&&!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary');
   return roomActionButton('buy:'+item.id,item.icon+' '+item.name+' · '+item.cost+' 🪙',item.desc,game.towerCoins<item.cost||exhausted);
  }).join('')+roomActionButton('leave','購入せず先へ進む');
 }else if(id==='event'&&game.roomStage==='mirror'){
  $('roomDescription').textContent='交換が確定するまで、元の遺物は失われません。';
  $('roomActions').innerHTML=game.relics.map(id=>{
   const relic=RR.BY_ID[id];return roomActionButton('mirror:'+id,relic.icon+' '+relic.name,relic.desc);
  }).join('')+roomActionButton('back','鏡の前に戻る');
 }else if(id==='event'){
  const options=event.actions.map(item=>{
   let disabled=false,description='';
   if(event.id==='altar'&&item.id==='sacrifice'){
    const cost=EV.altarCost(game.maxHp);
    disabled=!EV.canSacrifice(game.hp,game.maxHp)||choosePool().length===0;
    description='HP-'+cost+'。イベントの支払いは被弾扱いになりません。';
   }
   if(event.id==='mirror'&&item.id==='swap'){
    disabled=!game.relics.length||!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary');
    description='所持遺物1つを選び、風化・秘宝から3択。';
   }
   if(event.id==='chest'&&item.id==='open')description='失敗してもHP1で生存。';
   return roomActionButton('event:'+item.id,item.label,description,disabled);
  });
  $('roomActions').innerHTML=options.join('');
 }
}
function showRoomResult(text){
 game.roomLocked=true;game.roomStage='result';game.roomResult=text;renderRoom();syncHUD();
}
function finishNoncombatRoom(){
 if(!['room','routeSkill','relic'].includes(game.mode))return;
 game.roomLocked=true;game.relicReturn=null;game.relicMirrorTarget=null;game.routeSkillSet=[];
 advance();
}
function eventSkillOffer(title){
 const pool=choosePool();if(!pool.length)return false;
 game.routeSkillSet=pool.map(skill=>skill.id);
 game.routeSkillTitle=title;
 setMode('routeSkill');
 $('routeSkillTitle').textContent=title;
 $('routeSkillCards').innerHTML=pool.map(skill=>`<button class="reward-card ${skill.rarity}" type="button" data-route-skill="${skill.id}">
 <span class="rarity">${skill.rarity.toUpperCase()} · ${lvl(skill.id)?'LEVEL UP':'NEW SKILL'}</span>
 <span class="emoji">${skill.icon}</span><span class="rname">${skill.name} <small>Lv.${lvl(skill.id)+1}</small></span>
 <span class="rdesc">${skill.desc(lvl(skill.id)+1)}</span></button>`).join('');
 return true;
}
function takeEventSkill(id){
 if(game.mode!=='routeSkill'||!game.routeSkillSet.includes(id)||!SK[id]||lvl(id)>=SK[id].max)return;
 game.routeSkillSet=[];gainSkillLevel(id);sound(800,.18,'triangle',.05,130);finishNoncombatRoom();
}
function roomAction(action){
 if(game.mode!=='room')return;
 if(game.roomStage==='result'){
  if(action==='continue')finishNoncombatRoom();
  return;
 }
 if(game.roomLocked)return;
 if(game.currentRoom==='rest'){
  if(action==='rest:heal'){
   const recovered=heal(Math.round(game.maxHp*.35));
   showRoomResult('休息を終え、HPを'+Math.round(recovered)+'回復した。');
  }else if(action==='rest:meditate'){
   const before=game.shield;relicShield(20);game.rerolls++;
   showRoomResult('瞑想を終え、障壁+'+Math.round(game.shield-before)+'、引き直し+1を得た。');
  }
  return;
 }
 if(game.currentRoom==='merchant'){
  if(action==='leave'){showRoomResult('商人に礼を告げ、塔貨を温存した。');return;}
  if(!action.startsWith('buy:'))return;
  const item=EV.ITEMS_BY_ID[action.slice(4)];
  if(!item||game.towerCoins<item.cost)return;
  if(item.id==='skill'&&!choosePool().length)return;
  if(item.id==='relic'&&!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary'))return;
  game.towerCoins-=item.cost;game.roomLocked=true;syncHUD();
  if(item.id==='reroll'){game.rerolls++;showRoomResult('運命の札を購入した。引き直し+1。');}
  else if(item.id==='barrier'){
   const prev=game.shield;relicShield(20);
   showRoomResult('結界の護符で障壁+'+Math.round(game.shield-prev)+'。');
  }else if(item.id==='skill')eventSkillOffer('秘伝の巻物 — スキルをひとつ選べ');
  else if(item.id==='relic'){
   game.relicReturn='room';showRelicRewards('special');
  }
  return;
 }
 if(game.currentRoom!=='event'||!EV.BY_ID[game.eventId])return;
 if(action==='back'&&game.roomStage==='mirror'){game.roomStage=null;renderRoom();return;}
 if(game.roomStage==='mirror'){
  if(!action.startsWith('mirror:'))return;
  const relicId=action.slice(7);
  if(!game.relics.includes(relicId))return;
  game.relicMirrorTarget=relicId;game.relicReturn='mirror';game.roomLocked=true;showRelicRewards('special');
  return;
 }
 if(!action.startsWith('event:'))return;
 const event=EV.BY_ID[game.eventId],opt=action.slice(6);
 if(!event.actions.some(x=>x.id===opt))return;
 if(event.id==='altar'){
  if(opt==='sacrifice'){
   if(!EV.canSacrifice(game.hp,game.maxHp)||!choosePool().length)return;
   game.hp-=EV.altarCost(game.maxHp);game.roomLocked=true;syncHUD();
   eventSkillOffer('血の祭壇 — スキルをひとつ選べ');
  }else if(opt==='ward'){const old=game.shield;relicShield(12);showRoomResult('祭壇が障壁+'+Math.round(game.shield-old)+'を授けた。');}
 }else if(event.id==='mirror'){
  if(opt==='coins'){game.towerCoins+=12;showRoomResult('鏡を背にし、塔貨12枚を手に入れた。');}
  else if(opt==='swap'){
   if(!game.relics.length||!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary'))return;
   game.roomStage='mirror';renderRoom();
  }
 }else if(event.id==='traveler'){
  if(opt==='coins'){game.towerCoins+=18;showRoomResult('旅人の遺品から塔貨18枚を手に入れた。');}
  else if(opt==='ward'){const old=game.shield;relicShield(10);game.rerolls++;showRoomResult('障壁+'+Math.round(game.shield-old)+'、引き直し+1を得た。');}
 }else if(event.id==='chest'){
  if(opt==='coins'){game.towerCoins+=10;showRoomResult('宝箱は開けず、塔貨10枚を拾った。');}
  else if(opt==='open'){
   game.roomLocked=true;
   if(Math.random()<.4&&RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary')){
    game.relicReturn='room';showRelicRewards('special');
   }else{
    const lost=EV.chestDamage(game.hp,game.maxHp);
    game.hp-=lost;showRoomResult('宝箱の罠が発動！ HPを'+Math.round(lost)+'失った（死亡しない）。');
   }
  }
 }
}
function spawnEnemy(t){
 clashFX=null;
 game.relicRustyUsed=false;game.relicStardustUsed=false;game.relicStopUsed=false;game.relicPactConsumed=false;
 const floor=game.floor||1;
 let archetype;
 if(game.practice){
  const key=game.practiceKey||$('practiceEnemy').value;
  if(!DEV_MODE&&!book.seen[key]){title();return}
  archetype=P.findByKey(key);
 }else if(DEV_MODE&&game.devOverride){
  archetype=P.findByKey(game.devOverride);
  game.devOverride=null;
 }else if(game.routeTrial){
  // 50% of blood trials tease a signature foe from two complete zones ahead.
  // The visitor uses the CURRENT floor's elite stats, not its future floor's growth.
  archetype=P.foreshadowTrialForFloor(floor,Math.random);
  if(!archetype){
   const ordinary=P.encounterForFloor(floor,()=>.5,game.lastRareFloor);
   archetype=P.findByKey(ordinary.id+':elite');
  }
 }else{
  archetype=P.encounterForFloor(floor,Math.random,game.lastRareFloor);
  if(archetype.rare)game.lastRareFloor=floor;
 }
 if(!archetype){title();return}
 // Encounter, not kill, unlocks the existing invulnerable practice mode.
 game.lastDiscovered=false;
 clearGuardInput();resetParryInput();
 if(!game.practice&&!archetype.preview){
  game.lastDiscovered=P.recordEncounter(book,archetype,floor);
  saveBook();
 }
 const stats=P.baseStats(archetype,floor,game.practice);
 const maxHp=game.practice?999999:stats.maxHp;
 game.enemy={...archetype,name:archetype.displayName,maxHp,hp:maxHp,atk:stats.atk,burn:0,index:0,phase:1};
 game.phaseStage=null;game.phaseStartedAt=0;game.phaseCountStartAt=0;
 if(archetype.boss&&!game.practice)game.shield+=PR.value(permanent,'bossWard');
 game.artLoading=false;game.artFallback=false;
 const skinReady=!DEV_MODE||!window.ParryHeroPuppet?.skinReady||window.ParryHeroPuppet.skinReady(devPreviewSkin);
 if(useIllustratedArt()&&KNIGHT_PUPPET&&(!KNIGHT_PUPPET.readyFor(game.enemy)||!skinReady)){
  const run=game,encounter=game.enemy;game.artLoading=true;stopScore();setMode('loading');
  // Resume from a fresh beat origin only after both characters can be drawn.
  // A later completion cannot restart a run the player has left or replaced.
  const finish=ok=>{
   if(game!==run||game.enemy!==encounter||game.mode!=='loading')return;
   game.artLoading=false;game.artFallback=!ok;beginEncounter(performance.now());setMode('combat');
  };
  Promise.resolve().then(()=>Promise.all([KNIGHT_PUPPET.preload(encounter),
   DEV_MODE?window.ParryHeroPuppet?.preloadSkin?.(devPreviewSkin)??true:true])).then(results=>finish(results.every(Boolean)),()=>finish(false));
 }else beginEncounter(t);
 syncHUD();
}
function beginEncounter(t){
 const archetype=game.enemy,floor=game.floor||1;
 startScore(game.enemy);
 if(archetype.rare&&!game.practice){sound(890,.20,'sine',.08,-180);showText('✦ RARE ENCOUNTER ✦',w*.50,h*.20,'#f6d58b',20)}
 game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.attackAt=t+game.attackSpan+170;game.telegraphStart=t;
 game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;
 game.lastAttemptDelta=null;game.lastStrike=0;game.feedback='';game.feedbackAt=0;
 game.nextFloorHint=game.practice?'PRACTICE':archetype.preview?'UNKNOWN ENCOUNTER':archetype.finalBoss?'FINAL BOSS · '+floor+'F':archetype.rare?'RARE ENCOUNTER':archetype.elite?'ELITE ENCOUNTER':archetype.boss?'BOSS FLOOR':'FLOOR '+floor;
 game.nextFloorHintAt=t;syncAttackClock();syncHUD();
}
function nextStrike(){
 const e=game.enemy;if(!e)return;
 // The finale interrupts only BETWEEN attacks; never move an already-telegraphed hit.
 if(e.finalBoss&&e.phase===1&&e.phaseRhythm&&e.hp>0&&e.hp<=e.maxHp*.5){
  beginFinalPhase();return;
 }
 const step=e.rhythm[e.index%e.rhythm.length];e.index++;const extra=lvl('tempo')?Math.ceil(lvl('tempo')*.5):0;const beats=step+extra;game.attackBeat+=beats;game.attackSpan=beats*score.beat*1000;syncAttackClock();game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;game.lastAttemptDelta=null}
function beginFinalPhase(){
 const e=game.enemy;
 e.phase=2;e.rhythm=[...e.phaseRhythm];e.index=0;
 clearGuardInput();
 game.phaseStage='rumble';game.phaseStartedAt=performance.now();
 game.phaseCountStartAt=0;
 game.attackAt=Infinity;game.attackResolved=true;game.pendingKind=null;
 game.inputLocked=true;
 stopScore();
 setMode('phase');
 sound(88,1.1,'sawtooth',.10,-49);
 shake=Math.max(shake,11);flash=.80;flashColor='#b982e7';
 // No damage, burn ticking or player action occurs while the second movement is introduced.
}
function beginFinalCountIn(){
 if(game.mode!=='phase'||game.phaseStage!=='rumble')return;
 game.phaseStage='countin';
 const e=game.enemy;
 startScore(e);
 // If the browser cannot initialize audio, the visual count-in still finishes safely.
 if(!score.active)score.beat=60/136;
 game.phaseCountStartAt=score.active?scoreToPerf(score.origin):performance.now()+170;
 if(score.active){
  // Four low drum strokes on the same AudioContext clock; only the first is accented.
  for(let i=0;i<FINAL_PHASE_COUNT_BEATS;i++){
   const t=score.origin+i*score.beat;
   scoreFinalKick(t,i===0);
  }
 }
 $('trackLabel').textContent='SECOND MOVEMENT · '+score.bpm+' BPM';
}
function updateFinalPhase(now){
 if(game.phaseStage==='rumble'){
  if(now-game.phaseStartedAt>=FINAL_PHASE_RUMBLE_MS)beginFinalCountIn();
  return;
 }
 if(game.phaseStage!=='countin')return;
 if(score.active)scheduleScore();
 const beatMs=score.beat*1000;
 const startAt=score.active?scoreToPerf(score.origin):game.phaseCountStartAt;
 const resumeAt=startAt+FINAL_PHASE_COUNT_BEATS*beatMs;
 if(now<resumeAt)return;
 // If a background tab skipped the end of the count-in, replay it instead of
 // immediately striking the player with an expired telegraph.
 if(now>resumeAt+beatMs){stopScore();game.phaseStage='rumble';beginFinalCountIn();return;}
 game.phaseStage=null;
 game.attackBeat=FINAL_PHASE_COUNT_BEATS*2;
 game.attackSpan=FINAL_PHASE_COUNT_BEATS*beatMs;
 if(score.active)syncAttackClock();
 else{game.attackAt=now+game.attackSpan;game.telegraphStart=now;}
 game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;
 game.pendingKind=null;game.inputLocked=false;game.lastAttemptDelta=null;
 // The movement title was already shown over the count-in; do not show it again
 // at the normal combo/HUD height when combat resumes.
 game.nextFloorHint='';
 game.nextFloorHintAt=-99999;
 setMode('combat');
}
function showText(text,x,y,color='#fff',size=21){texts.push({text,x,y,t:performance.now(),life:850,color,size});if(texts.length>45)texts.shift()}
function puff(x,y,color='#fff',count=16,power=1){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),v=rand(.6,3.7)*power;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-rand(0,.6),color,life:rand(400,1100),max:1100,size:rand(1.4,4.1)})}if(particles.length>180)particles.splice(0,particles.length-180)}
function feedback(label,color){game.feedback=label;game.feedbackAt=performance.now();showText(label,w*.5,h*.27,color,27)}
// Each successful parry heals once from damage actually inflicted (overkill excluded).
// Blood Rhythm adds 1 percentage point to both lifesteal rate and max-HP recovery cap per combo.
// The combo contribution deliberately has no upper limit.
function bloodHealAmount(dealt,level,combo,synergy,maxHp){
 if(level<=0||dealt<=0||maxHp<=0)return 0;
 const bonus=synergy?Math.max(0,Math.floor(combo)):0;
 const rate=(6+level*2+bonus)/100;
 const cap=Math.ceil(maxHp*(25+bonus)/100);
 return Math.min(Math.max(2,Math.round(dealt*rate)),cap);
}
function finishParryBlood(){
 if(!game.parryDamageActive)return 0;
 const dealt=game.parryDamage;
 game.parryDamage=0;game.parryDamageActive=false;
 const amount=bloodHealAmount(dealt,lvl('blood'),game.combo,has('blood','fury'),game.maxHp);
 return amount?heal(amount):0;
}
// Resolve successful-parry healing once, also when the killing blow immediately ends the floor.
// Overheal and between-floor regeneration never become stored attack damage.
function finishParryRecovery(){
 if(!game.parryRecoveryActive)return;
 game.parryRecoveryActive=false;
 const blood=finishParryBlood();
 const lust=lvl('bloodlust')&&!game.practice?heal(2+lvl('bloodlust')):0;
 const bell=hasRelic('pilgrim_bell')&&game.relicBellDue?heal(4):0;
 game.relicBellDue=false;
 const pact=hasRelic('blood_pact_chalice')&&game.relicPactReady?heal(8):0;
 game.relicPactReady=false;
 if(lvl('bloodlust')&&!game.practice){
  const multiple=(1+lvl('bloodlust')*.5)*(has('bloodlust','blood')?1.5:1);
  const cap=game.baseAtk*(2.5+lvl('bloodlust')*.5);
  game.bloodlustPending=Math.min(cap,Math.round((blood+lust+bell+pact)*multiple));
 }
}
function damageEnemy(n,color='#fff',label){
 const e=game.enemy;if(!e||e.hp<=0)return;
 if(hasRelic('emperor_conduit')&&['⚡','雷鳴','雷霆','過充電','雷導','雷帝'].includes(label))n*=1.25;
 const damage=Math.max(1,Math.round(n)),dealt=Math.min(e.hp,damage);
 e.hp-=dealt;game.damage+=damage;
 // Guard reflection is outside the successful-parry scope; burn ticks bypass damageEnemy.
 if(game.parryDamageActive)game.parryDamage+=dealt;
 const x=w*.71+rand(-22,22),y=h*.43+rand(-25,18);
 showText(label?`${label} ${formatCompact(damage)}`:formatCompact(damage),x,y,color,label?15:19);
 puff(w*.71,h*.60,color,Math.min(22,4+damage/14),.72);
 if(e.hp<=0){
  // Killing blows change game mode immediately: settle lifesteal first.
  finishParryRecovery();clearFloor();
 }
}
function heal(n){const a=game.hp;game.hp=Math.min(game.maxHp,game.hp+n);const restored=Math.max(0,game.hp-a);if(restored>.1)showText('+'+Math.round(restored),w*.27,h*.47,'#8aefbd',18);return restored}
function getAttackMultiplier(){let m=(1+lvl('blade')*.25)*(1+Math.min(game.combo,120)*(.012+lvl('fury')*.02));if(game.hp<game.maxHp*.5)m*=1+lvl('gamble')*.30;if(game.enemy?.hp/game.enemy?.maxHp<.35)m*=1+lvl('execute')*.23;return m}
function strikeResult(kind,at){const e=game.enemy;if(!e||game.mode!=='combat')return;game.attackResolved=true;game.lastImpactAt=at;game.lastStrikeKind=kind;musicParry(kind);game.lateReported=false;game.lastHitAt=at;triggerClashFX(kind,at,e.kind);if(game.practice){if(kind==='miss')feedback(game.lastAttemptDelta===null?'入力なし':((game.lastAttemptDelta<0?'早い ':'遅い ')+Math.abs(Math.round(game.lastAttemptDelta))+'ms'),'#f7ca8e');else feedback(kind==='just'?'JUST!':kind==='parry'?'PARRY!':'GUARD',kind==='just'?'#84effa':'#ecd3a1');}const perfect=kind==='just';if(kind==='guard'){
  game.relicJustStreak=0;game.justStreak=0;
  if(hasRelic('stopped_hand')&&!game.relicStopUsed){
   game.relicStopUsed=true;showText('秒針停止!',w*.35,h*.31,'#dac8ff',17);
  }else game.combo=guardComboAfterHit(game.combo);
  game.guards++;
  if(!lvl('aegis'))game.charge=0;
  applyDamage(Math.min(e.atk*GUARD_DAMAGE_RATIO,game.maxHp*GUARD_MAX_HP_RATIO),'GUARD');
  if(game.mode!=='combat')return;
  if(lvl('thorns')){let reflect=e.atk*(.30+lvl('thorns')*.18);if(has('aegis','thorns'))reflect+=game.shield*.4;damageEnemy(reflect,'#dbb7ff','反射')}feedback('GUARD','#f6c473');
}else if(kind==='miss'){
  game.relicJustStreak=0;game.justStreak=0;game.combo=0;game.misses++;game.charge=0;game.lastDamageAt=at;applyDamage(e.atk,'MISS');if(game.mode!=='combat')return;if(!game.practice)feedback('HIT!','#ff8295');sound(145,.21,'sawtooth',.045,-85);shake=12;
}else{
  game.parryReadyAt=Math.min(game.parryReadyAt||0,at);
  game.lastDeflectAt=at;game.combo++;game.peakCombo=Math.max(game.peakCombo,game.combo);game.parries++;if(perfect){game.perfects++;game.charge=Math.min(7,game.charge+2)}else{game.charge=Math.min(7,game.charge+1)}
  game.justStreak=perfect?(game.justStreak||0)+1:0;
  // Record success and JUST thresholds before damage can end the floor.
  if(lvl('overcharge'))game.overchargeCount=(game.overchargeCount||0)+1;
  const heartbeatProc=!!(lvl('heartbeat')&&perfect&&game.justStreak>=(has('heartbeat','focus')?2:3));
  if(heartbeatProc){game.justStreak=0;game.charge=Math.min(7,game.charge+1)}
  game.parryDamage=0;game.parryDamageActive=!!lvl('blood')&&!game.practice;
  game.parryRecoveryActive=true;
  if(hasRelic('conduit_stone')&&!game.relicBoltDue)game.relicBoltDue=relicBump('conduit_stone',4);
  if(hasRelic('emperor_conduit')&&!lvl('thunder')&&!lvl('overcharge')&&!game.relicEmperorDue)
   game.relicEmperorDue=relicBump('emperor_conduit',5);
  if(hasRelic('pilgrim_bell'))game.relicBellDue=relicBump('pilgrim_bell',4);
  if(hasRelic('ember_vial'))game.enemy.burn+=3;
  if(hasRelic('royal_banner')&&game.combo%10===0)relicShield(10);
  if(hasRelic('broken_gear')&&game.relicGearReady){game.relicGearReady=false;relicShield(5)}
  if(hasRelic('serene_crystal')){
   game.relicJustStreak=perfect?(game.relicJustStreak||0)+1:0;
   if(game.relicJustStreak>=3){game.relicJustStreak=0;relicShield(8);showText('静謐!',w*.34,h*.36,'#c7e5f9',17)}
  }
  const relicMaskSlash=hasRelic('duet_mask')&&game.relicMaskReady;
  game.relicMaskReady=hasRelic('duet_mask')&&perfect;
  if(lvl('frost')&&!game.frostWard){
   game.frostCount=(game.frostCount||0)+1;
   if(game.frostCount>=4){game.frostCount=0;game.frostWard=true;showText('氷の加護!',w*.32,h*.34,'#c5ecff',18)}
  }
  let val=game.baseAtk*getAttackMultiplier()*(perfect?(1.6+lvl('precision')*.35):1);
  if(lvl('double')&&Math.random()<(.14+lvl('double')*.09)){val*=2;showText('DOUBLE!',w*.51,h*.22,'#fdd99d',18)}
  if(game.fortitudeReady&&lvl('fortitude')){
   val*=1+(.15+.1*lvl('fortitude'));game.fortitudeReady=false;
   if(has('fortitude','aegis'))game.shield=Math.min(100+20*lvl('aegis'),game.shield+5);
   showText('不屈!',w*.54,h*.27,'#e6e9a7',17);
  }
  // Spend last parry's stored healing before newly earned recovery can be calculated.
  if(lvl('bloodlust')&&game.bloodlustPending>0){
   val+=game.bloodlustPending;showText('渇望 +'+Math.round(game.bloodlustPending),w*.53,h*.36,'#e9a3cb',15);game.bloodlustPending=0;
  }
  if(hasRelic('stardust_whetstone')&&!game.relicStardustUsed){
   game.relicStardustUsed=true;val*=1.3;
  }
  if(hasRelic('reaper_pact'))val*=1.35;
  if(hasRelic('golden_festival_bell')&&e.boss)val*=1.2;
  damageEnemy(val,perfect?'#93eafa':'#fff5cb');if(game.mode!=='combat')return;
  if(relicMaskSlash){
   damageEnemy(val*.4,'#dfb8f5','仮面');if(game.mode!=='combat')return;
  }
  if(hasRelic('conduit_stone')&&game.relicBoltDue){
   game.relicBoltDue=false;damageEnemy(12,'#a1e8ff','雷導');if(game.mode!=='combat')return;
  }
  if(hasRelic('emperor_conduit')&&!lvl('thunder')&&!lvl('overcharge')&&game.relicEmperorDue){
   game.relicEmperorDue=false;damageEnemy(20,'#bceeff','雷帝');if(game.mode!=='combat')return;
  }
  if(heartbeatProc){
   damageEnemy(game.baseAtk*(.20+.15*lvl('heartbeat')),'#9ee8f7','拍動');if(game.mode!=='combat')return;
  }
  if(lvl('overcharge')){
   if(game.overchargeCount>=3){
    game.overchargeCount=0;
    damageEnemy(game.baseAtk*(.7+.4*lvl('overcharge')),'#8cecff','過充電');if(game.mode!=='combat')return;
    if(has('overcharge','thunder')){
     damageEnemy((10+12*lvl('thunder'))*.5,'#94e8ff','雷霆');if(game.mode!=='combat')return;
    }
   }
  }
  if(lvl('thunder')){const thunder=10+12*lvl('thunder');damageEnemy(thunder*(1+game.combo*.018),'#86e8ff','⚡');if(game.mode!=='combat')return}
  if(lvl('echo')){let echo=val*(.25+lvl('echo')*.13);damageEnemy(echo,'#d8baff','残響');if(game.mode!=='combat')return;if(has('thunder','echo'))damageEnemy((10+12*lvl('thunder'))*(1+lvl('echo')*.24),'#86e8ff','雷鳴');if(game.mode!=='combat')return}
  if(lvl('ember')){e.burn+=lvl('ember')*7;showText('炎 +'+lvl('ember')*7,w*.75,h*.33,'#ffba83',13);if(has('ember','execute')&&e.hp/e.maxHp<.35){damageEnemy(e.burn*2,'#ff996f','紅蓮');e.burn=0;if(game.mode!=='combat')return}}
  if(perfect&&lvl('aegis')){game.shield=Math.min(100+20*lvl('aegis'),game.shield+3+3*lvl('aegis'));if(has('aegis','thorns')){damageEnemy(game.shield*.28,'#c5adff','鏡壁');if(game.mode!=='combat')return}}
  if(lvl('pulse')&&game.combo%8===0){damageEnemy(42*lvl('pulse')*(1+game.combo*.02),'#ffe298','共鳴波');if(game.mode!=='combat')return}
  if(lvl('king')&&game.combo%(has('king','pulse')?8:10)===0){
   damageEnemy(game.baseAtk*(2+lvl('king'))*getAttackMultiplier(),'#ffdaa0','王の一撃');
   if(game.mode!=='combat')return;
  }
  if(game.charge>=7){game.charge=0;if(hasRelic('broken_gear'))game.relicGearReady=true;const ult=(game.baseAtk*1.5+lvl('rune')*45)*getAttackMultiplier();damageEnemy(ult,'#dcafff','奥義');if(game.mode!=='combat')return;if(has('rune','precision')){damageEnemy(ult*.65,'#d2b0ff','時空切断');if(game.mode!=='combat')return}flash=.75;flashColor='#d6c0ff';puff(w*.7,h*.55,'#dbb5fb',28,1.5);sound(660,.33,'sawtooth',.05,-340)}
  finishParryRecovery();
  if(!game.practice)feedback(perfect?'JUST PARRY!':'PARRY!',perfect?'#8beaff':'#ffe1a0');if(perfect){chord();if(navigator.vibrate)navigator.vibrate(15);flash=.67;flashColor='#a0e8ff';shake=Math.max(shake,5)}else{flash=Math.max(flash,.18);flashColor='#9accff'};
}
if(game.mode==='combat')nextStrike();syncHUD();}
function clearFloor(){
 if(game.mode!=='combat')return;
 const defeated=game.enemy;
 if(!game.practice){
  if(!defeated.preview){P.recordDefeat(book,defeated,game.floor);saveBook();}
  const baseBonus=defeated.rare?(defeated.soulBonus||0):defeated.elite?2:0;
  const bonus=baseBonus?soulReward(baseBonus):0;
  if(bonus){game.bonusSouls+=bonus;meta.coins+=bonus;save();showText('魂の欠片 +'+bonus,w*.52,h*.34,'#ffe19a',21)}
  const gained=RT.towerCoins(defeated,game.routeTrial);
  game.towerCoins+=gained;game.towerCoinsEarned+=gained;
  showText('塔貨 +'+gained,w*.52,h*.25,'#f8cd79',16);
  game.relicRewardKind=RR.rewardType(game.floor,defeated,Math.random);
  const recovery=PR.value(permanent,'regen');
  if(recovery)heal(Math.ceil(game.maxHp*recovery/100));
 }
 // Reaching the summit is recorded immediately; a player need not die to earn the milestone.
 game.finalClear=!game.practice&&game.floor===80&&defeated.id==='endking';
 if(game.finalClear){meta.bestFloor=Math.max(meta.bestFloor,80);save();}
 stopScore();game.mode='victory';game.clearAt=performance.now();defeated.hp=0;
 game.bossKills+=Number(defeated.boss);
 puff(w*.72,h*.58,defeated.color,40,1.8);flash=1;flashColor='#f6cb84';
 sound(450,.24,'triangle',.05,300);setTimeout(()=>sound(790,.28,'triangle',.045,230),120);syncHUD();
}
function applyDamage(n,tag){
 let damage=game.practice?0:Math.max(1,Math.ceil(n));
 const previousShield=game.shield,previousHp=game.hp;
 let prevented=0;
 // Consume the ice ward before regular shield absorption.
 if(damage>0&&lvl('frost')&&game.frostWard&&!game.practice){
  prevented=Math.floor(damage*(15+10*lvl('frost'))/100);
  damage=Math.max(0,damage-prevented);game.frostWard=false;
  showText('氷結 -'+prevented,w*.31,h*.36,'#baeaff',17);
 }
 const used=Math.min(game.shield,damage);
 game.shield=Math.max(0,game.shield-used);damage-=used;
 if(tag==='GUARD'&&hasRelic('silver_mirror')&&damage>0)damage-=Math.min(8,Math.floor(damage*.2));
 if(damage>0&&hasRelic('rusty_crest')&&!game.relicRustyUsed){
  game.relicRustyUsed=true;damage=Math.max(0,damage-6);
 }
 if(damage>0)game.hp=Math.max(0,game.hp-damage);
 if(game.hp<previousHp&&hasRelic('blood_pact_chalice')&&!game.relicPactConsumed){
  game.relicPactConsumed=true;game.relicPactReady=true;
 }
 // Normal Fortitude responds to lost HP; Immortal Shield additionally triggers on barrier break.
 if(lvl('fortitude')&&!game.practice){
  if(game.hp<previousHp||(has('fortitude','aegis')&&previousShield>0&&game.shield===0))
   game.fortitudeReady=true;
 }
 showText(damage?'−'+damage:'BLOCK!',w*.27,h*.49,damage?'#ff818f':'#c4b4ff',21);
 puff(w*.28,h*.64,damage?'#ff879c':'#c5b0fa',12,1);
 shake=Math.max(shake,damage?11:4);
 if(game.hp<=0){
  const revive=PR.value(permanent,'revive');
  if(!game.practice&&!game.reviveUsed&&revive){
   game.reviveUsed=true;game.hp=Math.max(1,Math.ceil(game.maxHp*revive/100));
   showText('復活!',w*.28,h*.34,'#ffdc97',26);flash=.65;flashColor='#ffc878';
   sound(660,.30,'triangle',.07,120);
  }else die();
 }
 // Frost Mirror works for guards and misses; never counts as parry lifesteal damage.
 if(prevented>0&&has('frost','thorns')&&game.mode==='combat')
  damageEnemy(prevented*.5,'#bbebff','氷鏡');
 syncHUD();
}
function die(){
 if(game.mode==='gameover')return;
 stopScore();
 const coins=soulReward(Math.max(3,Math.floor(game.floor*2+game.bossKills*3)));
 meta.coins+=coins;
 meta.bestFloor=Math.max(meta.bestFloor,game.floor);
 meta.bestCombo=Math.max(meta.bestCombo,game.peakCombo);
 meta.runs++;
 const rescue=grantRescueRewards();
 save(); // Reward currency and claim mask are saved together.
 $('deathSummary').innerHTML=`<b>${game.floor}F</b>で力尽きた。<br>ジャストパリィ <b>${game.perfects}回</b> / 被弾 <b>${game.misses}回</b> / 空振り <b>${game.whiffs}回</b><br>最大コンボ <b>${game.peakCombo}</b><br>魂の欠片 <b style="color:#f4cf86">+${coins+game.bonusSouls+rescue} ✧</b>${game.bonusSouls?`（特別討伐 +${game.bonusSouls}）`:''}${rescue?`（累計挑戦ボーナス +${rescue} ✧）`:''}`;
 $('deathRecords').innerHTML=records();
 game.deathInputUnlockAt=performance.now()+DEATH_INPUT_GRACE_MS;
 setMode('gameover');sound(200,.42,'sawtooth',.05,-130);
}
function choosePool(){const available=SKILLS.filter(s=>lvl(s.id)<s.max&&!game.sealedSkillIds?.includes(s.id)),taken=[];for(let k=0;k<Math.min(PR.value(permanent,'choice4')||3,available.length);k++){const rarityWeight={common:5.4,rare:2.9,epic:1.05};const weights=available.map(s=>(rarityWeight[s.rarity]??rarityWeight.common)*(lvl(s.id)?1.17:1));let r=Math.random()*weights.reduce((a,b)=>a+b,0),idx=0;for(;idx<weights.length-1;idx++){r-=weights[idx];if(r<=0)break}taken.push(available.splice(idx,1)[0])}return taken}
function showRelicRewards(kind){
 const choices=RR.offer(kind,game.relics,game.relicDiscarded);
 if(!choices.length){
  if(game.relicReturn==='mirror'){
   game.relicReturn=null;game.relicMirrorTarget=null;game.roomLocked=false;game.roomStage=null;
   setMode('room');renderRoom();
  }else if(game.relicReturn==='room')finishNoncombatRoom();
  else showRewards();
  return;
 }
 game.relicOffer=choices.map(r=>r.id);
 game.relicSwapTarget=null;
 setMode('relic');
 renderRelicReward();
}
function renderRelicReward(){
 if(game.mode!=='relic')return;
 const offered=game.relicOffer.map(id=>RR.BY_ID[id]).filter(Boolean);
 const selected=game.relicSwapTarget&&RR.BY_ID[game.relicSwapTarget];
 $('relicOfferTitle').textContent=selected?'交換する遺物を選べ':'遺物をひとつ選べ';
 $('relicOfferHint').textContent=selected?'取り外した遺物は、このランでは再取得できません。':'所持 '+game.relics.length+' / '+RR.MAX_HELD;
 $('relicOfferCards').innerHTML=selected?'':
  offered.map(r=>`<button type="button" class="relic-reward-card ${r.rarity}" data-relic="${r.id}"><span class="relic-reward-rarity">${RR.RARITY_LABELS[r.rarity]}</span><span class="relic-reward-symbol">${r.icon}</span><strong>${r.name}</strong><span class="relic-reward-desc">${r.desc}</span><small>相性：${r.affinity}</small></button>`).join('');
 $('relicReplaceList').hidden=!selected;
 $('relicReplaceList').innerHTML=selected?
  `<p class="relic-replace-note">${selected.icon} ${selected.name} と交換する遺物</p>`+
  game.relics.map(id=>{const r=RR.BY_ID[id];return `<button type="button" class="relic-replace-card" data-replace="${id}"><span>${r.icon}</span><span><b>${r.name}</b><small>${r.desc}</small></span></button>`}).join(''):'';
 $('relicBackBtn').hidden=!selected;
 $('relicSkipBtn').textContent='今回は見送る →';
}
function grantRelic(id,replaceId=null){
 if(!RR.BY_ID[id]||!game.relicOffer.includes(id)||game.mode!=='relic')return false;
 if(game.relics.includes(id)||game.relicDiscarded.includes(id))return false;
 if(replaceId!==null){
  const index=game.relics.indexOf(replaceId);
  if(index<0)return false;
  game.relics[index]=id;
  game.relicDiscarded.push(replaceId);
  delete game.relicCounters[replaceId];
  if(replaceId==='duet_mask')game.relicMaskReady=false;
  if(replaceId==='broken_gear')game.relicGearReady=false;
  if(replaceId==='blood_pact_chalice')game.relicPactReady=false;
  if(replaceId==='pilgrim_bell')game.relicBellDue=false;
  if(replaceId==='conduit_stone')game.relicBoltDue=false;
  if(replaceId==='emperor_conduit')game.relicEmperorDue=false;
  if(replaceId==='serene_crystal')game.relicJustStreak=0;
 }else{
  if(game.relics.length>=RR.MAX_HELD)return false;
  game.relics.push(id);
 }
 adjustRelicMaxHp();
 renderRelicInventory();
 return true;
}
function selectRelic(id){
 if(game.mode!=='relic'||!game.relicOffer.includes(id))return;
 if(game.relicReturn==='mirror'){
  if(game.relicMirrorTarget&&grantRelic(id,game.relicMirrorTarget))finishRelicReward(true);
 }else if(game.relics.length>=RR.MAX_HELD){
  game.relicSwapTarget=id;renderRelicReward();
 }else if(grantRelic(id))finishRelicReward(true);
}
function replaceRelic(id){
 if(game.mode!=='relic'||!game.relicSwapTarget)return;
 if(grantRelic(game.relicSwapTarget,id))finishRelicReward(true);
}
function finishRelicReward(acquired=false){
 if(game.mode!=='relic')return;
 game.relicOffer=[];game.relicSwapTarget=null;
 const returned=game.relicReturn;
 game.relicReturn=null;game.relicMirrorTarget=null;
 if(returned==='mirror'&&!acquired){
  game.roomLocked=false;game.roomStage=null;setMode('room');renderRoom();return;
 }
 if(returned==='mirror'||returned==='room'){finishNoncombatRoom();return;}
 showRewards();
}
function showRewards(){
 if(!['victory','relic'].includes(game.mode))return;
 if(game.relicRewardKind){
  const kind=game.relicRewardKind;game.relicRewardKind=null;
  showRelicRewards(kind);return;
 }
 game.mode='reward';choiceSet=choosePool();renderRewards();setMode('reward');
}
function renderRewards(){const rar={common:'COMMON',rare:'RARE',epic:'EPIC'};$('rewardCards').className='reward-cards'+(choiceSet.length===4?' four':'');$('rewardTitle').textContent=game.finalClear&&game.floor===80?'80F制覇 — 終刻の王を討伐':`${game.floor}F 突破 — 戦利品`;$('rewardCards').innerHTML=choiceSet.map(s=>`<button class="reward-card ${s.rarity}" data-skill="${s.id}"><span class="rarity">${rar[s.rarity]||String(s.rarity||'COMMON').toUpperCase()} · ${lvl(s.id)?'LEVEL UP':'NEW SKILL'}</span><span class="emoji">${s.icon}</span><span class="rname">${s.name} <span class="muted" style="font-size:10px">Lv.${lvl(s.id)+1}</span></span><span class="rdesc">${s.desc(lvl(s.id)+1)}</span></button>`).join('');for(const btn of $('rewardCards').querySelectorAll('[data-skill]'))btn.addEventListener('click',()=>takeSkill(btn.dataset.skill));$('rerollBtn').textContent=`↻ 引き直す (残 ${game.rerolls})`;$('rerollBtn').disabled=game.rerolls<=0;$('healBtn').textContent=`♡ 強化せずHPを ${Math.round(game.maxHp*.2)} 回復`;const notices=[game.finalClear&&game.floor===80?'👑 塔の頂を制覇！ 81Fから無限踏破が始まる':null,game.lastDiscovered?'📖 図鑑登録':null,game.enemy?.rare?'✦ レア報酬獲得':null,game.floor%5===0?'↻ 引き直し +1':null].filter(Boolean);$('rewardNote').textContent=notices.join('　');$('rewardNote').hidden=!notices.length}
function gainSkillLevel(id){
 const prevMax=game.maxHp;
 game.lv[id]=(game.lv[id]||0)+1;
 if(id==='thunder'||id==='overcharge')game.relicEmperorDue=false;
 if(id==='heal'){
  game.rawMaxHp=65+10*meta.life+lvl('heal')*15;adjustRelicMaxHp();
  game.hp=Math.min(game.maxHp,game.hp+game.maxHp-prevMax+12);
 }
}
function takeSkill(id){
 const s=SK[id];
 if(game.mode!=='reward'||!s||!choiceSet.find(v=>v.id===id)||lvl(id)>=s.max)return;
 gainSkillLevel(id);
 if(game.floor%5===0)game.rerolls++;
 sound(790,.17,'triangle',.06,140);advance();
}
function advance(){
 game.floor++;game.routeTrial=false;game.currentRoom=null;game.eventId=null;game.roomStage=null;game.roomLocked=false;
 game.hp=Math.min(game.hp,game.maxHp);
 enterFloor(performance.now());
 renderBuild();syncHUD();
}
function showHeal(){if(game.mode!=='reward')return;heal(Math.round(game.maxHp*.2));if(game.floor%5===0)game.rerolls++;advance()}
function tap(releasedEnough=true){
 if(game.mode!=='combat')return;
 const t=performance.now();syncAttackClock();
 // 衝突後に押しても次の攻撃の『早すぎ』にならない。直前の攻撃への遅れとして扱う。
 if(game.lastStrikeKind==='miss'&&t-game.lastImpactAt>=0&&t-game.lastImpactAt<220&&!game.lateReported){
  game.lateReported=true;
  feedback('遅い '+Math.round(t-(game.lastImpactAt-PARRY_STARTUP))+'ms','#f7ca8e');
  return;
 }
 if(game.attackResolved||game.inputLocked)return;
 if(!releasedEnough||t<(game.parryReadyAt||0)){game.parryBlockedAt=t;return;}
 game.parryReadyAt=t+PARRY_REARM_MS;
 // Only the press edge attempts a parry. Earlier inputs raise the shield and can
 // defend at impact IF held continuously for the full 100 ms startup.
 const delta=t-(game.attackAt-PARRY_STARTUP),perfect=getPerfectWindow(),parry=getParryWindow();
 game.lastAttemptDelta=delta;game.parryAnimAt=t;
 if(Math.abs(delta)<=perfect){game.pendingKind='just';game.inputLocked=true;game.parryAnimKind='just'}
 else if(Math.abs(delta)<=parry){game.pendingKind='parry';game.inputLocked=true;game.parryAnimKind='parry'}
 else game.parryAnimKind='guard';
}

function populatePracticeEnemies(selected,allowUnseen=false){
 const options=P.codexEntries().filter(e=>allowUnseen||book.seen[e.bookKey]);
 const select=$('practiceEnemy');
 select.innerHTML=options.map(e=>'<option value="'+e.bookKey+'">'+e.displayName+'</option>').join('');
 if(selected&&(allowUnseen||book.seen[selected]))select.value=selected;
 else if(options.length)select.value=options[0].bookKey;
}
function renderCodex(){
 const entries=P.codexEntries(),known=Object.keys(book.seen).length;
 $('codexSummary').textContent=known+' / '+entries.length+' 発見';
 const filter=$('codexFilter').value;
 const cards=entries.filter(e=>filter==='all'||filter==='discovered'&&book.seen[e.bookKey]||filter==='rare'&&e.rare||filter==='elite'&&e.elite||filter==='normal'&&!e.rare&&!e.elite);
 $('codexList').innerHTML=cards.map(e=>{
  const record=book.seen[e.bookKey];
  if(!record)return '<div class="codex-card locked"><div class="codex-symbol">？</div><strong>未遭遇</strong></div>';
  const type=e.rare?'RARE':e.elite?'ELITE':e.boss?'BOSS':'NORMAL';
  const rank=e.rare?'rare':e.elite?'elite':e.boss?'boss':'normal';
  const wins=book.defeated[e.bookKey]?.wins||0;
  return '<div class="codex-card '+rank+'"><div class="codex-symbol">'+(e.rare?'✦':e.boss?'♛':e.elite?'◆':'⚔')+'</div><strong>'+e.displayName+'</strong><small>'+type+' · 遭遇 '+record.encounters+'回 · 討伐 '+wins+'回 · 初遭遇 '+record.firstFloor+'F</small><p>'+e.desc+'</p><button class="codex-practice" data-practice="'+e.bookKey+'">⚔ 稽古場で練習</button></div>';
 }).join('')||'<div class="empty">該当する敵はまだいません。</div>';
 for(const btn of $('codexList').querySelectorAll('[data-practice]'))btn.addEventListener('click',()=>startPractice(btn.dataset.practice));
}
function openCodex(){
 if(deathInputBlocked()||!['title','gameover','codex'].includes(game.mode))return;
 stopScore();setMode('codex');renderCodex();
}
function startPractice(key){
 if(!book.seen[key]||!P.findByKey(key))return;
 start(true,key);
}
function togglePause(){if(game.mode==='combat'){clearGuardInput();pauseAt=performance.now();stopScore();setMode('pause');}else if(game.mode==='pause'){const now=performance.now();resetParryInput();game.whiffUntil=0;game.parryAnimAt=-99999;game.lastDeflectAt=-99999;game.lastDamageAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.pendingKind=null;game.inputLocked=false;game.attackResolved=false;game.cuePlayed=false;game.windupPlayed=false;startScore(game.enemy);game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.nextFloorHintAt=now;syncAttackClock();setMode('combat')}}
function resize(){const r=canvas.getBoundingClientRect();w=Math.max(260,r.width);h=Math.max(300,r.height);dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);
function round(x,y,r,fill,stroke='',lw=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}
function fillPoly(points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function textDraw(t,x,y,size,color='#fff',align='center',weight='400'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px "Checkpoint Period Display", system-ui, sans-serif`;ctx.fillStyle=color;ctx.fillText(t,x,y)}
// Canvas text is not a DOM element; preload once so the first parry effect can use the display face.
if(document.fonts?.load)document.fonts.load('24px "Checkpoint Period Display"').catch(()=>{});

function paintDeepZone(now,scene){
 if(!['forge','frost','astral','void'].includes(scene))return;
 ctx.save();
 const floorY=h*.80;
 if(scene==='forge'){
  // Heated masonry, glowing furnaces and drifting sparks: cosmetic only.
  ctx.fillStyle='#69281851';ctx.fillRect(0,0,w,floorY);
  for(let k=0;k<4;k++){
   const x=(k+.5)*w/4,boxW=w*.09;
   ctx.fillStyle='#4e292c';ctx.fillRect(x-boxW*.65,h*.22,boxW*1.3,h*.49);
   ctx.fillStyle='#e85f2777';ctx.fillRect(x-boxW*.45,h*.35,boxW*.9,h*.24);
   ctx.fillStyle='#ffd29344';ctx.fillRect(x-boxW*.18,h*.39,boxW*.36,h*.18);
   ctx.fillStyle='#f5a05d';round(x,h*.71,Math.max(2,w*.006),'#f5a05d');
  }
  for(let k=0;k<17;k++){
   const x=((k*71+17)%101)/101*w;
   const y=((k*43+now*.022)%290)/290*(h*.64)+h*.15;
   round(x,y,1.3+(k%3)*.55,k%2?'#ffcf8b90':'#f78c5f95');
  }
  ctx.fillStyle='#bf4f2926';ctx.fillRect(0,floorY,w,h-floorY);
 }else if(scene==='frost'){
  // Ice hanging above the corridor, cold reflections and gentle snow.
  ctx.fillStyle='#4a99ba35';ctx.fillRect(0,0,w,floorY);
  for(let k=0;k<11;k++){
   const x=(k+.5)*w/11;
   const size=h*(.045+(k%3)*.014);
   fillPoly([[x-9,0],[x+9,0],[x+((k%2)?4:-4),size]],'#b4eaf0a0');
   line([[x-6,0],[x,size*.68]],'#d6f7ff9c',1.5);
  }
  for(let k=0;k<15;k++){
   const x=((k*79+25)%103)/103*w;
   const y=(k*47+now*.016)%(h*.69)+h*.05;
   round(x,y,1.3+k%3*.5,'#dffbff8c');
  }
  ctx.fillStyle='#b5e6ff1b';ctx.fillRect(0,floorY,w,h-floorY);
  line([[0,floorY+6],[w,floorY+6]],'#b9edff9a',2);
 }else if(scene==='astral'){
  // A slow orrery suspended behind the combat silhouettes, not a timing HUD.
  ctx.fillStyle='#4b377f5b';ctx.fillRect(0,0,w,floorY);
  const cx=w*.5,cy=h*.38;
  for(let k=0;k<3;k++){
   ctx.beginPath();ctx.ellipse(cx,cy,w*(.20+k*.088),h*(.10+k*.04),
    Math.sin(now*.00008+k)*.25,0,Math.PI*2);
   ctx.strokeStyle=k===0?'#f7dca65e':'#bbace85b';
   ctx.lineWidth=2;ctx.stroke();
  }
  for(let k=0;k<27;k++){
   const x=((k*79+31)%101)/101*w;
   const y=((k*43+13)%83)/83*h*.7;
   const twinkle=.4+.35*Math.sin(now*.0012+k*3.2);
   ctx.globalAlpha=twinkle;
   round(x,y,(k%5===0?2.5:1.2),'#e8dcff');
  }
  ctx.globalAlpha=1;
  for(let k=0;k<4;k++){
   const angle=now*.00014+k*Math.PI/2;
   const x=cx+Math.cos(angle)*w*.29,y=cy+Math.sin(angle)*h*.18;
   round(x,y,4,'#f5d8a1');
  }
  ctx.fillStyle='#9576cb29';ctx.fillRect(0,floorY,w,h-floorY);
 }else if(scene==='void'){
  // Fractured black-and-gold summit, distant eclipse and drifting fragments.
  ctx.fillStyle='#35132f75';ctx.fillRect(0,0,w,floorY);
  const cx=w*.51,cy=h*.28;
  round(cx,cy,Math.min(w,h)*.155,'#4a223f');
  ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.172,0,Math.PI*2);
  ctx.strokeStyle='#d2a269b0';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.202,0,Math.PI*2);
  ctx.strokeStyle='#93557b77';ctx.lineWidth=2;ctx.stroke();
  for(let k=0;k<9;k++){
   const x=(k+.5)*w/9,drift=Math.sin(now*.00045+k)*5;
   fillPoly([[x-10,h*.13+drift],[x+9,h*.15+drift],[x+17,h*.28+drift],[x-15,h*.31+drift]],
    k%2?'#4e3455ad':'#625168ad');
   line([[x,h*.15+drift],[x+4,h*.29+drift]],'#c5a08765',1.2);
  }
  ctx.fillStyle='#7c416b30';ctx.fillRect(0,floorY,w,h-floorY);
  line([[0,floorY+4],[w,floorY+4]],'#c794a6a0',2);
 }
 ctx.restore();
}
function drawBackground(now){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#10152c');g.addColorStop(.6,'#1a1b35');g.addColorStop(1,'#132135');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const center=w*.52;
  for(let i=0;i<6;i++){let x=(i/5)*w-30;ctx.fillStyle=i%2?'#141c31':'#151d33';ctx.fillRect(x,0,Math.max(18,w*.07),h*.79);ctx.fillStyle='#29304c';ctx.fillRect(x+7,0,2,h*.8)}
  const doorW=Math.min(w*.4,260);ctx.fillStyle='#0d1429';ctx.beginPath();ctx.moveTo(center-doorW/2,h*.79);ctx.lineTo(center-doorW/2,h*.28);ctx.quadraticCurveTo(center-doorW/2,h*.09,center,h*.08);ctx.quadraticCurveTo(center+doorW/2,h*.09,center+doorW/2,h*.28);ctx.lineTo(center+doorW/2,h*.79);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#48506b';ctx.stroke();let shine=ctx.createRadialGradient(center,h*.35,10,center,h*.35,doorW*.65);shine.addColorStop(0,'#60547477');shine.addColorStop(1,'#43335100');ctx.fillStyle=shine;ctx.fillRect(center-doorW,h*.09,doorW*2,h*.75);
  for(let i=0;i<4;i++){let cx=(i%2===0?w*.09:w*.91)+(Math.floor(i/2)?25:-25),cy=h*(i<2?.23:.51);round(cx,cy,4,'#f6bc73');round(cx,cy,15,'#e9b36a22')}
  for(let i=0;i<30;i++){const x=((i*97+29)%1000)/1000*w,y=(i*163%600)/600*h*.75+Math.sin(now*.00065+i)*7;round(x,y,1.1+((i*3)%3)*.33,i%4?'#b7adc350':'#edd0ac80')}
  const floorY=h*.80;const gr=ctx.createLinearGradient(0,floorY,0,h);gr.addColorStop(0,'#3e3d4d');gr.addColorStop(.1,'#272b43');gr.addColorStop(1,'#11192a');ctx.fillStyle=gr;ctx.fillRect(0,floorY,w,h-floorY);ctx.fillStyle='#626078';ctx.fillRect(0,floorY,w,3);ctx.strokeStyle='#ffffff0e';ctx.lineWidth=1;for(let i=0;i<9;i++){const x=i*w/8;line([[x,floorY],[w*.5+(x-w*.5)*1.6,h]],'#ffffff0e',1)}for(let y=floorY+26;y<h;y+=28)line([[0,y],[w,y]],'#ffffff12',1);
  paintDeepZone(now,P.zoneForFloor(game.floor||1).scene);
  if(game.enemy?.boss){let gl=ctx.createRadialGradient(w*.71,h*.56,4,w*.71,h*.56,h*.55);gl.addColorStop(0,'#d77f4537');gl.addColorStop(1,'#f59f4800');ctx.fillStyle=gl;ctx.fillRect(0,0,w,h)}
}
function hero(now){
 const s=Math.min(w/550,h/470)*1.23,x=w*.28,y=h*.80;
 const since=now-(game.parryAnimAt||-99999);
 const quickLift=clamp(since/95,0,1)*clamp((300-since)/130,0,1);
 const heldLift=game.guardHeld?clamp((now-game.guardStartedAt)/PARRY_STARTUP,0,1):0;
 const lift=Math.max(quickLift,heldLift);
 const action=['parry','just'].includes(game.lastStrikeKind)?clamp(1-(now-(game.lastDeflectAt??-99999))/240,0,1):0;
 const hurt=clamp(1-(now-(game.lastDamageAt||-99999))/250,0,1);
 const age=now-(game.lastImpactAt??-99999),push=(age>=0&&age<160&&game.lastStrikeKind!=='miss'?Math.sin(Math.PI*age/160):0)*(game.lastStrikeKind==='just'?1:game.lastStrikeKind==='guard'?.75:.45);
 if(useIllustratedArt()&&!game.artFallback&&KNIGHT_PUPPET?.drawHero(ctx,{width:w,height:h,e:game.enemy,m:game.enemy?motionFor(game.enemy):undefined,now,skin:DEV_MODE?devPreviewSkin:'normal',counterTint:PR.extraEnabled(permanent,'slashTint')?PR.extraOption(permanent,'slashTint'):null,
   attackAt:game.attackAt,attackSpan:game.attackSpan,lastImpactAt:game.lastImpactAt,lastDeflectAt:game.lastDeflectAt,lastStrikeKind:game.lastStrikeKind,
   pose:{lift,heldLift,push,action,hurt,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt}}))return;
 if(!legacyVisualEnabled()&&CHARACTER_RIG_ENABLED&&CHARACTER_RIG?.drawHero(ctx,{width:w,height:h,e:game.enemy,m:game.enemy?motionFor(game.enemy):{reach:110},now,
  pose:{lift,heldLift,push,action,hurt,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt}}))return;
 if(!legacyVisualEnabled()&&COMBAT_ART_ENABLED&&COMBAT_ART?.drawHero(ctx,{width:w,height:h,e:game.enemy,now,
  pose:{lift,heldLift,push,action,hurt,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt}}))return;
 ctx.save();ctx.translate(x-hurt*8-push*4,y+Math.sin(now/390)*1.6+hurt*5+push*2);ctx.scale(s,s);
 ctx.fillStyle='#080d20aa';ctx.beginPath();ctx.ellipse(0,0,44,10,0,0,Math.PI*2);ctx.fill();
 if(!legacyVisualEnabled()&&CHARACTER_READY_ENABLED&&CHARACTER_READY?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt})){ctx.restore();return;}
 if(!legacyVisualEnabled()&&CHARACTER_TRACE_ENABLED&&CHARACTER_TRACE?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt})){ctx.restore();return;}
 if(!legacyVisualEnabled()&&CHARACTER_FLAT_ENABLED&&CHARACTER_FLAT?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt})){ctx.restore();return;}
 if(!legacyVisualEnabled()&&CHARACTER_SVG_ENABLED&&CHARACTER_SVG?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt})){ctx.restore();return;}
 if(!legacyVisualEnabled()&&CHARACTER_ART_ENABLED&&CHARACTER_ART?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:game.lastStrikeKind,lastImpactAt:game.lastImpactAt})){ctx.restore();return;}
 fillPoly([[-11,-69],[-34,-59],[-52,-7],[-29,-16],[-11,-24]],'#315b78');fillPoly([[-8,-66],[-29,-53],[-42,-8],[-23,-17]],'#3f8ca4');
 fillPoly([[-15,-34],[-1,-34],[-3,0],[-19,0]],'#778aa5');fillPoly([[1,-35],[15,-35],[22,0],[6,0]],'#657793');
 fillPoly([[-21,-5],[-2,-5],[-1,2],[-23,2]],'#29384c');fillPoly([[5,-5],[25,-5],[29,2],[4,2]],'#29384c');
 fillPoly([[-19,-83],[13,-85],[26,-40],[9,-30],[-18,-37]],'#738aa8');fillPoly([[-12,-78],[7,-78],[7,-40],[-8,-40]],'#263950');line([[-18,-68],[24,-54]],'#bad9e1',2.6);round(3,-57,5,'#eac791');
 fillPoly([[-17,-107],[6,-117],[20,-98],[13,-80],[-14,-81]],'#b7c6d4');fillPoly([[-16,-107],[-7,-115],[4,-118],[1,-91],[-18,-91]],'#526781');fillPoly([[4,-101],[18,-98],[13,-89],[3,-90]],'#142b3f');round(9,-95,2,'#76eff3');
 // 盾は敵のいる右側。押している間は迎撃位置で保持し、100msで構え切る。
 ctx.save();ctx.translate(21+lift*18-push*5,-48-lift*10+push*2);
 if(game.guardHeld&&heldLift>=1){ctx.shadowColor='#84bbef';ctx.shadowBlur=12;}ctx.rotate(-.16+lift*.18-push*.23);
 fillPoly([[-16,-25],[17,-25],[14,5],[0,24],[-14,5]],'#b5ced9');
 fillPoly([[-11,-19],[12,-19],[10,4],[0,17],[-10,4]],'#273d59');line([[0,-13],[0,10]],'#8ff0f3',3);line([[-8,-2],[8,-2]],'#8ff0f3',3);
 if(game.lastStrikeKind==='just'&&now-game.lastImpactAt<170){ctx.shadowColor='#8ef4ff';ctx.shadowBlur=32;round(0,0,23,'#74deff35','#dcfaff',3);ctx.shadowBlur=0}
 ctx.restore();
 ctx.save();ctx.translate(12,-65);ctx.rotate(action*.65+.07-lift*.1);line([[0,6],[12,-43]],'#edfcff',7);line([[0,6],[12,-43]],'#77d7ec',3);line([[-12,7],[12,10]],'#e8c28f',6);line([[0,7],[-2,23]],'#554b5e',6);ctx.restore();ctx.restore();
 // The legacy renderer has no painted counter wave of its own.
 if(game.enemy&&PR.extraEnabled(permanent,'slashTint'))COMBAT_ART?.counterSlash?.(ctx,{kind:game.lastStrikeKind,phase:(now-(game.lastDeflectAt??-99999))/240,
  origin:{x:w*.28,y:h*.80-65*s},target:{x:w*.65,y:h*.80-65*s},scale:s,tint:PR.extraOption(permanent,'slashTint')});
}
function enemy(now){
 const e=game.enemy;if(!e)return;
 const m=motionFor(e),d=game.attackAt-now,span=game.attackSpan||1900;
 if(useIllustratedArt()&&!game.artFallback&&KNIGHT_PUPPET?.drawEnemy(ctx,{e,m,now,width:w,height:h,
   attackAt:game.attackAt,attackSpan:span,lastImpactAt:game.lastImpactAt,
   lastDeflectAt:game.lastDeflectAt,lastStrikeKind:game.lastStrikeKind}))return;
 if(!legacyVisualEnabled()&&CHARACTER_RIG_ENABLED&&CHARACTER_RIG?.drawEnemy(ctx,{e,m,now,width:w,height:h,
  attackAt:game.attackAt,attackSpan:span,lastImpactAt:game.lastImpactAt,
  lastDeflectAt:game.lastDeflectAt,lastStrikeKind:game.lastStrikeKind}))return;
 if(!legacyVisualEnabled()&&COMBAT_ART_ENABLED&&COMBAT_ART?.drawEnemy(ctx,{e,m,now,width:w,height:h,
  attackAt:game.attackAt,attackSpan:span,lastImpactAt:game.lastImpactAt,
  lastDeflectAt:game.lastDeflectAt,lastStrikeKind:game.lastStrikeKind}))return;
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
  for(let j=0;j<3;j++){round(dustX+(j*19+6)*scale,ground-(j%2)*7*scale,3.8*scale,e.color||m.accent)}
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
 const color=e.color||m.accent;
 // One palette filter recolors the entire existing silhouette (including dedicated sprites).
 // It is strictly visual: attack contacts and score timings remain unchanged.
 if(e.palette&&'filter' in ctx){
  const degrees=Number(e.palette.hueRotate)||0;
  const saturation=Number(e.palette.saturation)||100;
  ctx.filter='hue-rotate('+degrees+'deg) saturate('+saturation+'%)';
 }
 // Visual-only enemy identities; attack tip uses the original contact coordinate.
 if(!legacyVisualEnabled()&&CHARACTER_KNIGHT_ENABLED&&CHARACTER_KNIGHT?.drawEnemy(ctx,{e,m,now,charge,action,p,recoil,rec,impact})){
  // Traced knight art only: original timing, position, parry contact and saved state unchanged.
 }else if(!legacyVisualEnabled()&&CHARACTER_ART_ENABLED&&CHARACTER_ART?.drawEnemy(ctx,{e,m,now,charge,action,p,recoil,rec,impact})){
  // Optional art-layer pilot; the attack clock and contact point are unchanged.
 }else if(VARIANT_MOTIONS?.draw(e.sprite||e.id,ctx,{e,m,now,charge,action,p,recoil,rec,impact,round,line,fillPoly})){
  // Dedicated silhouette drawn without changing the Web Audio clock or hitboxes.
 }else if(e.kind==='slime'){
  // スライムは「圧縮→前傾→頭から飛びかかる」。盾に当たるのは左前方のこぶ。
  // 先端のローカル座標(+49,-58)を全員共通のhitX/hitYに揃える。
  const bulge=charge*.30,leap=smooth(p),stretch=leap*.23;
  const flatten=charge*.29;
  const backX=-38-charge*9-leap*15;
  const crestX=m.reach-11*(1-leap);
  const crestY=-58+28*charge+8*(1-leap);
  const topY=-82+31*charge-5*leap;
  ctx.fillStyle=e.color||'#42ada5';ctx.beginPath();
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
  fillPoly([[-33,-63+lift],[-16,-97-lift],[13,-103-lift],[32,-74+lift],[33,-24],[44,0],[18,-10],[0,-2],[-17,-15],[-39,2]],e.color||'#6269a5');
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
  fillPoly([[-26,-78+crouch],[-42,-52+crouch],[-35,-4],[-8,-12],[26,0],[18,-68+crouch]],e.color||'#562c49');
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
  fillPoly([[-22,-84-lean],[17,-83-lean],[27,-42-lean],[-16,-36-lean]],e.color||'#7e8fa4');
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
 if(e.rare||e.elite){
  ctx.save();ctx.globalAlpha=e.rare?.90:.67;ctx.strokeStyle=e.rare?'#ffe0a0':'#ed858b';
  ctx.lineWidth=e.rare?2.3:1.5;ctx.shadowColor=e.rare?'#ffc765':'#ec6175';ctx.shadowBlur=e.rare?17:9;
  ctx.beginPath();ctx.ellipse(0,-70,55,76,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<(e.rare?4:2);i++){
   const a=now/880+i*Math.PI*2/(e.rare?4:2);
   round(Math.cos(a)*59,-72+Math.sin(a)*65,3.5,e.rare?'#ffdf91':'#f9a0ad');
  }
  ctx.restore();
 }
 ctx.restore();

}

function clashPosition(){
 if(useIllustratedArt()&&KNIGHT_PUPPET?.readyFor(game.enemy)){
  const l=KNIGHT_PUPPET.layout(w,h,game.enemy,motionFor(game.enemy));
  return {x:l.hitX,y:l.hitY,scale:l.base};
 }
 if(!legacyVisualEnabled()&&CHARACTER_RIG_ENABLED&&CHARACTER_RIG&&typeof window.Path2D==='function'){
  const l=CHARACTER_RIG.layout(w,h,game.enemy,motionFor(game.enemy));
  return {x:l.hitX,y:l.hitY,scale:l.base};
 }
 if(!legacyVisualEnabled()&&COMBAT_ART_ENABLED&&COMBAT_ART?.readyFor(game.enemy)){
  const l=COMBAT_ART.layout(w,h,game.enemy,motionFor(game.enemy));
  return {x:l.hitX,y:l.hitY,scale:l.base};
 }
 const scale=Math.min(w/550,h/470)*1.23;
 return {x:w*.28+39*scale,y:h*.80-58*scale,scale};
}
function triggerClashFX(kind,at,enemyKind){
 clashFX={kind,at,enemyKind,combo:game.combo+(kind==='just'||kind==='parry'?1:0)};
 const {x,y}=clashPosition();
 if(kind==='just')puff(x,y,'#b2f5ff',27,1.65);
 else if(kind==='parry')puff(x,y,'#9fcbff',15,1.05);
 else if(kind==='miss')puff(x,y,'#db718b',9,.55);
}
function drawClashFX(now){
 if(!clashFX)return;
 const age=now-clashFX.at;if(age<0||age>255)return;
 const just=clashFX.kind==='just',normal=clashFX.kind==='parry',miss=clashFX.kind==='miss';
 const {x,y,scale:base}=clashPosition();
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

function drawFinalPhase(now){
 // Keep the fighting arena and the boss visible throughout the entire transition:
 // FX -> "第二楽章" over the four audible beats -> uninterrupted combat.
 const cx=w*.70,cy=h*.45;
 ctx.save();
 if(game.phaseStage==='rumble'){
  const progress=clamp((now-game.phaseStartedAt)/FINAL_PHASE_RUMBLE_MS,0,1);
  const glow=ctx.createRadialGradient(cx,cy,4,cx,cy,Math.max(w,h)*.60);
  glow.addColorStop(0,'#cf80e34a');glow.addColorStop(1,'#a25bbc00');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  // Swelling waves and flickering fragments convey the rumble without text.
  for(let k=0;k<3;k++){
   ctx.beginPath();ctx.arc(cx,cy,(24+progress*100+k*34)*Math.min(w/550,h/470),0,Math.PI*2);
   ctx.strokeStyle=k===0?'#e9b9fd9c':'#b478d35e';
   ctx.lineWidth=3+k;ctx.stroke();
  }
  for(let k=0;k<9;k++){
   const a=k*2.39996+now*.0006;
   const radius=24+progress*70+(k%3)*18;
   round(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,2+(k%3),'#ecd0ffad');
  }
 }else if(game.phaseStage==='countin'){
  // The 4 clicks are audible; no numeric HUD, prompts, or full-screen cover.
  const startAt=score.active?scoreToPerf(score.origin):game.phaseCountStartAt;
  const beatPosition=(now-startAt)/(score.beat*1000);
  const beatFraction=((beatPosition%1)+1)%1;
  const pulse=beatPosition>=0?Math.max(0,1-beatFraction*2):0;
  const titleSize=Math.min(38,w*.087)+2*pulse;
  ctx.shadowColor='#e3b3ff';ctx.shadowBlur=10+12*pulse;
  textDraw('第二楽章',w*.5,h*.35,titleSize,'#fff0ff');
  ctx.shadowBlur=0;
  // A quiet pulse around the boss is a musical accent, not a blocking overlay.
  ctx.beginPath();ctx.arc(cx,cy,24+10*pulse,0,Math.PI*2);
  ctx.strokeStyle='#d8b2fa88';ctx.lineWidth=2+pulse;ctx.stroke();
 }
 ctx.restore();
}
function drawBonusSamples(now){
 if(game.mode!=='upgrade'||upgradeTab!=='bonus'||!COMBAT_ART)return;
 for(const sample of document.querySelectorAll('canvas[data-skin-sample]')){
  const c=sample.getContext('2d');if(!c)continue;c.clearRect(0,0,sample.width,sample.height);
  window.ParryHeroPuppet?.drawHero(c,{skin:sample.dataset.skinSample,now,pose:{},layout:{heroX:280,ground:280,heroScale:1.5}});
 }
 for(const sample of document.querySelectorAll('canvas[data-bonus-sample]')){
  const c=sample.getContext('2d');if(!c)continue;c.clearRect(0,0,180,74);c.fillStyle='#aebfd6';c.font='10px sans-serif';c.textAlign='center';
  if(sample.dataset.bonusSample==='slashTint'){
   const item=PR.EXTRAS.find(item=>item.id==='slashTint');
   item.choices.forEach((tint,i)=>{COMBAT_ART.counterSlash(c,{kind:'just',phase:.55,origin:{x:i*60,y:34},target:{x:30+i*60,y:34},scale:.35,tint});c.fillText(tint.name,30+i*60,69);});
  }else for(const [i,combo]of [10,25,50].entries()){COMBAT_ART.comboAura(c,{now,combo,x:30+i*60,y:57,scale:.35});c.fillText(combo+' COMBO',30+i*60,72);}
 }
}
function drawComboGlow(now){
 if(!game.enemy||!PR.extraEnabled(permanent,'comboGlow'))return;
 let x=w*.28,y=h*.80,scale=Math.min(w/550,h/470)*1.23;
 if(useIllustratedArt()&&KNIGHT_PUPPET?.readyFor(game.enemy)){
  const l=KNIGHT_PUPPET.layout(w,h,game.enemy,motionFor(game.enemy)),whole=window.ParryArtEdits?.whole('hero')||{x:0,y:0,scale:1};
  const unit=window.ParryHeroPuppet?.SCALE||.16;
  x=l.heroX+whole.x*unit*l.heroScale;y=l.ground+whole.y*unit*l.heroScale;scale=l.heroScale*whole.scale;
 }
 COMBAT_ART?.comboAura?.(ctx,{now,combo:game.combo||0,x,y,scale});
}
function drawScreen(now){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));drawBackground(now);
 if(game.mode==='combat'&&!game.practice){ctx.save();ctx.globalAlpha=.035;ctx.fillStyle=P.zoneForFloor(game.floor).accent;ctx.fillRect(0,0,w,h*.72);ctx.restore()}
 if(game.artLoading){ctx.restore();textDraw('立ち絵を読み込み中…',w*.5,h*.5,Math.min(20,w*.05),'#cfdff5');return;}
 const poseTime=combatPoseTime(now);enemy(poseTime);drawComboGlow(poseTime);hero(poseTime);ctx.restore();drawClashFX(now);
 // Reserve separate, stable vertical lanes: the combo stays above the floor-entry title.
 // 0.055h vs 0.14h leaves a legible gap even on the 345px-tall mobile canvas.
 const boss=game.enemy?.boss;if(game.mode==='combat'){if(game.nextFloorHint&&now-game.nextFloorHintAt<1300){const alpha=clamp(1-(now-game.nextFloorHintAt-500)/800,0,1);ctx.globalAlpha=alpha;textDraw(game.nextFloorHint,w*.5,h*.14,Math.min(30,w*.075),boss?'#ffe0a2':'#cfdff5');ctx.globalAlpha=1}
 if(game.combo>1){textDraw('×'+game.combo+' COMBO',w*.5,h*.055,Math.min(19,w*.045),'#d4f5ed')}
 
 }
 if(game.mode==='phase')drawFinalPhase(now);
 if(game.mode==='victory'){textDraw(game.finalClear?'TOWER CONQUERED':'FLOOR CLEARED',w*.5,h*.26,Math.min(34,w*.075),'#ffe3ad');}
 if(flash>0){ctx.globalAlpha=flash*.18;ctx.fillStyle=flashColor;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);round(p.x,p.y,p.size,p.color)}ctx.globalAlpha=1;
 for(const a of texts){const age=now-a.t,alpha=clamp(1-age/a.life,0,1);ctx.globalAlpha=alpha;ctx.shadowColor=a.color;ctx.shadowBlur=8;textDraw(a.text,a.x,a.y-age*.043,a.size,a.color);ctx.shadowBlur=0}ctx.globalAlpha=1;
}
function update(now,dt){const m=game.mode;if(m==='combat'){scheduleScore();syncAttackClock();
 if(!game.windupPlayed&&now>=game.attackAt-Math.min(motionFor(game.enemy).prepare,game.attackSpan*.83)){
  game.windupPlayed=true;sound(game.enemy.boss?135:195,.14,'triangle',.026,-65);
 }
 if(!game.cuePlayed&&now>=game.attackAt-motionFor(game.enemy).swing){
  game.cuePlayed=true;sfxSwing();
 }
 if(game.enemy?.burn>0){const burnTick=game.enemy.burn*dt/1000*.55;if(burnTick>0){game.enemy.hp-=burnTick;game.damage+=burnTick;if(game.enemy.hp<=0){game.enemy.hp=0;clearFloor()}}}
 if(game.mode==='combat'&&!game.attackResolved&&now>=game.attackAt)
  strikeResult(game.pendingKind||(guardReadyAt(game.attackAt)?'guard':'miss'),game.attackAt);
 }else if(m==='phase')updateFinalPhase(now);
 else if(m==='victory'&&now-game.clearAt>900)showRewards();
 shake=Math.max(0,shake-dt*.08);flash=Math.max(0,flash-dt*.003);particles=particles.filter(p=>{p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vx*=.985;p.vy+=.025;p.life-=dt;return p.life>0});texts=texts.filter(a=>now-a.t<a.life);
}
function frame(now){const dt=clamp(now-lastT,0,55);lastT=now;if(DEV_MODE&&devMusicAudition)scheduleScore();if(game.mode==='gameover'&&$('deathCover').inert&&now>=game.deathInputUnlockAt)syncDeathInputLock(now);if(game.mode!=='pause'&&game.mode!=='title'&&game.mode!=='reward'&&game.mode!=='gameover'&&game.mode!=='upgrade')update(now,dt);drawScreen(game.mode==='pause'?pauseAt:now);if(['combat','phase','victory'].includes(game.mode))syncHUD();if(DEV_MODE)window.__parryDevUI?.updateMusic?.();drawBonusSamples(now);requestAnimationFrame(frame)}
canvas.addEventListener('pointerdown',e=>{
 if(game.mode!=='combat')return;
 e.preventDefault();
 beginGuardInput('pointer:'+(e.pointerId??'mouse'));
});
document.addEventListener('pointerup',e=>endGuardInput('pointer:'+(e.pointerId??'mouse')));
document.addEventListener('pointercancel',e=>endGuardInput('pointer:'+(e.pointerId??'mouse')));
document.addEventListener('keydown',e=>{
 if((e.code==='Space'||e.code==='Enter')&&game.mode==='combat'){
  e.preventDefault();
  if(!e.repeat)beginGuardInput('key:'+e.code);
 }else if(e.code==='Escape'&&['combat','pause'].includes(game.mode)){
  e.preventDefault();togglePause();
 }else if(e.code==='Escape'&&game.mode==='upgrade'){
  e.preventDefault();closeUpgrade();
 }
});
document.addEventListener('keyup',e=>{
 if(e.code==='Space'||e.code==='Enter'){endGuardInput('key:'+e.code);if(game.mode==='combat')e.preventDefault();}
});
window.addEventListener('blur',clearGuardInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearGuardInput()});
$('practiceEnemy').addEventListener('change',()=>{if(game.practice&&game.mode==='combat'){
 const key=$('practiceEnemy').value;
 if((!DEV_MODE&&!book.seen[key])||!P.findByKey(key))return;
 clearGuardInput();game.practiceKey=key;game.combo=0;game.charge=0;particles=[];texts=[];spawnEnemy(performance.now());game.parryAnimAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.whiffUntil=0;syncHUD()
 }});$('startBtn').addEventListener('click',()=>start(false));$('practiceBtn').addEventListener('click',openCodex);$('deathCodexBtn').addEventListener('click',openCodex);$('codexCloseBtn').addEventListener('click',title);$('codexFilter').addEventListener('change',renderCodex);$('exitPracticeBtn').addEventListener('click',title);$('retryBtn').addEventListener('click',()=>{if(!deathInputBlocked())start(false)});$('homeBtn').addEventListener('click',()=>{if(!deathInputBlocked())title()});$('pauseBtn').addEventListener('click',togglePause);$('resumeBtn').addEventListener('click',togglePause);$('relicOfferCards').addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-relic]');
 if(btn)selectRelic(btn.dataset.relic);
});
$('relicReplaceList').addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-replace]');
 if(btn)replaceRelic(btn.dataset.replace);
});
$('relicBackBtn').addEventListener('click',()=>{
 if(game.mode!=='relic')return;game.relicSwapTarget=null;renderRelicReward();
});
$('relicSkipBtn').addEventListener('click',finishRelicReward);
$('routeCards').addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-route]');if(btn)selectRoute(btn.dataset.route);
});
$('roomActions').addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-room-action]');if(btn)roomAction(btn.dataset.roomAction);
});
$('routeSkillCards').addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-route-skill]');if(btn)takeEventSkill(btn.dataset.routeSkill);
});
$('rerollBtn').addEventListener('click',()=>{if(game.mode!=='reward'||game.rerolls<1)return;game.rerolls--;choiceSet=choosePool();renderRewards();sound(490,.13,'sine',.04,100)});$('healBtn').addEventListener('click',showHeal);$('audioBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('audioBtn').textContent=audioEnabled?'♫ SOUND ON':'♫ SOUND OFF';if(score.bus&&audioContext)score.bus.gain.setTargetAtTime(audioEnabled?.35:0,audioContext.currentTime,.025);if(audioEnabled)sound(600,.10,'sine',.04,160)});

$('upgradeOpenBtn').addEventListener('click',openUpgrade);
$('deathUpgradeBtn').addEventListener('click',openUpgrade);
$('upgradeCloseBtn').addEventListener('click',closeUpgrade);
$('upgradeTabs').addEventListener('click',e=>{
 if(game.mode!=='upgrade')return;
 const btn=e.target.closest?.('[data-tab]');
 const tab=btn?.dataset.tab;
 if(!['loadout','skills','base','special','seal','bonus'].includes(tab))return;
 upgradeTab=tab;renderUpgradeScreen();
});
$('upgradeList').addEventListener('click',e=>{
 if(game.mode!=='upgrade')return;
 const btn=e.target.closest?.('[data-action]');
 if(btn?.dataset.action==='bonus-section'){
  if(upgradeTab==='bonus'&&['items','skins'].includes(btn.dataset.key)){bonusView=btn.dataset.key;renderUpgradeScreen();}
 }else if(btn?.dataset.action==='skin-preview'){
  if(upgradeTab==='bonus'&&bonusView==='skins'&&PR.SKINS.some(skin=>skin.id===btn.dataset.key)){skinPreview=btn.dataset.key;renderUpgradeScreen();}
 }else if(btn)buyUpgrade(btn.dataset.action,btn.dataset.key);
});
$('upgradeList').addEventListener('change',e=>{
 if(game.mode!=='upgrade')return;
 const option=e.target.closest?.('[data-extra-option]');
 if(option){const next=PR.setExtraOption(permanent,option.dataset.extraOption,option.value,SKILLS);if(next){permanent=next;savePermanent();}renderUpgradeScreen();return;}
 const select=e.target.closest?.('[data-equip]');
 if(!select)return;
 const result=PR.equip(permanent,Number(select.dataset.equip),select.value||null,SKILLS);
 if(result){permanent=result;savePermanent()}
 renderUpgradeScreen();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='combat')togglePause();if(document.hidden&&devMusicAudition){stopScore();devMusicAudition=false;window.__parryDevUI?.updateMusic?.();}});
// Developer controls exist only when loaded from the separate dev.html page.
 // The dev page never writes progression, bestiary or timing-correction storage.
 if(DEV_MODE)window.__parryDev=Object.freeze({
  launch(floor=1,enemyKey='',practice=false,skin='normal'){
   const f=Math.min(999,Math.max(1,Math.floor(Number(floor)||1)));
   if(enemyKey&&!P.findByKey(enemyKey))return false;
   devPreviewSkin=window.ParryHeroPuppet?.skinId?.(skin)||'normal';
   const key=practice?(enemyKey||P.encounterForFloor(f,()=>.5).bookKey):null;
   start(practice,practice?key:null,{floor:f,enemyKey:enemyKey||null,allowUnseenPractice:practice});
   return true;
  },
  previewSkin(){return devPreviewSkin},
  reset(){title()},
  musicList(){return STAGE_MUSIC?.themes||[]},
  previewMusic(id,variant='normal'){
   if(!audioEnabled||!STAGE_MUSIC?.get(id)||!['normal','boss'].includes(variant))return false;
   title();devMusicTheme=id;devMusicAudition=true;startScore({kind:'knight',boss:variant==='boss'});
   if(!score.active)devMusicAudition=false;return score.active;
  },
  stopMusic(){if(!devMusicAudition)return false;stopScore();devMusicAudition=false;return true},
  practiceMusic(id,variant='normal'){
   const theme=STAGE_MUSIC?.get(id);if(!theme||!['normal','boss'].includes(variant))return false;
   const zone=P.zoneForFloor(theme.from),floor=theme.from+(variant==='boss'?4:0),enemy=variant==='boss'?zone.boss:zone.fixed[1];
   title();start(true,enemy+':normal',{floor,allowUnseenPractice:true,musicId:id});return true;
  },
  musicState(){
   const beats=score.active&&audioContext?Math.max(0,(audioContext.currentTime-score.origin)/score.beat):0;
   return {active:score.active,audition:devMusicAudition,id:score.music,bpm:score.bpm,bar:Math.floor(beats/4)%8+1,beat:Math.floor(beats)%4+1};
  },
  getSfxVolume(){return Math.round(devSfxVolume*100)},
  setSfxVolume(percent){
   const value=Number(percent);if(!Number.isFinite(value))return Math.round(devSfxVolume*100);
   devSfxVolume=Math.max(0,Math.min(100,Math.round(value)))/100;
   if(devSfxBus)devSfxBus.gain.setTargetAtTime(devSfxVolume,audioContext.currentTime,.015);
   return Math.round(devSfxVolume*100);
  },
  previewSound(kind){
   if(!audioEnabled||!window.ParryCombatSfx?.PROFILES[kind])return false;
   audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
   if(audioContext.state==='suspended')audioContext.resume();
   return window.ParryCombatSfx.play(audioContext,kind,audioContext.currentTime,steelDestination());
  },
  list(){return P.codexEntries().map(e=>({key:e.bookKey,name:e.displayName,rare:e.rare,boss:e.boss,elite:e.elite}))},
  preview(floor=1,enemyKey=''){
   const f=Math.min(999,Math.max(1,Math.floor(Number(floor)||1)));
   const encounter=enemyKey?P.findByKey(enemyKey):P.encounterForFloor(f,()=>.5);
   if(!encounter)return null;
   return {floor:f,key:encounter.bookKey,name:encounter.displayName,
    hpMultiplier:encounter.hpMultiplier??1,atkMultiplier:encounter.atkMultiplier??1,
    ...P.baseStats(encounter,f),boss:encounter.boss,elite:encounter.elite,rare:encounter.rare};
  },
  state(){return {floor:game.floor,enemy:game.enemy?.id,variant:game.enemy?.bookKey,mode:game.mode,enemyMaxHp:game.enemy?.maxHp,enemyAttack:game.enemy?.atk}},
  isolated:true
 });
 window.__parryV05=()=>({mode:game.mode,floor:game.floor,enemy:game.enemy?.preview?'？？？':game.enemy?.id,preview:!!game.enemy?.preview,practice:!!game.practice,encounterKey:game.enemy?.preview?null:game.enemy?.bookKey,encounterElite:!!game.enemy?.elite,encounterRare:!!game.enemy?.rare,discovered:Object.keys(book.seen),souls:meta.coins,bpm:score.bpm,attackBeat:game.attackBeat,attackAt:game.attackAt,beat:score.beat,scoreOrigin:score.origin,audioNow:audioContext?.currentTime,scoreActive:score.active,combo:game.combo,hp:game.hp,maxHp:game.maxHp,shield:game.shield,attackSpan:game.attackSpan,guardHeld:!!game.guardHeld,guardReady:guardReadyAt(performance.now()),lastStrikeKind:game.lastStrikeKind,parryAnimAt:game.parryAnimAt,parryCooldownRemaining:Math.max(0,(game.parryReadyAt||0)-performance.now()),parryReleaseRemaining:Math.max(0,PARRY_RELEASE_MS-(performance.now()-(game.guardReleasedAt??-99999))),offset:latencyOffset,rerolls:game.rerolls,reviveUsed:!!game.reviveUsed,enemyHp:game.enemy?.hp,enemyMaxHp:game.enemy?.maxHp,enemyAttack:game.enemy?.atk,bossPhase:game.enemy?.phase||1,enemyRhythm:[...(game.enemy?.rhythm||[])],phaseStage:game.phaseStage||null,phaseCountStartAt:game.phaseCountStartAt||0,finalClear:!!game.finalClear,justStreak:game.justStreak||0,overchargeCount:game.overchargeCount||0,frostCount:game.frostCount||0,frostWard:!!game.frostWard,fortitudeReady:!!game.fortitudeReady,bloodlustPending:game.bloodlustPending||0,sealedSkillIds:[...(game.sealedSkillIds||[])],runSkills:{...(game.lv||{})},towerCoins:game.towerCoins||0,towerCoinsEarned:game.towerCoinsEarned||0,routeTrial:!!game.routeTrial,currentRoom:game.currentRoom||null,eventId:game.eventId||null,roomStage:game.roomStage||null,routeSkillSet:[...(game.routeSkillSet||[])],relicReturn:game.relicReturn||null,relicMirrorTarget:game.relicMirrorTarget||null,relics:[...(game.relics||[])],relicDiscarded:[...(game.relicDiscarded||[])],relicOffer:[...(game.relicOffer||[])],relicRewardKind:game.relicRewardKind||null,relicSwapTarget:game.relicSwapTarget||null,relicMaskReady:!!game.relicMaskReady,relicGearReady:!!game.relicGearReady,relicPactReady:!!game.relicPactReady,relicBellDue:!!game.relicBellDue,relicCounters:{...(game.relicCounters||{})},permanent:{...permanent,unlockedSkills:[...permanent.unlockedSkills],equipped:[...permanent.equipped],sealedSkills:[...permanent.sealedSkills],unlockedExtras:[...permanent.unlockedExtras],enabledExtras:[...permanent.enabledExtras],extraOptions:{...permanent.extraOptions}}});resize();title();window.ParryDiagnostics?.registerGame('v0.9.3-8',window.__parryV05);requestAnimationFrame(frame);
})();
