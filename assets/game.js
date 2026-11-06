(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const DEV_MODE=document.documentElement.dataset.parryDev==='true';
let devPreviewSkin='normal';
let beatContact=true,cueBeats=1.5,devTimingTrace={};
const attackPresentation={opening:true,cues:new Map(),contact:null};
const splitContact=()=>cueBeats>0&&typeof window.ParryCombatSfx?.playContact==='function'&&typeof window.ParryCombatSfx?.playTail==='function';
function presentContact(){
 if(!splitContact())return;
 const key=score.theme+':'+game.attackBeat;
 if(attackPresentation.contact?.key===key)return;
 attackPresentation.contact={key,at:game.attackAt,audioAt:score.origin+game.attackBeat*score.beat,guard:!!game.guardAtImpact,result:null};
 triggerClashFX('contact',game.attackAt,game.enemy.kind);
}
const MUSIC=window.ParryMusic;
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
const RunState=window.ParryRunState;if(!RunState)throw Error('Missing assets/run-state.js');
const RR=window.ParryRelics;if(!RR)throw Error('Missing assets/relics.js');
const RT=window.ParryRoutes;if(!RT)throw Error('Missing assets/routes.js');
const EV=window.ParryEvents;if(!EV)throw Error('Missing assets/events.js');
const PREF=window.ParryPlayerSettings,CP=window.ParryRunCheckpoint;
const saves=window.ParrySaveStore.create({storage:()=>localStorage,writable:!DEV_MODE});
const audioClock=window.ParryAudioClock.create();
let clockPausedPhase=false;
let preferences=PREF.normalize();try{preferences=PREF.normalize(saves.readJson(PREF.KEY,{}).value)}catch(e){}
let pendingCheckpoint=null,saveFailed=false,settingsReturn='title',calibration=null,calibrationNodes=[],pendingNewTutorial=false;
const CALIBRATION_COUNT_IN=4,CALIBRATION_SAMPLES=16;
const KEY='parryTowerPrototype_v1';const OFFSET_KEY='parryTowerInputOffset_v1';const LEGACY_OFFSET_KEY='parryTowerAudioOffset_v05';const BOOK_KEY='parryTowerBestiary_v1';const PERMANENT_KEY='parryTowerPermanent_v1'; // v0.1と同じ保存領域で恒久育成を引き継ぐ
const baseMeta={coins:0,bestFloor:0,bestCombo:0,runs:0,life:0,attack:0,ward:0,rescueClaimMask:0};
let meta={...baseMeta};try{
 const s=saves.readJson(KEY,{}).value;
 for(const k of Object.keys(baseMeta)){
  if(PR.BASE_UPGRADES.some(def=>def.id===k)){meta[k]=PR.baseLevel(s,k);}
  else if(k==='rescueClaimMask')meta[k]=PR.rescueMask(s[k]);
  else if(typeof s[k]==='number'&&Number.isFinite(s[k]))meta[k]=Math.max(0,Math.floor(s[k]));
 }
}catch(e){}
const save=()=>{$('soulFragmentsLabel').textContent=meta.coins;saves.writeJson(KEY,meta);};
const savePermanent=()=>{saves.writeJson(PERMANENT_KEY,permanent);};
let book=P.emptyBook();try{book=P.normalizeBook(saves.readJson(BOOK_KEY,{}).value)}catch(e){}
const saveBook=()=>{saves.writeJson(BOOK_KEY,book);};
const CombatMath=window.ParryCombatMath,CombatHealth=window.ParryCombatHealth,SkillCatalog=window.ParrySkills;
const {SKILLS,SYNERGIES,PULSE_COMBO_STEP,KING_COMBO_STEP}=SkillCatalog;
const {ULTIMATE_BASE_MULTIPLIER,heartbeatDamagePercent,tempoReduction}=CombatMath;
function baseAttackScale(){return CombatMath.baseAttackScale(game?.baseAtk);}
function skillAtkScale(){return CombatMath.skillAtkScale(game?.baseAtk,lvl('blade'));}
function runBaseHp(){return CombatMath.runBaseHp(game.lifeBonus??PR.baseValue(meta,'life'));}
function hpSkillScale(){return CombatMath.hpSkillScale(runBaseHp(),lvl('heal'));}
function skillDescriptionContext(){return {baseAtk:game?.baseAtk,bladeLevel:lvl('blade'),baseHp:runBaseHp()};}
function describeSkill(id,level){return SkillCatalog.describe(id,level,skillDescriptionContext());}
let codexTab='monsters';
const SK=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
// Keep ownership and equipment in a separate, versioned save; legacy currency and stats remain untouched.
let permanent=PR.defaults();try{permanent=PR.normalize(saves.readJson(PERMANENT_KEY,{}).value,SKILLS)}catch(e){}
if(!permanent.skinRecords.normal)permanent.skinRecords.normal={bestFloor:meta.bestFloor,bestCombo:meta.bestCombo,runs:meta.runs};
function visualSkin(){return game?.skin||(DEV_MODE?devPreviewSkin:permanent.equippedSkin)||'normal'}
function runSkinRules(){return PR.skinRules(game?.skinEffects?game.skin:'normal')}
let runLegacyVisual=null;
function legacyVisualEnabled(){return runLegacyVisual??PR.extraEnabled(permanent,'legacyVisual')}
function useIllustratedArt(){return (DEV_MODE&&devPreviewSkin!=='normal')||(ILLUSTRATED_ENABLED&&!legacyVisualEnabled())}
function syncArtMode(){
 document.documentElement.dataset.parryArt=legacyVisualEnabled()?'legacy':ILLUSTRATED_ENABLED?'illustrated':COMBAT_ART_ENABLED?'impact':CHARACTER_RIG_ENABLED?'rework':'legacy';
 if(useIllustratedArt())KNIGHT_PUPPET?.preloadSources?.();
}
let upgradeTab='loadout',upgradeReturnMode='title',bonusView='items';

const ENEMIES=P.monsters.slice(0,4);
const BOSS=P.byId.guardian;
let game={mode:'title'},w=800,h=500,dpr=1,lastT=performance.now(),particles=[],texts=[],shake=0,flash=0,flashColor='#fff',audioEnabled=true,choiceSet=[],cuePlayed=false;
let devMusicTheme='auto',devMusicAudition=false;

let pausedFrom='combat',pauseAt=0,screenOffset=0;
// Visual effects use the wall-clock only; never modify AudioContext, strike timestamps or hitboxes.
let clashFX=null;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// Held guards need 100ms preparation. Successful parries meet the score beat immediately.
const PARRY_STARTUP=100;
const contactDelay=()=>beatContact?0:PARRY_STARTUP;
const PARRY_REARM_MS=300,PARRY_RELEASE_MS=120;
// Guard activates after the shield is physically raised; hold to cover repeated attacks.
const GUARD_DAMAGE_RATIO=.30;
const GUARD_MAX_HP_RATIO=.40;
const GUARD_COMBO_LOSS_RATIO=.20;
const GUARD_MIN_COMBO_LOSS=5;
const heldGuardInputs=new Set();
function clearGuardInput(){
 captureImpactGuard();
 const wasHeld=heldGuardInputs.size>0||game?.guardHeld;
 heldGuardInputs.clear();
 if(game){game.guardHeld=false;game.guardStartedAt=0;if(wasHeld)game.guardReleasedAt=performance.now();}
}
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
 captureImpactGuard();
 const removed=heldGuardInputs.delete(source);
 if(removed&&heldGuardInputs.size===0&&game){game.guardHeld=false;game.guardStartedAt=0;game.guardReleasedAt=performance.now();}
}
function guardReadyAt(impact){
 return !!game.guardHeld&&game.guardStartedAt+PARRY_STARTUP<=impact;
}
function captureImpactGuard(now=performance.now()){
 if(game?.mode==='combat'&&!game.attackResolved&&now>=game.attackAt&&game.guardAtImpact==null)
  game.guardAtImpact=guardReadyAt(game.attackAt);
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
const motionFor=(e,opening=attackPresentation.opening)=>{
 const m=MOTIONS[e.kind]||MOTIONS.knight;
 if(!cueBeats)return m;
 // Keep each enemy's authored pose sequence; fit preparation and release into the selected beat lead.
 const prepare=cueBeats*score.beat*1000;
 const swing=prepare*m.swing/m.prepare,phrase=P.attackPhrase(e,e.index,opening),noWindup=!phrase.windup;
 // Finish the previous recoil before a short follow-up's swing begins.
 // An overlapping contact pose otherwise hides the new release and snaps back late.
 const recovery=noWindup?Math.min(m.recovery,Math.max(80,phrase.beats*score.beat*1000-swing)):m.recovery;
 return {...m,prepare,swing,recovery,cuePrepare:prepare,noWindup};
};
// ---- Music and combat share one Web Audio clock; inputs follow its beats. ----
const audio=window.ParryAudioSession.create({
 createContext:()=>new (window.AudioContext||window.webkitAudioContext)(),
 now:()=>performance.now(),defer:(callback,delay)=>setTimeout(callback,delay),
 // Warm steel tails before the session establishes its beat origin.
 prepare:ac=>window.ParryCombatSfx?.prepare?.(ac),playStep:playMusicStep,devMode:DEV_MODE
});
const {score,stopScore,scheduleScore,effectDestination,steelDestination}=audio;
applyAudioPreferences();
let latencyOffset=0;try{
 const currentResult=saves.readText(OFFSET_KEY);
 if(!currentResult.ok)throw currentResult.error;
 const legacyResult=saves.readText(LEGACY_OFFSET_KEY);
 if(!legacyResult.ok)throw legacyResult.error;
 const current=currentResult.value,legacy=legacyResult.value;
 if(current!==null&&Number.isFinite(Number(current)))latencyOffset=clamp(Number(current),-180,180);
 else if(legacy!==null&&Number.isFinite(Number(legacy)))latencyOffset=clamp(Number(legacy)-PARRY_STARTUP,-180,180);
 // Preserve saved input centers: presentation changes do not require another offset conversion.
}catch(e){}
$('latencySlider').value=latencyOffset;$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';
$('latencySlider').addEventListener('input',e=>{latencyOffset=Number(e.target.value);$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';saves.writeText(OFFSET_KEY,latencyOffset); });
function playMusicStep(ac,step,at){
 if(!audioEnabled)return;
 MUSIC?.playStep(ac,{
  destination:score.bus,noiseBuffer:score.noise,id:score.music,step,at,beat:score.beat,boss:score.boss,
  movement:game.enemy?.phase||1,startStep:score.musicStartStep,countIn:game.mode==='phase'&&game.phaseStage==='countin',
  arrangement:devMusicAudition||['combat','phase'].includes(game?.mode)
 });
}
function encounterBpm(enemy){
 const base=enemy.boss?136:enemy.kind==='rogue'?124:112;
 if(devMusicAudition)return MUSIC?.get(devMusicTheme)?.bpm??base;
 // Freeze once per enemy, including checkpoints written before the rework.
 game.tempoBpmReduction??=tempoReduction(lvl('tempo'));
 return base+(enemy.elite?6:0)+(runSkinRules().randomTempo?game.skinTempoOffset||0:0)-game.tempoBpmReduction;
}
function startScore(enemy){
 attackPresentation.cues.clear();attackPresentation.contact=null;
 const beat=60/encounterBpm(enemy),boss=!!enemy.boss;
 const selected=DEV_MODE&&devMusicTheme!=='auto'?MUSIC?.get(devMusicTheme):MUSIC?.forEncounter(game.floor||1,enemy);
 const startStep=selected?.floor!=null&&game.mode==='phase'&&game.phaseStage==='countin'?FINAL_PHASE_COUNT_BEATS*2:0;
 if(!audio.startScore({beat,id:selected?.id||'crypt',boss,startStep}))return;
 audioClock.reset();
 $('trackLabel').textContent=(selected&&!selected.original?selected.name:boss?'BOSS / IRON WALTZ':enemy.kind==='rogue'?'SHADOW BREAKS':'DUNGEON GROOVE')+' · '+score.bpm+' BPM';
 scheduleScore();
}
function readAudioClock(){
 const ac=audio.context;
 let stamp=null,stampError=false;try{stamp=ac.getOutputTimestamp?.()||null;}catch(e){stampError=true;}
 return audioClock.sample({audio:ac.currentTime,perf:performance.now(),state:ac.state,stamp,stampError,latencyHint:((ac.outputLatency||0)+(ac.baseLatency||0))*1000});
}
function scoreToPerf(t,offset=0){
 if(audio.context){const reading=readAudioClock();if(reading.healthy)return t*1000+reading.offset+offset;}
 return score.visualOriginPerf+(t-score.origin)*1000+offset;
}
function syncAttackClock(){if(!score.active||!game.enemy)return;game.attackAt=scoreToPerf(score.origin+game.attackBeat*score.beat)+contactDelay();game.telegraphStart=game.attackAt-game.attackSpan}
function inputTargetAt(){return game.attackAt-contactDelay()+latencyOffset}
function musicParry(kind){
 const ac=audio.context;
 if(!audioEnabled||!ac)return;
 if(splitContact()&&attackPresentation.contact){
  if(window.ParryCombatSfx?.PROFILES[kind])window.ParryCombatSfx.playTail(ac,kind,attackPresentation.contact.audioAt,steelDestination());
  return;
 }
 if(window.ParryCombatSfx?.PROFILES[kind]){window.ParryCombatSfx.play(ac,kind,ac.currentTime+.003,steelDestination());return;}
 if(!score.bus||!score.noise)return;
 const tone=(...args)=>MUSIC?.playTone(ac,score.bus,...args);
 const noise=(...args)=>MUSIC?.playNoise(ac,score.bus,score.noise,...args);
 const t=ac.currentTime+.003;
 // Musical response to a successful parry. All notes use the BGM's AudioContext clock.
 if(kind==='just'){
  noise(t,.085,.12,2900);
  tone(784,.16,.11,t,'triangle',125);
  tone(1175,.20,.085,t+.045,'sine',95);
  tone(1568,.22,.055,t+.092,'sine',-125);
 }else if(kind==='parry'){
  noise(t,.058,.085,2400);
  tone(659,.13,.082,t,'triangle',120);
  tone(988,.13,.038,t+.034,'sine',-45);
 }else if(kind==='guard'){
  tone(245,.11,.060,t,'triangle',-60);
 }else{
  noise(t,.13,.065,650);
  tone(128,.16,.065,t,'sawtooth',-65);
 }
}

function sound(freq=500,dur=.13,type='sine',vol=.06,slide=0){
 if(!audioEnabled)return;
 try{
  const ac=audio.ensureContext();
  if(!ac)return;
  const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(50,freq+slide),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(effectDestination());o.start(t);o.stop(t+dur+.02);
 }catch(e){}
}
function chord(){/* The bright chord is scheduled by musicParry on the BGM clock. */}
// 剣が動き始める音。250ms前の電子音ではなく斬撃に追従する風切り音。
function sfxSwing(){if(!audioEnabled)return;try{
 const ac=audio.ensureContext();
 if(!ac)return;
 const t=ac.currentTime,dur=.17;
 const buffer=ac.createBuffer(1,Math.ceil(dur*ac.sampleRate),ac.sampleRate);
 const ch=buffer.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;
 const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=buffer;filter.type='bandpass';filter.Q.value=.7;
 filter.frequency.setValueAtTime(1050,t);filter.frequency.exponentialRampToValueAtTime(320,t+dur);
 gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.09,t+.055);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.connect(filter);filter.connect(gain);gain.connect(effectDestination());src.start(t);src.stop(t+dur);
}catch(e){}}
function upgradeCount(){return Object.values(game.lv||{}).reduce((a,b)=>a+b,0)}
function lvl(id){return game.lv?.[id]||0}
function kingComboStep(){return has('king','pulse')?PULSE_COMBO_STEP:KING_COMBO_STEP}
function has(a,b){return lvl(a)>0&&lvl(b)>0}
function getPerfectWindow(){return (11+lvl('focus')*2)*runSkinRules().just}
function getParryWindow(){return (31+lvl('stability')*3)*runSkinRules().parry}
// Lock the entire death overlay (including dynamically rendered shop buttons).
// Keep the retry / home / bestiary buttons natively disabled for keyboard and accessibility.
function deathInputBlocked(now=performance.now()){
 return game.mode==='gameover'&&now<(game.deathInputUnlockAt||0);
}
function syncDeathInputLock(now=performance.now()){
 const blocked=deathInputBlocked(now);
 $('deathCover').inert=blocked;
 for(const id of ['retryBtn','homeBtn','deathCodexBtn','deathUpgradeBtn','deathPracticeBtn'])if($(id))$(id).disabled=blocked;
}
function setMode(mode){
 if(mode==='combat'&&game.artLoading)mode='loading';
 if(mode!=='combat')clearGuardInput();
 game.mode=mode;
 $('practiceTools').hidden=!game.practice||!['combat','pause'].includes(mode);
 $('exitPracticeBtn').hidden=!game.practice||!['combat','pause'].includes(mode);
 $('exitPracticeBtn').textContent='稽古を終了';
 const covers={settings:'settings',confirm:'confirm',title:'title',reward:'reward',relic:'relic',route:'route',room:'room',routeSkill:'routeSkill',gameover:'death',pause:'pause',codex:'codex',upgrade:'upgrade'};
 for(const name of ['title','reward','relic','route','room','routeSkill','death','pause','codex','upgrade','settings','confirm'])$(name+'Cover').hidden=name!==covers[mode];
 $('pauseBtn').disabled=!['combat','pause'].includes(mode);
 $('pauseBtn').textContent=mode==='pause'?'▶ 再開':'Ⅱ 一時停止';
 syncDeathInputLock();
 $('settingsBtn').disabled=['loading','phase','confirm'].includes(mode);
 syncTutorial();checkpoint();
 $('runStateLabel').textContent={title:'READY',loading:'LOADING',combat:game.practice?'PRACTICE':'IN BATTLE',phase:'SECOND MOVEMENT',victory:'CLEARED',reward:'LEVEL UP',relic:'RELIC OFFER',route:'CROSSROADS',room:'EVENT ROOM',routeSkill:'SKILL GIFT',gameover:'GAME OVER',pause:'PAUSED',codex:'CODEX',upgrade:'UPGRADES'}[mode]||'';
}
function syncHUD(){const enemy=game.enemy;$('floorNumber').textContent=game.practice?'--':String(game.floor||1).padStart(2,'0');
 $('floorBadge').textContent=game.practice?'⚔ PRACTICE':enemy?.rare?'✦ RARE':enemy?.boss?(enemy.elite?'✦ ELITE BOSS':'✦ BOSS'):enemy?.elite?'◆ ELITE':'';
 $('zoneLabel').textContent=game.practice?'稽古場':P.zoneForFloor(game.floor||1).name;
 $('zoneLabel').style.color=game.practice?'#f4d68d':P.zoneForFloor(game.floor||1).accent;$('enemyName').textContent=enemy?.name||'塔の入口';$('comboLabel').textContent=game.combo||0;$('hpText').textContent=`${Math.ceil(game.hp||0)} / ${game.maxHp||100}`;$('hpFill').style.width=clamp(100*(game.hp||0)/(game.maxHp||100),0,100)+'%';$('hpFill').classList?.toggle?.('shielded',(game.shield||0)>0);if($('shieldFill'))$('shieldFill').style.width=clamp(100*(game.shield||0)/(game.maxHp||100),0,100)+'%';$('shieldText').textContent=game.shield>0?`＋🛡${Math.ceil(game.shield)}`:'';$('enemyBarName').textContent=enemy?.name||'ENEMY';$('enemyHpText').textContent=enemy?`${Math.ceil(Math.max(0,enemy.hp))} / ${enemy.maxHp}`:'—';$('enemyHpFill').style.width=enemy?clamp(enemy.hp/enemy.maxHp*100,0,100)+'%':'0%';$('perfectStat').textContent=game.perfects||0;$('damageStat').textContent=formatCompact(game.damage||0);$('bestComboStat').textContent=game.peakCombo||0;$('chargeStat').textContent=`${game.charge||0} / 7`;$('buildCount').textContent=`${upgradeCount()} LEVELS`;$('towerCoinsLabel').textContent=game.towerCoins||0;$('soulFragmentsLabel').textContent=meta.coins;renderCombatBuffs();}
function renderCombatBuffs(){
 const parts=[];
 if(lvl('fortitude')&&game.fortitudeReady)parts.push('🛡 不屈 準備');
 if(lvl('heartbeat'))parts.push('🎵 ジャスト '+(game.justStreak||0)+'/'+(has('heartbeat','focus')?2:3));
 if(lvl('overcharge'))parts.push('⚡ 過充電 '+(game.overchargeCount||0)+'/3');
 if(lvl('frost'))parts.push(game.frostWard?'❄ 氷の加護 準備':'❄ 氷結 '+(game.frostCount||0)+'/4');
 if(lvl('king')){const step=kingComboStep();parts.push('👑 王の一撃 あと'+(step-(game.combo||0)%step));}
 if(lvl('bloodlust')&&game.bloodlustPending>0)parts.push('🦇 渇望 +'+Math.round(game.bloodlustPending));
 if(hasRelic('unbroken_sigil'))parts.push(game.relicBulwarkUsed?'🔰 紋章 使用済':'🔰 紋章 準備');
 if(lvl('wardcraft')||game.bonuses?.wardCapacity)parts.push('🔰 障壁の補充上限 '+shieldCap());
 const el=$('combatBuffs');el.hidden=!parts.length;el.textContent=parts.join('　·　');
}
function formatCompact(n){if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return Math.floor(n).toLocaleString('ja-JP')}
function renderBuild(){const active=SKILLS.filter(s=>lvl(s.id));$('buildList').innerHTML=active.length?active.map(s=>`<div class="build-item"><span class="build-symbol">${s.icon}</span><div style="min-width:0"><div class="build-name">${s.name}</div><div class="build-desc">${describeSkill(s.id,lvl(s.id))}</div></div><span class="level">Lv.${lvl(s.id)} / ${skillCap(s.id)}${game.skillBreaks?.[s.id]?`<br>✦ ${game.skillBreaks[s.id]}/2`:""}</span></div>`).join(''):'<div class="empty">スキルなし</div>';$('synergyList').innerHTML=SYNERGIES.filter(s=>has(s.a,s.b)).map(s=>`<div class="synergy"><b>${s.name}</b><small>${s.desc}</small></div>`).join('');renderRelicInventory();}

// Caps and refinements belong to this challenge, never to permanent progression.
function skillCap(id){return Object.hasOwn(SK,id)?SK[id].max+(game.skillBreaks?.[id]||0):0}
function availableSkills(){return SKILLS.filter(s=>lvl(s.id)<skillCap(s.id)&&!game.sealedSkillIds?.includes(s.id))}
function merchantTargets(itemId){
 if(itemId==='polish')return RR.validIds(game.relics).filter(id=>!game.polishedRelics.includes(id));
 if(!['training','breakthrough'].includes(itemId))return [];
 return SKILLS.filter(s=>lvl(s.id)>0&&!game.sealedSkillIds?.includes(s.id)&&
  (itemId==='training'?lvl(s.id)<skillCap(s.id):lvl(s.id)===skillCap(s.id)&&(game.skillBreaks[s.id]||0)<2)).map(s=>s.id);
}
function merchantAvailable(id){
 if(['training','breakthrough','polish'].includes(id))return merchantTargets(id).length>0;
 if(id==='elixir')return game.charge<7;
 if(id==='skill')return availableSkills().length>0;
 if(id==='relic')return RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary');
 return Object.hasOwn(EV.ITEMS_BY_ID,id);
}
function relicPolished(id){return hasRelic(id)&&!!game.polishedRelics?.includes(id)}
function relicPower(id,secondary=false){return RR.BY_ID[id]?.[secondary?'secondary':'power']?.[relicPolished(id)?1:0]||0}
function relicScaledSuffix(id,polished=false){
 const r=RR.BY_ID[id];if(!r)return '';
 const idx=polished?1:0;
 if(id==='conduit_stone'||id==='ember_vial'||id==='emperor_conduit'){
  const s=skillAtkScale();if(Math.abs(s-1)<=1e-4)return '';
  if(id==='conduit_stone')return `（現在 ${Math.round(r.power[idx]*s)}）`;
  if(id==='ember_vial')return `（現在 +${Math.round(r.power[idx]*s)}）`;
  return `（現在 雷撃${Math.round(r.secondary[idx]*s)}）`;
 }
 if(id==='rusty_crest'||id==='pilgrim_bell'||id==='blood_pact_chalice'||id==='silver_mirror'){
  const s=hpSkillScale();if(Math.abs(s-1)<=1e-4)return '';
  if(id==='rusty_crest')return `（現在 ${Math.round(r.power[idx]*s)}軽減）`;
  if(id==='silver_mirror')return `（現在 最大${Math.round(r.secondary[idx]*s)}軽減）`;
  return `（現在 HP${Math.round(r.power[idx]*s)}回復）`;
 }
 return '';
}
function ownedRelic(id){const r=RR.BY_ID[id],pol=relicPolished(id),base=pol?r.polishedDesc:r.desc;return {...r,name:pol?r.name+' ✦':r.name,desc:base+relicScaledSuffix(id,pol)}}
function hasRelic(id){return !game.practice&&!!game.relics?.includes(id)}
function relicCounter(id){return game.relicCounters?.[id]||0}
function relicBump(id,threshold){
 const next=relicCounter(id)+1;
 game.relicCounters[id]=next>=threshold?0:next;
 return next>=threshold;
}
function shieldCap(){return CombatMath.shieldCap(runBonus('wardCapacity'),lvl('aegis'),lvl('wardcraft'));}
function addShield(amount,combat=false,cap=shieldCap()){
 return CombatHealth.addShield(game,amount,{combat,cap,wardcraftLevel:lvl('wardcraft')});
}
function relicShield(amount){return addShield(amount,game.mode==='combat')}
function adjustRelicMaxHp(){RunState.adjustRelicMaxHp(game)}
function renderRelicInventory(){
 const items=RR.validIds(game.relics||[]).map(ownedRelic);
 $('relicCount').textContent=items.length+' / '+RR.MAX_HELD;
 $('relicList').innerHTML=items.length?items.map(r=>`<div class="relic-owned ${r.rarity}"><span class="relic-owned-icon">${r.icon}</span><div><div class="relic-owned-title">${r.name}</div><div class="relic-owned-desc">${r.desc}</div></div></div>`).join(''):'<div class="empty">遺物なし</div>';
}
function records(){
 const id=game?.skin||permanent.equippedSkin,skin=PR.SKINS.find(s=>s.id===id)||PR.SKINS[0];
 const r=permanent.skinRecords[skin.id]||{bestFloor:0,bestCombo:0,runs:0};
 return `<span>${skin.icon} ${skin.name}</span><span>最高到達 <b>${r.bestFloor}F</b></span><span>最高コンボ <b>${r.bestCombo}</b></span><span>挑戦 <b>${r.runs}回</b></span>`;
}
function recordSkinRun(finished=false){
 if(DEV_MODE||game.practice)return;
 const r=permanent.skinRecords[game.skin]||{bestFloor:0,bestCombo:0,runs:0};
 r.bestFloor=Math.max(r.bestFloor,game.floor);r.bestCombo=Math.max(r.bestCombo,game.peakCombo);
 if(finished)r.runs++;
 permanent.skinRecords[game.skin]=r;savePermanent();
}

function runBonus(id){return game.bonuses?.[id]??PR.value(permanent,id)}
function towerCoinReward(raw){return Math.round(raw*(1+runBonus('coinGain')/100))}
function awardTowerCoins(raw){
 const gained=towerCoinReward(raw);
 game.towerCoins+=gained;game.towerCoinsEarned+=gained;
 return gained;
}
function soulReward(n){return Math.ceil(n*(1+runBonus('soulGain')/100))}
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
function renderUpgradeScreen(){
 const view=window.ParryShopView.render({meta,permanent,tab:upgradeTab,bonusView,skillContext:skillDescriptionContext()});
 upgradeTab=view.tab;
 $('upgradeCoins').textContent=view.coinsLabel;
 $('soulFragmentsLabel').textContent=view.coins;
 $('upgradeTabs').innerHTML=view.tabsHtml;
 for(const id of view.preloadSkins)window.ParryHeroPuppet?.preloadSkin?.(id);
 $('upgradeList').innerHTML=view.listHtml;
}
function openUpgrade(){
 if(deathInputBlocked()||!['title','gameover'].includes(game.mode))return;
 runLegacyVisual=null;upgradeReturnMode=game.mode;upgradeTab='loadout';setMode('upgrade');renderUpgradeScreen();
}
function closeUpgrade(){if(game.mode!=='upgrade')return;setMode(upgradeReturnMode);if(upgradeReturnMode==='title')$('titleRecords').innerHTML=records().replace(/<span>[^<]*<\/span>/,'');else if(upgradeReturnMode==='gameover')$('deathRecords').innerHTML=records();}
function syncShopAppearance(){if(DEV_MODE){devPreviewSkin=permanent.equippedSkin;if($('devSkin'))$('devSkin').value=devPreviewSkin;}if(upgradeReturnMode==='gameover')game.skin=permanent.equippedSkin;syncArtMode();}
function buyUpgrade(action,key){
 if(game.mode!=='upgrade')return;
 if(action==='skin-equip'){
  const next=PR.equipSkin(permanent,key,SKILLS);if(!next)return;
  permanent=next;savePermanent();syncShopAppearance();window.ParryHeroPuppet?.preloadSkin?.(key);renderUpgradeScreen();return;
 }
 if(action==='bonus-toggle'){
  const next=PR.toggleExtra(permanent,key,!PR.extraEnabled(permanent,key),SKILLS);if(!next)return;
  permanent=next;savePermanent();if(key==='legacyVisual')syncShopAppearance();else syncArtMode();renderUpgradeScreen();sound(650,.12,'triangle',.04,140);return;
 }
 if(action==='quick-equip'){
  const [slotStr,skillId]=String(key).split(':'),slot=Number(slotStr);
  if(!Number.isInteger(slot)||slot<0||slot>=permanent.slots)return;
  const current=permanent.equipped[slot]===skillId?null:skillId;
  const next=PR.equip(permanent,slot,current,SKILLS);
  if(!next)return;
  permanent=next;savePermanent();renderUpgradeScreen();sound(650,.12,'triangle',.04,140);return;
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
 }else if(action==='skin-buy'){
  const skin=PR.SKINS.find(s=>s.id===key);
  if(skin&&Number.isFinite(skin.cost)&&!PR.ownsSkin(permanent,key)){
   cost=skin.cost;apply=()=>{permanent.unlockedSkins.push(key);permanent=PR.equipSkin(permanent,key,SKILLS);syncShopAppearance();window.ParryHeroPuppet?.preloadSkin?.(key);};
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
function checkpointContext(){return {skills:SKILLS,relics:RR.RELICS,encounters:P.findByKey,skins:PR.SKINS.map(s=>s.id)}}
function readCheckpoint(){try{return CP.validate(saves.readJson(CP.KEY).value,checkpointContext())}catch(e){return null}}
function checkpoint(){
 if(DEV_MODE||game.practice)return;
 const data=CP.capture(game,choiceSet);if(!data)return;
 const result=saves.writeCheckpoint(CP.KEY,data,{discardOnFailure:true});
 saveFailed=!result.ok;
 $('saveWarning').hidden=result.ok;
 pendingCheckpoint=result.ok?data:null;
}
function removeCheckpoint(){if(DEV_MODE)return;pendingCheckpoint=null;if(!saves.remove(CP.KEY).ok)saveFailed=true;}
function syncContinue(){
 pendingCheckpoint=DEV_MODE?null:readCheckpoint();
 $('continueBtn').hidden=!pendingCheckpoint;
 $('continueBtn').textContent=pendingCheckpoint?'つづきから · '+pendingCheckpoint.game.floor+'F →':'つづきから →';
 $('startBtn').textContent=pendingCheckpoint?'新しく挑戦する →':'塔に挑戦する →';$('startBtn').className=pendingCheckpoint?'secondary':'primary';
}
function requestStart(tutorial=false){
 pendingNewTutorial=tutorial;
 if(!DEV_MODE&&readCheckpoint()){setMode('confirm');return}
 startTutorialOrRun();
}
function startTutorialOrRun(){
 removeCheckpoint();start(false,null,{tutorial:pendingNewTutorial,skinEffects:true});
}
function configureSurvivalTrial(profile,polished){
 game.lv={blade:8,heal:6,blood:4,aegis:4,fury:3,thunder:4,echo:3,bloodlust:2};
 game.lifeBonus=120;game.rawMaxHp=runBaseHp()+PR.lifeVesselBonus(runBaseHp(),lvl('heal'));game.baseAtk=46;game.shield=0;
 game.bonuses={regen:0,revive:0,bossWard:0,soulGain:0,choice4:0,wardCapacity:0,wardInheritance:0,coinGain:0};
 game.relics=[];game.devSurvival=profile;
 if(['overflow','all'].includes(profile))game.relics.push('overflow_chalice');
 if(['sigil','all'].includes(profile))game.relics.push('unbroken_sigil');
 if(['wardcraft','all'].includes(profile))game.lv.wardcraft=3;
 if(['inheritance','all'].includes(profile))game.bonuses.wardInheritance=10;
 game.polishedRelics=polished?[...game.relics]:[];
 adjustRelicMaxHp();game.hp=game.maxHp;
}
function restoreCheckpoint(){
 if(DEV_MODE)return false;
 const saved=readCheckpoint();if(!saved){syncContinue();return false}
 cancelCalibration();stopScore();clearGuardInput();particles=[];texts=[];clashFX=null;
 game=saved.game;runLegacyVisual=game.legacyVisual;syncArtMode();choiceSet=saved.choices.map(id=>SK[id]);
 RunState.prepareRestore(game,performance.now());
 const mode=game.mode;
 if(mode==='combat')prepareEncounterArt(performance.now());
 setMode(mode);
 if(mode==='victory'){game.clearAt=performance.now();showRewards()}
 else if(mode==='reward')renderRewards();
 else if(mode==='relic')renderRelicReward();
 else if(mode==='route')showRoutes();
 else if(mode==='room')renderRoom();
 else if(mode==='routeSkill')renderEventSkillOffer();
 renderBuild();syncHUD();syncTutorial();return true;
}
function persistPreferences(){
 if(!saves.writeJson(PREF.KEY,preferences).ok)saveFailed=true;
 applyAudioPreferences();
}
function applyAudioPreferences(){
 audio.setMix({enabled:audioEnabled,bgm:preferences.bgm,sfx:preferences.sfx});
}
function openSettings(){
 if(['loading','phase','settings','confirm'].includes(game.mode)||deathInputBlocked())return;
 if(game.mode==='combat')togglePause();
 settingsReturn=game.mode;if(settingsReturn!=='pause')pauseAt=performance.now();setMode('settings');
 for(const kind of ['bgm','sfx']){$(kind+'Volume').value=String(preferences[kind]);$(kind+'VolumeValue').textContent=preferences[kind]+'%';}
 $('screenShake').checked=preferences.shake;$('screenFlash').checked=preferences.flash;
 $('saveStatus').textContent=DEV_MODE?'Devの変更は保存しません。':saveFailed?'このブラウザに保存できません。':readCheckpoint()?'中断データをこのブラウザに保存しています。':'進行はこのブラウザに自動保存します。';
}
function closeSettings(){cancelCalibration();setMode(settingsReturn);if(settingsReturn==='title')syncContinue();}
function cancelCalibration(){
 for(const node of calibrationNodes)try{node.stop()}catch(e){}calibrationNodes=[];calibration=null;
 $('calibrationTap').disabled=true;$('calibrationStart').disabled=false;
 for(const id of ['calibrationTry','calibrationApply','calibrationCancel'])$(id).hidden=true;
 $('calibrationPulse').style.transform='scale(1)';$('calibrationPulse').textContent='♫';
}
function calibrationTone(at,frequency=880){
 const ac=audio.context,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=frequency;
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.12,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+.07);
 o.connect(g);g.connect(effectDestination());o.start(at);o.stop(at+.08);calibrationNodes.push(o);
 o.onended=()=>{o.disconnect?.();g.disconnect?.();};
}
function startCalibration(){
 cancelCalibration();
 if(!audioEnabled||preferences.sfx===0){$('calibrationStatus').textContent='効果音の音量を上げて、SOUND ONで測ってください。';return}
 if(!audio.prepareScore()){$('calibrationStatus').textContent='音を再生できません。もう一度お試しください。';return}
 audioClock.reset();const start=audio.context.currentTime+1;
 calibration={kind:'measure',start,targets:Array.from({length:CALIBRATION_COUNT_IN+CALIBRATION_SAMPLES},(_,i)=>start+i*.5),used:new Set(),errors:[],result:null};
 for(const [i,t]of calibration.targets.entries())calibrationTone(t,i%4===0?1046:784);
 $('calibrationTap').disabled=true;$('calibrationStart').disabled=true;$('calibrationCancel').hidden=false;
 $('calibrationPulse').textContent='3';$('calibrationStatus').textContent='3 → 2 → 1 → GO';
}
function calibrationTap(){
 if(game.mode!=='settings'||!['measure','try'].includes(calibration?.kind))return;
 const now=performance.now(),c=calibration;
 if(c.kind==='measure'&&now<scoreToPerf(c.targets[CALIBRATION_COUNT_IN],0))return;
 let best=-1,error=Infinity;
 for(let i=c.kind==='measure'?CALIBRATION_COUNT_IN:0;i<c.targets.length;i++){const delta=now-scoreToPerf(c.targets[i],0);if(Math.abs(delta)<Math.abs(error)){best=i;error=delta}}
 if(best<0||Math.abs(error)>240||c.used.has(best))return;
 c.used.add(best);
 if(c.kind==='try'){
  const delta=error-c.result.candidate,kind=Math.abs(delta)<=getPerfectWindow()?'just':Math.abs(delta)<=getParryWindow()?'parry':'guard';
  $('calibrationStatus').textContent=(kind==='just'?'JUST!':kind==='parry'?'PARRY!':delta<0?'早め':'遅め')+' · '+Math.abs(Math.round(delta))+'ms（候補での試し打ち）';
  if(kind!=='guard')window.ParryCombatSfx?.play(audio.context,kind,audio.context.currentTime,steelDestination());
 }else{c.errors.push(error);$('calibrationStatus').textContent=c.errors.length+' / '+CALIBRATION_SAMPLES+' 回測定';}
}
function updateCalibration(){
 if(!calibration||game.mode!=='settings'||!audio.context)return;
 if(!readAudioClock().healthy){cancelCalibration();$('calibrationStatus').textContent='音声が止まったため測定を中断しました。もう一度測ってください。';return;}
 const c=calibration;if(c.kind==='result'){$('calibrationPulse').style.transform='scale(1)';return}const seconds=(performance.now()-scoreToPerf(c.start,0))/1000,beat=Math.floor(seconds/.5);
 $('calibrationPulse').style.transform='scale('+(seconds>=0?1+.18*Math.max(0,1-(seconds/.5-beat)*4):1)+')';
 if(c.kind==='measure'){
  const counting=beat<CALIBRATION_COUNT_IN;
  $('calibrationPulse').textContent=counting?['3','2','1','GO'][Math.max(0,beat)]:'♫';
  $('calibrationTap').disabled=counting;
  if(!counting&&!c.ready){c.ready=true;$('calibrationStatus').textContent=c.errors.length+' / '+CALIBRATION_SAMPLES+' 回測定';$('calibrationTap').focus?.();}
 }
 if(c.kind==='measure'&&performance.now()>scoreToPerf(c.targets.at(-1),0)+300){
  c.kind='result';c.result=PREF.recommend(c.errors);$('calibrationTap').disabled=true;$('calibrationStart').disabled=false;
  $('calibrationStatus').textContent=c.result?'おすすめ '+(c.result.candidate>=0?'+':'')+c.result.candidate+'ms · '+c.result.count+'回の入力から測定'+(c.result.clamped?'（調整範囲の上限・下限に合わせています）':''):'入力が少ないか、ばらつきが大きいため測れませんでした。もう一度試してください。';
  $('calibrationTry').hidden=!c.result;$('calibrationApply').hidden=!c.result;
 }else if(c.kind==='try'&&audio.context.currentTime>c.start+3.6){c.kind='result';$('calibrationStart').disabled=false;$('calibrationTap').disabled=true;}
}
function tryCalibration(){
 if(!calibration?.result||!audio.prepareScore())return;
 const result=calibration.result;cancelCalibration();
 audioClock.reset();const start=audio.context.currentTime+.5;
 calibration={kind:'try',start,result,targets:Array.from({length:6},(_,i)=>start+i*.5),used:new Set()};
 for(const at of calibration.targets)calibrationTone(at,784);
 $('calibrationTap').disabled=false;
 $('calibrationStatus').textContent='候補の補正で拍に合わせて試し打ち。保存するまで今の補正は変わりません。';$('calibrationTap').focus?.();
 $('calibrationTry').hidden=false;$('calibrationApply').hidden=false;$('calibrationCancel').hidden=false;
}
function syncTutorial(){
 const active=!!game.tutorial&&game.floor===1&&['combat','loading','pause'].includes(game.mode);
 $('tutorialGuide').hidden=!active;if(!active)return;
 const step=game.tutorialStep||0;
 const rows=[['まずはガード','画面を押したまま、敵の攻撃を盾で受けよう。'],['次はパリィ','敵が来る拍に合わせて短く押す。盾を戻してから、もう一度。'],['ぴったりならジャスト！','光と音が変わったら大成功。ジャストは必須ではないよ。倒したら2Fへ！']];
 $('tutorialTitle').textContent=rows[Math.min(2,step)][0];$('tutorialText').textContent=rows[Math.min(2,step)][1];$('tutorialNext').hidden=step!==2||game.tutorialFinishing;
}
function tutorialResult(kind){
 if(!game.tutorial||game.floor!==1)return;
 if(!game.tutorialStep&&kind==='guard')game.tutorialStep=1;
 else if(game.tutorialStep===1&&['just','parry'].includes(kind))game.tutorialStep=2;
 else if(game.tutorialStep>=2&&['just','parry'].includes(kind))game.tutorialFinishing=true;
 syncTutorial();
}
function title(){attackPresentation.contact=null;runLegacyVisual=null;syncArtMode();stopScore();devMusicAudition=false;devMusicTheme='auto';clashFX=null;game={mode:'title',floor:1,maxHp:65,hp:65,shield:0,lv:{},relics:[],towerCoins:0,combo:0,perfects:0,damage:0,charge:0};setMode('title');$('titleRecords').innerHTML=records().replace(/<span>[^<]*<\/span>/,'');syncContinue();syncHUD();renderBuild();}
function start(practice=false,practiceKey=null,devOptions=null){
 const runSkin=DEV_MODE?devPreviewSkin:permanent.equippedSkin,runEffects=DEV_MODE?!!devOptions?.skinEffects:true;
 if(DEV_MODE){if(score.active&&(devMusicAudition||score.music!=='crypt'))stopScore();devMusicAudition=false;devMusicTheme=MUSIC?.get(devOptions?.musicId)?devOptions.musicId:'auto';}
 if(practice&&((!book.seen[practiceKey]&&!(DEV_MODE&&devOptions?.allowUnseenPractice))||!P.findByKey(practiceKey)))return;
 if(practice)populatePracticeEnemies(practiceKey,DEV_MODE&&devOptions?.allowUnseenPractice);
 const initialLevels=practice?{}:PR.initialLevels(permanent,SKILLS);
 const sealedSkillIds=practice?[]:PR.activeSeals(permanent,SKILLS);
 const bonuses=Object.fromEntries(
  ['soulGain','bossWard','regen','revive','choice4','wardCapacity','wardInheritance','coinGain']
   .map(id=>[id,PR.value(permanent,id)])
 );
 const t=performance.now();
 particles=[];texts=[];clashFX=null;
 game=RunState.create({
  practice,practiceKey,skin:runSkin,skinEffects:runEffects,
  floor:DEV_MODE&&devOptions?.floor?Math.min(999,Math.max(1,Math.floor(Number(devOptions.floor)))):1,
  devOverride:DEV_MODE?devOptions?.enemyKey||null:null,
  initialLevels,sealedSkillIds,
  lifeBonus:PR.baseValue(meta,'life'),
  initialShield:PR.baseValue(meta,'ward'),
  baseAtk:25+PR.baseValue(meta,'attack'),
  extraRerolls:practice?0:PR.value(permanent,'extraReroll'),
  bonuses,legacyVisual:PR.extraEnabled(permanent,'legacyVisual'),tutorial:!!devOptions?.tutorial
 },t);
 runLegacyVisual=game.legacyVisual;
 syncArtMode();
 if(DEV_MODE&&devOptions?.tempoLevel!=null){
  const level=Math.min(6,Math.max(0,Math.floor(Number(devOptions.tempoLevel)||0)));
  if(level)game.lv.tempo=level;else delete game.lv.tempo;
  if(level>4)game.skillBreaks.tempo=level-4;else delete game.skillBreaks.tempo;
 }
 if(DEV_MODE&&devOptions?.survival)configureSurvivalTrial(devOptions.survival,devOptions.polished);
 if(DEV_MODE&&devOptions?.merchant){
  stopScore();game.sealedSkillIds=[];
  const levels=devOptions.merchant==='capped'?{blade:20,focus:6,stability:6,frost:6,double:5}:{blade:3,focus:2,heal:3,thunder:2};
  game.lv={...levels};game.rawMaxHp=runBaseHp()+PR.lifeVesselBonus(runBaseHp(),lvl('heal'));adjustRelicMaxHp();game.hp=game.maxHp;
  game.relics=['rusty_crest','emperor_conduit','duet_mask'];game.towerCoins=150;game.floor=14;showRoutes();selectRoute('merchant');
 }else enterFloor(t);
 syncHUD();renderBuild();sound(270,.20,'triangle',.07,160);
}
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
 game.justStreak=0;game.relicJustStreak=0;
}
function selectRoute(id){
 if(game.mode!=='route'||!RT.options(game.floor).some(r=>r.id===id))return;
 game.currentRoom=id;game.merchantBought=[];
 if(id==='trial'){
  game.combo=(game.combo||0)+3;game.peakCombo=Math.max(game.peakCombo||0,game.combo);
  game.routeTrial=true;spawnEnemy(performance.now());setMode('combat');syncHUD();return;
 }
 resetNoncombatCombo();
 const ev=id==='event'?EV.randomEvent(Math.random,game.lastEventId):null;
 game.roomLocked=false;game.roomStage=null;game.roomResult='';game.eventId=ev?ev.id:null;
 if(ev)game.lastEventId=ev.id;
 setMode('room');renderRoom();syncHUD();
}
function roomActionButton(id,label,detail='',disabled=false){
 return `<button type="button" class="room-choice" data-room-action="${id}" ${disabled?'disabled':''}>
  <span><b>${label}</b>${detail?`<small>${detail}</small>`:''}</span><span aria-hidden="true">›</span></button>`;
}
function renderRoom(){
 if(game.mode!=='room')return;
 checkpoint();
 const modal=$('roomActions').parentElement;if(modal)modal.scrollTop=0;
 const id=game.currentRoom,room=RT.ROOMS[id],event=id==='event'?EV.BY_ID[game.eventId]:null;
 if(!room||id==='trial'||(id==='event'&&!event))return;
 $('roomKicker').textContent=id==='event'?'MYSTERIOUS ENCOUNTER':id==='merchant'?'TRAVELLING MERCHANT':'A MOMENT OF RESPITE';
 $('roomIcon').textContent=event?.icon||room.icon;
 $('roomTitle').textContent=event?.name||room.name;
 $('roomDescription').hidden=false;
 $('roomDescription').textContent=event?.description||room.desc;
 $('roomNote').textContent='🪙 塔貨 '+game.towerCoins+'　♡ '+Math.ceil(game.hp)+' / '+game.maxHp+'　🛡 '+Math.ceil(game.shield);
 if(game.roomStage==='result'){
  $('roomDescription').textContent=game.roomResult;
  if(id==='merchant'&&!game.roomLocked){
   const bought=game.merchantBought||[];
   $('roomActions').innerHTML=roomActionButton('continue','次の階へ進む')+EV.ITEMS.map(item=>{
    const already=bought.includes(item.id),exhausted=!merchantAvailable(item.id);
    return roomActionButton('buy:'+item.id,item.icon+' '+item.name+' · '+item.cost+' 🪙',item.desc+(already?' · 購入済':exhausted?' · 対象なし':''),already||game.towerCoins<item.cost||exhausted);
   }).join('');
   return;
  }
  $('roomActions').innerHTML=roomActionButton('continue','次の階へ進む');
  return;
 }
 if(id==='merchant'&&game.roomStage?.startsWith('target:')){
  const itemId=game.roomStage.slice(7),item=EV.ITEMS_BY_ID[itemId];
  $('roomTitle').textContent=item.name;
  $('roomDescription').textContent=item.cost+' 🪙';
  $('roomActions').innerHTML=merchantTargets(itemId).map(target=>{
   if(itemId==='polish'){const r=RR.BY_ID[target];return roomActionButton('target:'+target,r.icon+' '+r.name,(r.desc+relicScaledSuffix(target,false))+' → '+(r.polishedDesc+relicScaledSuffix(target,true)),game.towerCoins<item.cost)}
   const skill=SK[target],cap=skillCap(target),next=cap+(itemId==='breakthrough'?1:0);
   return roomActionButton('target:'+target,skill.icon+' '+skill.name+' Lv.'+lvl(target)+' → '+(lvl(target)+1),
    describeSkill(skill.id,lvl(target))+' → '+describeSkill(skill.id,lvl(target)+1)+' / 上限 '+cap+' → '+next+
    (itemId==='breakthrough'?'（限界突破 '+((game.skillBreaks[target]||0)+1)+'/2）':''),game.towerCoins<item.cost);
  }).join('')+roomActionButton('back','← 商品一覧に戻る');
  return;
 }
 if(id==='event'&&game.roomStage==='target:sanctuary_train'){
  $('roomTitle').textContent='共鳴の聖堂 — スキル強化';
  $('roomDescription').hidden=true;
  $('roomActions').innerHTML=merchantTargets('training').map(target=>{
   const skill=SK[target];
   return roomActionButton('target:'+target,skill.icon+' '+skill.name+' Lv.'+lvl(target)+' → '+(lvl(target)+1),describeSkill(skill.id,lvl(target))+' → '+describeSkill(skill.id,lvl(target)+1));
  }).join('')+roomActionButton('back','← 聖堂の選択に戻る');
  return;
 }
 if(id==='event'&&game.roomStage==='target:forge_polish'){
  $('roomTitle').textContent='古の金床 — 遺物研磨';
  $('roomDescription').hidden=true;
  $('roomActions').innerHTML=merchantTargets('polish').map(target=>{
   const r=RR.BY_ID[target];
   return roomActionButton('target:'+target,r.icon+' '+r.name,(r.desc+relicScaledSuffix(target,false))+' → '+(r.polishedDesc+relicScaledSuffix(target,true)));
  }).join('')+roomActionButton('back','← 金床の選択に戻る');
  return;
 }
 if(id==='rest'){
  $('roomActions').innerHTML=[
   roomActionButton('rest:heal','🔥 休息','最大HPの35%を回復'),
   roomActionButton('rest:meditate','🛡 瞑想','障壁+20、スキル報酬の引き直し+1')
  ].join('');
 }else if(id==='merchant'){
  const bought=game.merchantBought||[];
  $('roomActions').innerHTML=EV.ITEMS.map(item=>{
   const already=bought.includes(item.id),exhausted=!merchantAvailable(item.id);
   return roomActionButton('buy:'+item.id,item.icon+' '+item.name+' · '+item.cost+' 🪙',item.desc+(already?' · 購入済':exhausted?' · 対象なし':''),already||game.towerCoins<item.cost||exhausted);
  }).join('')+roomActionButton('leave','購入せず先へ進む');
 }else if(id==='event'&&game.roomStage==='mirror'){
  $('roomDescription').textContent='交換が確定するまで、元の遺物は失われません。';
  $('roomActions').innerHTML=game.relics.map(id=>{
   const relic=ownedRelic(id);return roomActionButton('mirror:'+id,relic.icon+' '+relic.name,relic.desc);
  }).join('')+roomActionButton('back','鏡の前に戻る');
 }else if(id==='event'){
  const options=event.actions.map(item=>{
   let disabled=false,description='';
   if(event.id==='altar'&&item.id==='sacrifice'){
    const cost=EV.altarCost(game.maxHp);
    disabled=!EV.canSacrifice(game.hp,game.maxHp)||availableSkills().length===0;
    description='HP-'+cost+'。イベントの支払いは被弾扱いになりません。';
   }
   if(event.id==='mirror'&&item.id==='swap'){
    disabled=!game.relics.length||!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary');
    description='所持遺物1つを選び、風化・秘宝から3択。';
   }
   if(event.id==='chest'&&item.id==='open')description=RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary')?'失敗してもHP1で生存。':'めぼしい遺物は残っていないようだ（当選時は塔貨+'+towerCoinReward(25)+'・引き直し+1）。失敗してもHP1で生存。';
   if(event.id==='sanctuary'&&item.id==='resonate'){
    disabled=availableSkills().length===0;
    description='共鳴相方のスキルを引き当てて1つ習得。';
   }
   if(event.id==='sanctuary'&&item.id==='train'){
    disabled=merchantTargets('training').length===0;
    description='習得済みスキル1つをLv.+1。';
   }
   if(event.id==='sanctuary'&&item.id==='pray')description='最大HPの25%を回復。';
   if(event.id==='forge'&&item.id==='polish'){
    disabled=merchantTargets('polish').length===0;
    description='未研磨の所持遺物1つを研磨（✦）。';
   }
   if(event.id==='forge'&&item.id==='temper'){
    disabled=game.towerCoins<15;
    description='塔貨15枚を消費し、この挑戦の基礎攻撃力+3・障壁+15。';
   }
   if(event.id==='forge'&&item.id==='scrap')description='塔貨+'+towerCoinReward(14)+'。';
   if(event.id==='scales'&&item.id==='toSouls'){
    disabled=game.towerCoins<16;
    description='塔貨16枚を消費し、魂の欠片+'+soulReward(20)+' ✧を得る。';
   }
   if(event.id==='scales'&&item.id==='toCoins'){
    disabled=game.hp<=1;
    description='現在HPの20%（死亡しない）を払い、塔貨+'+towerCoinReward(24)+'・引き直し+1。';
   }
   if(event.id==='scales'&&item.id==='leave')description='障壁+10を得て先へ進む。';
   const label=item.label.replace(/塔貨\+(\d+)/g,(_,raw)=>'塔貨+'+towerCoinReward(Number(raw)));
   return roomActionButton('event:'+item.id,label,description,disabled);
  });
  $('roomActions').innerHTML=options.join('');
 }
}
function showRoomResult(text,keepMerchantOpen=false){
 game.roomLocked=!keepMerchantOpen;game.roomStage='result';game.roomResult=text;renderRoom();syncHUD();
}
function finishNoncombatRoom(){
 if(!['room','routeSkill','relic'].includes(game.mode))return;
 game.roomLocked=true;game.relicReturn=null;game.relicMirrorTarget=null;game.routeSkillSet=[];
 advance();
}
function resonancePool(){
 const avail=availableSkills();
 const partners=avail.filter(s=>lvl(s.id)===0&&SYNERGIES.some(syn=>(syn.a===s.id&&lvl(syn.b)>0)||(syn.b===s.id&&lvl(syn.a)>0)));
 const count=Math.min(runBonus('choice4')||3,avail.length);
 const rarityWeight={common:5.4,rare:2.9,epic:1.05};
 const pool=[...partners],picked=[];
 while(picked.length<count&&pool.length){
  const weights=pool.map(s=>(rarityWeight[s.rarity]??rarityWeight.common)*(lvl(s.id)?1.17:1));
  let r=Math.random()*weights.reduce((a,b)=>a+b,0),idx=0;
  for(;idx<weights.length-1;idx++){r-=weights[idx];if(r<=0)break;}
  picked.push(pool.splice(idx,1)[0]);
 }
 if(picked.length<count){
  for(const r of choosePool()){if(picked.length>=count)break;if(!picked.some(p=>p.id===r.id))picked.push(r);}
 }
 return picked;
}
function eventSkillOffer(title,customPool=null){
 const pool=customPool&&customPool.length?customPool:choosePool();if(!pool.length)return false;
 game.routeSkillSet=pool.map(skill=>skill.id);
 game.routeSkillTitle=title;
 setMode('routeSkill');
 renderEventSkillOffer();return true;
}
function skillCardMeta(s){
 const cur=lvl(s.id),next=cur+1;
 const diffHtml=cur>0?`<span class="levelup-diff">Lv.${cur} → Lv.${next}（現在：${describeSkill(s.id,cur)}）</span>`:'';
 const readySynergies=cur===0?SYNERGIES.filter(syn=>(syn.a===s.id&&lvl(syn.b)>0)||(syn.b===s.id&&lvl(syn.a)>0)):[];
 const synHtml=readySynergies.length?'<span class="synergy-ready-badge">✦ 共鳴解放可能！</span>':'';
 return {diffHtml,synHtml};
}
function renderEventSkillOffer(){
 const pool=game.routeSkillSet.map(id=>SK[id]);
 $('routeSkillTitle').textContent=game.routeSkillTitle||'スキルをひとつ選べ';
 $('routeSkillCards').innerHTML=pool.map(skill=>{const meta=skillCardMeta(skill);return `<button class="reward-card ${skill.rarity}" type="button" data-route-skill="${skill.id}">
 <span class="rarity">${skill.rarity.toUpperCase()} · ${lvl(skill.id)?'LEVEL UP':'NEW SKILL'}</span>
 <span class="emoji">${skill.icon}</span><span class="rname">${skill.name} <small>Lv.${lvl(skill.id)+1}</small></span>
 <span class="rdesc">${describeSkill(skill.id,lvl(skill.id)+1)}</span>${meta.diffHtml}${meta.synHtml}</button>`}).join('');
 return true;
}
function takeEventSkill(id){
 if(game.mode!=='routeSkill'||!game.routeSkillSet.includes(id)||!SK[id]||lvl(id)>=skillCap(id))return;
 game.routeSkillSet=[];gainSkillLevel(id);sound(800,.18,'triangle',.05,130);
 if(game.currentRoom==='merchant'){
  renderBuild();setMode('room');showRoomResult(SK[id].name+'がLv.'+lvl(id)+'になった！',true);return;
 }
 finishNoncombatRoom();
}
function roomAction(action){
 if(game.mode!=='room')return;
 if(game.roomStage==='result'){
  if(action==='continue'){finishNoncombatRoom();return;}
  if(game.currentRoom!=='merchant'||game.roomLocked||!action.startsWith('buy:'))return;
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
  if(!game.merchantBought)game.merchantBought=[];
  if(game.roomStage?.startsWith('target:')){
   if(action==='back'){game.roomStage=game.merchantBought.length?'result':null;renderRoom();return}
   if(!action.startsWith('target:'))return;
   const itemId=game.roomStage.slice(7),item=EV.ITEMS_BY_ID[itemId],target=action.slice(7);
   if(!item||game.merchantBought.includes(itemId)||game.towerCoins<item.cost||!merchantTargets(itemId).includes(target))return;
   game.towerCoins-=item.cost;game.merchantBought.push(itemId);
   if(itemId==='polish')game.polishedRelics.push(target);
   else{
    if(itemId==='breakthrough')game.skillBreaks[target]=(game.skillBreaks[target]||0)+1;
    gainSkillLevel(target);
   }
   renderBuild();
   const name=itemId==='polish'?RR.BY_ID[target].name:SK[target].name;
   showRoomResult(name+(itemId==='polish'?'を研磨した！':('がLv.'+lvl(target)+'になった！')),true);
   return;
  }
  if(action==='leave'){showRoomResult('商人に礼を告げ、塔貨を温存した。');return;}
  if(!action.startsWith('buy:'))return;
  const item=EV.ITEMS_BY_ID[action.slice(4)];
  if(!item||game.merchantBought.includes(item.id)||game.towerCoins<item.cost)return;
  if(!merchantAvailable(item.id))return;
  if(['training','breakthrough','polish'].includes(item.id)){game.roomStage='target:'+item.id;renderRoom();return}
  game.towerCoins-=item.cost;game.merchantBought.push(item.id);syncHUD();
  if(item.id==='elixir'){const old=game.charge;game.charge=Math.min(7,old+3);showRoomResult('奥義ゲージ '+old+' → '+game.charge+' / 7。次のパリィで力を解き放て！',true);}
  else if(item.id==='reroll'){game.rerolls++;showRoomResult('運命の札を購入した。引き直し+1。',true);}
  else if(item.id==='barrier'){
   const prev=game.shield;relicShield(20);
   showRoomResult('結界の護符で障壁+'+Math.round(game.shield-prev)+'。',true);
  }else if(item.id==='skill'){game.roomLocked=true;eventSkillOffer('秘伝の巻物 — スキルをひとつ選べ');}
  else if(item.id==='relic'){
   game.roomLocked=true;game.relicReturn='room';showRelicRewards('special');
  }
  return;
 }
 if(game.currentRoom!=='event'||!EV.BY_ID[game.eventId])return;
 if(action==='back'&&['mirror','target:sanctuary_train','target:forge_polish'].includes(game.roomStage)){game.roomStage=null;renderRoom();return;}
 if(game.roomStage==='mirror'){
  if(!action.startsWith('mirror:'))return;
  const relicId=action.slice(7);
  if(!game.relics.includes(relicId))return;
  game.relicMirrorTarget=relicId;game.relicReturn='mirror';game.roomLocked=true;showRelicRewards('special');
  return;
 }
 if(game.roomStage==='target:sanctuary_train'){
  if(!action.startsWith('target:'))return;
  const target=action.slice(7);
  if(!merchantTargets('training').includes(target))return;
  gainSkillLevel(target);renderBuild();
  showRoomResult(SK[target].name+'がLv.'+lvl(target)+'に強化された！');
  return;
 }
 if(game.roomStage==='target:forge_polish'){
  if(!action.startsWith('target:'))return;
  const target=action.slice(7);
  if(!merchantTargets('polish').includes(target))return;
  game.polishedRelics.push(target);renderBuild();
  showRoomResult(RR.BY_ID[target].name+'を研磨した！');
  return;
 }
 if(!action.startsWith('event:'))return;
 const event=EV.BY_ID[game.eventId],opt=action.slice(6);
 if(!event.actions.some(x=>x.id===opt))return;
 if(event.id==='altar'){
  if(opt==='sacrifice'){
   if(!EV.canSacrifice(game.hp,game.maxHp)||!availableSkills().length)return;
   game.hp-=EV.altarCost(game.maxHp);game.roomLocked=true;syncHUD();
   eventSkillOffer('血の祭壇 — スキルをひとつ選べ');
  }else if(opt==='ward'){const old=game.shield;relicShield(12);showRoomResult('祭壇が障壁+'+Math.round(game.shield-old)+'を授けた。');}
 }else if(event.id==='mirror'){
  if(opt==='coins'){const gained=awardTowerCoins(12);showRoomResult('鏡を背にし、塔貨'+gained+'枚を手に入れた。');}
  else if(opt==='swap'){
   if(!game.relics.length||!RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary'))return;
   game.roomStage='mirror';renderRoom();
  }
 }else if(event.id==='traveler'){
  if(opt==='coins'){const gained=awardTowerCoins(18);showRoomResult('旅人の遺品から塔貨'+gained+'枚を手に入れた。');}
  else if(opt==='ward'){const old=game.shield;relicShield(10);game.rerolls++;showRoomResult('障壁+'+Math.round(game.shield-old)+'、引き直し+1を得た。');}
 }else if(event.id==='chest'){
  if(opt==='coins'){const gained=awardTowerCoins(10);showRoomResult('宝箱は開けず、塔貨'+gained+'枚を拾った。');}
  else if(opt==='open'){
   game.roomLocked=true;
   if(Math.random()<.4){
    if(RR.available(game.relics,game.relicDiscarded).some(r=>r.rarity!=='legendary')){
     game.relicReturn='room';showRelicRewards('special');
    }else{
     const gained=awardTowerCoins(25);game.rerolls++;
     showRoomResult('めぼしい遺物は残っていないようだ。塔貨+'+gained+'・引き直し+1を得た。');
    }
   }else{
    const lost=EV.chestDamage(game.hp,game.maxHp);
    game.hp-=lost;showRoomResult('宝箱の罠が発動！ HPを'+Math.round(lost)+'失った（死亡しない）。');
   }
  }
 }else if(event.id==='sanctuary'){
  if(opt==='resonate'){
   if(!availableSkills().length)return;
   game.roomLocked=true;eventSkillOffer('共鳴の聖堂 — スキルをひとつ選べ',resonancePool());
  }else if(opt==='train'){
   if(!merchantTargets('training').length)return;
   game.roomStage='target:sanctuary_train';renderRoom();
  }else if(opt==='pray'){
   const rec=heal(Math.round(game.maxHp*.25));
   showRoomResult('聖堂で祈りを捧げ、HPを'+Math.round(rec)+'回復した。');
  }
 }else if(event.id==='forge'){
  if(opt==='polish'){
   if(!merchantTargets('polish').length)return;
   game.roomStage='target:forge_polish';renderRoom();
  }else if(opt==='temper'){
   if(game.towerCoins<15)return;
   game.towerCoins-=15;game.baseAtk+=3;
   const before=game.shield;relicShield(15);
   showRoomResult('武具を打ち直し、基礎攻撃力+3、障壁+'+Math.round(game.shield-before)+'を得た。');
  }else if(opt==='scrap'){
   const gained=awardTowerCoins(14);
   showRoomResult('金床の鉄屑から塔貨'+gained+'枚を得た。');
  }
 }else if(event.id==='scales'){
  if(opt==='toSouls'){
   if(game.towerCoins<16)return;
   const gain=soulReward(20);
   game.towerCoins-=16;meta.coins+=gain;game.bonusSouls+=gain;save();
   showRoomResult('祭器に塔貨を捧げ、魂の欠片+'+gain+' ✧を得た。');
  }else if(opt==='toCoins'){
   if(game.hp<=1)return;
   const cost=Math.min(game.hp-1,Math.max(1,Math.ceil(game.hp*.2)));
   game.hp-=cost;const gained=awardTowerCoins(24);game.rerolls++;
   showRoomResult('血の捧げ物（HP-'+cost+'）を捧げ、塔貨'+gained+'枚と引き直し+1を得た。');
  }else if(opt==='leave'){
   const before=game.shield;relicShield(10);
   showRoomResult('祭器に触れず先へ進み、障壁+'+Math.round(game.shield-before)+'を得た。');
  }
 }
}
function spawnEnemy(t){
 clashFX=null;
 game.relicRustyUsed=false;game.relicStardustUsed=false;game.relicStopUsed=0;game.relicPactConsumed=false;game.relicBulwarkUsed=false;
 const floor=game.floor||1;
 let archetype;
 if(game.practice){
  const key=game.practiceKey||$('practiceEnemy').value;
  if(!DEV_MODE&&!book.seen[key]){title();return}
  archetype=P.findByKey(key);
 }else if(game.tutorial){archetype=P.findByKey('slime:normal');
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
 clearGuardInput();RunState.resetParryInput(game);
 if(!game.practice&&!archetype.preview){
  game.lastDiscovered=P.recordEncounter(book,archetype,floor);
  saveBook();
 }
 const stats=P.baseStats(archetype,floor,game.practice);
 const maxHp=game.practice?999999:stats.maxHp;
 game.enemy={...archetype,name:archetype.displayName,maxHp,hp:maxHp,atk:stats.atk,burn:0,index:0,phase:1};
 game.phaseStage=null;game.phaseStartedAt=0;game.phaseCountStartAt=0;
 if(archetype.boss&&!game.practice)game.shield+=runBonus('bossWard');
 if(!game.practice&&!game.tutorial){
  const minimum=Math.ceil(game.maxHp*runBonus('wardInheritance')/100);
  addShield(Math.max(0,minimum-game.shield));
 }
 game.skinTempoOffset=runSkinRules().randomTempo?[12,0,-12][Math.min(2,Math.floor(Math.random()*3))]:0;
 game.tempoBpmReduction=tempoReduction(lvl('tempo'));
 prepareEncounterArt(t);syncHUD();
}
function prepareEncounterArt(t){
 game.artLoading=false;game.artFallback=false;
 const skinReady=!window.ParryHeroPuppet?.skinReady||window.ParryHeroPuppet.skinReady(visualSkin());
 if(useIllustratedArt()&&KNIGHT_PUPPET&&(!KNIGHT_PUPPET.readyFor(game.enemy)||!skinReady)){
  const run=game,encounter=game.enemy;game.artLoading=true;stopScore();setMode('loading');
  // Resume from a fresh beat origin only after both characters can be drawn.
  // A later completion cannot restart a run the player has left or replaced.
  const finish=ok=>{
   if(game!==run||game.enemy!==encounter||game.mode!=='loading')return;
   game.artLoading=false;game.artFallback=!ok;beginEncounter(performance.now());setMode('combat');
  };
  Promise.resolve().then(()=>Promise.all([KNIGHT_PUPPET.preload(encounter),
   window.ParryHeroPuppet?.preloadSkin?.(visualSkin())??true])).then(results=>finish(results.every(Boolean)),()=>finish(false));
 }else beginEncounter(t);
 syncHUD();
}
function beginEncounter(t){
 const archetype=game.enemy,floor=game.floor||1;
 startScore(game.enemy);
 if(runSkinRules().randomTempo)showText(game.skinTempoOffset>0?'時空加速 ＋12':game.skinTempoOffset<0?'時空減速 −12':'時空安定 ±0',w*.5,h*.3,'#d9bcff',18);
 if(archetype.rare&&!game.practice){sound(890,.20,'sine',.08,-180);showText('✦ RARE ENCOUNTER ✦',w*.50,h*.20,'#f6d58b',20)}
 attackPresentation.opening=true;game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.attackAt=t+game.attackSpan+170+contactDelay();game.telegraphStart=t;
 game.attackResolved=false;game.guardAtImpact=null;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;
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
 const beats=e.rhythm[e.index%e.rhythm.length];e.index++;attackPresentation.opening=false;game.attackBeat+=beats;game.attackSpan=beats*score.beat*1000;syncAttackClock();game.attackResolved=false;game.guardAtImpact=null;game.cuePlayed=false;game.windupPlayed=false;game.pendingKind=null;game.inputLocked=false;game.lastAttemptDelta=null}
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
 game.phaseCountStartAt=score.active?scoreToPerf(score.origin):performance.now()+170;
 if(score.active){
  // Four low drum strokes on the same AudioContext clock; only the first is accented.
  const ac=audio.context;
  for(let i=0;i<FINAL_PHASE_COUNT_BEATS;i++){
   const t=score.origin+i*score.beat;
   if(audioEnabled)MUSIC?.playCountIn(ac,score.bus,score.noise,t,i===0);
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
 attackPresentation.opening=true;game.attackBeat=FINAL_PHASE_COUNT_BEATS*2;
 game.attackSpan=FINAL_PHASE_COUNT_BEATS*beatMs;
 if(score.active)syncAttackClock();
 else{game.attackAt=now+game.attackSpan;game.telegraphStart=now;}
 game.attackResolved=false;game.guardAtImpact=null;game.cuePlayed=false;game.windupPlayed=false;
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
// Settle once, including the killing blow, before floor progression changes state.
function finishParryRecovery(){
 if(!game.parryRecoveryActive)return;
 CombatHealth.finishParryRecovery(game,{
  bloodLevel:lvl('blood'),bloodSynergy:has('blood','fury'),
  bloodlustLevel:lvl('bloodlust'),bloodlustSynergy:has('bloodlust','blood'),
  bellOwned:hasRelic('pilgrim_bell'),bellAmount:Math.round(relicPower('pilgrim_bell')*hpSkillScale()),
  pactOwned:hasRelic('blood_pact_chalice'),pactAmount:Math.round(relicPower('blood_pact_chalice')*hpSkillScale())
 },heal);
}
function damageEnemy(n,color='#fff',label){
 const e=game.enemy;if(!e||e.hp<=0)return;
 if(hasRelic('emperor_conduit')&&['⚡','雷鳴','雷霆','過充電','雷導','雷帝'].includes(label))n*=1+relicPower('emperor_conduit');
 const phaseFloor=e.finalBoss&&e.phase===1&&e.phaseRhythm?Math.max(1,Math.floor(e.maxHp*.5)):(game.tutorial&&!game.tutorialFinishing?1:0);
 const damage=Math.max(1,Math.round(n)),dealt=Math.min(Math.max(0,e.hp-phaseFloor),damage);
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
function heal(n,recovery=null){
 const overflow=recovery&&hasRelic('overflow_chalice')?{
  ratio:relicPower('overflow_chalice'),budgetRatio:relicPower('overflow_chalice',true),
  polished:relicPolished('overflow_chalice')
 }:null;
 return CombatHealth.heal(game,n,{cap:shieldCap(),overflow},recovery,{
  hp:restored=>showText('+'+Math.round(restored),w*.27,h*.47,'#8aefbd',18),
  shield:added=>showText('障壁 +'+added,w*.27,h*.40,'#c4b4ff',15)
 });
}
function getAttackMultiplier(){
 return CombatMath.attackMultiplier({
  bladeLevel:lvl('blade'),furyLevel:lvl('fury'),gambleLevel:lvl('gamble'),executeLevel:lvl('execute'),
  combo:game.combo,hp:game.hp,maxHp:game.maxHp,enemyHp:game.enemy?.hp,enemyMaxHp:game.enemy?.maxHp
 });
}
function strikeResult(kind,at,effectAt=at){tutorialResult(kind);const e=game.enemy;if(!e||game.mode!=='combat')return;game.lastInputTargetAt=inputTargetAt();game.attackResolved=true;game.lastImpactAt=at;game.lastStrikeKind=kind;if(splitContact()&&attackPresentation.contact?.key===score.theme+':'+game.attackBeat)attackPresentation.contact.result=kind;musicParry(kind);game.lateReported=false;game.lastHitAt=effectAt;triggerClashFX(kind,splitContact()?(attackPresentation.contact?.at??at):effectAt,e.kind);if(splitContact()&&effectAt>at+1)clashFX.noFreeze=true;if(game.practice){if(kind==='miss')feedback(game.lastAttemptDelta===null?'入力なし':((game.lastAttemptDelta<0?'早い ':'遅い ')+Math.abs(Math.round(game.lastAttemptDelta))+'ms'),'#f7ca8e');else feedback(kind==='just'?'JUST!':kind==='parry'?'PARRY!':'GUARD',kind==='just'?'#84effa':'#ecd3a1');}const perfect=kind==='just';if(runSkinRules().suddenDeath&&!game.practice&&!game.tutorial&&['guard','miss'].includes(kind)){game.combo=0;game.charge=0;game.justStreak=0;game.relicJustStreak=0;game[kind==='guard'?'guards':'misses']++;game.lastDamageAt=effectAt;game.hp=0;game.shield=0;feedback('一撃で決着！','#ff9292');die();syncHUD();return;}if(kind==='guard'){
  game.relicJustStreak=0;game.justStreak=0;
  if(hasRelic('stopped_hand')&&game.relicStopUsed<relicPower('stopped_hand')){
   game.relicStopUsed++;showText('秒針停止!',w*.35,h*.31,'#dac8ff',17);
  }else game.combo=guardComboAfterHit(game.combo);
  game.guards++;
  if(!lvl('aegis'))game.charge=0;
  applyDamage(Math.min(e.atk*GUARD_DAMAGE_RATIO,game.maxHp*GUARD_MAX_HP_RATIO),'GUARD');
  if(game.mode!=='combat')return;
  if(lvl('thorns')){let reflect=e.atk*(.30+lvl('thorns')*.18)*skillAtkScale();if(has('aegis','thorns'))reflect+=game.shield*.4;damageEnemy(reflect,'#dbb7ff','反射');if(game.mode!=='combat')return;}feedback('GUARD','#f6c473');
}else if(kind==='miss'){
  game.lastTimingDeltaMs=game.lastAttemptDelta===null?null:Math.round(game.lastAttemptDelta);game.lastTimingKind='miss';
  game.relicJustStreak=0;game.justStreak=0;game.combo=0;game.misses++;game.charge=0;game.lastDamageAt=effectAt;applyDamage(e.atk,'MISS');if(game.mode!=='combat')return;if(!game.practice)feedback('HIT!','#ff8295');if(!splitContact())sound(145,.21,'sawtooth',.045,-85);shake=12;
}else{
  game.parryReadyAt=Math.min(game.parryReadyAt||0,at);
  const heavyJust=perfect&&!attackPresentation.opening&&(e.boss||e.elite)&&(game.attackSpan/(score.beat*1000))>=2.99;
  game.lastDeflectAt=effectAt;game.combo++;game.peakCombo=Math.max(game.peakCombo,game.combo);game.parries++;if(perfect){game.perfects++;game.floorPerfects=(game.floorPerfects||0)+1;game.charge=Math.min(7,game.charge+(heavyJust?3:2))}else{game.charge=Math.min(7,game.charge+1)}
  if(heavyJust)showText('HEAVY BREAK!',w*.52,h*.21,'#ffd984',19);
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
  if(hasRelic('ember_vial'))game.enemy.burn+=Math.round(relicPower('ember_vial')*skillAtkScale());
  if(hasRelic('royal_banner')&&game.combo%10===0)relicShield(relicPower('royal_banner'));
  if(hasRelic('broken_gear')&&game.relicGearReady){game.relicGearReady=false;relicShield(relicPower('broken_gear'))}
  if(hasRelic('serene_crystal')){
   game.relicJustStreak=perfect?(game.relicJustStreak||0)+1:0;
   if(game.relicJustStreak>=3){game.relicJustStreak=0;relicShield(relicPower('serene_crystal'));showText('静謐!',w*.34,h*.36,'#c7e5f9',17)}
  }
  const relicMaskSlash=hasRelic('duet_mask')&&game.relicMaskReady;
  game.relicMaskReady=hasRelic('duet_mask')&&perfect;
  if(lvl('frost')&&!game.frostWard){
   game.frostCount=(game.frostCount||0)+1;
   if(game.frostCount>=4){game.frostCount=0;game.frostWard=true;showText('氷の加護!',w*.32,h*.34,'#c5ecff',18)}
  }
  let val=game.baseAtk*getAttackMultiplier()*(perfect?(1.6+lvl('precision')*.35):1)*(heavyJust?1.25:1);
  if(lvl('double')&&Math.random()<(.14+lvl('double')*.09)){val*=2;showText('DOUBLE!',w*.51,h*.22,'#fdd99d',18)}
  if(game.fortitudeReady&&lvl('fortitude')){
   val*=1+(.15+.1*lvl('fortitude'));game.fortitudeReady=false;
   if(has('fortitude','aegis'))addShield(5,true);
   showText('不屈!',w*.54,h*.27,'#e6e9a7',17);
  }
  // Spend last parry's stored healing before newly earned recovery can be calculated.
  if(lvl('bloodlust')&&game.bloodlustPending>0){
   val+=game.bloodlustPending;showText('渇望 +'+Math.round(game.bloodlustPending),w*.53,h*.36,'#e9a3cb',15);game.bloodlustPending=0;
  }
  if(hasRelic('stardust_whetstone')&&!game.relicStardustUsed){
   game.relicStardustUsed=true;val*=1+relicPower('stardust_whetstone');
  }
  if(hasRelic('reaper_pact'))val*=1+relicPower('reaper_pact');
  if(hasRelic('golden_festival_bell')&&e.boss)val*=1+relicPower('golden_festival_bell');
  damageEnemy(val,perfect?'#93eafa':'#fff5cb');if(game.mode!=='combat')return;
  if(relicMaskSlash){
   damageEnemy(val*relicPower('duet_mask'),'#dfb8f5','仮面');if(game.mode!=='combat')return;
  }
  if(hasRelic('conduit_stone')&&game.relicBoltDue){
   game.relicBoltDue=false;damageEnemy(relicPower('conduit_stone')*skillAtkScale(),'#a1e8ff','雷導');if(game.mode!=='combat')return;
  }
  if(hasRelic('emperor_conduit')&&!lvl('thunder')&&!lvl('overcharge')&&game.relicEmperorDue){
   game.relicEmperorDue=false;damageEnemy(relicPower('emperor_conduit',true)*skillAtkScale(),'#bceeff','雷帝');if(game.mode!=='combat')return;
  }
  if(heartbeatProc){
   damageEnemy(game.baseAtk*heartbeatDamagePercent(lvl('heartbeat'))/100,'#9ee8f7','拍動');if(game.mode!=='combat')return;
  }
  if(lvl('overcharge')){
   if(game.overchargeCount>=3){
    game.overchargeCount=0;
    damageEnemy(game.baseAtk*(.7+.4*lvl('overcharge')),'#8cecff','過充電');if(game.mode!=='combat')return;
    if(has('overcharge','thunder')){
     damageEnemy((10+12*lvl('thunder'))*skillAtkScale()*.5,'#94e8ff','雷霆');if(game.mode!=='combat')return;
    }
   }
  }
  if(lvl('thunder')){const thunder=(10+12*lvl('thunder'))*skillAtkScale();damageEnemy(thunder*(1+game.combo*.018),'#86e8ff','⚡');if(game.mode!=='combat')return}
  if(lvl('echo')){let echo=val*(.25+lvl('echo')*.13);damageEnemy(echo,'#d8baff','残響');if(game.mode!=='combat')return;if(has('thunder','echo'))damageEnemy((10+12*lvl('thunder'))*skillAtkScale()*(1+lvl('echo')*.24),'#86e8ff','雷鳴');if(game.mode!=='combat')return}
  if(lvl('ember')){const burnGain=Math.round(lvl('ember')*7*skillAtkScale());e.burn+=burnGain;showText('炎 +'+burnGain,w*.75,h*.33,'#ffba83',13);if(has('ember','execute')&&e.hp/e.maxHp<.35){damageEnemy(e.burn*2,'#ff996f','紅蓮');e.burn=0;if(game.mode!=='combat')return}}
  if(perfect&&lvl('aegis')){addShield(3+3*lvl('aegis'),true);if(has('aegis','thorns')){damageEnemy(game.shield*.28,'#c5adff','鏡壁');if(game.mode!=='combat')return}}
  if(lvl('pulse')&&game.combo%PULSE_COMBO_STEP===0){damageEnemy(42*lvl('pulse')*skillAtkScale()*(1+game.combo*.02),'#ffe298','共鳴波');if(game.mode!=='combat')return}
  if(lvl('king')&&game.combo%kingComboStep()===0){
   damageEnemy(game.baseAtk*(2+lvl('king'))*getAttackMultiplier(),'#ffdaa0','王の一撃');
   if(game.mode!=='combat')return;
  }
  let ultFired=false;
  if(game.charge>=7){ultFired=true;game.charge=0;game.lastUltimateAt=effectAt;if(hasRelic('broken_gear'))game.relicGearReady=true;const ult=(game.baseAtk*ULTIMATE_BASE_MULTIPLIER+lvl('rune')*45*baseAttackScale())*getAttackMultiplier();damageEnemy(ult,'#a8f7ff','奥義');if(game.mode!=='combat')return;if(has('rune','precision')){damageEnemy(ult*.65,'#d2b0ff','時空切断');if(game.mode!=='combat')return}shake=Math.max(shake,12);puff(w*.7,h*.55,'#9ef6ff',36,1.8);sound(660,.33,'sawtooth',.05,-340);sound(220,.38,'triangle',.06,-110)}
  finishParryRecovery();
  if(!game.practice)feedback(perfect?'JUST PARRY!':'PARRY!',perfect?'#8beaff':'#ffe1a0');if(perfect){chord();if(navigator.vibrate)navigator.vibrate(15);if(!ultFired){flash=.67;flashColor='#a0e8ff';}shake=Math.max(shake,5)}else if(!ultFired){flash=Math.max(flash,.18);flashColor='#9accff'};
}
if(game.mode==='combat')nextStrike();syncHUD();}
function clearFloor(){
 if(game.mode!=='combat')return;
 if(game.tutorial&&!game.tutorialFinishing){game.enemy.hp=1;return;}
 if(game.tutorial){game.tutorial=false;game.hp=game.maxHp;$('tutorialGuide').hidden=true;}
 const defeated=game.enemy;
 if(!game.practice){
  const floorPerfects=game.floorPerfects||0;game.floorPerfects=0;
  let firstKill=false;
  if(!defeated.preview){firstKill=P.recordDefeat(book,defeated,game.floor);saveBook();}
  const firstBonus=(!DEV_MODE&&firstKill)?(defeated.boss?6:(defeated.elite||defeated.rare)?4:2):0;
  const baseBonus=(defeated.rare?(defeated.soulBonus||0):defeated.elite?2:0)+firstBonus;
  const bonus=baseBonus?soulReward(baseBonus):0;
  if(bonus){game.bonusSouls+=bonus;meta.coins+=bonus;save();showText((firstBonus?'初討伐! ':'')+'魂の欠片 +'+bonus,w*.52,h*.34,'#ffe19a',21)}
  const techCoins=Math.min(4,Math.floor(floorPerfects/2));
  const rawCoins=RT.towerCoins(defeated,game.routeTrial)+techCoins;
  const gained=awardTowerCoins(rawCoins);
  showText('塔貨 +'+gained+(techCoins?' (技量+'+techCoins+')':''),w*.52,h*.25,'#f8cd79',16);
  game.relicRewardKind=RR.rewardType(game.floor,defeated,Math.random);
  const recovery=runBonus('regen');
  if(recovery)heal(Math.ceil(game.maxHp*recovery/100));
 }
 // Reaching the summit is recorded immediately; a player need not die to earn the milestone.
 game.finalClear=!game.practice&&game.floor===80&&defeated.id==='endking';
 if(game.finalClear){meta.bestFloor=Math.max(meta.bestFloor,80);recordSkinRun();save();}
 stopScore();game.mode='victory';game.clearAt=performance.now();defeated.hp=0;
 game.bossKills+=Number(defeated.boss);
 puff(w*.72,h*.58,defeated.color,40,1.8);flash=1;flashColor='#f6cb84';
 sound(450,.24,'triangle',.05,300);setTimeout(()=>sound(790,.28,'triangle',.045,230),120);syncHUD();checkpoint();
}
function applyDamage(n,tag){
 const rules={
  frostLevel:lvl('frost'),frostMirror:has('frost','thorns'),
  sigilRatio:hasRelic('unbroken_sigil')?relicPower('unbroken_sigil'):null,
  silver:hasRelic('silver_mirror')?{
   cap:Math.round(relicPower('silver_mirror',true)*hpSkillScale()),ratio:relicPower('silver_mirror')
  }:null,
  rustyReduction:hasRelic('rusty_crest')?Math.round(relicPower('rusty_crest')*hpSkillScale()):null,
  pactOwned:hasRelic('blood_pact_chalice'),fortitudeLevel:lvl('fortitude'),
  fortitudeSynergy:has('fortitude','aegis'),revivePercent:runBonus('revive')
 };
 CombatHealth.applyDamage(game,n,tag,rules,{
  frost:prevented=>showText('氷結 -'+prevented,w*.31,h*.36,'#baeaff',17),
  sigil:blocked=>showText('紋章 -'+blocked,w*.31,h*.39,'#c4b4ff',16),
  hit:damage=>{
   showText(damage?'−'+damage:'BLOCK!',w*.27,h*.49,damage?'#ff818f':'#c4b4ff',21);
   puff(w*.28,h*.64,damage?'#ff879c':'#c5b0fa',12,1);
   shake=Math.max(shake,damage?11:4);
  },
  revive:()=>{
   showText('復活!',w*.28,h*.34,'#ffdc97',26);flash=.65;flashColor='#ffc878';
   sound(660,.30,'triangle',.07,120);
  },
  die,reflect:amount=>damageEnemy(amount,'#bbebff','氷鏡'),sync:syncHUD
 });
}
function die(){
 if(game.mode==='gameover')return;
 removeCheckpoint();
 stopScore();
 const coins=soulReward(Math.max(3,Math.floor(game.floor*2+game.bossKills*3)));
 const rawTech=Math.floor((game.perfects||0)*.5)+Math.floor((game.peakCombo||0)*.4);
 const techSouls=rawTech>0?soulReward(rawTech):0;
 meta.coins+=coins+techSouls;
 meta.bestFloor=Math.max(meta.bestFloor,game.floor);
 meta.bestCombo=Math.max(meta.bestCombo,game.peakCombo);
 meta.runs++;
 recordSkinRun(true);
 const rescue=grantRescueRewards();
 save(); // Reward currency and claim mask are saved together.
 const foe=game.enemy,foeLine=foe&&!foe.preview?`（<b>${foe.name}</b>）`:'';
 if($('deathPracticeBtn'))$('deathPracticeBtn').hidden=!(foe&&!foe.preview&&book.seen[foe.bookKey]);
 $('deathSummary').innerHTML=`<b>${game.floor}F</b>${foeLine}で力尽きた。<br>ジャストパリィ <b>${game.perfects}回</b> / 被弾 <b>${game.misses}回</b><br>最大コンボ <b>${game.peakCombo}</b><br>魂の欠片 <b style="color:#f4cf86">+${coins+techSouls+game.bonusSouls+rescue} ✧</b>${techSouls?`（技量ボーナス +${techSouls}）`:''}${game.bonusSouls?`（特別討伐 +${game.bonusSouls}）`:''}${rescue?`（累計挑戦ボーナス +${rescue} ✧）`:''}`;
 $('deathRecords').innerHTML=records();runLegacyVisual=null;
 game.deathInputUnlockAt=performance.now()+DEATH_INPUT_GRACE_MS;
 setMode('gameover');sound(200,.42,'sawtooth',.05,-130);
}
function choosePool(){const available=availableSkills(),taken=[];for(let k=0;k<Math.min(runBonus('choice4')||3,available.length);k++){const rarityWeight={common:5.4,rare:2.9,epic:1.05};const weights=available.map(s=>(rarityWeight[s.rarity]??rarityWeight.common)*(lvl(s.id)?1.17:1));let r=Math.random()*weights.reduce((a,b)=>a+b,0),idx=0;for(;idx<weights.length-1;idx++){r-=weights[idx];if(r<=0)break}taken.push(available.splice(idx,1)[0])}return taken}
function showRelicRewards(kind){
 const choices=RR.offer(kind,game.relics,game.relicDiscarded);
 if(!choices.length){
  if(game.relicReturn==='mirror'){
   game.relicReturn=null;game.relicMirrorTarget=null;game.roomLocked=false;game.roomStage=null;
   setMode('room');renderRoom();
  }else if(game.relicReturn==='room'){
   game.relicReturn=null;
   if(game.currentRoom==='merchant'){setMode('room');showRoomResult('めぼしい遺物は残っていないようだ。',true);}
   else finishNoncombatRoom();
  }else showRewards();
  return;
 }
 game.relicOffer=choices.map(r=>r.id);
 game.relicSwapTarget=null;
 setMode('relic');
 renderRelicReward();
}
function renderRelicReward(){
 if(game.mode!=='relic')return;
 checkpoint();
 const offered=game.relicOffer.map(id=>RR.BY_ID[id]).filter(Boolean);
 const selected=game.relicSwapTarget&&RR.BY_ID[game.relicSwapTarget];
 $('relicOfferTitle').textContent=selected?'交換する遺物を選べ':'遺物をひとつ選べ';
 $('relicOfferHint').textContent=selected?'取り外した遺物は、このランでは再取得できません。':'所持 '+game.relics.length+' / '+RR.MAX_HELD;
 $('relicOfferCards').innerHTML=selected?'':
  offered.map(r=>`<button type="button" class="relic-reward-card ${r.rarity}" data-relic="${r.id}"><span class="relic-reward-rarity">${RR.RARITY_LABELS[r.rarity]}</span><span class="relic-reward-symbol">${r.icon}</span><strong>${r.name}</strong><span class="relic-reward-desc">${r.desc+relicScaledSuffix(r.id,false)}</span><small>相性：${r.affinity}</small></button>`).join('');
 $('relicReplaceList').hidden=!selected;
 $('relicReplaceList').innerHTML=selected?
  `<p class="relic-replace-note">${selected.icon} ${selected.name} と交換する遺物</p>`+
  game.relics.map(id=>{const r=ownedRelic(id);return `<button type="button" class="relic-replace-card" data-replace="${id}"><span>${r.icon}</span><span><b>${r.name}</b><small>${r.desc}</small></span></button>`}).join(''):'';
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
  game.polishedRelics=game.polishedRelics.filter(id=>id!==replaceId);
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
 if(returned==='room'&&game.currentRoom==='merchant'){
  setMode('room');showRoomResult(acquired?'遺物箱から遺物を手に入れた！':'遺物箱の遺物を見送った。',true);return;
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
function renderRewards(){const rar={common:'COMMON',rare:'RARE',epic:'EPIC'};$('rewardCards').className='reward-cards'+(choiceSet.length===4?' four':'');$('rewardTitle').textContent=game.finalClear&&game.floor===80?'80F制覇 — 終刻の王を討伐':`${game.floor}F 突破 — 戦利品`;$('rewardCards').innerHTML=choiceSet.map(s=>{const meta=skillCardMeta(s);return `<button class="reward-card ${s.rarity}" data-skill="${s.id}"><span class="rarity">${rar[s.rarity]||String(s.rarity||'COMMON').toUpperCase()} · ${lvl(s.id)?'LEVEL UP':'NEW SKILL'}</span><span class="emoji">${s.icon}</span><span class="rname">${s.name} <span class="muted" style="font-size:10px">Lv.${lvl(s.id)+1}</span></span><span class="rdesc">${describeSkill(s.id,lvl(s.id)+1)}</span>${meta.diffHtml}${meta.synHtml}</button>`}).join('');for(const btn of $('rewardCards').querySelectorAll('[data-skill]'))btn.addEventListener('click',()=>takeSkill(btn.dataset.skill));$('rerollBtn').textContent=`↻ 引き直す (残 ${game.rerolls})`;$('rerollBtn').disabled=game.rerolls<=0;$('healBtn').textContent=`♡ 強化せずHPを ${Math.round(game.maxHp*.2)} 回復`;const notices=[game.finalClear&&game.floor===80?'👑 塔の頂を制覇！ 81Fから無限踏破が始まる':null,game.lastDiscovered?'📖 図鑑登録':null,game.enemy?.rare?'✦ レア報酬獲得':null,game.floor%5===0?'↻ 引き直し +1':null].filter(Boolean);$('rewardNote').textContent=notices.join('　');$('rewardNote').hidden=!notices.length;checkpoint()}
function gainSkillLevel(id){
 if(!Object.hasOwn(SK,id)||lvl(id)>=skillCap(id)||game.sealedSkillIds?.includes(id))return false;
 const prevMax=game.maxHp;
 game.lv[id]=(game.lv[id]||0)+1;
 if(id==='thunder'||id==='overcharge')game.relicEmperorDue=false;
 if(id==='heal'){
  game.rawMaxHp=runBaseHp()+PR.lifeVesselBonus(runBaseHp(),lvl('heal'));adjustRelicMaxHp();
  game.hp=Math.min(game.maxHp,game.hp+game.maxHp-prevMax+12);
 }
 return true;
}
function takeSkill(id){
 const s=SK[id];
 if(game.mode!=='reward'||!s||!choiceSet.find(v=>v.id===id)||lvl(id)>=skillCap(id))return;
 gainSkillLevel(id);
 if(game.floor%5===0)game.rerolls++;
 sound(790,.17,'triangle',.06,140);advance();
}
function advance(){
 game.floor++;game.floorPerfects=0;game.routeTrial=false;game.currentRoom=null;game.eventId=null;game.roomStage=null;game.roomLocked=false;
 game.hp=Math.min(game.hp,game.maxHp);
 enterFloor(performance.now());
 renderBuild();syncHUD();
}
function showHeal(){if(game.mode!=='reward')return;heal(Math.round(game.maxHp*.2));if(game.floor%5===0)game.rerolls++;advance()}
function tap(releasedEnough=true){
 if(game.mode!=='combat')return;
 const t=performance.now();syncAttackClock();
 // 衝突後に押しても次の攻撃の『早すぎ』にならない。直前の攻撃への遅れとして扱う。
 if(game.lastStrikeKind==='miss'&&t-game.lastImpactAt>=0&&t-game.lastImpactAt<220&&!game.lateReported&&Math.abs(t-inputTargetAt())>getParryWindow()){
  game.lateReported=true;
  feedback('遅い '+Math.round(t-game.lastInputTargetAt)+'ms','#f7ca8e');
  return;
 }
 if(game.attackResolved||game.inputLocked)return;
 if(!releasedEnough||t<(game.parryReadyAt||0)){game.parryBlockedAt=t;return;}
 game.parryReadyAt=t+PARRY_REARM_MS;
 // Only the press edge attempts a parry. Earlier inputs raise the shield and can
 // defend at impact IF held continuously for the full 100 ms startup.
 const delta=t-inputTargetAt(),perfect=getPerfectWindow(),parry=getParryWindow();
 game.lastAttemptDelta=delta;game.parryAnimAt=t;
 if(Math.abs(delta)<=perfect){game.pendingKind='just';game.inputLocked=true;game.parryAnimKind='just'}
 else if(Math.abs(delta)<=parry){game.pendingKind='parry';game.inputLocked=true;game.parryAnimKind='parry'}
 else game.parryAnimKind='guard';
 if(DEV_MODE)devTimingTrace.input={delta,kind:game.pendingKind||'outside',at:t};
 if(game.pendingKind)game.pendingAt=t;
}

function populatePracticeEnemies(selected,allowUnseen=false){
 const options=P.codexEntries().filter(e=>allowUnseen||book.seen[e.bookKey]);
 const select=$('practiceEnemy');
 select.innerHTML=options.map(e=>'<option value="'+e.bookKey+'">'+e.displayName+'</option>').join('');
 if(selected&&(allowUnseen||book.seen[selected]))select.value=selected;
 else if(options.length)select.value=options[0].bookKey;
}
function renderCodex(){
 $('codexToolbar').hidden=codexTab==='skills';
 if($('codexTabs')){
  for(const btn of $('codexTabs').querySelectorAll('[data-codex-tab]')){
   const active=btn.dataset.codexTab===codexTab;
   btn.className='upgrade-tab'+(active?' active':'');
   btn.setAttribute('aria-pressed',String(active));
  }
 }
 const view=window.ParryCodexView.render({
  tab:codexTab,filter:$('codexFilter').value,book,
  unlockedSkills:permanent.unlockedSkills,skillContext:skillDescriptionContext()
 });
 $('codexSummary').textContent=view.summary;
 $('codexList').innerHTML=view.listHtml;
 for(const btn of $('codexList').querySelectorAll('[data-practice]'))btn.addEventListener('click',()=>startPractice(btn.dataset.practice));
}
function openCodex(){
 if(deathInputBlocked()||!['title','gameover','codex'].includes(game.mode))return;
 stopScore();setMode('codex');renderCodex();$('codexList').scrollTop=0;$('codexCloseBtn').focus?.();
}
function startPractice(key){
 if(!book.seen[key]||!P.findByKey(key))return;
 start(true,key);
}
function pauseForClock(){
 clockPausedPhase=game.mode==='phase';pauseAt=performance.now();audioClock.paused(pauseAt);
 clearGuardInput();stopScore();setMode('pause');
 $('pauseStatus').hidden=false;$('pauseStatus').textContent='音声の同期を確認できないため一時停止しました。再開すると4拍から始まります。';
}
function togglePause(){
 if(game.mode==='combat'){clockPausedPhase=false;$('pauseStatus').hidden=true;clearGuardInput();pauseAt=performance.now();stopScore();setMode('pause');}
 else if(game.mode==='pause'){
  const now=performance.now();RunState.resetParryInput(game);game.whiffUntil=0;game.parryAnimAt=-99999;game.lastDeflectAt=-99999;game.lastDamageAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.pendingKind=null;game.inputLocked=false;game.attackResolved=false;game.guardAtImpact=null;game.cuePlayed=false;game.windupPlayed=false;
  $('pauseStatus').hidden=true;
  if(clockPausedPhase){clockPausedPhase=false;game.phaseStage='rumble';setMode('phase');beginFinalCountIn();}
  else{startScore(game.enemy);attackPresentation.opening=true;game.attackBeat=4;game.attackSpan=4*score.beat*1000;game.nextFloorHintAt=now;syncAttackClock();setMode('combat');}
 }
}
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
let lastHeroAnchors=null;
function heroAnchors(now,poseInput,s,x,y,lift,push,hurt){
 const HP=window.ParryHeroPuppet;
 if(useIllustratedArt()&&!game.artFallback&&KNIGHT_PUPPET?.readyFor(game.enemy)&&HP){
  const m=game.enemy?motionFor(game.enemy):undefined,l=KNIGHT_PUPPET.layout(w,h,game.enemy,m);
  const q=HP.pose(poseInput),edits=window.ParryArtEdits,baseParts=HP.placements(q);
  const editTime=q.action>0?q.phase*240:0,u=HP.SCALE||.16;
  const parts=edits?.placements('hero',baseParts,HP.placements(HP.pose()),editTime,u)||baseParts;
  const whole=edits?.whole('hero')||{x:0,y:0,scale:1};
  const partPoint=(partName,[px,py])=>{
   const t=parts[partName],vx=(px-t.pivot[0])*u*(t.sx||1),vy=(py-t.pivot[1])*u*(t.sy||1);
   const rx=vx*Math.cos(t.angle)-vy*Math.sin(t.angle),ry=vx*Math.sin(t.angle)+vy*Math.cos(t.angle);
   return {x:l.heroX+(q.slide+(t.at.x+rx)*whole.scale+whole.x*u)*l.heroScale,y:l.ground+((t.at.y+ry)*whole.scale+whole.y*u)*l.heroScale};
  };
  const shPt=partPoint('shield',HP.PIVOTS.shieldContact);
  return lastHeroAnchors={
   illustrated:true,layout:l,m,
   footX:l.heroX+(q.slide+whole.x*u)*l.heroScale,
   footY:l.ground+whole.y*u*l.heroScale,
   scale:l.heroScale*whole.scale,
   grip:partPoint('weapon',HP.PIVOTS.grip),
   tip:partPoint('weapon',HP.PIVOTS.tip),
   shieldX:shPt.x,shieldY:shPt.y,
   shieldAngle:q.shieldAngle||0
  };
 }
 const fx=x-hurt*8-push*4,fy=y+Math.sin(now/390)*1.6+hurt*5+push*2;
 return lastHeroAnchors={
  illustrated:false,layout:null,m:null,
  footX:fx,footY:fy,scale:s,
  grip:{x:fx+12*s,y:fy-65*s},
  tip:{x:fx+24*s,y:fy-108*s},
  shieldX:fx+(21+lift*18-push*5)*s,
  shieldY:fy+(-48-lift*10+push*2)*s,
  shieldAngle:-.16+lift*.18-push*.23
 };
}
function drawHeroBehindFX(now,anchors,poseInput){
 const hasBolt=lvl('overcharge')>0&&(game.overchargeCount||0)>=2;
 const hasMask=hasRelic('duet_mask')&&!!game.relicMaskReady;
 if(hasBolt){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let b=0;b<3;b++){
   const seed=Math.floor(now/75)+b*17,baseX=anchors.footX+(b-1)*18*anchors.scale,startY=anchors.footY-12*anchors.scale;
   const pts=[[baseX,startY]];let cx=baseX,cy=startY;
   for(let seg=1;seg<=5;seg++){
    const hash=Math.sin(seed*12.9898+seg*78.233)*43758.5453;
    cx+=((hash-Math.floor(hash))-.5)*22*anchors.scale;
    cy-=(18+(seg%2)*5)*anchors.scale;
    pts.push([cx,cy]);
   }
   ctx.strokeStyle='#38d6ff';ctx.shadowColor='#00b7ff';ctx.shadowBlur=12;
   ctx.lineWidth=3.2*anchors.scale;ctx.lineCap='round';ctx.lineJoin='miter';ctx.globalAlpha=.78;
   ctx.beginPath();pts.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
   ctx.strokeStyle='#e8fbff';ctx.lineWidth=1.3*anchors.scale;ctx.stroke();
   if(pts[2]){
    ctx.beginPath();ctx.moveTo(pts[2][0],pts[2][1]);
    ctx.lineTo(pts[2][0]+(b%2?12:-12)*anchors.scale,pts[2][1]-11*anchors.scale);ctx.stroke();
   }
  }
  ctx.restore();
 }
 if(hasMask&&anchors.illustrated&&window.ParryHeroPuppet){
  const cloneLayout={...anchors.layout,heroX:anchors.layout.heroX-22*anchors.layout.heroScale,ground:anchors.layout.ground-3*anchors.layout.heroScale};
  ctx.save();ctx.globalAlpha=.68+.12*Math.sin(now/220);
  if('filter' in ctx)ctx.filter='brightness(0.30) sepia(1) hue-rotate(235deg) saturate(320%) drop-shadow(0 0 6px #9e47ff)';
  window.ParryHeroPuppet.drawHero(ctx,{width:w,height:h,e:game.enemy,m:anchors.m,now:now-90,skin:visualSkin(),layout:cloneLayout,counterPhase:-1,counterTarget:null,pose:{...poseInput,lastStrikeKind:'guard'}});
  ctx.restore();
 }
}
function drawHeroFrontFX(now,anchors,ultActive){
 if(lvl('frost')>0&&game.frostWard){
  const sx=anchors.shieldX+9*anchors.scale,sy=anchors.shieldY+2*anchors.scale,sw=18*anchors.scale,sh=38*anchors.scale;
  ctx.save();ctx.translate(sx,sy);ctx.rotate((anchors.shieldAngle||0)-.08);ctx.globalCompositeOperation='lighter';
  const hex=[[0,-sh],[sw*.95,-sh*.52],[sw*1.05,sh*.42],[0,sh],[-sw*.65,sh*.48],[-sw*.65,-sh*.52]];
  const iceGrad=ctx.createLinearGradient(-sw,-sh,sw,sh);
  iceGrad.addColorStop(0,'rgba(185,248,255,.46)');iceGrad.addColorStop(.5,'rgba(95,215,255,.24)');iceGrad.addColorStop(1,'rgba(210,252,255,.52)');
  ctx.fillStyle=iceGrad;ctx.strokeStyle='#d6fbff';ctx.shadowColor='#5ce1ff';ctx.shadowBlur=12;ctx.lineWidth=2*anchors.scale;
  ctx.beginPath();hex.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(235,254,255,.65)';ctx.lineWidth=1.1*anchors.scale;
  ctx.beginPath();ctx.moveTo(0,-sh);ctx.lineTo(sw*.25,0);ctx.lineTo(0,sh);
  ctx.moveTo(-sw*.65,-sh*.52);ctx.lineTo(sw*1.05,sh*.42);
  ctx.moveTo(sw*.95,-sh*.52);ctx.lineTo(-sw*.65,sh*.48);ctx.stroke();
  ctx.restore();
 }
 // 案C：蒼白臨界待機刀身オーラ（次のパリィまたはJUSTパリィで奥義発動可能な時、切り出し刀身が蒼白く発光）
 if(['combat','phase'].includes(game.mode)&&!ultActive&&(game.charge||0)>=5&&anchors.grip&&anchors.tip){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const color='#9ef6ff';
  ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=16;
  ctx.lineWidth=(4.5+1.5*Math.sin(now/120))*anchors.scale;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(anchors.grip.x,anchors.grip.y);ctx.lineTo(anchors.tip.x,anchors.tip.y);ctx.stroke();
  for(let i=0;i<4;i++){
   const t=((now/260+i*.25)%1);
   const sx=anchors.grip.x+(anchors.tip.x-anchors.grip.x)*t+Math.sin(now/60+i)*4;
   const sy=anchors.grip.y+(anchors.tip.y-anchors.grip.y)*t+Math.cos(now/60+i)*4;
   ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(sx,sy,2.2*anchors.scale,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 if(['combat','phase','victory'].includes(game.mode)){
  const charge=ultActive?7:(game.charge||0),isMax=charge>=6,rx=45*anchors.scale,ry=9*anchors.scale,cy=anchors.footY+9*anchors.scale;
  ctx.save();
  for(let i=0;i<7;i++){
   const t=1-(i/6),angle=Math.PI*(.15+.70*t);
   const px=anchors.footX+Math.cos(angle)*rx,py=cy+Math.sin(angle)*ry,lit=i<charge;
   ctx.beginPath();ctx.arc(px,py,lit?(isMax?4.8:4.0):2.6,0,Math.PI*2);
   if(lit){ctx.fillStyle=ultActive?'#a8f7ff':isMax?'#e6b8ff':'#7ceeff';ctx.shadowColor=ultActive?'#38d6ff':isMax?'#c466ff':'#44ccff';ctx.shadowBlur=isMax||ultActive?14:8;}
   else{ctx.fillStyle='rgba(140,165,205,.28)';ctx.shadowBlur=0;}
   ctx.fill();
  }
  ctx.restore();
 }
}
function hero(now){
 const s=Math.min(w/550,h/470)*1.23,x=w*.28,y=h*.80;
 const since=now-(game.parryAnimAt||-99999);
 const beatParry=beatContact&&['parry','just'].includes(game.parryAnimKind);
 const quickLift=beatParry?clamp(since/8,0,1)*clamp((180-since)/90,0,1):clamp(since/95,0,1)*clamp((300-since)/130,0,1);
 const heldLift=game.guardHeld?clamp((now-game.guardStartedAt)/PARRY_STARTUP,0,1):0;
 const deflectAge=now-(game.lastDeflectAt??-99999);
 const contactLift=beatContact&&['parry','just'].includes(game.lastStrikeKind)&&deflectAge>=0?1-smooth((deflectAge-38)/100):0;
 const pendingLift=beatParry&&game.pendingKind?clamp(since/8,0,1):0;
 const lift=Math.max(quickLift,heldLift,contactLift,pendingLift);
 const action=['parry','just'].includes(game.lastStrikeKind)?clamp(1-(now-(game.lastDeflectAt??-99999))/240,0,1):0;
 const hurt=clamp(1-(now-(game.lastDamageAt||-99999))/250,0,1);
 const contact=splitContact()?attackPresentation.contact:null,impactAt=contact?.at??game.lastImpactAt,visibleKind=contact?(contact.result||'contact'):game.lastStrikeKind;
 const age=now-(impactAt??-99999),push=(age>=0&&age<160&&(contact||game.lastStrikeKind!=='miss')?Math.sin(Math.PI*age/160):0)*(contact?(contact.guard?.75:.45):(game.lastStrikeKind==='just'?1:game.lastStrikeKind==='guard'?.75:.45));
 const ultActive=(now-(game.lastUltimateAt??-99999))>=0&&(now-(game.lastUltimateAt??-99999))<520;
 const poseInput={lift,heldLift,push,action,hurt,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt};
 const anchors=heroAnchors(now,poseInput,s,x,y,lift,push,hurt);
 drawHeroBehindFX(now,anchors,poseInput);
 const hasFort=lvl('fortitude')>0&&!!game.fortitudeReady;
 ctx.save();
 if(hasFort&&'filter' in ctx){
  const pulse=(.8+.2*Math.sin(now/180)).toFixed(2);
  ctx.filter=`drop-shadow(0 0 4px rgba(255,190,70,${pulse})) drop-shadow(0 0 10px rgba(235,105,15,${pulse}))`;
 }
 let drawn=false;
 if(useIllustratedArt()&&!game.artFallback&&KNIGHT_PUPPET?.drawHero(ctx,{width:w,height:h,e:game.enemy,m:game.enemy?motionFor(game.enemy):undefined,now,skin:visualSkin(),counterTint:PR.extraEnabled(permanent,'slashTint')?PR.extraOption(permanent,'slashTint'):null,
   counterWave:!ultActive,
   attackAt:game.attackAt,attackSpan:game.attackSpan,lastImpactAt:impactAt,lastDeflectAt:game.lastDeflectAt,lastStrikeKind:visibleKind,
   pose:poseInput}))drawn=true;
 else if(!legacyVisualEnabled()&&CHARACTER_RIG_ENABLED&&CHARACTER_RIG?.drawHero(ctx,{width:w,height:h,e:game.enemy,m:game.enemy?motionFor(game.enemy):{reach:110},now,pose:poseInput}))drawn=true;
 else if(!legacyVisualEnabled()&&COMBAT_ART_ENABLED&&COMBAT_ART?.drawHero(ctx,{width:w,height:h,e:game.enemy,now,pose:poseInput}))drawn=true;
 if(!drawn){
  ctx.save();ctx.translate(x-hurt*8-push*4,y+Math.sin(now/390)*1.6+hurt*5+push*2);ctx.scale(s,s);
  ctx.fillStyle='#080d20aa';ctx.beginPath();ctx.ellipse(0,0,44,10,0,0,Math.PI*2);ctx.fill();
  if(!legacyVisualEnabled()&&CHARACTER_READY_ENABLED&&CHARACTER_READY?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt}))drawn=true;
  else if(!legacyVisualEnabled()&&CHARACTER_TRACE_ENABLED&&CHARACTER_TRACE?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt}))drawn=true;
  else if(!legacyVisualEnabled()&&CHARACTER_FLAT_ENABLED&&CHARACTER_FLAT?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt}))drawn=true;
  else if(!legacyVisualEnabled()&&CHARACTER_SVG_ENABLED&&CHARACTER_SVG?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt}))drawn=true;
  else if(!legacyVisualEnabled()&&CHARACTER_ART_ENABLED&&CHARACTER_ART?.drawHero(ctx,{now,lift,heldLift,push,action,guardHeld:game.guardHeld,lastStrikeKind:visibleKind,lastImpactAt:impactAt}))drawn=true;
  if(!drawn){
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
   ctx.save();ctx.translate(12,-65);ctx.rotate(action*.65+.07-lift*.1);line([[0,6],[12,-43]],'#edfcff',7);line([[0,6],[12,-43]],'#77d7ec',3);line([[-12,7],[12,10]],'#e8c28f',6);line([[0,7],[-2,23]],'#554b5e',6);ctx.restore();
  }
  ctx.restore();
  // The legacy renderer has no painted counter wave of its own.
  if(game.enemy&&!ultActive&&PR.extraEnabled(permanent,'slashTint'))COMBAT_ART?.counterSlash?.(ctx,{kind:game.lastStrikeKind,phase:(now-(game.lastDeflectAt??-99999))/240,
   origin:{x:w*.28,y:h*.80-65*s},target:{x:w*.65,y:h*.80-65*s},scale:s,tint:PR.extraOption(permanent,'slashTint')});
 }
 ctx.restore();
 drawHeroFrontFX(now,anchors,ultActive);
}
function drawHeavyAuraC(ax,ay,groundY,ew,eh,scale,charge,p,now,front){
 if(charge<=.02&&p<=.01)return;
 const intensity=Math.min(1,charge*1.15+p*.9);
 ctx.save();ctx.globalCompositeOperation='lighter';
 if(!front){
  const rx=ew*(1.38-charge*.34),ry=10*scale;
  ctx.strokeStyle='#ff5577';ctx.shadowColor='#ff3b6b';ctx.shadowBlur=14;
  ctx.lineWidth=2.6*scale;ctx.globalAlpha=intensity*.88;
  ctx.beginPath();ctx.ellipse(ax,groundY+2,rx,ry,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#ffc2d1';ctx.lineWidth=1.4*scale;ctx.globalAlpha=intensity*.65;
  ctx.beginPath();ctx.ellipse(ax,groundY+2,rx*.72,ry*.72,0,0,Math.PI*2);ctx.stroke();
 }else{
  for(let k=0;k<3;k++){
   const phase=(charge*.85+k*.33+now/1400)%1,r=Math.max(10,(1-phase)*eh*.68);
   ctx.strokeStyle=k===0?'#ffc2d1':'#ff3b6b';ctx.shadowColor='#ff3b6b';ctx.shadowBlur=12;
   ctx.lineWidth=(1.6+phase*1.8)*scale;ctx.globalAlpha=intensity*Math.sin(phase*Math.PI)*.85;
   ctx.beginPath();ctx.arc(ax,ay-eh*.52,r,0,Math.PI*2);ctx.stroke();
  }
 }
 ctx.restore();
}
function drawSampledHeavyAura(sampled,e,now,front){
 if(!sampled)return;
 const {l,x,q,s}=sampled,id=window.ParryEnemyPuppet?.idFor?.(e)||'knight';
 const whole=window.ParryArtEdits?.whole?.(id)||{x:0,y:0,scale:1};
 const u=s?window.ParryEnemyPuppet.unit(s):(KNIGHT_PUPPET.SCALE||.16),floatY=q?.float||0;
 const ax=x+whole.x*u*l.enemyScale,ay=l.ground+(floatY+whole.y*u)*l.enemyScale,scale=l.enemyScale*whole.scale;
 const eh=(s?.height||174)*scale,ew=(s?s.height*(s.motion==='slime'?.57:.29):48)*scale;
 drawHeavyAuraC(ax,ay,l.ground,ew,eh,scale,q?.charge||0,sampled.t?.p||0,now,front);
}
function enemy(now){
 let e=game.enemy;if(!e)return;
 let opening=attackPresentation.opening,attackAt=game.attackAt,span=game.attackSpan||1900,lastImpactAt=game.lastImpactAt;
 // The blade follows through on time even while a corrected late input can
 // still arrive. Project the next visual phrase without advancing gameplay.
 const awaitingInput=game.mode==='combat'&&!game.attackResolved&&now>=attackAt;
 if(awaitingInput){
  lastImpactAt=attackAt;span=e.rhythm[e.index%e.rhythm.length]*score.beat*1000;
  attackAt+=span;e={...e,index:e.index+1};opening=false;
 }
 const m=motionFor(e,opening);
 const shownResult=attackPresentation.contact?.result;
 const presentedKind=splitContact()?(['just','parry'].includes(shownResult)?shownResult:'contact'):(awaitingInput?'':game.lastStrikeKind);
 const d=attackAt-now;
 const isHeavy=game.mode==='combat'&&(e.boss||e.elite)&&!opening&&(span/(score.beat*1000))>=2.99;
 if(useIllustratedArt()&&!game.artFallback&&KNIGHT_PUPPET?.readyFor(e)){
  const enemyData={e,m,now,width:w,height:h,attackAt,attackSpan:span,lastImpactAt,lastDeflectAt:game.lastDeflectAt,lastStrikeKind:presentedKind};
  const sampleFn=window.ParryEnemyPuppet?.supports?.(e)?window.ParryEnemyPuppet.sample:KNIGHT_PUPPET.sample;
  const sampled=isHeavy&&sampleFn?sampleFn(enemyData):null;
  if(sampled)drawSampledHeavyAura(sampled,e,now,false);
  if(KNIGHT_PUPPET.drawEnemy(ctx,enemyData)){
   if(sampled)drawSampledHeavyAura(sampled,e,now,true);
   return;
  }
 }
 if(!legacyVisualEnabled()&&CHARACTER_RIG_ENABLED&&CHARACTER_RIG?.drawEnemy(ctx,{e,m,now,width:w,height:h,
  attackAt,attackSpan:span,lastImpactAt,
  lastDeflectAt:game.lastDeflectAt,lastStrikeKind:presentedKind}))return;
 if(!legacyVisualEnabled()&&COMBAT_ART_ENABLED&&COMBAT_ART?.drawEnemy(ctx,{e,m,now,width:w,height:h,
  attackAt,attackSpan:span,lastImpactAt,
  lastDeflectAt:game.lastDeflectAt,lastStrikeKind:presentedKind}))return;
 const base=Math.min(w/550,h/470)*1.23,scale=base*(e.boss?1.34:1);
 const heroX=w*.28,restX=w*.73,hitX=heroX+39*base,hitY=h*.80-58*base;
 const prepare=m.cuePrepare??Math.min(m.prepare,Math.max(m.swing+120,span-130));
 const prep=m.noWindup?0:smooth((prepare-d)/(prepare-m.swing));
 const p=clamp((m.swing-d)/m.swing,0,1);
 // 速度に明確な変化をつける。弾速を表示するゲージではなく、動きの重さが予兆になる。
 const dash=p*p*(1+.12*(1-p));
 const after=now-(lastImpactAt||-99999);
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
 const recoilTime=Math.min(195,Math.max(75,(attackAt-now-145)));
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
 if(isHeavy)drawHeavyAuraC(x,y,ground,48*scale,140*scale,scale,charge,p,now,true);
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

function drawUltimateFX(now){
 // 案C：刹那暗転・一閃（空間断裂）＋十字フレア＋衝撃波リング
 const age=now-(game.lastUltimateAt??-99999);
 if(age<0||age>520)return;
 const p=clamp(age/520,0,1),alpha=1-p;
 const scale=lastHeroAnchors?.scale||(Math.min(w/550,h/470)*1.23);
 const gripX=lastHeroAnchors?.grip?.x??(w*.28);
 const m=game.enemy?motionFor(game.enemy):undefined;
 const target=(useIllustratedArt()&&!game.artFallback&&game.enemy&&KNIGHT_PUPPET?.counterTarget?.({e:game.enemy,m,now,width:w,height:h,attackAt:game.attackAt,attackSpan:game.attackSpan||1900,lastImpactAt:game.lastImpactAt,lastDeflectAt:game.lastDeflectAt,lastStrikeKind:game.lastStrikeKind}))||{x:w*.72,y:h*.58};
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 // Outer cyan glow line
 ctx.strokeStyle='#5ce1ff';ctx.shadowColor='#38d6ff';ctx.shadowBlur=28;
 ctx.lineWidth=(14*Math.pow(1-p,1.3))*scale;ctx.globalAlpha=alpha;
 ctx.beginPath();ctx.moveTo(gripX-28,target.y+20);ctx.lineTo(w-10,target.y-26);ctx.stroke();
 // Crisp white-hot core slash line
 ctx.strokeStyle='#ffffff';ctx.lineWidth=(4.5*Math.pow(1-p,1.5))*scale;
 ctx.beginPath();ctx.moveTo(gripX-28,target.y+20);ctx.lineTo(w-10,target.y-26);ctx.stroke();
 // Impact cross-star at enemy center
 const starLen=(58*(1-p*.5))*scale;
 ctx.strokeStyle='#e8fdff';ctx.lineWidth=(3.2*(1-p))*scale;
 ctx.beginPath();ctx.moveTo(target.x-starLen*.35,target.y-starLen);ctx.lineTo(target.x+starLen*.35,target.y+starLen);ctx.stroke();
 // Expanding shock ring
 ctx.strokeStyle='#9ef6ff';ctx.lineWidth=3.2*(1-p);
 ctx.beginPath();ctx.arc(target.x,target.y,18+p*140,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
function combatPoseTime(now){
 // Freeze *only the character poses* for 40ms, never game time, BGM or attack scheduling.
 if(!clashFX||clashFX.noFreeze||clashFX.kind!=='just'||game.mode!=='combat'||game.enemy?.kind!==clashFX.enemyKind)return now;
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
function drawScreen(now){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();if(shake>0){const sx=rand(-shake,shake),sy=rand(-shake,shake);if(preferences.shake)ctx.translate(sx,sy);}drawBackground(now);
 if(game.mode==='combat'&&!game.practice){ctx.save();ctx.globalAlpha=.035;ctx.fillStyle=P.zoneForFloor(game.floor).accent;ctx.fillRect(0,0,w,h*.72);ctx.restore()}
 if(game.artLoading){ctx.restore();textDraw('立ち絵を読み込み中…',w*.5,h*.5,Math.min(20,w*.05),'#cfdff5');return;}
 const ultAge=now-(game.lastUltimateAt??-99999);
 if(preferences.flash&&ultAge>=0&&ultAge<260){ctx.save();ctx.fillStyle=`rgba(3,6,18,${.72*(1-ultAge/260)})`;ctx.fillRect(0,0,w,h);ctx.restore();}
 const poseTime=combatPoseTime(now);enemy(poseTime);drawComboGlow(poseTime);hero(poseTime);ctx.restore();if(ultAge<0||ultAge>=520)drawClashFX(now);drawUltimateFX(now);
 // Reserve separate, stable vertical lanes: the combo stays above the floor-entry title.
 // 0.055h vs 0.14h leaves a legible gap even on the 345px-tall mobile canvas.
 const boss=game.enemy?.boss;if(game.mode==='combat'){if(game.nextFloorHint&&now-game.nextFloorHintAt<1300){const alpha=clamp(1-(now-game.nextFloorHintAt-500)/800,0,1);ctx.globalAlpha=alpha;textDraw(game.nextFloorHint,w*.5,h*.14,Math.min(30,w*.075),boss?'#ffe0a2':'#cfdff5');ctx.globalAlpha=1}
 if(game.combo>1){textDraw('×'+game.combo+' COMBO',w*.5,h*.055,Math.min(19,w*.045),'#d4f5ed')}
 
 }
 if(game.mode==='phase')drawFinalPhase(now);
 if(game.mode==='victory'){textDraw(game.finalClear?'TOWER CONQUERED':'FLOOR CLEARED',w*.5,h*.26,Math.min(34,w*.075),'#ffe3ad');}
 if(preferences.flash&&flash>0){ctx.globalAlpha=flash*.18;ctx.fillStyle=flashColor;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);round(p.x,p.y,p.size,p.color)}ctx.globalAlpha=1;
 for(const a of texts){const age=now-a.t,alpha=clamp(1-age/a.life,0,1);ctx.globalAlpha=alpha;ctx.shadowColor=a.color;ctx.shadowBlur=8;textDraw(a.text,a.x,a.y-age*.043,a.size,a.color);ctx.shadowBlur=0}ctx.globalAlpha=1;
}
function attackCues(now,beat,at,motion){
 const cues=attackPresentation.cues,key=score.theme+':'+beat;
 if(!cues.has(key)){cues.set(key,{});if(cues.size>8)cues.delete(cues.keys().next().value);}
 const played=cues.get(key);
 if(!motion.noWindup&&!played.windup&&now>=at-motion.cuePrepare){played.windup=true;sound(game.enemy.boss?135:195,.14,'triangle',.026,-65);}
 if(!played.swing&&now>=at-motion.swing){played.swing=true;sfxSwing();}
 if(splitContact()&&!played.contact){
  const contactAt=score.origin+beat*score.beat;
  played.contact=audio.reserveContact(contactAt,(ac,at,destination)=>window.ParryCombatSfx.playContact(ac,at,destination));
 }
}
function update(now,dt){const m=game.mode;
 if(['combat','phase'].includes(m)&&score.active&&!readAudioClock().healthy){pauseForClock();return;}
 if(m==='combat'){scheduleScore();syncAttackClock();
 if(DEV_MODE&&now>=game.attackAt){
  const key=score.theme+':'+game.attackBeat;
  if(devTimingTrace.frame?.key!==key)devTimingTrace.frame={key,delay:now-game.attackAt};
 }
 const motion=motionFor(game.enemy);
 if(cueBeats)attackCues(now,game.attackBeat,game.attackAt,motion);
 else{
 if(!game.windupPlayed&&now>=game.attackAt-Math.min(motion.prepare,game.attackSpan*.83)){
  game.windupPlayed=true;sound(game.enemy.boss?135:195,.14,'triangle',.026,-65);
 }
 if(!game.cuePlayed&&now>=game.attackAt-motion.swing){
  game.cuePlayed=true;sfxSwing();
 }
 }
 if(game.enemy?.burn>0){const e=game.enemy,burnTick=e.burn*dt/1000*.55;if(burnTick>0){const phase1=!!(e.finalBoss&&e.phase===1&&e.phaseRhythm),minHp=phase1?Math.max(1,Math.floor(e.maxHp*.5)):(game.tutorial&&!game.tutorialFinishing?1:0),actual=Math.max(0,e.hp-Math.max(minHp,e.hp-burnTick));e.hp-=actual;game.damage+=actual;if(phase1&&e.hp<=minHp)beginFinalPhase();else if(e.hp<=0){e.hp=0;clearFloor()}}}
 if(game.mode==='combat'&&!game.attackResolved&&now>=game.attackAt){
  // Remember the guard at physical contact; releasing it during a positive
  // input offset must not erase it, and a guard raised afterwards is too late.
  captureImpactGuard(now);
  presentContact();
  // Wait for the corrected late edge before assigning guard/miss. Pending
  // parries can resolve at contact; a late success starts fresh feedback now.
  if(game.pendingKind||now>inputTargetAt()+getParryWindow()){
   const effectAt=Math.max(game.attackAt,game.pendingKind?game.pendingAt:inputTargetAt()+getParryWindow());
   strikeResult(game.pendingKind||(game.guardAtImpact?'guard':'miss'),game.attackAt,effectAt);
  }
 }
 if(cueBeats&&game.mode==='combat'){
  // Follow the same next-phrase projection as enemy(), even while the previous input window is open.
  const beats=game.enemy.rhythm[game.enemy.index%game.enemy.rhythm.length];
  attackCues(now,game.attackBeat,game.attackAt,motionFor(game.enemy));
  attackCues(now,game.attackBeat+beats,scoreToPerf(score.origin+(game.attackBeat+beats)*score.beat),motionFor({...game.enemy,index:game.enemy.index+1},false));
 }
 }else if(m==='phase')updateFinalPhase(now);
 else if(m==='victory'&&now-game.clearAt>900)showRewards();
 shake=Math.max(0,shake-dt*.08);flash=Math.max(0,flash-dt*.003);particles=particles.filter(p=>{p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vx*=.985;p.vy+=.025;p.life-=dt;return p.life>0});texts=texts.filter(a=>now-a.t<a.life);
}
function frame(now){const dt=clamp(now-lastT,0,55);lastT=now;if(DEV_MODE&&devMusicAudition)scheduleScore();if(game.mode==='gameover'&&$('deathCover').inert&&now>=game.deathInputUnlockAt)syncDeathInputLock(now);if(game.mode!=='settings'&&game.mode!=='pause'&&game.mode!=='title'&&game.mode!=='reward'&&game.mode!=='gameover'&&game.mode!=='upgrade')update(now,dt);drawScreen(['settings','pause'].includes(game.mode)?pauseAt:now);updateCalibration();if(['combat','phase','victory'].includes(game.mode))syncHUD();if(DEV_MODE)window.__parryDevUI?.updateMusic?.();drawBonusSamples(now);requestAnimationFrame(frame)}
canvas.addEventListener('pointerdown',e=>{
 if(game.mode!=='combat')return;
 e.preventDefault();
 beginGuardInput('pointer:'+(e.pointerId??'mouse'));
});
document.addEventListener('pointerup',e=>endGuardInput('pointer:'+(e.pointerId??'mouse')));
document.addEventListener('pointercancel',e=>endGuardInput('pointer:'+(e.pointerId??'mouse')));
document.addEventListener('keydown',e=>{
 const control=e.target?.closest?.('button,input,select,textarea,a');
 if(game.mode==='settings'&&control&&control.id!=='calibrationTap'&&e.code!=='Escape')return;
 if(game.mode==='settings'&&['measure','try'].includes(calibration?.kind)&&['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)calibrationTap();return}
 if(e.code==='Escape'&&game.mode==='settings'){e.preventDefault();closeSettings();return}
 if((e.code==='Space'||e.code==='Enter')&&game.mode==='combat'){
  if(control)return;
  e.preventDefault();
  if(!e.repeat)beginGuardInput('key:'+e.code);
 }else if(e.code==='Escape'&&['combat','pause'].includes(game.mode)){
  e.preventDefault();togglePause();
 }else if(e.code==='Escape'&&game.mode==='confirm'){e.preventDefault();title();
 }else if(e.code==='Escape'&&game.mode==='upgrade'){
  e.preventDefault();closeUpgrade();
 }
});
document.addEventListener('keyup',e=>{
 if(e.code==='Space'||e.code==='Enter'){endGuardInput('key:'+e.code);if(game.mode==='combat'&&!e.target?.closest?.('button,input,select,textarea,a'))e.preventDefault();}
});
window.addEventListener('blur',clearGuardInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearGuardInput();if(calibration){cancelCalibration();$('calibrationStatus').textContent='測定を中断しました。もう一度測れます。';}}});
$('practiceEnemy').addEventListener('change',()=>{if(game.practice&&game.mode==='combat'){
 const key=$('practiceEnemy').value;
 if((!DEV_MODE&&!book.seen[key])||!P.findByKey(key))return;
 clearGuardInput();game.practiceKey=key;game.combo=0;game.charge=0;particles=[];texts=[];spawnEnemy(performance.now());game.parryAnimAt=-99999;game.lastImpactAt=-99999;game.lastStrikeKind='miss';game.whiffUntil=0;syncHUD()
 }});$('startBtn').addEventListener('click',()=>requestStart(false));$('practiceBtn').addEventListener('click',openCodex);$('deathCodexBtn').addEventListener('click',openCodex);$('deathPracticeBtn')?.addEventListener('click',()=>{if(!deathInputBlocked()&&game.enemy?.bookKey&&book.seen[game.enemy.bookKey])startPractice(game.enemy.bookKey)});$('codexCloseBtn').addEventListener('click',title);$('codexFilter').addEventListener('change',()=>{renderCodex();$('codexList').scrollTop=0;});$('codexTabs')?.addEventListener('click',e=>{const btn=e.target?.closest?.('[data-codex-tab]');if(!btn)return;codexTab=btn.dataset.codexTab==='skills'?'skills':'monsters';renderCodex();$('codexList').scrollTop=0});$('exitPracticeBtn').addEventListener('click',title);$('retryBtn').addEventListener('click',()=>{if(!deathInputBlocked())start(false)});$('homeBtn').addEventListener('click',()=>{if(!deathInputBlocked())title()});$('pauseBtn').addEventListener('click',togglePause);$('resumeBtn').addEventListener('click',togglePause);$('relicOfferCards').addEventListener('click',e=>{
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
$('rerollBtn').addEventListener('click',()=>{if(game.mode!=='reward'||game.rerolls<1)return;game.rerolls--;choiceSet=choosePool();renderRewards();sound(490,.13,'sine',.04,100)});$('healBtn').addEventListener('click',showHeal);$('audioBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('audioBtn').textContent=audioEnabled?'♫ SOUND ON':'♫ SOUND OFF';applyAudioPreferences();if(audioEnabled)sound(600,.10,'sine',.04,160)});

$('settingsBtn').addEventListener('click',openSettings);
$('settingsCloseBtn').addEventListener('click',closeSettings);
for(const kind of ['bgm','sfx'])$(kind+'Volume').addEventListener('input',()=>{preferences[kind]=PREF.normalize({[kind]:Number($(kind+'Volume').value)})[kind];$(kind+'VolumeValue').textContent=preferences[kind]+'%';persistPreferences()});
for(const [id,key]of [['screenShake','shake'],['screenFlash','flash']])$(id).addEventListener('change',()=>{preferences[key]=$(id).checked;persistPreferences()});
$('calibrationStart').addEventListener('click',startCalibration);
$('calibrationTap').addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();calibrationTap()});
$('calibrationTap').addEventListener('click',e=>{if(!e?.detail)calibrationTap()});
$('calibrationCancel').addEventListener('click',()=>{cancelCalibration();$('calibrationStatus').textContent='元の補正を保っています。';});
$('calibrationTry').addEventListener('click',tryCalibration);
$('calibrationApply').addEventListener('click',()=>{if(!calibration?.result)return;latencyOffset=calibration.result.candidate;$('latencySlider').value=String(latencyOffset);$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';saves.writeText(OFFSET_KEY,latencyOffset);cancelCalibration();$('calibrationStatus').textContent='補正を保存しました。';});
$('tutorialBtn').addEventListener('click',()=>requestStart(true));
$('continueBtn').addEventListener('click',restoreCheckpoint);
$('newRunConfirm').addEventListener('click',startTutorialOrRun);
$('newRunCancel').addEventListener('click',title);
$('suspendBtn').addEventListener('click',()=>{if(game.mode!=='pause')return;if(!DEV_MODE&&!game.practice){const snapshot=CP.capture({...game,mode:'combat'},choiceSet);if(!saves.writeCheckpoint(CP.KEY,snapshot).ok){saveFailed=true;return}}title();});
$('tutorialNext').addEventListener('click',()=>{if(game.tutorial){game.tutorialFinishing=true;syncTutorial();checkpoint()}});
$('tutorialSkip').addEventListener('click',()=>{game.tutorial=false;syncTutorial();checkpoint()});

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
  launch(floor=1,enemyKey='',practice=false,skin='normal',skinEffects=false,tempoLevel=null,timingMode='previous',inputOffset=null){
   const f=Math.min(999,Math.max(1,Math.floor(Number(floor)||1)));
   if(enemyKey&&!P.findByKey(enemyKey))return false;
   cueBeats=timingMode==='half'?.5:timingMode==='full'?1:timingMode==='onehalf'?1.5:0;
   beatContact=timingMode==='beat'||cueBeats>0;devTimingTrace={};
   if(typeof inputOffset==='number'&&Number.isFinite(inputOffset)){
    latencyOffset=clamp(inputOffset,-180,180);$('latencySlider').value=String(latencyOffset);$('latencyValue').textContent=(latencyOffset>=0?'+':'')+latencyOffset+'ms';
   }
   devPreviewSkin=PR.SKINS.find(s=>s.id===skin)?.id||'normal';
   const key=practice?(enemyKey||P.encounterForFloor(f,()=>.5).bookKey):null;
   start(practice,practice?key:null,{floor:f,enemyKey:enemyKey||null,allowUnseenPractice:practice,skinEffects,tempoLevel});
   return true;
  },
  merchant(profile='growing',skin='normal',skinEffects=true){
   if(!['growing','capped'].includes(profile))return false;
   devPreviewSkin=PR.SKINS.find(s=>s.id===skin)?.id||'normal';
   start(false,null,{floor:14,merchant:profile,skinEffects});return true;
  },
  survival(profile='all',skin='normal',skinEffects=true,polished=false){
   if(!['baseline','overflow','wardcraft','inheritance','sigil','all'].includes(profile))return false;
   devPreviewSkin=PR.SKINS.find(s=>s.id===skin)?.id||'normal';
   start(false,null,{floor:80,enemyKey:'endking:elite',survival:profile,polished:!!polished,skinEffects});return true;
  },
  survivalHit(kind){
   if(game.mode!=='combat'||!game.devSurvival||!['guard','miss'].includes(kind))return false;
   strikeResult(kind,performance.now());return true;
  },
  previewSkin(){return devPreviewSkin},
  skinState(){return {id:visualSkin(),effects:!!game.skinEffects,hpMultiplier:runSkinRules().hp,parryWindow:getParryWindow(),justWindow:getPerfectWindow(),tempoOffset:game.skinTempoOffset||0,tempoReduction:game.tempoBpmReduction||0}},
  timingState(){
   const active=score.active&&game.mode==='combat',beatAt=game.attackAt-contactDelay(),origin=beatAt-game.attackBeat*score.beat*1000;
   const motion=game.enemy?motionFor(game.enemy):null;
   return {mode:cueBeats===.5?'half':cueBeats===1?'full':cueBeats===1.5?'onehalf':beatContact?'beat':'previous',active,offset:latencyOffset,contactDelta:contactDelay(),inputDelta:latencyOffset,
    cueBeats:cueBeats||null,windup:motion?!motion.noWindup:false,windupLead:motion&&!motion.noWindup?(motion.cuePrepare??Math.min(motion.prepare,game.attackSpan*.83)):null,swingLead:motion?.swing??null,
    beatAt,contactAt:game.attackAt,targetAt:inputTargetAt(),beatPulse:active&&performance.now()>=origin&&((performance.now()-origin)%(score.beat*1000))<55,
    lastInput:devTimingTrace.input?{...devTimingTrace.input}:null,firstContactFrameMs:devTimingTrace.frame?.delay??null};
  },
  reset(){title()},
  musicList(){return MUSIC?.list().filter(piece=>piece.floor==null)||[]},
  musicReviews(){return MUSIC?.list().filter(piece=>piece.floor!=null)||[]},
  previewMusic(id,variant='normal'){
   const piece=MUSIC?.get(id);
   if(!audioEnabled||!piece||!['normal','boss'].includes(variant))return false;
   title();devMusicTheme=id;devMusicAudition=true;startScore({kind:'knight',boss:piece.floor!=null||variant==='boss'});
   if(!score.active)devMusicAudition=false;return score.active;
  },
  stopMusic(){if(!devMusicAudition)return false;stopScore();devMusicAudition=false;return true},
  practiceMusic(id,variant='normal'){
   const theme=MUSIC?.get(id);if(!theme||!['normal','boss'].includes(variant))return false;
   const zone=P.zoneForFloor(theme.from),floor=theme.floor??theme.from+(variant==='boss'?4:0);
   const enemy=theme.floor!=null||variant==='boss'?zone.boss:zone.fixed[1];
   const key=enemy+(theme.floor===80?':elite':':normal');
   title();start(true,key,{floor,allowUnseenPractice:true,musicId:id});return true;
  },
  musicState(){
   const beats=score.active&&audio.context?Math.max(0,(audio.context.currentTime-score.origin)/score.beat-score.musicStartStep/2):0;
   const bars=MUSIC?.get(score.music)?.bars||8;
   return {active:score.active,audition:devMusicAudition,id:score.music,bpm:score.bpm,bars,bar:Math.floor(beats/4)%bars+1,beat:Math.floor(beats)%4+1};
  },
  getSfxVolume:audio.getDevSfxVolume,
  setSfxVolume:audio.setDevSfxVolume,
  previewSound(kind){
   if(!audioEnabled||!window.ParryCombatSfx?.PROFILES[kind])return false;
   const ac=audio.ensureContext();
   return !!ac&&window.ParryCombatSfx.play(ac,kind,ac.currentTime,steelDestination());
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
 window.__parryV05=()=>({mode:game.mode,floor:game.floor,enemy:game.enemy?.preview?'？？？':game.enemy?.id,preview:!!game.enemy?.preview,practice:!!game.practice,encounterKey:game.enemy?.preview?null:game.enemy?.bookKey,encounterElite:!!game.enemy?.elite,encounterRare:!!game.enemy?.rare,discovered:Object.keys(book.seen),souls:meta.coins,bpm:score.bpm,attackBeat:game.attackBeat,attackAt:game.attackAt,beat:score.beat,scoreOrigin:score.origin,audioNow:audio.context?.currentTime,scoreActive:score.active,combo:game.combo,hp:game.hp,maxHp:game.maxHp,shield:game.shield,attackSpan:game.attackSpan,guardHeld:!!game.guardHeld,guardReady:guardReadyAt(performance.now()),lastStrikeKind:game.lastStrikeKind,parryAnimAt:game.parryAnimAt,parryCooldownRemaining:Math.max(0,(game.parryReadyAt||0)-performance.now()),parryReleaseRemaining:Math.max(0,PARRY_RELEASE_MS-(performance.now()-(game.guardReleasedAt??-99999))),offset:latencyOffset,clock:audioClock.snapshot(),rerolls:game.rerolls,reviveUsed:!!game.reviveUsed,enemyHp:game.enemy?.hp,enemyMaxHp:game.enemy?.maxHp,enemyAttack:game.enemy?.atk,bossPhase:game.enemy?.phase||1,enemyRhythm:[...(game.enemy?.rhythm||[])],phaseStage:game.phaseStage||null,phaseCountStartAt:game.phaseCountStartAt||0,finalClear:!!game.finalClear,justStreak:game.justStreak||0,overchargeCount:game.overchargeCount||0,frostCount:game.frostCount||0,frostWard:!!game.frostWard,fortitudeReady:!!game.fortitudeReady,bloodlustPending:game.bloodlustPending||0,sealedSkillIds:[...(game.sealedSkillIds||[])],runSkills:{...(game.lv||{})},skillBreaks:{...(game.skillBreaks||{})},polishedRelics:[...(game.polishedRelics||[])],charge:game.charge||0,towerCoins:game.towerCoins||0,towerCoinsEarned:game.towerCoinsEarned||0,routeTrial:!!game.routeTrial,currentRoom:game.currentRoom||null,eventId:game.eventId||null,roomStage:game.roomStage||null,routeSkillSet:[...(game.routeSkillSet||[])],relicReturn:game.relicReturn||null,relicMirrorTarget:game.relicMirrorTarget||null,relics:[...(game.relics||[])],relicDiscarded:[...(game.relicDiscarded||[])],relicOffer:[...(game.relicOffer||[])],relicRewardKind:game.relicRewardKind||null,relicSwapTarget:game.relicSwapTarget||null,relicMaskReady:!!game.relicMaskReady,relicGearReady:!!game.relicGearReady,relicPactReady:!!game.relicPactReady,relicBellDue:!!game.relicBellDue,relicCounters:{...(game.relicCounters||{})},permanent:{...permanent,unlockedSkills:[...permanent.unlockedSkills],equipped:[...permanent.equipped],sealedSkills:[...permanent.sealedSkills],unlockedExtras:[...permanent.unlockedExtras],enabledExtras:[...permanent.enabledExtras],extraOptions:{...permanent.extraOptions}}});resize();title();window.ParryDiagnostics?.registerGame('v0.9.9',window.__parryV05);requestAnimationFrame(frame);
})();
