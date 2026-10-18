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
 function drawEnemy(ctx,data){
  if(!ctx||!data||data.e?.id!=='knight')return false;
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
 return Object.freeze({drawHero,drawEnemy});
});
