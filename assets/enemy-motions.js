/* v0.5.4 enemy-specific visuals.
 * Rendering only: attacks, parry timing and the Web Audio clock live in game.js.
 * The attacking tip for every variant approaches (motion.reach, -58) at p=1.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryEnemyMotions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SUPPORTED=Object.freeze(['sentinel','duelist','cantor','clockwork']);
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
 // Keep the attack point aligned with the shield for every unique sprite.
 function attackPoint(id,reach,action,charge,handed=0){
  const t=ease(action),r=Math.max(40,Number(reach)||110);
  if(id==='sentinel')return {x:lerp(34,r,t),y:lerp(-142,-58,t)};
  if(id==='duelist')return {x:lerp(35,r,t),y:lerp(handed?-38:-102,-58,t)};
  if(id==='cantor')return {x:lerp(38,r,t),y:lerp(-103,-58,t)};
  if(id==='clockwork')return {x:lerp(38,r,t),y:lerp(-98,-58,t)};
  return null;
 }
 function draw(id,ctx,data){
  if(!SUPPORTED.includes(id))return false;
  const {e,m,now,charge,action,p,recoil,rec,round,line,fillPoly}=data;
  const t=clamp(action),c=clamp(charge),r=clamp(recoil),impact=ease(t);
  ctx.save();
  // A different silhouette and wind-up for each monster, not only a palette swap.
  if(id==='sentinel'){
   // Heavy planted feet, tower shield, and a visibly raised overhead sword.
   const lean=9*c+7*impact;
   fillPoly([[-30,-45],[-47,-30],[-42,0],[-19,0],[-8,-35]],'#526078');
   fillPoly([[2,-39],[17,-37],[35,0],[9,0]],'#68758b');
   fillPoly([[-33,-92-lean],[-17,-104-lean],[20,-101-lean],[31,-56],[-19,-47]],'#506b82');
   fillPoly([[-18,-93-lean],[8,-97-lean],[20,-61],[-10,-61]],'#87a2b9');
   fillPoly([[-21,-116-lean],[0,-126-lean],[25,-116-lean],[24,-96-lean],[-24,-96-lean]],'#9daec2');
   line([[-13,-108-lean],[14,-108-lean]],'#f7d8a4',3);
   // The massive shield remains a recognizable rectangular slab even in recovery.
   ctx.save();ctx.translate(40-10*impact-6*r,-65+5*impact);ctx.rotate(-.18*c+.12*impact-.16*r);
   fillPoly([[-21,-40],[23,-38],[24,30],[0,39],[-23,25]],'#c4b8a5');
   fillPoly([[-16,-34],[17,-34],[18,23],[0,30],[-17,20]],'#31485d');
   line([[-12,-23],[12,-23]],'#f6d89a',4);
   line([[0,-27],[0,26]],'#e8d2a8',4);
   ctx.restore();
   const hand=[19,-80-28*c+8*impact];
   const tip=attackPoint(id,m.reach,t,c);
   line([[1,-69],hand],'#9baabd',13);
   line([hand,[tip.x-8*r,tip.y-8*r]],'#f6e6c7',10);
   line([hand,[tip.x-8*r,tip.y-8*r]],'#fff9e6',2.5);
   line([[hand[0]-14,hand[1]+3],[hand[0]+14,hand[1]-5]],'#e0bd85',6);
   if(t>.03&&t<.96){ctx.globalAlpha=.2+.2*t;line([[28,-129],[tip.x-12,tip.y-4]],'#a3d7ef',7);ctx.globalAlpha=1}
  } else if(id==='duelist'){
   // Dual blades alternate: each hit has a visible top/bottom leading hand.
   const ix=Math.max(0,e.index-(rec>0?1:0)),handed=ix%2;
   const crouch=14*c,lean=8*impact;
   fillPoly([[-33,-62+crouch],[-48,-17],[-27,0],[2,-12],[22,0],[31,-52+crouch]],'#52273d');
   fillPoly([[-31,-85+crouch],[-14,-97+crouch],[22,-84+crouch],[24,-44+crouch],[-23,-43+crouch]],'#a44757');
   fillPoly([[-7,-75+crouch],[12,-75+crouch],[11,-51+crouch],[-8,-52+crouch]],'#d27472');
   fillPoly([[-19,-112+crouch],[1,-124+crouch],[19,-108+crouch],[13,-89+crouch],[-19,-92+crouch]],'#342639');
   line([[-11,-97+crouch],[11,-97+crouch]],'#f7afb0',3.4);
   fillPoly([[-20,-42],[0,-39],[-7,0],[-30,0]],'#7c4e60');
   fillPoly([[4,-43],[19,-42],[30,0],[11,0]],'#74536e');
   // Active blade snaps from an unmistakable chambered stance into contact.
   const attackHand=[22+18*impact,-57-3*c];
   const tip=attackPoint(id,m.reach,t,c,handed);
   line([[9,-52],attackHand],'#d4acb6',9);
   line([attackHand,[tip.x-8*r,tip.y]],'#fff0ec',6.5);
   line([attackHand,[tip.x-8*r,tip.y]],'#ff9195',2);
   // The supporting blade is held clear of the hit point until the next attack.
   const backHand=[-13+7*c,-62-4*c];
   const backTip=[-43+24*c,-121+16*c];
   line([[-16,-54],backHand],'#b87280',8);
   line([backHand,backTip],'#e9a9b6',5);
   line([backHand,backTip],'#fff0ed',1.5);
   if(t>.15&&t<.9){ctx.globalAlpha=.28;line([[tip.x-20,tip.y+12],[tip.x,tip.y+3]],'#ff8996',11);ctx.globalAlpha=1}
  } else if(id==='cantor'){
   // The attack is a glowing palm and forward shock line, NOT a shrinking timing ring.
   const hover=Math.sin(now/320)*3,lift=10*c;
   ctx.translate(0,hover*(1-t));
   fillPoly([[-38,-72+lift],[-20,-110-lift],[11,-108-lift],[39,-78+lift],[44,-14],[30,0],[5,-19],[-14,0],[-43,-15]],'#7562a1');
   fillPoly([[-19,-102-lift],[1,-129-lift],[26,-100-lift],[13,-66],[-15,-66]],'#353355');
   fillPoly([[-10,-94-lift],[5,-95-lift],[16,-82-lift],[-15,-82-lift]],'#4f457a');
   round(-5,-90-lift,3.3,'#8ee1ff');round(10,-90-lift,3.3,'#8ee1ff');
   // The cantor traces a visible rune with its sleeve before releasing the wave.
   line([[-28,-80-lift],[-21,-70-lift],[-14,-80-lift]],'#d5c0fa',2.4);
   line([[-27,-73-lift],[-15,-73-lift]],'#9ce5fa',1.7);
   const hand=[25+12*impact,-62-29*c+8*impact];
   const tip=attackPoint(id,m.reach,t,c);
   line([[7,-60],hand],'#b5a6e9',9);
   line([hand,[tip.x-9*r,tip.y-5*r]],'#b0e8ff',6);
   // Ether condenses around the reaching palm as the move accelerates.
   const intensity=.24+.48*c+.26*t;
   ctx.save();ctx.globalAlpha=clamp(intensity);
   round(tip.x-7*r,tip.y-4*r,7+4*c,'#d6f4ff');
   for(let i=0;i<4;i++){
    const a=i*Math.PI*.5+now/730;
    const rx=33*Math.cos(a),ry=27*Math.sin(a);
    round(18+rx,-73-18*c+ry,2.6,i%2?'#c9b1f8':'#9feaff');
   }
   if(t>.35){line([[hand[0],hand[1]],[tip.x-9*r,tip.y-4*r]],'#87ceff',13*t)}
   ctx.restore();
  } else if(id==='clockwork'){
   // Mechanical timing is readable from piston extension and rotating gears.
   const tick=now*.0026,lean=6*c;
   fillPoly([[-22,-46],[-34,-34],[-34,0],[-11,0],[3,-39]],'#695b60');
   fillPoly([[7,-39],[22,-35],[35,0],[9,0]],'#7e6e6a');
   fillPoly([[-34,-93-lean],[-10,-103-lean],[25,-91-lean],[31,-51],[-27,-47]],'#847063');
   fillPoly([[-26,-91-lean],[20,-85-lean],[17,-56],[-21,-58]],'#be9b77');
   fillPoly([[-18,-119-lean],[5,-128-lean],[26,-115-lean],[20,-95-lean],[-18,-95-lean]],'#c2a582');
   line([[-8,-107-lean],[18,-107-lean]],'#8de4e0',3.4);
   for(const gear of [[-8,-73,16],[15,-65,11]]){
    const [gx,gy,rad]=gear,angle=tick+(gear[0]<0?1:-1)*c;
    ctx.save();ctx.translate(gx,gy);ctx.rotate(angle);ctx.strokeStyle='#f1d3a1';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,rad-4,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4;
     line([[Math.cos(a)*(rad-4),Math.sin(a)*(rad-4)],[Math.cos(a)*(rad+2),Math.sin(a)*(rad+2)]],'#e9c48f',4);
    }
    round(0,0,4,'#3d5262');ctx.restore();
   }
   // The piston visibly telescopes with the attacking thrust.
   const hand=[30,-60-18*c];
   const tip=attackPoint(id,m.reach,t,c);
   line([[14,-58],hand],'#c4aa8a',13);
   line([hand,[tip.x-6*r,tip.y-6*r]],'#d2bd9d',13);
   line([hand,[tip.x-6*r,tip.y-6*r]],'#f8e8c4',4);
   round(hand[0],hand[1],6,'#506378');
   const pistonX=lerp(42,m.reach-11,impact);
   line([[pistonX-13,-67],[pistonX,-67]],'#8ce2e1',4);
   if(c>.35){ctx.globalAlpha=.25+.3*c;round(16,-82,24,'#f8cc8533');ctx.globalAlpha=1}
  }
  ctx.restore();
  return true;
 }
 return Object.freeze({SUPPORTED,attackPoint,draw});
});
