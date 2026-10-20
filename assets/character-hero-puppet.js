/* Adopted illustrated hero: direct source-PNG cutout, forward 360 counter.
 * Drawing only. Existing 240ms counter clock, inputs and combat state are external.
 */
(function(root,factory){
 'use strict';const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryHeroPuppet=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const SOURCE='character-art/rework/hero/hero-ready-candidate.png';
 const SKIN_SOURCE='character-art/skins/fundoshi/hero-fundoshi-fine-v2.png';
 const SKIN_IDS=Object.freeze(['normal','chick','fundoshi','spacetime']);
 const scriptUrl=root?.document?.currentScript?.src;
 const WIDTH=1445,HEIGHT=1088,SCALE=.16,ORIGIN=Object.freeze([850,1045]);
 const PIVOTS=Object.freeze(Object.fromEntries(Object.entries({
  waist:[870,635],shoulder:[727,439],elbow:[611,456],wrist:[641,343],grip:[652,302],tip:[212,68],
  shieldShoulder:[1000,449],shieldContact:[1306,590],
  rearFoot:[480,1039],frontFoot:[1153,1037]
 }).map(([k,v])=>[k,Object.freeze(v)])));
 const poly=points=>Object.freeze(points.map(p=>Object.freeze(p.map(v=>Object.freeze(v)))));
 const MASKS=Object.freeze({
  weapon:poly([
   [[185,45],[345,45],[650,180],[710,180],[717,245],[785,295],[785,355],[580.53,355],[598,337],[520,349],[505,317],[548,267],[185,115]]
  ]),
  forearm:poly([[[785,355],[785,375],[675,375],[663,449],[643,487],[620,509],[583,509],[548,475],[541,428],[565,371],[580.53,355]]]),
  upperArm:poly([[[631,415],[668,389],[687,366],[730,355],[774,362],[807,387],[828,427],[812,448],[774,472],[750,487],[706,490],[665,505],[631,485],[615,469]]]),
  shield:poly([[[1001,403],[1039,423],[1059,448],[1097,426],[1139,367],[1166,373],[1213,397],[1265,415],[1308,413],[1328,462],[1333,547],[1328,650],[1316,744],[1280,833],[1248,822],[1184,773],[1125,707],[1090,637],[1057,597],[1025,577],[997,547],[978,500],[974,453]]]),
  cape:poly([[[432,360],[513,366],[565,348],[627,350],[674,366],[751,431],[771,483],[743,553],[691,606],[622,663],[541,708],[433,754],[286,735],[92,568],[85,427],[253,386],[412,413]]]),
  legs:poly([[[0,640],[WIDTH,640],[WIDTH,HEIGHT],[0,HEIGHT]]])
 });
 const ORDER=Object.freeze(['cape','legs','shield','body','upperArm','forearm','weapon']);
 const PRIORITY=Object.freeze(['weapon','forearm','upperArm','shield','cape','legs']);
 const CROPS=Object.freeze({
  weapon:Object.freeze([180,40,610,320]),forearm:Object.freeze([530,345,260,170]),upperArm:Object.freeze([605,345,235,170]),
  shield:Object.freeze([965,360,375,485]),cape:Object.freeze([75,335,710,435]),
  legs:Object.freeze([0,640,WIDTH,448]),body:Object.freeze([0,0,WIDTH,650])
 });
 const clamp=n=>Math.max(0,Math.min(1,Number(n)||0)),mix=(a,b,t)=>a+(b-a)*t;
 const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
 const point=(x,y)=>({x,y}),local=([x,y])=>point((x-ORIGIN[0])*SCALE,(y-ORIGIN[1])*SCALE);
 const add=(a,b)=>point(a.x+b.x,a.y+b.y);
 const rotate=(p,a)=>point(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));
 const about=(p,pivot,a)=>add(pivot,rotate(point(p.x-pivot.x,p.y-pivot.y),a));
 const P=Object.freeze(Object.fromEntries(Object.entries(PIVOTS).map(([k,v])=>[k,local(v)])));
 const upperDirection=Math.atan2(P.elbow.y-P.shoulder.y,P.elbow.x-P.shoulder.x);
 const foreDirection=Math.atan2(P.wrist.y-P.elbow.y,P.wrist.x-P.elbow.x);
 const IDLE_BEND=Math.atan2(Math.sin(foreDirection-upperDirection),Math.cos(foreDirection-upperDirection));
 let image=null,layers=null,status='idle',pending=null,maskStamp='',layerCrops={};
 let fundoshiImage=null,fundoshiPending=null,chickSprite=null;
 const skinLayers=new Map();
 const skinId=id=>SKIN_IDS.includes(id)?id:'normal';
 const sourceUrl=()=>new URL(root.ParryPixelArt?.source(SOURCE)||SOURCE,scriptUrl||'https://invalid.local/assets/character-hero-puppet.js').href;
 function canvas(w=WIDTH,h=HEIGHT){const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;}
 function polygon(ctx,polys){for(const points of polys){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}}
 function blueMask(img){
  const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData?.(0,0,WIDTH,HEIGHT)?.data;if(!pixels)return null;
  const mask=ctx.createImageData(WIDTH,HEIGHT),out=mask.data;
  // Keep cape/plume pixels behind the moving near arm. No recolouring.
  for(let y=3;y<HEIGHT-3;y++)for(let x=3;x<WIDTH-3;x++){
   const i=(y*WIDTH+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   if(pixels[i+3]&&b>35&&b>r*1.7&&b>g*1.22)
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)out[((y+dy)*WIDTH+x+dx)*4+3]=255;
  }
  ctx.putImageData(mask,0,0);return c;
 }
 function prepare(img,patchCape=true){
  const used=canvas(),uc=used.getContext('2d'),result={},blue=blueMask(img),armHoles=canvas(),ac=armHoles.getContext('2d');
  for(const name of [...PRIORITY,'body']){
   const mask=canvas(),mc=mask.getContext('2d');mc.fillStyle='#fff';
   const custom=root.ParryArtEdits?.maskFor('hero',name,MASKS[name]);
   if(name==='body')mc.fillRect(0,0,WIDTH,HEIGHT);else polygon(mc,custom||MASKS[name]);
   if(blue&&name==='cape'){mc.globalCompositeOperation='destination-in';mc.drawImage(blue,0,0);}
   if(blue&&['weapon','forearm','upperArm'].includes(name)){mc.globalCompositeOperation='destination-out';mc.drawImage(blue,0,0);}
   mc.globalCompositeOperation='destination-out';mc.drawImage(used,0,0);
   mc.globalCompositeOperation='source-over';
   if(['weapon','forearm','upperArm'].includes(name))keepConnected(mask,img);
   uc.drawImage(mask,0,0);
   if(['weapon','forearm','upperArm'].includes(name))ac.drawImage(mask,0,0);
   const crop=custom&&custom!==MASKS[name]?root.ParryArtEdits.sourceCrop(custom,WIDTH,HEIGHT,CROPS[name]):CROPS[name];
   layerCrops[name]=crop;const [x,y,w,h]=crop,part=canvas(w,h),pc=part.getContext('2d');
   pc.drawImage(img,-x,-y);pc.globalCompositeOperation='destination-in';pc.drawImage(mask,-x,-y);
   pc.globalCompositeOperation='source-over';result[name]=part;
  }
  // Concealed cape under the raised arm: reuse an adjacent cloth patch from
  // this SAME painting, clipped strictly to the cut arm's original footprint.
  if(!patchCape)return result;
  const patch=canvas(),pc=patch.getContext('2d');
  pc.drawImage(img,395,480,130,140,550,401,194,112);
  pc.globalCompositeOperation='destination-in';pc.drawImage(armHoles,0,0);
  const cover=canvas(),cc=cover.getContext('2d');cc.fillStyle='#fff';
  polygon(cc,poly([[[550,429],[604,414],[654,401],[744,407],[744,514],[550,514]]]));
  pc.drawImage(cover,0,0);
  const body=result.body.getContext('2d');body.globalCompositeOperation='destination-over';body.drawImage(patch,0,0);body.globalCompositeOperation='source-over';
  return result;
 }
 function keepConnected(mask,img){
  // A mask may graze a neighbouring plate across a transparent gap. Assign
  // only the main connected sword/arm to it; detached pixels stay on the body.
  const probe=canvas(),pc=probe.getContext('2d');pc.drawImage(img,0,0);
  pc.globalCompositeOperation='destination-in';pc.drawImage(mask,0,0);
  const data=pc.getImageData?.(0,0,WIDTH,HEIGHT)?.data;if(!data)return;
  const seen=new Uint8Array(WIDTH*HEIGHT),queue=new Int32Array(WIDTH*HEIGHT);let largest=[];
  for(let start=0;start<seen.length;start++)if(!seen[start]&&data[start*4+3]>8){
   let head=0,tail=1;queue[0]=start;seen[start]=1;
   while(head<tail){const i=queue[head++],x=i%WIDTH,y=Math.floor(i/WIDTH);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy;if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT)continue;
     const n=ny*WIDTH+nx;if(!seen[n]&&data[n*4+3]>8){seen[n]=1;queue[tail++]=n;}
    }
   }
   if(tail>largest.length)largest=queue.slice(0,tail);
  }
  const mc=mask.getContext('2d'),pixels=mc.getImageData(0,0,WIDTH,HEIGHT),keep=new Uint8Array(seen.length);
  for(const i of largest)keep[i]=1;
  for(let i=0;i<keep.length;i++)if(!keep[i])pixels.data[i*4+3]=0;
  mc.putImageData(pixels,0,0);
 }
 function preload(){
  if(pending)return pending;
  if(!root?.document?.createElement||typeof root.Image!=='function')return Promise.resolve(false);
  status='loading';pending=new Promise(resolve=>{
   const img=new root.Image();img.onload=async()=>{await root.ParryArtEdits?.ready;try{layers=prepare(img);image=img;maskStamp=root.ParryArtEdits?.maskStamp('hero')||'';status='ready';resolve(true);}
    catch(error){status='failed';root.console?.warn?.('[hero cutout]',error);resolve(false);}};
   img.onerror=()=>{status='failed';resolve(false);};img.src=sourceUrl();
  });return pending;
 }
 function filteredLayers(id){
  const filter=id==='chick'?'sepia(1) saturate(2.3) brightness(1.12)':'sepia(.85) saturate(2.5) hue-rotate(220deg) brightness(1.18)';
  return Object.fromEntries(ORDER.map(name=>{
   const source=layers[name],c=canvas(source.width,source.height),ctx=c.getContext('2d');
   ctx.drawImage(source,0,0);const pixels=ctx.getImageData?.(0,0,c.width,c.height);
   if(pixels?.data?.length){
    const hue=id==='chick'?54/360:277/360,saturation=id==='chick'?.78:.63;
    for(let i=0;i<pixels.data.length;i+=4){
     const d=pixels.data;if(!d[i+3])continue;
     const high=Math.max(d[i],d[i+1],d[i+2]),low=Math.min(d[i],d[i+1],d[i+2]);
     let l=(high+low)/510;if(l<.08)continue;
     const blue=d[i+2]>d[i]*1.3&&d[i+2]>d[i+1]*1.05;
     l=Math.min(.96,blue?l*1.12+.07:l+.025);
     const a=saturation*Math.min(l,1-l),channel=n=>{const k=(n+hue*12)%12;return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255)};
     d[i]=channel(0);d[i+1]=channel(8);d[i+2]=channel(4);
    }ctx.putImageData(pixels,0,0);
   }else{ctx.clearRect(0,0,c.width,c.height);ctx.filter=filter;ctx.drawImage(source,0,0)}
   return [name,c];
  }));
 }
 function buildSkin(id){
  const parts=id==='fundoshi'?prepare(fundoshiImage,false):filteredLayers(id);
  if(id==='chick')chickImage();
  skinLayers.set(id,parts);return true;
 }
 function skinReady(id='normal'){
  return status==='ready'&&(skinId(id)==='normal'||skinLayers.has(skinId(id)));
 }
 async function preloadSkin(id='normal'){
  id=skinId(id);if(!await preload())return false;syncLayers();
  if(id==='normal'||skinLayers.has(id))return true;
  if(id==='fundoshi'&&!fundoshiImage){
   if(!fundoshiPending)fundoshiPending=new Promise(resolve=>{
    const img=new root.Image();img.onload=()=>{fundoshiImage=img;resolve(true)};
    img.onerror=()=>resolve(false);img.src=new URL(SKIN_SOURCE,scriptUrl||'https://invalid.local/assets/character-hero-puppet.js').href;
   });
   if(!await fundoshiPending)return false;
  }
  syncLayers();if(skinLayers.has(id))return true;
  try{return buildSkin(id)}catch(error){root.console?.warn?.('[hero skin]',error);return false}
 }
 // Pixel-native head ornament, anchored to the torso but drawn above all parts.
 function chickImage(){
  if(chickSprite)return chickSprite;
  chickSprite=canvas(15,12);const ctx=chickSprite.getContext('2d'),pixel=1;
  const rows=[
   '....oo.........','...oyyo........','..oyyyyyo......',
   '.oyyyyyyyo.....','oyhyyyyyyyo....','oyhyyyykyyo....',
   'oyyyyyyyyoor...','.oyyyyyyyo.....','..oyyyyyyo.....',
   '...oyyyyo......','....oooo.......','....r..r.......'];
  const colors={o:'#855413',y:'#ffdc4d',h:'#fff3a2',k:'#1d2630',r:'#f19b32'};
  rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(colors[v]){ctx.fillStyle=colors[v];ctx.fillRect(x*pixel,y*pixel,pixel,pixel)}}));return chickSprite;
 }
 function drawChick(ctx,q){
  // Use the existing counter phase: no separate timer or mutable jump state,
  // so pause, slow motion and scrubbing show the same hop as real combat.
  const t=q.action>0?clamp((q.phase-.025)/.925):0;
  const hop=4*t*(1-t),stretch=Math.sin(Math.PI*t);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(945-18*hop,250-150*hop);
  ctx.rotate(-.12*Math.sin(Math.PI*2*t));ctx.scale(1-.04*stretch,1+.06*stretch);
  ctx.drawImage(chickImage(),-107,-216,270,216);ctx.restore();
 }
 function drawClocks(ctx,now){
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle='#d7b0ff';
  for(let i=0;i<3;i++){
   const x=52+i*12,y=-117+i*14,r=27-i*4;
   ctx.globalAlpha=.34-i*.08;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
   for(let j=0;j<12;j++){const a=j*Math.PI/6;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r-4),y+Math.sin(a)*(r-4));ctx.lineTo(x+Math.cos(a)*(r-1),y+Math.sin(a)*(r-1));ctx.stroke()}
   const a=now/1300+i*.65;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65);ctx.lineTo(x,y);ctx.lineTo(x+Math.cos(a/12-1.5)*r*.4,y+Math.sin(a/12-1.5)*r*.4);ctx.stroke();
  }ctx.restore();
 }
 function armAngles(action=0){
  const a=clamp(action);if(a===0)return {shoulder:0,elbow:0,wrist:0};
  const t=1-a;
  const keyed=keys=>{for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [x,v]=keys[i-1],[y,w]=keys[i];return mix(v,w,smooth((t-x)/(y-x)));}return keys.at(-1)[1];};
  // sannkou.mp4: extend forward, pass below, recover behind, then fold to
  // the high guard. The wrist lets the blade follow after the arm.
  const shoulder=keyed([[0,0],[.10,-.14],[.34,3.0],[.44,3.45],[.64,4.85],[.82,5.70],[1,Math.PI*2]]);
  const extension=armExtension(t),fold=.46*Math.abs(Math.sin(shoulder));
  const elbow=t<=.42?mix(fold,-IDLE_BEND,extension)
   :keyed([[.42,-IDLE_BEND],[.58,.20],[.70,-.55],[.82,-.40],[1,0]]);
  const sword=keyed([[0,0],[.10,-.14],[.24,.55],[.34,1.35],[.44,2.40],[.58,3.75],[.70,4.55],[.82,5.40],[1,Math.PI*2]]);
  return {shoulder,elbow,wrist:sword-shoulder-elbow};
 }
 function armExtension(phase){return smooth((phase-.18)/.16)*(1-smooth((phase-.42)/.12));}
 function pose(input={}){
  const success=input.lastStrikeKind===undefined||['parry','just'].includes(input.lastStrikeKind);
  const action=success?clamp(input.action):0,phase=1-action,weight=action>0?Math.sin(phase*Math.PI):0;
  const push=clamp(input.push),hurt=clamp(input.hurt)*(input.lastStrikeKind==='guard'?.35:1);
  const lift=Math.max(clamp(input.lift),input.guardHeld?clamp(input.heldLift):0);
  // The player holds their ground; opponents provide the approach motion.
  const lean=weight*.025-push*.02-hurt*.04,slide=weight*2-push-hurt*3;
  const angles=armAngles(action),shoulder=about(P.shoulder,P.waist,lean);
  const elbow=add(shoulder,rotate(point(P.elbow.x-P.shoulder.x,P.elbow.y-P.shoulder.y),lean+angles.shoulder));
  const foreAngle=lean+angles.shoulder+angles.elbow;
  const forePoint=p=>add(elbow,rotate(point(p.x-P.elbow.x,p.y-P.elbow.y),foreAngle));
  const wrist=forePoint(P.wrist),swordAngle=foreAngle+angles.wrist;
  const swordPoint=p=>add(wrist,rotate(point(p.x-P.wrist.x,p.y-P.wrist.y),swordAngle));
  // Lower the far arm at rest, then rotate it about its shoulder to the
  // established contact position. A fully raised shield keeps the old hit point.
  const shieldShoulder=about(P.shieldShoulder,P.waist,lean),shieldAngle=lean+.30*(1-smooth(lift))+push*.09;
  const shieldContact=add(shieldShoulder,rotate(point(P.shieldContact.x-P.shieldShoulder.x,P.shieldContact.y-P.shieldShoulder.y),shieldAngle));
  return {action,phase,weight,push,hurt,lift,lean,slide,angles,extension:action>0?armExtension(phase):0,shoulder,elbow,wrist,foreAngle,swordAngle,
   hand:swordPoint(P.grip),tip:swordPoint(P.tip),shieldShoulder,shieldContact,shieldAngle,
   frontFoot:P.frontFoot,rearFoot:P.rearFoot};
 }
 function placements(q){
  const body={at:P.waist,pivot:PIVOTS.waist,angle:q.lean};
  return {cape:body,legs:{at:point(0,0),pivot:ORIGIN,angle:0},body,
   shield:{at:q.shieldShoulder,pivot:PIVOTS.shieldShoulder,angle:q.shieldAngle},
   upperArm:{at:q.shoulder,pivot:PIVOTS.shoulder,angle:q.lean+q.angles.shoulder},
   forearm:{at:q.elbow,pivot:PIVOTS.elbow,angle:q.foreAngle},
   weapon:{at:q.wrist,pivot:PIVOTS.wrist,angle:q.swordAngle}};
 }
 function beginPart(ctx,t){
  ctx.save();if(root.ParryPixelArt?.enabled)ctx.imageSmoothingEnabled=false;
  if(t.opacity!==undefined)ctx.globalAlpha*=t.opacity;
  ctx.translate(t.at.x,t.at.y);ctx.rotate(t.angle);
  ctx.scale(SCALE*(t.sx||1),SCALE*(t.sy||1));ctx.translate(-t.pivot[0],-t.pivot[1]);
 }
 function drawCutout(ctx,q,{debug=false,editTime=q.action>0?q.phase*240:0,skin='normal',now=0}={}){
  if(status!=='ready')return false;
  syncLayers();skin=skinId(skin);
  if(skin!=='normal'&&!skinLayers.has(skin)){
   if(skin!=='fundoshi'||fundoshiImage)buildSkin(skin);else return false;
  }
  const activeLayers=skin==='normal'?layers:skinLayers.get(skin);
  const edits=root.ParryArtEdits,p=placements(q),rest=edits?placements(pose()):null;
  const adjusted=edits?.placements('hero',p,rest,editTime,SCALE)||p;
  edits?.begin(ctx,'hero',SCALE);
  if(skin==='spacetime')drawClocks(ctx,now);
  for(const name of edits?.orderFor('hero',ORDER)||ORDER){
   const t=adjusted[name];
   if(t.visible===false)continue;
   const [x,y]=layerCrops[name]||CROPS[name];beginPart(ctx,t);ctx.drawImage(activeLayers[name],x,y);
   ctx.restore();
  }
  if(debug){
   ctx.save();ctx.strokeStyle='#7affec';ctx.lineWidth=.8;ctx.beginPath();
   ctx.moveTo(q.shoulder.x,q.shoulder.y);ctx.lineTo(q.elbow.x,q.elbow.y);ctx.lineTo(q.wrist.x,q.wrist.y);ctx.lineTo(q.hand.x,q.hand.y);ctx.lineTo(q.tip.x,q.tip.y);ctx.stroke();ctx.restore();
  }
  // Reapply the edited body's anchor after the sword/arms, even when a custom
  // layer order is active. The chick keeps its helmet seat and stays foremost.
  if(skin==='chick'&&adjusted.body.visible!==false){
   beginPart(ctx,adjusted.body);drawChick(ctx,q);ctx.restore();
  }
  edits?.end(ctx);return true;
 }
 function syncLayers(){const stamp=root.ParryArtEdits?.maskStamp('hero')||'';if(status==='ready'&&maskStamp!==stamp){layers=prepare(image);skinLayers.clear();maskStamp=stamp;}}
 function editModel(){
  if(status!=='ready')return null;syncLayers();
  const labels={cape:'マント',legs:'下半身',shield:'盾と左腕',body:'胴・兜',upperArm:'剣腕の肩鎧・上腕',forearm:'剣腕の肘から手首',weapon:'剣と握り手・手首'};
  return {id:'hero',name:'主人公',width:WIDTH,height:HEIGHT,origin:ORIGIN,unit:SCALE,source:image,order:ORDER,
   parts:Object.fromEntries(ORDER.map(key=>[key,{image:layers[key],crop:layerCrops[key]||CROPS[key],mask:MASKS[key]||null,label:labels[key]}]))};
 }
 function drawHero(ctx,data){
  if(status!=='ready'||!data?.layout||!skinReady(data.skin))return false;
  const {layout:l,pose:input={},debug=false}=data,q=pose(input);
  ctx.save();ctx.fillStyle='#030914a8';ctx.beginPath();ctx.ellipse(l.heroX+q.slide*l.heroScale,l.ground+2,56*l.heroScale,5*l.heroScale,0,0,7);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(l.heroX+q.slide*l.heroScale,l.ground);ctx.scale(l.heroScale,l.heroScale);
  const customized=root.ParryArtEdits?.character('hero');
  if(q.action>.10&&q.action<.83&&data.motionVersion!=='v4'&&root.ParryCombatArt?.bladeRibbon&&!customized){
   const frames=[];
   for(let i=0;i<=6;i++){
    const old=pose({...input,action:clamp(q.action+.15*(1-i/6))});
    const at=p=>({x:p.x+old.slide-q.slide,y:p.y});frames.push({hand:at(old.hand),tip:at(old.tip)});
   }
   root.ParryCombatArt.bladeRibbon(ctx,frames,input.lastStrikeKind==='just'?'#a1f4ff':'#b4d9ff');
  }
  else if(q.action>.10&&q.action<.83&&data.motionVersion==='v4'&&!customized){
   ctx.save();ctx.lineCap='round';ctx.strokeStyle=input.lastStrikeKind==='just'?'#a1f4ff':'#b4d9ff';
   for(let i=0;i<6;i++){
    const a=pose({...input,action:clamp(q.action+.15*(1-i/6))}),b=pose({...input,action:clamp(q.action+.15*(1-(i+1)/6))});
    ctx.globalAlpha=.05+i*.025;ctx.lineWidth=2+i*.7;ctx.beginPath();ctx.moveTo(a.tip.x,a.tip.y);ctx.lineTo(b.tip.x,b.tip.y);ctx.stroke();
   }ctx.restore();
  }
  drawCutout(ctx,q,{debug,skin:data.skin,now:data.now||input.now||0});
  if((input.guardHeld&&clamp(input.heldLift)>.98)||(input.lastStrikeKind==='just'&&(data.now||0)-(input.lastImpactAt??-99999)<170)){
   const offset=rotate(point(-17,4),q.shieldAngle);
   ctx.save();ctx.strokeStyle='#b4f6ff';ctx.globalAlpha=.4;ctx.lineWidth=1;
   ctx.beginPath();ctx.ellipse(q.shieldContact.x+offset.x,q.shieldContact.y+offset.y,24,38,q.shieldAngle-.14,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.restore();
  const counterPhase=data.counterPhase??(q.action>0?q.phase:-1);
  if(counterPhase>.30&&counterPhase<272/240&&['parry','just'].includes(input.lastStrikeKind)&&data.counterTarget){
   // Use a stable release direction while the sword follows through, so the
   // enemy-front crescent cannot flip back as the hand circles behind us.
   const releasePhase=.22,release=pose({...input,action:1-releasePhase,lift:1,hurt:0,
    push:Math.sin(Math.PI*releasePhase*240/160)*(input.lastStrikeKind==='just'?1:.45)});
   const edits=root.ParryArtEdits,parts=placements(release),weapon=(edits?.placements('hero',parts,placements(pose()),releasePhase*240,SCALE)||parts).weapon;
   if(weapon.visible!==false&&(weapon.opacity??1)>0){
    const v=rotate(point((PIVOTS.grip[0]-weapon.pivot[0])*SCALE*(weapon.sx||1),(PIVOTS.grip[1]-weapon.pivot[1])*SCALE*(weapon.sy||1)),weapon.angle);
    const whole=edits?.whole('hero')||{x:0,y:0,scale:1};
    const origin={x:l.heroX+(release.slide+(weapon.at.x+v.x)*whole.scale+whole.x*SCALE)*l.heroScale,
     y:l.ground+((weapon.at.y+v.y)*whole.scale+whole.y*SCALE)*l.heroScale};
    root.ParryCombatArt?.counterSlash?.(ctx,{kind:input.lastStrikeKind,phase:counterPhase,origin,target:data.counterTarget,scale:l.heroScale,tint:data.counterTint});
   }
  }
  return true;
 }
 function drawReference(ctx,{x,ground,scale}){
  if(status!=='ready')return false;
  ctx.drawImage(image,x-ORIGIN[0]*SCALE*scale,ground-ORIGIN[1]*SCALE*scale,WIDTH*SCALE*scale,HEIGHT*SCALE*scale);return true;
 }
 function compareIdle(){
  if(status!=='ready')return null;
  const c=canvas(),ctx=c.getContext('2d');ctx.translate(ORIGIN[0],ORIGIN[1]);ctx.scale(1/SCALE,1/SCALE);drawCutout(ctx,pose());
  const out=ctx.getImageData(0,0,WIDTH,HEIGHT).data,ref=canvas(),rc=ref.getContext('2d');rc.drawImage(image,0,0);
  const src=rc.getImageData(0,0,WIDTH,HEIGHT).data;let total=0,different=0;
  for(let i=0;i<src.length;i+=4)if(src[i+3]||out[i+3]){
   total++;let d=0;for(let k=0;k<4;k++)d+=Math.abs(src[i+k]-out[i+k]);if(d>20)different++;
  }
  return {pixels:total,different,ratio:different/Math.max(1,total)};
 }
 function drawParts(ctx,width,height){
  if(status!=='ready')return false;
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#182536';ctx.fillRect(0,0,width,height);
  const labels={cape:'奥：元の青マント',legs:'元の下半身',shield:'左腕・盾',body:'胴・兜・飾り布',upperArm:'手前：肩鎧ごと回る剣上腕',forearm:'剣腕の肘から手首',weapon:'最前面：剣と握り手'};
  const rows=Math.ceil(ORDER.length/3);
  ORDER.forEach((name,i)=>{
   const x=i%3*width/3,y=Math.floor(i/3)*height/rows,c=layers[name],s=Math.min((width/3-28)/c.width,(height/rows-52)/c.height);
   ctx.drawImage(c,x+(width/3-c.width*s)/2,y+36,c.width*s,c.height*s);
   ctx.fillStyle='#e3d4b8';ctx.font='12px system-ui';ctx.fillText(labels[name],x+12,y+21);
  });return true;
 }
 function bounds(q){
  const p=placements(q),out=[];
  for(const name of ORDER){
   const polys=name==='body'?poly([[[680,155],[1050,155],[1050,650],[680,650]]]):MASKS[name];
   for(const points of polys)for(const [x,y] of points){
    const t=p[name];out.push(add(t.at,rotate(point((x-t.pivot[0])*SCALE,(y-t.pivot[1])*SCALE),t.angle)));
   }
  }
  return {minX:Math.min(...out.map(p=>p.x))+q.slide,maxX:Math.max(...out.map(p=>p.x))+q.slide,
   minY:Math.min(...out.map(p=>p.y)),maxY:Math.max(...out.map(p=>p.y))};
 }
 if(root?.document&&(root.ParryPixelArt?.adopted||/(?:^|[?&])art=illustrated(?:&|$)/.test(root.location?.search||'')))preload();
 return Object.freeze({SOURCE,SKIN_SOURCE,SKIN_IDS,skinId,preloadSkin,skinReady,WIDTH,HEIGHT,SCALE,ORIGIN,PIVOTS,MASKS,CROPS,ORDER,PRIORITY,sourceUrl,preload,status:()=>status,ready:()=>status==='ready',
  armAngles,armExtension,pose,placements,drawCutout,drawHero,drawReference,compareIdle,drawParts,bounds,editModel});
});
