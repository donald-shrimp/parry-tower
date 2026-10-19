/* Motion-first character rework. Shared ink, materials and articulated body parts.
 * Canvas/SVG path artwork, authored here; this is not a traced/generated PNG.
 * Rendering only. The caller owns combat, audio, inputs, clocks and persistence.
 */
(function(root,factory){
 'use strict';const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryCharacterRig=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const INK='#201e28',paths=new Map();
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0)),mix=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const pt=(x,y)=>({x,y}),add=(a,b)=>pt(a.x+b.x,a.y+b.y);
 const lerp=(a,b,t)=>pt(mix(a.x,b.x,t),mix(a.y,b.y,t));
 const BASE=Object.freeze({light:'#c3b5a3',metal:'#8e827b',shade:'#52474b',dark:'#322e3a',
  cloth:'#873d42',clothDark:'#452c37',edge:'#d1b48a',rust:'#a35b3b',glow:'#e7bc80'});
 const PALETTES=Object.freeze({
  hero:{light:'#ced0c6',metal:'#8b9aa0',shade:'#4e606d',dark:'#29343f',cloth:'#344f70',clothDark:'#202e47',edge:'#bca57c',rust:'#75776e',glow:'#a9d9dd'},
  knight:BASE,
  sentinel:{light:'#b5b7b0',metal:'#7f9296',shade:'#435c66',dark:'#2a3641',cloth:'#3b515e',clothDark:'#253440',edge:'#c7b68e',rust:'#976e51',glow:'#e8cc8e'},
  clockwork:{light:'#d0bd94',metal:'#a38b6c',shade:'#635650',dark:'#323a40',cloth:'#66504b',clothDark:'#3c3035',edge:'#dfc398',rust:'#966443',glow:'#91d1c6'},
  rogue:{light:'#a8a4a5',metal:'#777c88',shade:'#4d4c61',dark:'#292936',cloth:'#55485e',clothDark:'#2c293a',edge:'#a68b84',rust:'#705250',glow:'#d8a7bc'},
  duelist:{light:'#c2afb0',metal:'#967d85',shade:'#574654',dark:'#2d2634',cloth:'#873e50',clothDark:'#432938',edge:'#c1a083',rust:'#93604f',glow:'#e7b5ad'},
  wraith:{light:'#bdc8cd',metal:'#879da9',shade:'#4a627c',dark:'#24283f',cloth:'#444c77',clothDark:'#272d4a',edge:'#9db1c3',rust:'#687586',glow:'#b3e3e4'},
  cantor:{light:'#d1c4d0',metal:'#998ba9',shade:'#5b5077',dark:'#2c273e',cloth:'#66507f',clothDark:'#352c49',edge:'#c3afce',rust:'#7b667e',glow:'#d3c2ef'},
  guardian:{light:'#cbbb9e',metal:'#988374',shade:'#62505a',dark:'#352c3a',cloth:'#75404a',clothDark:'#402c38',edge:'#d7b47c',rust:'#a56743',glow:'#f1c989'},
  slime:{light:'#b6d9be',metal:'#70a79a',shade:'#366f70',dark:'#213d4c',cloth:'#6c9d8b',clothDark:'#345d5c',edge:'#c2e5ce',rust:'#63887b',glow:'#b7ecd0'}
 });
 const CATALOG=Object.freeze(['hero','knight','slime','rogue','wraith','sentinel','duelist','cantor','clockwork','guardian']);
 const typeOf=e=>{
  if(!e)return 'hero';const id=e.sprite||e.id;
  if(CATALOG.includes(id))return id;
  return CATALOG.includes(e.kind)?e.kind:'knight';
 };
 function palette(e){
  const type=typeOf(e),base=PALETTES[type]||BASE;
  if(e?.id==='ironwarden')return {...base,cloth:'#8c4140',clothDark:'#492b34'};
  if(e?.id==='dirgekeeper')return {...PALETTES.cantor,metal:'#9a97a6',cloth:'#4a496b'};
  if(e?.id==='timewarden')return {...PALETTES.clockwork,cloth:'#655170'};
  if(e?.id==='golden_tone')return {...PALETTES.wraith,cloth:'#8d744f',clothDark:'#483b3c',glow:'#f0d594'};
  if(e?.id==='gem_slime')return {...PALETTES.slime,glow:'#dbecd3',metal:'#8cb7ab'};
  return base;
 }
 function path(ctx,d,fill,edge=INK,width=1.35){
  let p=paths.get(d);
  if(!p){if(typeof root.Path2D!=='function')return; p=new root.Path2D(d);paths.set(d,p);}
  if(fill){ctx.fillStyle=fill;ctx.fill(p);}
  if(edge){ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=edge;ctx.stroke(p);}
 }
 function line(ctx,points,color,width=1,alpha=1){
  ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
 }
 function dot(ctx,x,y,r,fill,edge){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(edge){ctx.lineWidth=1;ctx.strokeStyle=edge;ctx.stroke();}}
 function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
 function at(ctx,point,angle,fn){ctx.save();ctx.translate(point.x,point.y);ctx.rotate(angle);fn();ctx.restore();}
 function twoBone(start,target,upper,lower,bend=1){
  const dx=target.x-start.x,dy=target.y-start.y,length=Math.hypot(dx,dy);
  const distance=Math.max(Math.abs(upper-lower)+.001,Math.min(upper+lower-.001,length||.001));
  const direction=Math.atan2(dy,dx),a=Math.acos(Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
  const elbow=pt(start.x+Math.cos(direction+bend*a)*upper,start.y+Math.sin(direction+bend*a)*upper);
  const end=pt(start.x+Math.cos(direction)*distance,start.y+Math.sin(direction)*distance);
  return {start,elbow,end};
 }
 function layout(w,h,e={},m={reach:110}){
  const boss=e.boss?1.16:1;
  const base=Math.min((w-22)/(94+62+(m.reach+78)*boss),h*.67/(190*boss));
  const heroScale=base,enemyScale=base*boss,ground=h*.80;
  const heroX=Math.max(w*.23,74*heroScale+8),hitX=heroX+61*heroScale,hitY=ground-83*heroScale;
  const contactX=hitX+m.reach*enemyScale,available=w-79*enemyScale-9;
  const restX=Math.min(available,contactX+32*enemyScale);
  return {base,heroScale,enemyScale,heroX,ground,hitX,hitY,contactX,
   restX:Math.max(contactX,restX),stageX:Math.max(contactX,Math.min(available,restX+3*enemyScale)),impactY:-83/boss};
 }
 function weaponLength(type){return type==='guardian'?86:type==='rogue'?52:type==='duelist'?62:type==='clockwork'?51:type==='wraith'?26:type==='cantor'?43:72;}
 function pose({type='knight',now=0,charge=0,action=0,p=0,rec=0,recoil=0,reach=110,impactY=-83,
  hero=false,lift=0,hurt=0,counter=0,index=0}){
  const c=clamp(charge),a=clamp(action),r=clamp(recoil),hit=clamp(hurt);
  let drive=a,wind=c,weaponAngle=(-1.10-.82*c)*(1-a),hand=lerp(lerp(pt(29,-103),pt(-1,-114),c),pt(reach-weaponLength(type),impactY),a);
  if(hero){
   const t=counter>0?1-clamp(counter):0;
   drive=counter>0?Math.sin(Math.PI*t):0;wind=0;
   const key=t<.17?smooth(t/.17):t<.55?smooth((t-.17)/.38):smooth((t-.55)/.45);
   if(t<.17){hand=lerp(pt(29,-103),pt(21,-113),key);weaponAngle=mix(-1.1,-1.7,key);}
   else if(t<.55){hand=lerp(pt(21,-113),pt(64,-84),key);weaponAngle=mix(-1.7,.35,key);}
   else {hand=lerp(pt(64,-84),pt(29,-103),key);weaponAngle=mix(.35,-1.1,key);}
  }
  const crouch=(type==='rogue'||type==='duelist')?14:8;
  const hip=pt(-3-wind*6+drive*10-r*7-hit*5,-57+wind*crouch+drive*3+hit*4);
  const lean=.025-.15*wind+.17*drive-.10*r-.08*hit;
  const chest=add(hip,pt(Math.sin(lean)*42,-Math.cos(lean)*42));
  const shoulder=add(chest,pt(11,-3)),backShoulder=add(chest,pt(-12,0));
  if(!hero&&(type==='wraith'||type==='cantor'))hand=lerp(pt(37,-100-10*c),pt(reach-weaponLength(type),impactY),a);
  const arms=type==='wraith'?[36,49]:[31,33];
  const activeBack=type==='duelist'&&index%2===1;
  if(activeBack)hand=lerp(lerp(pt(-10,-92),pt(-5,-114),c),pt(reach-weaponLength(type),impactY),a);
  const support=pt(-10+4*c,-92-3*c);
  const frontArm=twoBone(shoulder,activeBack?pt(29,-103):hand,...arms,1);
  const guard=hero?pt(34+7*lift,-79-4*lift):pt(31-4*c+2*a,-79-5*c);
  const backArm=twoBone(backShoulder,type==='duelist'?(activeBack?hand:support):guard,31,34,1);
  const step=hero?drive:a;
  const raise=hero?Math.sin(Math.PI*drive)*6:(rec>0?Math.sin(Math.PI*(1-rec))*5:Math.sin(Math.PI*clamp(p))*9);
  const frontFoot=pt(21+15*step,-6-raise),backFoot=pt(-22-4*c,-6-(p>.55?Math.sin(Math.PI*p)*4:0));
  const frontLeg=twoBone(add(hip,pt(9,0)),frontFoot,31,32,-1),backLeg=twoBone(add(hip,pt(-10,0)),backFoot,31,32,-1);
  if(activeBack)weaponAngle=(-1.95-.42*c)*(1-a);
  const activeHand=activeBack?backArm.end:frontArm.end;
  const tip=pt(activeHand.x+Math.cos(weaponAngle)*weaponLength(type),activeHand.y+Math.sin(weaponAngle)*weaponLength(type));
  return {type,now,c,a,r,hip,chest,lean,head:add(chest,pt(0,-25)),frontArm,backArm,frontLeg,backLeg,
   weaponAngle,tip,lift,hero,drive,index,step,activeBack};
 }
 function limb(ctx,bone,p,leg=false,back=false){
  const color=back?p.shade:p.metal;
  line(ctx,[bone.start,bone.elbow,bone.end],p.dark,leg?14:12);
  const upperAngle=Math.atan2(bone.elbow.y-bone.start.y,bone.elbow.x-bone.start.x)-Math.PI/2;
  const lowerAngle=Math.atan2(bone.end.y-bone.elbow.y,bone.end.x-bone.elbow.x)-Math.PI/2;
  const upperLength=Math.hypot(bone.elbow.x-bone.start.x,bone.elbow.y-bone.start.y);
  const lowerLength=Math.hypot(bone.end.x-bone.elbow.x,bone.end.y-bone.elbow.y);
  at(ctx,bone.start,upperAngle,()=>{
   ctx.scale(1,upperLength/31);
   path(ctx,leg?'M-9-2 Q0-6 9 0 L8 18 L5 31 L-6 30 L-10 14Z':'M-8-2 Q0-6 8-1 L9 10 L5 29 L-5 31 L-9 12Z',color);
   path(ctx,'M-5 1 L2-1 L2 15 L-3 27 L-7 24 L-8 12Z',back?p.metal:p.light,null);
   path(ctx,'M3 0 L8 2 L7 17 L4 29 L0 29 L3 11Z',p.shade,null);
   line(ctx,[pt(-5,13),pt(5,15)],p.dark,.8);line(ctx,[pt(-5,4),pt(-3,10)],p.edge,.8,.65);
  });
  dot(ctx,bone.elbow.x,bone.elbow.y,leg?7:6,p.dark,INK);
  dot(ctx,bone.elbow.x-1,bone.elbow.y-1,leg?4.5:3.7,back?p.shade:p.metal);
  at(ctx,bone.elbow,lowerAngle,()=>{
   ctx.scale(1,lowerLength/32);
   path(ctx,'M-6 1 Q0-2 7 2 L8 10 L5 29 L-5 33 L-8 24 L-8 9Z',color);
   path(ctx,'M-5 5 L1 2 L3 12 L0 27 L-5 29 L-6 17Z',back?p.metal:p.light,null);
   path(ctx,'M3 6 L7 7 L5 26 L0 30 L1 18Z',p.shade,null);
   line(ctx,[pt(-5,19),pt(5,17)],p.dark,.9);line(ctx,[pt(-3,7),pt(-4,14)],p.edge,.8,.7);
  });
 }
 function boot(ctx,point,p,back){
  at(ctx,point,0,()=>{
   path(ctx,'M-8-5 L7-6 L11-1 L18 2 L19 6 L-10 6 L-11 2Z',back?p.shade:p.metal);
   path(ctx,'M-5-3 L5-4 L7 0 L14 2 L14 3 L-6 3Z',back?p.metal:p.light,null);
   line(ctx,[pt(-9,5),pt(18,5)],p.dark,2);line(ctx,[pt(4,-2),pt(7,2)],p.shade,1.3);
  });
 }
 function cape(ctx,q,p,robe=false){
  const sway=Math.sin(q.now/370)*2+q.drive*15-q.c*7,top=add(q.chest,pt(-17,-4));
  ctx.save();ctx.translate(top.x,top.y);
  const hem=robe?94:q.type==='knight'?57:89;
  ctx.beginPath();ctx.moveTo(-5,-3);ctx.quadraticCurveTo(-24,4,-27,24);
  ctx.bezierCurveTo(-31,48,-36+sway,hem-11,-45+sway,hem);
  ctx.lineTo(-29+sway,hem-5);ctx.lineTo(-22+sway,hem+3);ctx.lineTo(-16+sway,hem-8);
  ctx.lineTo(-6+sway,hem-3);ctx.quadraticCurveTo(6,58,15,21);ctx.closePath();ctx.fillStyle=p.cloth;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-6,7);ctx.bezierCurveTo(-18,33,-21,66,-29+sway,hem-8);ctx.lineTo(-16+sway,hem-9);ctx.quadraticCurveTo(-5,42,2,17);ctx.closePath();ctx.fillStyle=p.clothDark;ctx.fill();
  line(ctx,[pt(-15,18),pt(-22,48),pt(-28+sway,hem-15)],p.edge,.7,.22);
  line(ctx,[pt(-21+sway,hem-9),pt(-19+sway,hem-2)],p.dark,1);
  ctx.restore();
 }
 function torso(ctx,q,p){
  at(ctx,q.hip,q.lean,()=>{
   path(ctx,'M-19-10 Q0-18 19-11 L23 5 L17 14 L6 10 L-4 15 L-22 11Z',p.dark);
   path(ctx,'M-20-8 L-7-11 L-5 0 L-9 11 L-23 9Z',p.metal);
   path(ctx,'M-5-12 L9-12 L14 0 L9 11 L-4 13 L-7 1Z',p.shade);
   path(ctx,'M11-11 L20-7 L24 5 L16 10 L12 0Z',p.metal);
   line(ctx,[pt(-18,-5),pt(18,-5)],p.edge,2.5);dot(ctx,3,-5,3,p.edge,INK);
   if(q.type==='knight'){
    path(ctx,'M3 0 L17-2 L22 12 L28 25 L19 21 L17 31 L4 25 L-1 13Z',p.cloth);
    path(ctx,'M8 1 L14 1 L12 15 L18 26 L5 22 L2 12Z',p.clothDark,null);
    line(ctx,[pt(16,8),pt(17,16),pt(22,23)],p.edge,.7,.3);
   }
  });
  at(ctx,q.chest,q.lean,()=>{
   const leather=q.type==='rogue'||q.type==='duelist',mechanical=q.type==='clockwork';
   path(ctx,'M-22-9 Q-7-17 12-12 L24-4 L21 21 L14 37 L-15 35 L-23 18Z',leather?p.cloth:p.metal);
   path(ctx,'M-19-7 L-5-12 L1-8 L-1 12 L-9 24 L-17 20Z',leather?p.metal:p.light,null);
   path(ctx,'M2-10 L13-8 L21-2 L17 20 L9 28 L-2 21 L1 10Z',p.shade,null);
   path(ctx,'M-16 23 L-3 25 L9 30 L14 26 L16 32 L9 37 L-14 34Z',p.dark,null);
   line(ctx,[pt(-19,16),pt(-5,21),pt(12,18),pt(19,12)],p.dark,1.2);
   line(ctx,[pt(-15,-5),pt(-6,-8),pt(-1,-5)],p.edge,.8);
   line(ctx,[pt(-18,25),pt(15,2)],leather?p.edge:'#67534b',4);
   line(ctx,[pt(-18,25),pt(15,2)],p.dark,.7);
   for(const [x,y] of [[-17,4],[15,-1],[-10,27],[11,23]])dot(ctx,x,y,1.2,p.edge,INK);
   if(mechanical){gear(ctx,-4,8,11,q.now*.0008,p);gear(ctx,12,19,7,-q.now*.0012,p);}
   else if(leather){path(ctx,'M-8 0 L2-3 L8 3 L3 13 L-5 13Z',p.dark);line(ctx,[pt(-3,1),pt(3,8)],p.edge,1);}
   else {
    path(ctx,'M-9-1 L1-5 L10 0 L7 12 L0 17 L-8 10Z',p.dark);
    path(ctx,'M-5 1 L0-1 L5 2 L3 10 L0 13 L-4 9Z',p.edge,null);
    path(ctx,'M-15 10 L-11 8 L-9 13 L-13 17Z',p.rust,null);
    path(ctx,'M12 22 L16 20 L15 26 L9 29Z',p.rust,null);
   }
  });
 }
 function gear(ctx,x,y,r,angle,p){
  at(ctx,pt(x,y),angle,()=>{
   for(let i=0;i<8;i++){const a=i*Math.PI/4;line(ctx,[pt(Math.cos(a)*(r-2),Math.sin(a)*(r-2)),pt(Math.cos(a)*(r+2),Math.sin(a)*(r+2))],p.edge,3);}
   dot(ctx,0,0,r,p.edge,INK);dot(ctx,0,0,r-3,p.dark);dot(ctx,0,0,2,p.glow);
  });
 }
 function shoulder(ctx,point,p,back=false,big=false){
  at(ctx,point,0,()=>{
   if(big)ctx.scale(1.23,1.13);
   path(ctx,'M-12-6 Q-3-14 7-9 L13-3 L10 8 L1 12 L-10 7 L-15 0Z',back?p.shade:p.metal);
   path(ctx,'M-11-5 Q-3-11 5-7 L9-3 L4 2 L-6 4 L-11 1Z',back?p.metal:p.light,null);
   path(ctx,'M6 0 L11-2 L9 6 L1 10 L-8 6 L-6 3Z',p.shade,null);
   path(ctx,'M-10 0 L-6-2 L-3 1 L-6 5Z',p.rust,null);
   line(ctx,[pt(-9,-5),pt(-2,-8),pt(4,-6)],p.edge,.8);
  });
 }
 function head(ctx,q,p,e){
  const turn=-.08*q.c+.07*q.drive;
  at(ctx,q.head,turn,()=>{
   if(q.type==='rogue'||q.type==='duelist'||q.type==='wraith'||q.type==='cantor'){
    const ghost=q.type==='wraith'||q.type==='cantor';
    path(ctx,ghost?'M-23 3 L-24-14 Q-18-28-5-40 L5-30 L18-19 L24-2 L15 16 L-5 19Z':'M-23 5 L-22-14 Q-17-26-2-32 L17-20 L23-4 L16 15 L-5 16Z',p.cloth);
    path(ctx,'M-17-10 Q-10-25-2-28 L-5-9 L-13 6 L-19 8Z',p.shade,null);
    path(ctx,'M-5-17 L9-20 L17-10 L19 3 L10 12 L-4 9 L-11 0Z',p.dark);
    path(ctx,ghost?'M-3-13 L7-15 L13-8 L11 7 L4 11 L-3 6Z':'M-6-8 L9-12 L16-6 L14 3 L3 6 L-7 1Z',ghost?p.light:p.shade,null);
    line(ctx,[pt(1,-5),pt(11,-7)],p.glow,1.8);
    if(ghost){line(ctx,[pt(3,1),pt(7,4),pt(5,9)],p.dark,1);line(ctx,[pt(-1,-11),pt(2,-7)],p.dark,1);}
    else {path(ctx,'M-10 0 L5 3 L16 0 L14 8 L3 13 L-11 7Z',p.clothDark);line(ctx,[pt(-5,4),pt(6,7),pt(12,5)],p.cloth,1.3);}
    line(ctx,[pt(-17,8),pt(-9,13),pt(-2,12)],p.edge,.7,.5);
    return;
   }
   if(q.type==='clockwork'){
    path(ctx,'M-20-24 L4-30 L21-19 L22 3 L11 14 L-13 12 L-23 2Z',p.metal);
    path(ctx,'M-16-21 L1-25 L7-18 L4-1 L-16 0Z',p.light,null);
    path(ctx,'M7-18 L19-15 L18 5 L9 10 L4 0Z',p.shade,null);
    path(ctx,'M-11-12 L20-10 L20-3 L-12-5Z',p.dark);
    line(ctx,[pt(-8,-8),pt(17,-7)],p.glow,2);
    for(const x of [-9,-3,3,9])line(ctx,[pt(x,3),pt(x,9)],p.dark,1.6);
    gear(ctx,-18,-8,6,0,p);return;
   }
   const boss=q.type==='guardian';
   if(boss){
    path(ctx,'M-14-21 Q-30-28-31-44 L-24-37 L-17-34 L-8-22Z',p.edge);
    path(ctx,'M10-25 L24-42 L26-45 L24-30 L18-17Z',p.edge);
   }
   path(ctx,q.type==='knight'?'M-23-12 L-20-23 Q-10-31 4-28 L16-23 L23-11 L23 4 L12 16 L-12 12 L-24 1Z':'M-21-16 Q-17-29 1-31 L16-25 L23-13 L24 3 L11 16 L-11 13 L-23 3Z',p.metal);
   path(ctx,'M-18-16 Q-13-25-1-27 L4-22 L1-8 L-14-5 L-20 0Z',p.light,null);
   path(ctx,'M6-25 L15-21 L20-12 L18-1 L9 3 L0-7 L3-18Z',p.shade,null);
   path(ctx,'M-4-8 L23-12 L25-1 L17 9 L4 12 L-5 3Z',p.dark);
   path(ctx,'M-1-3 L20-6 L19 1 L10 8 L2 6Z',p.metal,null);
   line(ctx,[pt(2,-7),pt(21,-9)],p.glow,1.7);
   for(const [x,y] of [[5,1],[10,0],[15,-1]])line(ctx,[pt(x,y),pt(x-1,y+6)],p.dark,1.5);
   path(ctx,'M-20-5 L-10-4 L-9 9 L-15 9 L-22 2Z',p.shade);
   path(ctx,q.type==='knight'?'M-10-24 L-9-36 L-3-30 L1-34 L4-24 L-2-21Z':'M-12-24 L-6-34 L-2-37 L1-28 L5-24 L0-20Z',p.edge);
   line(ctx,[pt(-16,-18),pt(-12,-22),pt(-6,-24)],p.edge,.8);
   path(ctx,'M-18-11 L-12-13 L-10-7 L-15-4Z',p.rust,null);
   line(ctx,[pt(-14,3),pt(-10,6)],p.edge,.7);
   if(e?.id==='endking')path(ctx,'M-20-22 L-18-39 L-10-30 L-2-43 L5-30 L17-38 L18-21Z',p.edge);
  });
 }
 function clothExtras(ctx,q,p){
  const t=q.drive,tail=14*t-9*q.c+Math.sin(q.now/250)*2;
  at(ctx,add(q.chest,pt(-6,-11)),0,()=>{
   path(ctx,'M-16-2 L3-6 L14-2 L10 5 L-1 8 L-17 3Z',p.cloth);
   path(ctx,'M-14 1 L0 4 L9 1 L7 5 L-2 7 L-14 4Z',p.clothDark,null);
   ctx.beginPath();ctx.moveTo(-15,1);ctx.bezierCurveTo(-31,-7,-33-tail,-18,-54-tail,-17);ctx.lineTo(-48-tail,-10);ctx.lineTo(-55-tail,-6);ctx.quadraticCurveTo(-34-tail,-8,-27,6);ctx.closePath();ctx.fillStyle=p.cloth;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.stroke();
   line(ctx,[pt(-16,0),pt(-29,-4),pt(-43-tail,-12)],p.edge,.6,.3);
  });
 }
 function shield(ctx,hand,p,type,lift=0){
  at(ctx,hand,-.12*(1-lift),()=>{
   if(type==='sentinel')ctx.scale(1.3,1.33);
   path(ctx,'M-18-31 L2-37 L20-26 L22 1 Q18 23 3 36 L-13 29 L-23 7Z',p.metal);
   path(ctx,'M-14-27 L1-32 L16-23 L17 0 Q14 19 3 29 L-10 23 L-18 6Z',p.cloth);
   path(ctx,'M-13-24 L0-28 L-2 25 L-10 21 L-16 5Z',p.clothDark,null);
   line(ctx,[pt(3,-26),pt(3,23)],p.edge,2.8);line(ctx,[pt(-11,-8),pt(15,-8)],p.edge,2.4);
   path(ctx,'M-4-7 L2-13 L9-6 L4 4 L-3 1Z',p.metal);dot(ctx,2,-5,2.4,p.edge);
   path(ctx,'M-17 10 L-12 8 L-8 16 L-12 19Z',p.rust,null);
   path(ctx,'M11-23 L16-22 L16-14 L12-15Z',p.rust,null);
   line(ctx,[pt(-15,-27),pt(0,-32),pt(12,-25)],p.light,1);
   for(const [x,y] of [[-17,-17],[16,-12],[-14,15],[5,27]])dot(ctx,x,y,1.1,p.edge,INK);
  });
 }
 function weapon(ctx,hand,angle,p,type,length){
  at(ctx,hand,angle,()=>{
   if(type==='clockwork'){
    path(ctx,'M-8-7 L5-9 L16-7 L17 7 L2 10 L-9 6Z',p.metal);
    line(ctx,[pt(6,0),pt(length-5,0)],p.dark,10);line(ctx,[pt(8,0),pt(length-5,0)],p.light,5);
    at(ctx,pt(length-6,0),0,()=>{path(ctx,'M-5-9 L5-10 L9-5 L8 7 L-6 9Z',p.metal);line(ctx,[pt(1,-5),pt(1,5)],p.glow,2);});
   }else if(type==='wraith'){
    path(ctx,'M-8-4 L-2-9 L8-7 L13-1 L9 8 L-3 9 L-9 3Z',p.light);
    for(const y of [-6,0,6])path(ctx,`M5 ${y-2} Q17 ${y-4} ${length} ${y} L${length-4} ${y+2} L8 ${y+3}Z`,p.light);
   }else if(type==='cantor'){
    path(ctx,'M-8-2 L-2-7 L9-6 L14-1 L12 6 L1 9 L-8 5Z',p.light);
    line(ctx,[pt(11,0),pt(length,0)],p.glow,3,.8);
    dot(ctx,length,0,5,p.glow);dot(ctx,length-2,-2,2,'#f0e9e1');
   }else{
    const broad=type==='guardian'?10:type==='rogue'?3:6;
    line(ctx,[pt(-14,0),pt(9,0)],INK,6);line(ctx,[pt(-13,0),pt(8,0)],p.clothDark,3.5);
    path(ctx,`M8-${broad} L${length-12}-${broad+1} L${length} 0 L${length-12} ${broad} L8 ${broad-1}Z`,p.light);
    path(ctx,`M10 0 L${length-4} 0 L${length-12} ${broad-1} L10 ${broad-2}Z`,p.shade,null);
    line(ctx,[pt(13,-broad+2),pt(length-13,-broad+2),pt(length-3,0)],p.edge,.8);
    path(ctx,'M2-12 L8-10 L10 10 L3 13 L1 9 L4 0Z',p.edge);
    if(type==='knight'||type==='guardian'){
     path(ctx,`M${length*.38}-${broad-1} L${length*.47}-${broad} L${length*.49} -1 L${length*.43} 2 L${length*.38} 1Z`,p.rust,null);
     path(ctx,`M${length*.70} 1 L${length*.77} 0 L${length*.76} ${broad-1} L${length*.68} ${broad-1}Z`,p.rust,null);
    }
    dot(ctx,-14,0,2.4,p.edge,INK);
   }
   path(ctx,'M-6-4 L0-6 L5-3 L6 3 L1 7 L-6 5 L-8 1Z',p.metal);
   line(ctx,[pt(-4,-2),pt(2,-3)],p.light,1.5);
  });
 }
 function robe(ctx,q,p){
  at(ctx,q.hip,q.lean,()=>{
   const sway=Math.sin(q.now/280)*3+q.drive*7;
   ctx.beginPath();ctx.moveTo(-18,-47);ctx.quadraticCurveTo(4,-56,19,-42);ctx.lineTo(24,4);
   ctx.lineTo(34+sway,49);ctx.lineTo(20+sway,44);ctx.lineTo(12,55);ctx.lineTo(2,42);
   ctx.lineTo(-7,54);ctx.lineTo(-17,44);ctx.lineTo(-31+sway,48);ctx.quadraticCurveTo(-22,10,-18,-47);ctx.closePath();ctx.fillStyle=p.cloth;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
   path(ctx,'M-10-42 L-3-46 L1-10 L-3 37 L-9 47 L-14 30Z',p.clothDark,null);
   path(ctx,'M7-44 L15-40 L14 0 L24 42 L15 39 L6 18Z',p.shade,null);
   line(ctx,[pt(-13,-38),pt(-9,7),pt(-17,39)],p.edge,.8,.45);
   if(q.type==='cantor')for(const y of [-22,-8,6]){
    path(ctx,`M-2 ${y-4} L2 ${y} L-2 ${y+4} L-6 ${y}Z`,null,p.edge,1);
   }
  });
 }
 function paintSkeleton(ctx,q){
  for(const b of [q.frontArm,q.backArm,q.frontLeg,q.backLeg]){
   line(ctx,[b.start,b.elbow,b.end],'#b0f1d3',1.1,.9);
   for(const v of [b.start,b.elbow,b.end])dot(ctx,v.x,v.y,2.2,'#d3f5dc',INK);
  }
  line(ctx,[q.hip,q.chest,q.head],'#b0f1d3',1.2);
  dot(ctx,q.tip.x,q.tip.y,2.6,'#ffd180',INK);
 }
 function humanoid(ctx,q,p,e,debug=false){
  const ghost=q.type==='wraith'||q.type==='cantor';
  cape(ctx,q,p,ghost);
  if(!ghost){
   limb(ctx,q.backLeg,p,true,true);boot(ctx,q.backLeg.end,p,true);
   limb(ctx,q.frontLeg,p,true,false);boot(ctx,q.frontLeg.end,p,false);
  }
  limb(ctx,q.backArm,p,false,true);shoulder(ctx,q.backArm.start,p,true,q.type==='sentinel'||q.type==='guardian');
  if(ghost)robe(ctx,q,p);else torso(ctx,q,p);
  dot(ctx,q.head.x,q.head.y+11,6,p.dark,INK);head(ctx,q,p,e);
  if(['hero','knight','sentinel','guardian'].includes(q.type))shield(ctx,q.backArm.end,p,q.type,q.lift);
  else if(q.type==='duelist')weapon(ctx,q.backArm.end,q.activeBack?q.weaponAngle:-1.95,p,'duelist',62);
  else if(q.type==='clockwork')gear(ctx,q.backArm.end.x,q.backArm.end.y,8,-q.now*.001,p);
  else {dot(ctx,q.backArm.end.x,q.backArm.end.y,5,p.shade,INK);}
  limb(ctx,q.frontArm,p,false,false);shoulder(ctx,q.frontArm.start,p,false,q.type==='guardian');
  weapon(ctx,q.frontArm.end,q.activeBack?-1.10:q.weaponAngle,p,q.type,weaponLength(q.type));
  if(q.type==='knight'||q.type==='hero'||q.type==='rogue'||q.type==='duelist')clothExtras(ctx,q,p);
  if(q.type==='clockwork'&&q.a>.05&&q.a<.95){
   for(let i=0;i<3;i++){ctx.save();ctx.globalAlpha=.2*(1-q.a);ellipse(ctx,q.chest.x-27-i*q.a*15,q.chest.y-2-i*q.a*11,3+i,2+i,p.light);ctx.restore();}
  }
  if(debug)paintSkeleton(ctx,q);
 }
 function slime(ctx,data,p,debug){
  const c=clamp(data.charge),a=clamp(data.action),reach=data.reach||49,impactY=data.impactY??-83;
  const front=pt(mix(36,reach,a),mix(-63,impactY,a)),top=-80+31*c-8*a,back=-42-13*c;
  ctx.beginPath();ctx.moveTo(back,0);ctx.bezierCurveTo(back-15,-15,back-14,top+18,-17,top);
  ctx.bezierCurveTo(3,top-14,front.x-18,front.y-5,front.x,front.y);
  ctx.bezierCurveTo(front.x+1,front.y+22,51,-20,43,0);ctx.quadraticCurveTo(0,11,back,0);ctx.closePath();
  ctx.fillStyle=p.metal;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.7;ctx.stroke();
  ctx.beginPath();ctx.moveTo(back+5,-7);ctx.quadraticCurveTo(back-3,top+20,-16,top+7);
  ctx.quadraticCurveTo(3,top,front.x-10,front.y+10);ctx.quadraticCurveTo(5,-39,-5,-6);ctx.closePath();ctx.fillStyle=p.shade;ctx.fill();
  path(ctx,'M-17-47 L-3-62 L13-56 L24-38 L13-22 L-5-18 L-21-29Z',p.dark);
  path(ctx,'M-4-55 L9-51 L16-38 L8-29 L-4-27 L-13-35Z',p.glow,null);
  path(ctx,'M-4-55 L-2-39 L-13-35Z',p.light,null);
  line(ctx,[pt(-2,-39),pt(8,-29),pt(16,-38),pt(-2,-39),pt(9,-51)],p.shade,1);
  line(ctx,[pt(-29,top+26),pt(-23,top+17),pt(-12,top+13)],p.light,2,.85);
  line(ctx,[pt(front.x-11,front.y+4),pt(front.x-4,front.y+2)],p.edge,2,.8);
  for(const [x,y,r] of [[-30,-22,2.3],[29,-17,1.8],[-23,-55+20*c,1.5]])dot(ctx,x,y,r,p.light);
  if(debug){dot(ctx,front.x,front.y,2.5,'#ffd180',INK);line(ctx,[pt(-42,1),pt(43,1)],'#b0f1d3',1);}
 }
 function shadow(ctx,x,y,s,wide=1){ellipse(ctx,x,y+2,36*s*wide,6*s,'#050b16a6');}
 function drawHero(ctx,data){
  if(typeof root.Path2D!=='function'||!ctx)return false;
  const {width,height,now=0,pose:input={},e={},m={reach:110}}=data,l=layout(width,height,e,m);
  const q=pose({type:'hero',hero:true,now,counter:clamp(input.action),lift:clamp(input.lift),hurt:clamp(input.hurt)});
  shadow(ctx,l.heroX,l.ground,l.heroScale,1.2);
  ctx.save();ctx.translate(l.heroX,l.ground);ctx.scale(l.heroScale,l.heroScale);
  if(input.action>.18&&input.action<.7){
   const previous=pose({type:'hero',hero:true,counter:clamp(input.action+.12)});
   line(ctx,[previous.tip,q.tip],'#cddedb',9,.2);line(ctx,[previous.tip,q.tip],'#f3e4c7',1.4,.6);
  }
  humanoid(ctx,q,PALETTES.hero,null,data.debug);
  ctx.restore();return true;
 }
 function drawEnemy(ctx,data){
  const {e,m,now,width,height,attackAt,attackSpan,lastImpactAt=-99999,lastDeflectAt=-99999,lastStrikeKind=''}=data;
  if(!e||!m||typeof root.Path2D!=='function')return false;
  const art=root.ParryCombatArt;if(!art)return false;
  const l=layout(width,height,e,m),t=art.timeline(m,attackAt-now,now-lastImpactAt,attackSpan);
  const x=mix(mix(l.restX,l.stageX,t.prep),l.contactX,t.action),age=now-lastDeflectAt;
  const recoil=age>=0&&age<180&&['just','parry'].includes(lastStrikeKind)?Math.sin(Math.PI*age/180)*(lastStrikeKind==='just'?1:.5):0;
  const type=typeOf(e),index=Math.max(0,(e.index||0)-(t.rec>0?1:0));
  const q=pose({type,now,charge:t.charge,action:t.action,p:t.p,rec:t.rec,recoil,reach:m.reach,impactY:l.impactY,index});
  shadow(ctx,x,l.ground,l.enemyScale,type==='slime'?1.3:1.1);
  ctx.save();ctx.translate(x+recoil*8*l.enemyScale,l.ground);ctx.scale(-l.enemyScale,l.enemyScale);
  if(e.palette)ctx.filter='hue-rotate('+(Number(e.palette.hueRotate)||0)+'deg) saturate('+(Number(e.palette.saturation)||100)+'%)';
  const p=palette(e);
  if(type==='slime')slime(ctx,{...t,reach:m.reach,impactY:l.impactY},p,data.debug);
  else {
   if(t.p>.35&&t.rec===0){
    const previous=pose({type,charge:t.charge,action:Math.pow(Math.max(0,t.p-.12),3),reach:m.reach,impactY:l.impactY});
    line(ctx,[previous.tip,q.tip],p.edge,9,.22);line(ctx,[previous.tip,q.tip],p.light,1.4,.65);
   }
   humanoid(ctx,q,p,e,data.debug);
  }
  if(e.elite||e.rare){ctx.save();ctx.globalAlpha=.65;line(ctx,[pt(-12,6),pt(0,9),pt(12,6)],e.rare?'#e5c98b':'#d58b8f',1.6);ctx.restore();}
  ctx.restore();return true;
 }
 return Object.freeze({CATALOG,PALETTES,typeOf,palette,twoBone,layout,pose,weaponLength,drawHero,drawEnemy});
});
