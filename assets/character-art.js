/* Optional character-art experiment.
 * Canvas 2D vector layers only. No hitboxes, game state, Web Audio or persistence.
 * Deliberately scoped to the hero and the original 'knight' enemy.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryCharacterArt=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const INK='#151b2c';
 function poly(ctx,pts,fill,edge=INK,width=2){
  ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(edge){ctx.lineJoin='round';ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.stroke();}
 }
 function line(ctx,pts,color,width=2){
  ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
 }
 function dot(ctx,x,y,r,fill){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
 }
 function ellipse(ctx,x,y,rx,ry,fill){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
 }
 function rune(ctx,x,y,glow){
  ctx.save();ctx.translate(x,y);
  ctx.shadowColor=glow;ctx.shadowBlur=8;
  line(ctx,[[0,-9],[7,0],[0,9],[-7,0],[0,-9]],glow,2);
  line(ctx,[[-5,0],[5,0]],'#f9f4d6',1.6);
  ctx.restore();
 }
 function drawHero(ctx,pose){
  if(!ctx||!pose)return false;
  const {now=0,lift=0,heldLift=0,push=0,action=0,guardHeld=false,lastStrikeKind='',lastImpactAt=-99999}=pose;
  const flutter=Math.sin(now/270)*2.4+push*8,breath=Math.sin(now/450)*1.2;
  ctx.save();
  // Inner / outer cape: asymmetric silhouette with animated loose hem.
  poly(ctx,[[-16,-73],[-31,-78],[-46,-62],[-55+flutter,-14],[-43+flutter,1],[-30,-12],[-12,-25]],'#233b50');
  poly(ctx,[[-24,-72],[-42,-51],[-49+flutter,-7],[-35+flutter,-17],[-20,-38]],'#26778a',null);
  line(ctx,[[-30,-65],[-41,-26],[-39+flutter,-12]],'#64bec0',1.7);
  // Boot and greave pairs are drawn behind the torso.
  poly(ctx,[[-18,-39],[0,-39],[-2,-12],[-6,0],[-22,0]],'#50667d');
  poly(ctx,[[1,-40],[18,-39],[23,-2],[8,0],[3,-17]],'#617b8d');
  poly(ctx,[[-21,-20],[-4,-21],[-6,-4],[-20,-4]],'#a6bfca');
  poly(ctx,[[8,-18],[22,-16],[25,-3],[10,-3]],'#a6b8c8');
  poly(ctx,[[-23,-5],[-2,-5],[0,3],[-27,3]],'#1a2c3f');
  poly(ctx,[[7,-5],[25,-5],[29,3],[5,3]],'#172c40');
  line(ctx,[[-22,-1],[-4,-1]],'#78b3c1',1.6);
  // Asymmetric cuirass, layered faulds and shoulder caps.
  poly(ctx,[[-23,-87],[-7,-93],[15,-85],[27,-56],[17,-39],[-18,-37],[-28,-60]],'#283d55');
  poly(ctx,[[-22,-84],[-5,-89],[6,-73],[-2,-47],[-19,-53]],'#aec6ce');
  poly(ctx,[[1,-85],[17,-81],[24,-58],[11,-46],[-2,-47]],'#647f94');
  poly(ctx,[[-17,-53],[10,-52],[19,-43],[8,-35],[-16,-37]],'#394b67');
  poly(ctx,[[-20,-88],[-31,-77],[-27,-62],[-11,-67]],'#b7c7d0');
  poly(ctx,[[14,-84],[28,-73],[29,-59],[15,-67]],'#9fb7c5');
  line(ctx,[[-17,-65],[13,-56]],'#e9d9b0',2.4);
  poly(ctx,[[-5,-57],[2,-65],[9,-57],[2,-48]],'#d6b77d',null);
  dot(ctx,2,-57,2.2,'#f9edc8');
  // Helmet: a distinct pointed crest and narrow teal sight line.
  ctx.save();ctx.translate(0,breath*.45);
  poly(ctx,[[-20,-109],[-3,-120],[14,-116],[23,-100],[18,-82],[-17,-81],[-24,-96]],'#728a9d');
  poly(ctx,[[-21,-109],[-6,-119],[4,-119],[-1,-89],[-19,-89]],'#c6d6d9');
  poly(ctx,[[6,-107],[20,-105],[15,-91],[5,-91]],'#192a3f');
  poly(ctx,[[-2,-121],[3,-133],[13,-118],[8,-115]],'#dfc48e');
  line(ctx,[[4,-100],[17,-99]],'#7be0dd',3.5);
  line(ctx,[[8,-93],[14,-93]],'#d9f6f2',1.4);
  ctx.restore();
  // Shield occupies the existing guard anchor; no change to its raise timing.
  ctx.save();ctx.translate(21+lift*18-push*5,-48-lift*10+push*2);
  ctx.rotate(-.16+lift*.18-push*.23);
  poly(ctx,[[-16,-28],[16,-27],[19,6],[2,27],[-17,7]],'#d3d7ce');
  poly(ctx,[[-12,-23],[12,-23],[14,5],[2,20],[-12,6]],'#284c62');
  poly(ctx,[[-9,-20],[1,-23],[1,18],[-9,4]],'#41798a',null);
  line(ctx,[[2,-18],[2,16]],'#d9bc82',3);
  line(ctx,[[-8,-1],[12,-1]],'#d9bc82',3);
  poly(ctx,[[-2,-6],[5,-6],[8,0],[3,7],[-3,1]],'#f0dda3',null);
  if(guardHeld&&heldLift>=1){
   ctx.save();ctx.globalAlpha=.5;ctx.shadowColor='#85e6f7';ctx.shadowBlur=16;
   line(ctx,[[-16,-28],[16,-27],[19,6],[2,27],[-17,7],[-16,-28]],'#9febf5',2.5);ctx.restore();
  }
  if(lastStrikeKind==='just'&&now-lastImpactAt<170){
   ctx.save();ctx.shadowColor='#8ef4ff';ctx.shadowBlur=21;
   ctx.strokeStyle='#dcfaff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(1,-1,27,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.restore();
  // Separate sword arm and blade retain existing attack / parry interpolation.
  ctx.save();ctx.translate(12,-65);ctx.rotate(action*.65+.07-lift*.1);
  poly(ctx,[[-12,-3],[1,-8],[10,7],[-2,14]],'#536f89');
  poly(ctx,[[-2,7],[11,-46],[18,-54],[17,-42],[6,11]],'#d3e8ed');
  poly(ctx,[[12,-42],[17,-54],[17,-42],[5,8]],'#f8faf1',null);
  line(ctx,[[-12,8],[17,11]],'#d5b57a',5.3);
  line(ctx,[[1,9],[-2,25]],'#536477',6);
  dot(ctx,-2,25,3,'#d7bc80');
  ctx.restore();
  ctx.restore();
  return true;
 }

 // All enemy poses are in the same local coordinate system as game.js:
 // feet y=0, body center ~(-70), and attack tip (reach,-58) at impact.
 function attackTip(d){
  const e=d.e,id=e.sprite||e.id,c=d.charge||0,p=d.p||0,a=d.action??p,r=d.recoil||0;
  const drive=smooth(a),y=d.impactY??-58;
  const reach=d.m?.reach||(e.kind==='slime'?49:e.kind==='guardian'?130:e.kind==='wraith'?108:110);
  if(id==='sentinel')return {x:mix(34,reach,drive)-8*r,y:mix(-142,y,drive)-8*r};
  if(id==='clockwork')return {x:mix(38,reach,drive)-6*r,y:mix(-98,y,drive)-6*r};
  if(e.kind==='slime'){
   const leap=smooth(p);return {x:reach-11*(1-leap),y:y+28*c+8*(1-leap)};
  }
  if(e.kind==='rogue'){
   const handed=Math.max(0,(Number(e.index)||0)-((d.rec||0)>0?1:0))%2;
   return id==='duelist'?{x:mix(35,reach,drive),y:mix(handed?-38:-102,y,drive)}
    :{x:50+(reach-50)*a,y:-68+(y+68)*a-r*20};
  }
  if(e.kind==='wraith')return id==='cantor'
   ?{x:mix(38,reach,drive)-9*r,y:mix(-103,y,drive)-5*r}
   :{x:32+(reach-32)*a-r*14,y:-89+(y+89)*a+r*15};
  const angle=p>0?mix(-2.16,0,d.weighted?p:smooth(p*p)):(c>0?mix(-.92,-2.16,c):-.92);
  const bladeAngle=mix(angle,0,d.rec||0)-r*(e.kind==='guardian'?.32:.53);
  return {x:22+(e.kind==='guardian'?108:88)*Math.cos(bladeAngle),y:y+(e.kind==='guardian'?108:88)*Math.sin(bladeAngle),angle:bladeAngle};
 }
 function drawSlime(ctx,d){
  const {now=0,charge=0,p=0,recoil=0}=d,reach=d.m?.reach||49;
  const tip=attackTip(d),leap=smooth(p),squash=charge*(d.weighted?.34:.25),crestX=tip.x,crestY=tip.y;
  const wobble=Math.sin(now/240)*1.5;
  ctx.save();ctx.translate(0,wobble*(1-leap));
  // An irregular, semitransparent-looking blob with a sweeping forward snout.
  const top=-84+(d.weighted?43:30)*charge-5*leap,back=-40-(d.weighted?17:10)*charge-13*leap;
  ctx.beginPath();ctx.moveTo(back,0);
  ctx.bezierCurveTo(back-18,-21,-40,-62+20*charge,-16,top);
  ctx.bezierCurveTo(3,top-18,crestX-22,top-14,crestX,crestY);
  ctx.bezierCurveTo(crestX+5,crestY+25,42+15*leap,-15,44,0);
  ctx.closePath();ctx.fillStyle='#338a87';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();
  poly(ctx,[[-34,-23],[-27,top+13],[-4,top+5],[17,-48],[31,-14],[-5,-4]],'#5cc2b2',null);
  poly(ctx,[[-29,-21],[-17,-48],[-6,-51],[-17,-18]],'#a2ead2',null);
  line(ctx,[[-23,top+16],[-7,top+7],[10,top+10]],'#e3ffec',4);
  // Faceted nucleus is visible from across the arena.
  poly(ctx,[[-10,-48],[0,-58],[15,-47],[7,-31],[-5,-30]],'#256e78',null);
  poly(ctx,[[0,-53],[12,-46],[5,-35]],'#80f5dd',null);
  dot(ctx,-12+7*leap,-48+19*squash,6.5,'#f7f3dc');
  dot(ctx,14+7*leap,-48+19*squash,6.5,'#f7f3dc');
  dot(ctx,-10+7*leap,-47+19*squash,2.9,'#203948');
  dot(ctx,16+7*leap,-47+19*squash,2.9,'#203948');
  line(ctx,[[0,-24],[10,-23]],'#2a6b69',2.5);
  // The striking protrusion terminates at the legacy slime contact coordinate.
  poly(ctx,[[crestX-13,crestY+11],[crestX,crestY],[crestX-8,crestY-10]],'#b6fff0',null);
  if(recoil>0){ctx.save();ctx.globalAlpha=.22*recoil;ellipse(ctx,-2,-32,39+recoil*9,26,'#effff1');ctx.restore();}
  ctx.restore();return true;
 }
 function drawRogue(ctx,d,dual){
  const {e,now=0,charge=0,p=0,action=p,rec=0,recoil=0}=d;
  const crouch=charge*(d.weighted?(dual?20:28):(dual?14:19)),drive=smooth(action);
  ctx.save();
  poly(ctx,[[-24,-82+crouch],[-42,-58+crouch],[-43,-14],[-29,0],[-5,-15],[26,0],[21,-61+crouch]],'#402a42');
  poly(ctx,[[-32,-62+crouch],[-40,-24],[-26,-10],[-15,-42]],dual?'#943b50':'#564362',null);
  poly(ctx,[[-24,-43],[0,-42],[-7,0],[-27,0]],'#545a72');
  poly(ctx,[[6,-41],[22,-39],[30,0],[10,0]],'#797e98');
  poly(ctx,[[-32,-5],[-6,-5],[-5,2],[-33,2]],'#25263d');
  poly(ctx,[[8,-5],[29,-5],[31,2],[8,2]],'#25263d');
  poly(ctx,[[-28,-87+crouch],[-12,-94+crouch],[19,-86+crouch],[27,-51+crouch],[-20,-43+crouch]],dual?'#772e48':'#5d5674');
  poly(ctx,[[-17,-86+crouch],[3,-91+crouch],[8,-51+crouch],[-12,-49+crouch]],dual?'#bb5861':'#9492ab');
  poly(ctx,[[9,-85+crouch],[20,-77+crouch],[23,-54+crouch],[9,-51+crouch]],'#b6a3ae',null);
  poly(ctx,[[-20,-111+crouch],[-3,-125+crouch],[17,-110+crouch],[19,-89+crouch],[-18,-89+crouch]],'#332b43');
  poly(ctx,[[-18,-109+crouch],[-3,-123+crouch],[-7,-93+crouch],[-19,-93+crouch]],'#70637e');
  line(ctx,[[-11,-99+crouch],[12,-99+crouch]],dual?'#ff9c9e':'#f0aed9',3.5);
  line(ctx,[[-11,-93+crouch],[12,-93+crouch]],'#d5bdce',1.5);
  const handed=Math.max(0,(Number(e.index)||0)-(rec>0?1:0))%2;
  const tip=attackTip(d),tipX=tip.x,tipY=tip.y;
  const fistX=dual?22+18*drive:22+41*action-recoil*22;
  const fistY=dual?-57-3*charge:-53+7*charge-5*action-recoil*6;
  // A visible elbow transfers the crouch into the thrust; the blade stays gripped.
  const arm=d.weighted?[[12,-56+crouch],[19+14*drive,-37+crouch*.45],[fistX,fistY]]:[[12,-56+crouch],[fistX,fistY]];
  if(d.weighted)line(ctx,arm,INK,14);line(ctx,arm,dual?'#d5afb3':'#aba1b8',10);
  dot(ctx,fistX,fistY,5,'#d5bbc2');
  line(ctx,[[fistX,fistY],[tipX,tipY]],'#45425e',9);
  line(ctx,[[fistX,fistY],[tipX,tipY]],dual?'#ffd4d8':'#f0eaf8',5);
  line(ctx,[[fistX,fistY],[tipX,tipY]],'#fffefd',1.5);
  line(ctx,[[fistX-6,fistY-8],[fistX+6,fistY+8]],'#b98b85',5);
  if(dual){
   const secondY=d.weighted&&handed?24*drive:0;
   line(ctx,[[-18,-54+crouch],[-13+7*charge,-62-4*charge+secondY]],'#a97788',8);
   line(ctx,[[-13+7*charge,-62-4*charge+secondY],[-43+24*charge,-121+16*charge+secondY]],'#ecd3d4',5.5);
  }
  if(action>.15&&action<.9){
   ctx.save();ctx.globalAlpha=.22;
   line(ctx,[[tipX-21,tipY+13],[tipX,tipY+4]],dual?'#ff8898':'#d8b5ff',10);ctx.restore();
  }
  ctx.restore();return true;
 }
 function drawWraith(ctx,d,cantor){
  const {now=0,charge=0,p=0,action=p,recoil=0}=d;
  const hover=Math.sin(now/320)*3,lift=charge*(d.weighted?(cantor?15:21):(cantor?10:14)),drive=smooth(action);
  ctx.save();ctx.translate(0,hover*(1-action));
  // Robe has three separated floating tails, rather than conventional legs.
  poly(ctx,[[-36,-79+lift],[-23,-106-lift],[14,-108-lift],[36,-76+lift],[42,-22],[22,-2],[8,-21],[-9,1],[-38,-16]],cantor?'#61518a':'#434b89');
  poly(ctx,[[-37,-58],[-45,-15],[-26,-4],[-17,-36]],cantor?'#8271b8':'#626dae',null);
  poly(ctx,[[16,-54],[35,-32],[45,-11],[30,0],[14,-34]],'#4b507e',null);
  poly(ctx,[[-22,-99-lift],[0,-126-lift],[23,-98-lift],[14,-69],[-17,-69]],cantor?'#302f56':'#252d5b');
  poly(ctx,[[-11,-104-lift],[0,-119-lift],[9,-103-lift],[6,-88-lift],[-7,-88-lift]],cantor?'#594979':'#465583');
  line(ctx,[[-12,-88-lift],[13,-88-lift]],'#c7def4',2);
  dot(ctx,-8,-94-lift,3.3,'#87ecff');dot(ctx,9,-94-lift,3.3,'#87ecff');
  if(cantor){
   rune(ctx,-25,-81-lift,'#c5a7f9');
   rune(ctx,-16,-62-lift,'#a3edff');
   // The cantor projects a luminous palm and scripted shockwave.
   const hand=[25+12*drive,-62-29*charge+8*drive],tip=attackTip(d),tx=tip.x,ty=tip.y;
   line(ctx,[[10,-59],hand],'#af9ed8',9);
   line(ctx,[hand,[tx,ty]],'#c8edfb',7);
   dot(ctx,tx,ty,5,'#e2f9ff');
   if(charge>.1)for(let i=0;i<3;i++){const a=now/640+i*Math.PI*2/3;dot(ctx,19+Math.cos(a)*25,-73+Math.sin(a)*19,2.5,'#c8b8f8');}
  }else{
   const handX=22+69*action-recoil*11,handY=-38-19*charge-19*action+recoil*13;
   const tip=attackTip(d),tipX=tip.x,tipY=tip.y;
   line(ctx,[[18,-62-lift],[handX,handY]],'#7b85bc',11);
   line(ctx,[[handX,handY],[tipX,tipY]],'#c0def5',8);
   for(const off of [-7,0,7])line(ctx,[[tipX-8,tipY+off*.3],[tipX,tipY+off]],'#e2f6ff',2.5);
  }
  ctx.restore();return true;
 }
 function drawGuardian(ctx,d){
  const {e,charge=0,p=0,rec=0,recoil=0,now=0}=d;
  const lean=d.weighted?charge*14-Math.max(p,rec)*8:charge*8+p*10,flame=Math.sin(now/260)*2;
  ctx.save();
  poly(ctx,[[-20,-91],[-44,-77],[-51+flame,-23],[-34,-5],[-13,-20],[34,-3],[30,-66]],'#543b46');
  poly(ctx,[[-37,-67],[-46+flame,-18],[-28,-13],[-19,-53]],'#905c51',null);
  poly(ctx,[[-26,-44],[-6,-42],[-11,0],[-33,0]],'#675d70');
  poly(ctx,[[7,-42],[28,-39],[36,0],[10,0]],'#8a7480');
  poly(ctx,[[-34,-5],[-9,-4],[-8,3],[-36,3]],'#322c3d');
  poly(ctx,[[11,-4],[35,-4],[40,3],[9,3]],'#322c3d');
  poly(ctx,[[-34,-99-lean],[-17,-110-lean],[23,-103-lean],[37,-60-lean],[20,-38],[-26,-40],[-37,-71]],'#745f63');
  poly(ctx,[[-30,-96-lean],[-37,-80-lean],[-29,-58],[-9,-75]],'#cb9d85');
  poly(ctx,[[21,-96-lean],[37,-81-lean],[39,-56],[24,-67]],'#b58c79');
  poly(ctx,[[-19,-100-lean],[5,-105-lean],[15,-64-lean],[-7,-49],[-22,-56]],'#b29f98');
  poly(ctx,[[8,-102-lean],[23,-94-lean],[26,-59],[11,-49],[1,-54]],'#8b7276',null);
  poly(ctx,[[-23,-113-lean],[0,-126-lean],[25,-113-lean],[23,-86-lean],[-19,-85-lean]],'#b5a6a1');
  poly(ctx,[[-22,-114-lean],[-7,-123-lean],[0,-96-lean],[-20,-96-lean]],'#e6ccaf');
  poly(ctx,[[-22,-108-lean],[-39,-139-lean],[-25,-131-lean],[-9,-111-lean]],'#daaf83');
  poly(ctx,[[20,-108-lean],[39,-136-lean],[29,-111-lean]],'#daaf83');
  line(ctx,[[-11,-98-lean],[13,-98-lean]],'#fce1a3',4);
  poly(ctx,[[-4,-73-lean],[4,-82-lean],[12,-73-lean],[4,-64-lean]],'#c88c6a',null);
  dot(ctx,4,-73-lean,4.5,'#ffdb98');
  // Matches base guardian: hand(22,-58), blade length 108 -> tip x=130,y=-58 at impact.
  const point=attackTip(d),a=point.angle;
  const hand=[22,d.impactY??-58],tip=[point.x,point.y];
  const arm=d.weighted?[[11,-70-lean],[5-9*charge,-42-lean*.3],hand]:[[11,-70-lean],[15,-61]];
  if(d.weighted)line(ctx,arm,INK,17);line(ctx,arm,'#d4b392',13);
  dot(ctx,15,-61,6,'#eed7b6');
  if(p>.1&&p<1){ctx.save();ctx.globalAlpha=.27;line(ctx,[hand,tip],'#ffb67e',17);ctx.restore();}
  line(ctx,[hand,tip],'#675062',13);
  line(ctx,[hand,tip],'#ffdfa9',10);
  line(ctx,[hand,tip],'#fff5d9',2.5);
  ctx.save();ctx.translate(...hand);ctx.rotate(a);
  poly(ctx,[[-1,-14],[7,-12],[7,12],[-1,14]],'#ebc48c');
  line(ctx,[[0,0],[-18,0]],'#98717b',6);ctx.restore();
  ctx.restore();return true;
 }
 function drawSentinel(ctx,d){
  const {charge=0,action=0,recoil=0}=d,drive=smooth(action),lean=9*charge+7*drive,reach=d.m?.reach||110;
  ctx.save();
  poly(ctx,[[-34,-53],[-52,-30],[-44,0],[-19,0],[-8,-38]],'#465269');
  poly(ctx,[[2,-40],[20,-37],[38,0],[8,0]],'#64758c');
  poly(ctx,[[-34,-104-lean],[-19,-112-lean],[26,-107-lean],[34,-58],[-22,-47]],'#3d586e');
  poly(ctx,[[-25,-104-lean],[-3,-109-lean],[12,-75],[-13,-62]],'#819eb2');
  poly(ctx,[[8,-104-lean],[26,-96-lean],[26,-66],[9,-64]],'#a8bbc3');
  poly(ctx,[[-28,-125-lean],[2,-136-lean],[32,-123-lean],[28,-98-lean],[-27,-98-lean]],'#a1b3c5');
  poly(ctx,[[-26,-126-lean],[-7,-136-lean],[2,-106-lean],[-26,-106-lean]],'#d8dbd5');
  line(ctx,[[-13,-113-lean],[17,-113-lean]],'#f5d79c',4);
  // Massive independent tower shield and brass boss.
  ctx.save();ctx.translate(40-10*drive-6*recoil,-65+5*drive);ctx.rotate(-.18*charge+.12*drive-.16*recoil);
  poly(ctx,[[-24,-44],[24,-42],[27,27],[1,43],[-25,25]],'#b8b4a9');
  poly(ctx,[[-18,-36],[18,-35],[20,23],[1,34],[-19,20]],'#284455');
  poly(ctx,[[-17,-35],[0,-37],[0,33],[-19,20]],'#466778',null);
  line(ctx,[[0,-28],[0,24]],'#e6d5ab',4);
  line(ctx,[[-15,-21],[16,-21]],'#e6d5ab',4);
  dot(ctx,0,-9,5,'#f5e0b9');ctx.restore();
  const point=attackTip(d),hand=[19,-80-28*charge+8*drive],tip=[point.x,point.y];
  line(ctx,[[1,-70],hand],'#94a8b9',13);
  line(ctx,[hand,tip],'#45576e',12);line(ctx,[hand,tip],'#f2e2bf',9);line(ctx,[hand,tip],'#fffcef',2);
  line(ctx,[[hand[0]-13,hand[1]+3],[hand[0]+13,hand[1]-5]],'#e0be83',6);
  ctx.restore();return true;
 }
 function drawClockwork(ctx,d){
  const {now=0,charge=0,action=0,recoil=0}=d,drive=smooth(action),lean=6*charge,reach=d.m?.reach||110;
  ctx.save();
  poly(ctx,[[-25,-48],[-38,-33],[-35,0],[-11,0],[3,-40]],'#5f5661');
  poly(ctx,[[7,-41],[23,-35],[36,0],[9,0]],'#806f70');
  poly(ctx,[[-37,-100-lean],[-12,-109-lean],[28,-96-lean],[35,-49],[-30,-47]],'#79675f');
  poly(ctx,[[-30,-96-lean],[17,-95-lean],[16,-57],[-23,-59]],'#b59b79');
  poly(ctx,[[8,-92-lean],[27,-91-lean],[29,-53],[8,-53]],'#a68169',null);
  poly(ctx,[[-22,-121-lean],[5,-131-lean],[29,-115-lean],[24,-94-lean],[-21,-94-lean]],'#c7ab86');
  poly(ctx,[[-22,-121-lean],[3,-130-lean],[7,-102-lean],[-18,-101-lean]],'#dfc79e');
  line(ctx,[[-10,-107-lean],[20,-107-lean]],'#89ebe2',3.5);
  for(const [gx,gy,r,dir] of [[-9,-73,15,1],[15,-66,10,-1]]){
   ctx.save();ctx.translate(gx,gy);ctx.rotate(now*.0025*dir+charge);
   ctx.beginPath();ctx.arc(0,0,r-4,0,Math.PI*2);ctx.strokeStyle='#efd3a5';ctx.lineWidth=3;ctx.stroke();
   for(let i=0;i<8;i++){const a=i*Math.PI/4;line(ctx,[[Math.cos(a)*(r-5),Math.sin(a)*(r-5)],[Math.cos(a)*(r+2),Math.sin(a)*(r+2)]],'#e9c88f',3.5);}
   dot(ctx,0,0,4,'#405c6d');ctx.restore();
  }
  const point=attackTip(d),hand=[30,-60-18*charge],tip=[point.x,point.y];
  line(ctx,[[14,-59],hand],'#d2b89a',14);
  line(ctx,[hand,tip],'#5d5e64',14);
  line(ctx,[hand,tip],'#d7bea0',10);line(ctx,[hand,tip],'#f8edda',3);
  dot(ctx,hand[0],hand[1],6,'#4e6670');
  if(d.weighted){
   dot(ctx,14,-59,8,'#344553');dot(ctx,14,-59,4,'#c6b28f');
   // Steam is tied to the same release pose, so pausing freezes it too.
   if(drive>.08&&drive<.95)for(let i=0;i<3;i++){
    ctx.save();ctx.globalAlpha=.22*(1-drive);
    ellipse(ctx,-30-i*9*drive,-79-i*10*drive,4+6*drive,3+4*drive,'#cfdfdc');ctx.restore();
   }
  }
  const pistonX=mix(42,reach-11,drive);
  line(ctx,[[pistonX-13,-68],[pistonX,-68]],'#91e9df',4);
  ctx.restore();return true;
 }

 function drawEnemy(ctx,data){
  if(!ctx||!data||!data.e)return false;
  const sprite=data.e.sprite||data.e.id,kind=data.e.kind;
  if(sprite==='sentinel')return drawSentinel(ctx,data);
  if(sprite==='clockwork')return drawClockwork(ctx,data);
  if(kind==='slime')return drawSlime(ctx,data);
  if(kind==='rogue')return drawRogue(ctx,data,sprite==='duelist');
  if(kind==='wraith')return drawWraith(ctx,data,sprite==='cantor');
  if(kind==='guardian')return drawGuardian(ctx,data);
  if(kind!=='knight')return false;
  const {now=0,charge=0,p=0,rec=0,recoil=0}=data;
  const lean=charge*8+p*10,bob=Math.sin(now/510)*.8;
  ctx.save();
  // Tattered rear banner; iron greaves in two separate layers.
  poly(ctx,[[-13,-81],[-29,-75],[-37,-42],[-42,-6],[-19,-14],[-5,-36]],'#433043');
  poly(ctx,[[-24,-72],[-32,-54],[-38,-14],[-28,-24]],'#6c455a',null);
  poly(ctx,[[-21,-40],[-1,-38],[-5,-9],[-22,0],[-29,-4]],'#4e4b63');
  poly(ctx,[[4,-39],[20,-41],[28,-4],[11,0],[4,-13]],'#6c5b70');
  poly(ctx,[[-29,-6],[-5,-6],[-3,2],[-31,2]],'#302c44');
  poly(ctx,[[9,-5],[29,-5],[33,2],[7,2]],'#302c44');
  poly(ctx,[[-24,-30],[-8,-31],[-10,-10],[-25,-10]],'#8c8994');
  poly(ctx,[[11,-31],[23,-30],[25,-11],[14,-10]],'#938d9c');
  // Thick shoulder silhouette, aged plate, breastplate facets.
  poly(ctx,[[-22,-92-lean],[-10,-100-lean],[18,-91-lean],[29,-58-lean],[15,-37],[-19,-36],[-31,-65]],'#4e4b69');
  poly(ctx,[[-25,-85-lean],[-31,-72-lean],[-25,-52],[-13,-65-lean]],'#96879f');
  poly(ctx,[[16,-86-lean],[30,-74-lean],[31,-57],[20,-64]],'#b1a5a3');
  poly(ctx,[[-17,-88-lean],[7,-90-lean],[15,-68-lean],[8,-46],[-12,-46]],'#a29aa9');
  poly(ctx,[[6,-85-lean],[18,-81-lean],[22,-64],[11,-49],[1,-52]],'#73677c',null);
  poly(ctx,[[-11,-49],[12,-48],[16,-37],[-17,-37]],'#5f516c');
  line(ctx,[[-14,-68-lean],[8,-59-lean]],'#dcc6bd',2);
  line(ctx,[[-11,-46],[10,-45]],'#b49b78',2);
  // Face guard, broken ornamental crest and iron jaw.
  ctx.save();ctx.translate(0,bob*.5);
  poly(ctx,[[-19,-112-lean],[-1,-124-lean],[19,-111-lean],[20,-88-lean],[13,-80-lean],[-16,-83-lean],[-23,-92-lean]],'#aaa5b2');
  poly(ctx,[[-18,-112-lean],[-1,-122-lean],[2,-102-lean],[-17,-101-lean]],'#d0bdc5');
  poly(ctx,[[3,-107-lean],[20,-105-lean],[15,-91-lean],[2,-94-lean]],'#403548');
  poly(ctx,[[-5,-124-lean],[0,-135-lean],[6,-119-lean]],'#c7a477');
  line(ctx,[[-10,-97-lean],[11,-97-lean]],'#efb3c8',3.8);
  line(ctx,[[-7,-87-lean],[10,-87-lean]],'#56546c',3);
  for(let i=0;i<3;i++)line(ctx,[[i*5-3,-91-lean],[i*5-3,-84-lean]],'#d4c5cb',1.3);
  ctx.restore();
  // Weapon follows the exact legacy knight angular choreography and tip position.
  const actualAngle=p>0?mix(-2.16,0,smooth(p*p)):(charge>0?mix(-.92,-2.16,charge):-.92);
  const a=mix(actualAngle,0,rec)-recoil*.53;
  const hand=[22,-58],tip=[22+88*Math.cos(a),-58+88*Math.sin(a)];
  line(ctx,[[11,-70-lean],[hand[0]-7,hand[1]-3]],'#8d809a',13);
  dot(ctx,hand[0]-7,hand[1]-3,6,'#cfc0bc');
  if(p>.10&&p<1){ctx.save();ctx.globalAlpha=.18+.15*p;line(ctx,[hand,tip],'#f5badc',17);ctx.restore();}
  line(ctx,[hand,tip],'#463f5c',11);
  line(ctx,[hand,tip],'#ece6ee',8);
  line(ctx,[[hand[0]+3,hand[1]-1],[tip[0],tip[1]]],'#ffffff',2);
  ctx.save();ctx.translate(hand[0],hand[1]);ctx.rotate(a);
  poly(ctx,[[-2,-10],[5,-10],[6,10],[-2,10]],'#d3ab84');
  line(ctx,[[1,0],[-16,0]],'#6b5978',6);
  dot(ctx,-17,0,3,'#ddb994');
  ctx.restore();
  ctx.restore();
  return true;
 }
 return Object.freeze({drawHero,drawEnemy,attackTip});
});
