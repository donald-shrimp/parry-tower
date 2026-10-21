/* Seekable ending storyboard. Deterministic presentation; no gameplay, saves or RNG. */
(function(root){
 'use strict';
 const DEFAULTS=Object.freeze({fireworks:6,pullback:6,overload:4,density:1,zoom:.58,blast:1});
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 function normalize(raw={}){return {fireworks:clamp(raw.fireworks??6,2,20),pullback:clamp(raw.pullback??6,2,12),overload:clamp(raw.overload??4,1,10),density:clamp(raw.density??1,.2,2),zoom:clamp(raw.zoom??.58,.4,.9),blast:clamp(raw.blast??1,.3,1.5)};}
 const smooth=t=>{const n=clamp(t,0,1);return n*n*(3-2*n)};
 const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
 function marks(raw){const p=normalize(raw),zoom=3+p.fireworks,overload=zoom+p.pullback,blast=overload+p.overload;return [{at:0,name:'勝利'},{at:3,name:'花火'},{at:zoom,name:'引き'},{at:overload,name:'過剰打上'},{at:blast,name:'塔爆発'},{at:blast+2,name:'生還'},{at:blast+6,name:'踏破'}];}
 function sample(seconds,raw){
  const p=normalize(raw),m=marks(p),duration=m[6].at+4,t=clamp(seconds,0,duration),stage=m.filter(x=>t>=x.at).at(-1);
  return {time:t,duration,stage:stage.name,marks:m,zoom:10+(p.zoom-10)*smooth((t-m[2].at)/p.pullback),pull:smooth((t-m[2].at)/p.pullback),explosion:Math.max(0,t-m[4].at),exploded:t>=m[4].at,landing:smooth((t-m[5].at)/4),title:smooth((t-m[6].at)/1.2)};
 }
 function draw(ctx,width,height,seconds,raw,drawHero,lowFlash=false){
  const p=normalize(raw),s=sample(seconds,p),t=s.time,blastAt=s.marks[4].at;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0a1021';ctx.fillRect(0,0,width,height);
  for(let i=0;i<90;i++){const x=hash(i+3)*width,y=hash(i+203)*height*.8;ctx.fillStyle=i%4?'#97aec04a':'#f2dca666';ctx.fillRect(Math.floor(x),Math.floor(y),2,2)}
  const viewZoom=s.zoom+(9-s.zoom)*s.landing,cameraY=-8+278*s.pull+(690-270)*s.landing;
  ctx.translate(width*.5,height*.46);ctx.scale(viewZoom,viewZoom);ctx.translate(0,-cameraY);
  ctx.fillStyle='#151923';ctx.fillRect(-2000,700,4000,1200);
  if(!s.exploded){
   ctx.fillStyle='#121726';ctx.fillRect(-83,0,166,700);ctx.fillStyle='#303a50';ctx.fillRect(-76,0,152,700);
   for(let floor=0;floor<80;floor++){const y=floor*8.6+8;ctx.fillStyle=floor%2?'#36425a':'#2b354a';ctx.fillRect(-74,y,148,7);for(let x=-45;x<=45;x+=45){ctx.fillStyle='#e4b56a';ctx.globalAlpha=.25+hash(floor*4+x)*.45;ctx.fillRect(x,y+1,8,4)}ctx.globalAlpha=1;}
   ctx.fillStyle='#4b5870';ctx.fillRect(-90,-10,180,15);for(let x=-90;x<=76;x+=28)ctx.fillRect(x,-25,14,20);
   ctx.fillStyle='#8b7861';ctx.fillRect(-83,688,166,12);
  }else{
   const age=s.explosion;
   for(let i=0;i<150;i++){const originY=hash(i+91)*690,vx=(hash(i+12)-.5)*220*p.blast,vy=-40-hash(i+32)*190;
    const x=Math.max(-650,Math.min(650,(hash(i+80)-.5)*150+vx*age)),y=Math.min(695,originY+vy*age+90*age*age),size=5+hash(i+50)*17;
    ctx.fillStyle=i%4?'#384158':'#718092';ctx.fillRect(Math.round(x),Math.round(y),size,size*.8);}
   const glow=Math.max(0,1-age/1.6);if(glow){ctx.globalAlpha=glow*(lowFlash?.22:.65);ctx.fillStyle='#ffd193';ctx.beginPath();ctx.arc(0,330,Math.min(700,age*600+30)*p.blast,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  }
  const count=Math.floor(140*p.density);
  for(let i=0;i<count;i++){
   const birth=3+(blastAt-3)*Math.sqrt(i/count),age=t-birth;if(age<0||age>1.5||t>blastAt+1)continue;
   const x=(hash(i+20)-.5)*(35+200*s.pull),y=-20-hash(i+44)*(12+100*s.pull),color=['#ffc97b','#bfa8ff','#8de9f2','#ff9fbc','#d6edb5'][i%5];
   if(age<.22){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,20-(20-y)*age/.22);ctx.stroke();continue;}
   ctx.globalAlpha=Math.max(0,1-(age-.22)/1.28);ctx.fillStyle=color;
   for(let n=0;n<22;n++){const a=n*Math.PI*2/22,r=(age-.22)*(8+hash(i+61)*(15+70*s.pull)),py=y+Math.sin(a)*r+25*age*age;ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(py),3,3)}ctx.globalAlpha=1;
  }
  if(t>=blastAt+5.1&&t<blastAt+6.5){ctx.fillStyle='#ffdf9e';for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=(t-blastAt-5.1)*3;ctx.fillRect(-25+Math.cos(a)*r,677+Math.sin(a)*r,2,2)}}
  if(drawHero){const flight=s.exploded?smooth(s.explosion/3):0;drawHero(ctx,{x:Math.sin(flight*Math.PI)*90,y:-10+710*flight,scale:.1,guard:s.exploded?1:0,time:t*1000,hop:s.exploded?Math.max(0,1-s.explosion/3):0});}
  ctx.restore();
  if(s.title){ctx.save();ctx.globalAlpha=s.title;ctx.fillStyle='#fff0cf';ctx.textAlign='center';ctx.font='38px "Checkpoint Period Display",monospace';ctx.fillText('踏破完了。',width*.5,height*.23);ctx.font='15px system-ui';ctx.fillStyle='#ccd5e2';ctx.fillText('パリィの塔',width*.5,height*.23+36);ctx.restore();}
  return s;
 }
 const API=Object.freeze({DEFAULTS,normalize,marks,sample,draw});if(typeof module==='object'&&module.exports)module.exports=API;if(root)root.ParryEndingScene=API;
})(typeof window!=='undefined'?window:undefined);
