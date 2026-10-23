'use strict';
// Standalone checkpoint-boss model. Actual enemy/upgrade data are imported.
// NOT a full 1-80F playthrough, a prediction of user skill, or a loot simulator.
const P=require('../assets/encounters.js'),PR=require('../assets/progression.js');
const FLOORS=[10,20,40,60,80],TRIALS=240,MAX_ATTACKS=2400;
const PROFILES=[
 {id:'none',name:'無強化',stats:{life:0,attack:0,ward:0},perm:{regen:0,bossWard:0,soulGain:0}},
 {id:'middle',name:'中程度',stats:{life:6,attack:5,ward:6},perm:{regen:3,bossWard:3,soulGain:3}},
 {id:'max',name:'最大強化',stats:{life:12,attack:8,ward:12},perm:{regen:5,bossWard:6,soulGain:5}}
];
const STYLES=[
 {id:'defensive',name:'ガード多用',just:.10,parry:.45,guard:.40,miss:.05},
 {id:'offensive',name:'パリィ中心',just:.30,parry:.57,guard:.10,miss:.03}
];
// Shared *hypothetical* run skill selection, not guaranteed by reward rolls.
const SKILLS={
 10:{blade:1,blood:1},
 20:{blade:2,heal:1,blood:1,aegis:1},
 40:{blade:4,heal:2,blood:2,aegis:2,fury:1,thunder:1,echo:1},
 60:{blade:6,heal:4,blood:3,aegis:3,fury:2,thunder:2,echo:2},
 80:{blade:8,heal:6,blood:4,aegis:4,fury:3,thunder:4,echo:3}
};
const ceil=Math.ceil;
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function foeAt(floor){
 if(!FLOORS.includes(floor))throw Error('Unsupported floor');
 const foe=P.encounterForFloor(floor,()=>.5);
 if(!foe.boss||!foe.elite)throw Error('Expected an elite checkpoint boss');
 return Object.assign({},foe,P.baseStats(foe,floor));
}
function gear(p,floor,mode='bossOnly',includeSkills=true){
 const s=includeSkills?SKILLS[floor]:{};
 if(!s)throw Error('No skill path');
 const hp=65+PR.baseValue(p.stats,'life')+15*(s.heal||0);
 return {skills:s,hp,attack:25+PR.baseValue(p.stats,'attack'),
  shield:(mode==='full'?PR.baseValue(p.stats,'ward'):0)+PR.value(p.perm,'bossWard'),
  regen:ceil(hp*PR.value(p.perm,'regen')/100),
  soulMultiplier:1+PR.value(p.perm,'soulGain')/100};
}
function guardSurvival(atk,hp,shield){
 const damage=ceil(Math.min(atk*.30,hp*.40));let survived=0;
 for(let i=0;i<10000;i++){
  const absorbed=Math.min(shield,damage);
  shield-=absorbed;hp-=damage-absorbed;
  if(hp<=0)break;
  survived++;
 }
 return {damage,survived};
}
function kindFor(roll,style){
 if(style==='allJust')return 'just';
 if(style==='allParry')return 'parry';
 if(roll<style.just)return 'just';
 if(roll<style.just+style.parry)return 'parry';
 if(roll<style.just+style.parry+style.guard)return 'guard';
 return 'miss';
}
function simulate(profile,floor,style,seed=1,options={}){
 const foe=foeAt(floor),eq=gear(profile,floor,options.shieldMode||'bossOnly',options.includeSkills!==false);
 const s=eq.skills,lev=id=>s[id]||0,random=rng(seed),beat=60/(136+(foe.elite?6:0));
 let hp=eq.hp,shield=eq.shield,enemy=foe.maxHp,combo=0,charge=0,time=0,phase=1,rhythm=foe.rhythm,idx=0,phasePending=false;
 let parries=0,guards=0,misses=0,justs=0;
 function deal(raw){const d=Math.min(enemy,Math.max(1,Math.round(raw)));enemy-=d;return d;}
 function receive(raw){
  let d=Math.max(1,ceil(raw)),absorbed=Math.min(d,shield);
  shield-=absorbed;d-=absorbed;hp=Math.max(0,hp-d);
 }
 for(let step=1;step<=MAX_ATTACKS;step++){
  if(step===1)time+=4*beat;
  else if(phasePending){
   phase=2;phasePending=false;rhythm=foe.phaseRhythm;idx=0;
   time+=1.5+.17+8*beat; // second movement: intro, 4-beat count-in, new 4-beat telegraph
  }else time+=rhythm[idx++%rhythm.length]*beat;
  const result=kindFor(random(),style);
  if(result==='miss'){
   misses++;combo=0;charge=0;receive(foe.atk);
  }else if(result==='guard'){
   guards++;combo=Math.max(0,combo-Math.max(5,ceil(combo*.20)));
   if(!lev('aegis'))charge=0;
   receive(Math.min(foe.atk*.30,eq.hp*.40));
  }else{
   const just=result==='just';parries++;if(just)justs++;combo++;
   charge=Math.min(7,charge+(just?2:1));
   const mult=(1+lev('blade')*.25)*(1+Math.min(combo,120)*(.012+lev('fury')*.02));
   const val=eq.attack*mult*(just?1.6:1);
   let dealt=deal(val);
   if(enemy>0&&lev('thunder'))dealt+=deal((10+12*lev('thunder'))*(1+combo*.018));
   if(enemy>0&&lev('echo')){
    dealt+=deal(val*(.25+lev('echo')*.13));
    if(enemy>0&&lev('thunder'))dealt+=deal((10+12*lev('thunder'))*(1+lev('echo')*.24));
   }
   if(enemy>0&&just&&lev('aegis'))
    shield=Math.min(100+20*lev('aegis'),shield+3+3*lev('aegis'));
   if(enemy>0&&charge>=7){charge=0;dealt+=deal((eq.attack*1.5+lev('rune')*45)*mult);}
   if(lev('blood')&&dealt>0){
    const bonus=lev('fury')?combo:0;
    const recovered=Math.min(Math.max(2,Math.round(dealt*(6+2*lev('blood')+bonus)/100)),ceil(eq.hp*(25+bonus)/100));
    hp=Math.min(eq.hp,hp+recovered);
   }
  }
  if(hp<=0)return {won:false,step,seconds:time,parries,guards,misses,justs};
  if(enemy<=0)return {won:true,step,seconds:time,parries,guards,misses,justs};
  if(floor===80&&phase===1&&!phasePending&&enemy<=foe.maxHp*.5)phasePending=true;
 }
 return {won:false,timeout:true,step:MAX_ATTACKS,seconds:time,parries,guards,misses,justs};
}
function median(nums){if(!nums.length)return null;const a=nums.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function results(){
 const rows=[];
 for(const floor of FLOORS)for(const profile of PROFILES){
  const f=foeAt(floor),g=gear(profile,floor),full=gear(profile,floor,'full');
  const guard=guardSurvival(f.atk,g.hp,g.shield);
  const row={floor,profile:profile.id,enemy:f.id,bossHp:f.maxHp,bossAtk:f.atk,
   hp:g.hp,baseAtk:g.attack,bossOnlyShield:g.shield,fullShield:full.shield,
   guardDamage:guard.damage,guardSurvived:guard.survived,
   guardSurvivedFull:guardSurvival(f.atk,full.hp,full.shield).survived,
   missSurvives:g.hp+g.shield>f.atk,missSurvivesFull:full.hp+full.shield>f.atk,
   regenOnClear:g.regen,lowerBoundSoulAtDeath:ceil(Math.max(3,floor*2)*g.soulMultiplier)};
  for(const all of ['allJust','allParry']){
   const x=simulate(profile,floor,all);
   row[all+'Hits']=x.won?x.step:null;
   row[all+'Minutes']=x.won?+(x.seconds/60).toFixed(1):null;
  }
  for(let si=0;si<STYLES.length;si++){
   const st=STYLES[si],out=[];
   for(let i=0;i<TRIALS;i++)out.push(simulate(profile,floor,st,(floor*100003+i*7919+PROFILES.indexOf(profile)*19891+si*31337)>>>0));
   const won=out.filter(x=>x.won);
   row[st.id+'Wins']=won.length;
   row[st.id+'Trials']=TRIALS;
   row[st.id+'MedianStrikes']=median(won.map(x=>x.step));
   row[st.id+'MedianMinutes']=won.length?+(median(won.map(x=>x.seconds))/60).toFixed(1):null;
   row[st.id+'Timeouts']=out.filter(x=>x.timeout).length;
  }
  rows.push(row);
 }
 return rows;
}
function markdown(rows){
 let s='# 恒久強化・第3段階：ボス戦スナップショット比較\n\n';
 s+='**注意：1〜80階を通したクリア率ではありません。** 各ボス戦の開始時点でHP満タン・コンボ0、道中の初期障壁は消費済みと仮定しています。\n\n';
 s+='|階層|育成|ボスHP|敵攻撃|自HP|ボス障壁|ガード被ダメ|連続ガード生存|MISS耐久|ガード多用勝率|パリィ中心勝率|全JUST最短打数|\n';
 s+='|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|\n';
 for(const x of rows){
  const name=PROFILES.find(p=>p.id===x.profile).name;
  s+='|'+[x.floor,name,x.bossHp,x.bossAtk,x.hp,x.bossOnlyShield,x.guardDamage,x.guardSurvived,x.missSurvives?'可':'不可',(100*x.defensiveWins/TRIALS).toFixed(1)+'%',(100*x.offensiveWins/TRIALS).toFixed(1)+'%',x.allJustHits===null?'未討伐':x.allJustHits].join('|')+'|\n';
 }
 s+='\n#### 前提・除外要素\n\n';
 s+='- 実装の敵・恒久強化モジュールを参照。ラン内スキルは全プロフィール共通の仮定値（SKILLS参照）で、実際のランダムドロップは再現しません。\n';
 s+='- ガード多用：JUST10%/PARRY45%/GUARD40%/MISS5%。パリィ中心：JUST30%/PARRY57%/GUARD10%/MISS3%。固定シード各'+TRIALS+'試行。\n';
 s+='- 通常敵・分岐・遺物・復活・炎・反射・氷結・パリィ入力遅延・階層間のリソース推移はモデル外。ボスのリズムは討伐時間の概算に使用。\n';
 s+='- 80階第二楽章はフェーズ時間込みの概算。理論上限'+MAX_ATTACKS+'発で未討伐の試行は失敗扱い。勝率は想定操作モデル内のみ有効。\n';
 return s;
}
if(require.main===module)process.stdout.write(process.argv.includes('--json')?JSON.stringify(results(),null,2)+'\n':markdown(results()));
module.exports={FLOORS,PROFILES,STYLES,SKILLS,TRIALS,MAX_ATTACKS,foeAt,gear,guardSurvival,simulate,results,markdown};
