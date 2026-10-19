/* Shared, presentation-only art adjustments. No gameplay state or clocks. */
(function(root,factory){
 'use strict';const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryArtEdits=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const SCHEMA='parry-art-studio',VERSION=1,DRAFT_KEY='parry.art-studio.draft.v1',ACTIVE_KEY='parry.art-studio.active.v1';
 const clone=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const name=s=>typeof s==='string'&&/^[a-z][a-zA-Z0-9_]{0,39}$/.test(s)&&!['constructor','prototype','__proto__'].includes(s);
 const object=o=>o&&typeof o==='object'&&!Array.isArray(o);
 const empty=()=>({schema:SCHEMA,version:VERSION,updatedAt:0,characters:{}});
 const number=(v,f,min,max)=>{if(v===undefined)return f;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('数値が範囲外です');return v;};
 const defaults=()=>({x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:0,pivotY:0,opacity:1,visible:true,mode:'add',keys:[]});
 function values(v,key=false){
  if(!object(v))throw Error('部品の設定を読み込めません');
  const out={x:number(v.x,0,-4000,4000),y:number(v.y,0,-4000,4000),rotation:number(v.rotation,0,-4320,4320),
   scaleX:number(v.scaleX,1,.05,8),scaleY:number(v.scaleY,1,.05,8),opacity:number(v.opacity,1,0,1)};
  if(key){out.time=number(v.time,0,0,3000);out.easing=['smooth','linear','hold'].includes(v.easing)?v.easing:'smooth';}
  else {out.pivotX=number(v.pivotX,0,-4000,4000);out.pivotY=number(v.pivotY,0,-4000,4000);out.visible=v.visible!==false;out.mode=v.mode==='replace'?'replace':'add';}
  return out;
 }
 function readKeys(v){
  if(v.keys!==undefined&&(!Array.isArray(v.keys)||v.keys.length>80))throw Error('ポーズは部品ごとに80個までです');
  const keys=(v.keys||[]).map(k=>values(k,true)).sort((a,b)=>a.time-b.time);
  if(new Set(keys.map(k=>k.time)).size!==keys.length)throw Error('同じ時刻のポーズが重複しています');return keys;
 }
 function readWindow(v){
  if(!Array.isArray(v)||v.length!==4)throw Error('ポーズの適用区間が不正です');
  const w=v.map(t=>number(t,-1,0,3000));
  if(!(w[0]>=0&&w[0]<w[1]&&w[1]<=w[2]&&w[2]<w[3]))throw Error('ポーズの適用区間が不正です');return w;
 }
 function normalize(input){
  if(!object(input)||input.schema!==SCHEMA||input.version!==VERSION||!object(input.characters))throw Error('このツールの調整ファイル（v1）を選んでください');
  if(Object.keys(input.characters).length>32)throw Error('キャラクター数が多すぎます');
  const out=empty();out.updatedAt=number(input.updatedAt,0,0,Number.MAX_SAFE_INTEGER);
  for(const [id,c]of Object.entries(input.characters)){
   if(!name(id)||!object(c))throw Error('キャラクター名が不正です');
   const p=c.placement||{},o={placement:{x:number(p.x,0,-4000,4000),y:number(p.y,0,-4000,4000),scale:number(p.scale,1,.1,5)},layers:{}};
   if(c.effects!==undefined){if(!object(c.effects))throw Error('残像の設定が不正です');o.effects={swordBlurDuration:number(c.effects.swordBlurDuration,200,40,400)};}
   if(c.order!==undefined){if(!Array.isArray(c.order)||c.order.length>32||new Set(c.order).size!==c.order.length||c.order.some(k=>!name(k)))throw Error('部品の順序が不正です');o.order=[...c.order];}
   if(c.groups!==undefined){
    if(!Array.isArray(c.groups)||c.groups.length>16)throw Error('連動グループは16個までです');
    o.groups=c.groups.map(g=>{
     if(!object(g)||!Array.isArray(g.parts)||g.parts.length<2||g.parts.length>32||g.parts.some(k=>!name(k))||new Set(g.parts).size!==g.parts.length||!g.parts.includes(g.anchor))throw Error('連動グループの部品が不正です');
     if(!Array.isArray(g.pivot)||g.pivot.length!==2||g.pivot.some(v=>typeof v!=='number'))throw Error('連動グループの中心が不正です');
     const t=values(g),out={parts:[...g.parts],anchor:g.anchor,pivot:g.pivot.map(v=>number(v,0,-4000,4000)),x:t.x,y:t.y,rotation:t.rotation,keys:readKeys(g)};
     if(g.poseWindow!==undefined)out.poseWindow=readWindow(g.poseWindow);return out;
    });
   }
   if(c.layers&&!object(c.layers))throw Error('部品の設定が不正です');
   if(Object.keys(c.layers||{}).length>32)throw Error('部品が多すぎます');
   for(const [key,v]of Object.entries(c.layers||{})){
    if(!name(key))throw Error('部品名が不正です');const layer=values(v);
    layer.keys=readKeys(v);
    if(v.poseWindow!==undefined)layer.poseWindow=readWindow(v.poseWindow);
    if(v.mask!==undefined){
     if(!Array.isArray(v.mask)||!v.mask.length||v.mask.length>16)throw Error('切り抜き範囲は1〜16個です');
     layer.mask=v.mask.map(poly=>{
      if(!Array.isArray(poly)||poly.length<3||poly.length>512)throw Error('切り抜きの点は3〜512個です');
      return poly.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('切り抜きの点が不正です');return [number(p[0],0,0,id==='gem_slime'?1536:1445),number(p[1],0,0,id==='gem_slime'?1024:1088)];});
     });
    }
    o.layers[key]=layer;
   }
   out.characters[id]=o;
  }
  return out;
 }
 let project=root.ParryArtDefaults?normalize(root.ParryArtDefaults):empty(),revision=0,bypass=false;const stamps=new Map();
 function setProject(value){project=normalize(value);revision++;stamps.clear();return clone(project);}
 const getProject=()=>clone(project);
 const character=id=>!bypass?project.characters[id]:undefined;
 function maskStamp(id){if(!stamps.has(id)){const c=project.characters[id];stamps.set(id,JSON.stringify(Object.fromEntries(Object.entries(c?.layers||{}).filter(([,p])=>p.mask).map(([k,p])=>[k,p.mask]))));}return stamps.get(id);}
 function maskFor(id,key,fallback){return project.characters[id]?.layers?.[key]?.mask||fallback;}
 function orderFor(id,base){const order=character(id)?.order;if(!order)return base;return [...order.filter(k=>base.includes(k)),...base.filter(k=>!order.includes(k))];}
 function sampleKeys(keys,time){
  const identity={x:0,y:0,rotation:0,scaleX:1,scaleY:1,opacity:1};if(!keys?.length)return identity;
  if(time<=keys[0].time)return keys[0];if(time>=keys.at(-1).time)return keys.at(-1);
  const i=keys.findIndex(k=>k.time>time),a=keys[i-1],b=keys[i];let t=(time-a.time)/(b.time-a.time);
  if(a.easing==='hold')t=0;else if(a.easing!=='linear')t=t*t*(3-2*t);
  const out={};for(const key of Object.keys(identity))out[key]=a[key]+(b[key]-a[key])*t;return out;
 }
 const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
 const rotationStep=(previous,next)=>Math.atan2(Math.sin(next-previous),Math.cos(next-previous));
 function poseWeight(range,time){
  if(!range)return 1;
  const [start,fullStart,fullEnd,end]=range;if(time<=start||time>=end)return 0;
  const t=time<fullStart?(time-start)/(fullStart-start):time>fullEnd?(end-time)/(end-fullEnd):1;
  return t*t*(3-2*t);
 }
 // Legacy endpoint conversion; animated groups use placements() so their
 // positions follow the shared pivot's arc throughout interpolation.
 function groupDeltas(parts,pivot,{x=0,y=0,rotation=0}={},u=1){
  if(!Number.isFinite(u)||u<=0||![pivot.x,pivot.y,x,y,rotation].every(Number.isFinite))throw Error('まとめて動かす数値が不正です');
  const a=rotation*Math.PI/180;
  return Object.fromEntries(Object.entries(parts).map(([key,p])=>{
   const v=rotate(p.at.x-pivot.x,p.at.y-pivot.y,a);
   return [key,{x:(pivot.x+v.x+x-p.at.x)/u,y:(pivot.y+v.y+y-p.at.y)/u,rotation}];
  }));
 }
 function placement(id,key,animated,rest,time,u){
  const patch=character(id)?.layers?.[key];if(!patch)return animated;
  const p=patch.mode==='replace'&&rest?rest:animated,k=sampleKeys(patch.keys,time),weight=poseWeight(patch.poseWindow,time);
  const delta=rotate(patch.pivotX*u*(p.sx||1),patch.pivotY*u*(p.sy||1),p.angle);
  return {...p,phaseVisible:animated.phaseVisible,at:{x:p.at.x+delta.x+(patch.x+k.x)*u*weight,y:p.at.y+delta.y+(patch.y+k.y)*u*weight},
   pivot:[p.pivot[0]+patch.pivotX,p.pivot[1]+patch.pivotY],angle:p.angle+(patch.rotation+k.rotation)*Math.PI/180*weight,
   sx:(p.sx||1)*patch.scaleX*k.scaleX,sy:(p.sy||1)*patch.scaleY*k.scaleY,
   opacity:patch.opacity*k.opacity,visible:patch.visible};
 }
 function groupState(g,parts,time,u){
  const anchor=parts[g.anchor];if(!anchor||anchor.phaseVisible===false)return null;
  const v=rotate(g.pivot[0]*u,g.pivot[1]*u,anchor.angle),k=sampleKeys(g.keys,time),weight=poseWeight(g.poseWindow,time);
  return {pivot:{x:anchor.at.x+v.x,y:anchor.at.y+v.y},x:(g.x+k.x)*u*weight,y:(g.y+k.y)*u*weight,rotation:(g.rotation+k.rotation)*weight,weight};
 }
 function placements(id,animated,rest,time,u,limit=Infinity){
  const out=Object.fromEntries(Object.entries(animated).map(([key,p])=>[key,placement(id,key,p,rest?.[key],time,u)]));
  for(const g of (character(id)?.groups||[]).slice(0,limit)){
   const state=groupState(g,out,time,u);if(!state||state.weight===0)continue;const a=state.rotation*Math.PI/180;
   for(const key of g.parts){const p=out[key];if(!p)continue;const v=rotate(p.at.x-state.pivot.x,p.at.y-state.pivot.y,a);
    out[key]={...p,at:{x:state.pivot.x+v.x+state.x,y:state.pivot.y+v.y+state.y},angle:p.angle+a};
   }
  }return out;
 }
 function composeGroup(state,center,{x=0,y=0,rotation=0},u){
  const v=rotate(state.pivot.x+state.x-center.x,state.pivot.y+state.y-center.y,rotation*Math.PI/180);
  return {x:(center.x+v.x+x-state.pivot.x)/(u*state.weight),y:(center.y+v.y+y-state.pivot.y)/(u*state.weight),rotation:(state.rotation+rotation)/state.weight};
 }
 function whole(id){return character(id)?.placement||{x:0,y:0,scale:1};}
 function begin(ctx,id,u){const p=whole(id);ctx.save();if(p.x||p.y)ctx.translate(p.x*u,p.y*u);if(p.scale!==1)ctx.scale(p.scale,p.scale);}
 const end=ctx=>ctx.restore();
 function sourceCrop(polys,width,height,fallback){
  if(!polys)return fallback;const points=polys.flat();
  const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0])))-18),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))-18);
  return [x,y,Math.max(1,Math.min(width,Math.ceil(Math.max(...points.map(p=>p[0])))+18)-x),Math.max(1,Math.min(height,Math.ceil(Math.max(...points.map(p=>p[1])))+18)-y)];
 }
 function timeFor(data){const age=(data.now||0)-(data.lastImpactAt??-99999);return Math.max(0,Math.min(3000,age>=0&&age<1500?1500+age:1500-((data.attackAt??((data.now||0)+3000))-(data.now||0))));}
 function original(fn){const previous=bypass;bypass=true;try{return fn();}finally{bypass=previous;}}
 function storeDraft(value){const next=normalize(value);try{root.localStorage?.setItem(DRAFT_KEY,JSON.stringify(next));return true;}catch{return false;}}
 function readDraft(){try{const s=root.localStorage?.getItem(DRAFT_KEY);return s?normalize(JSON.parse(s)):null;}catch{return null;}}
 function applyLocal(value){const next=normalize(value);setProject(next);try{root.localStorage?.setItem(ACTIVE_KEY,JSON.stringify(next));return true;}catch{return false;}}
 try{const saved=root.localStorage?.getItem(ACTIVE_KEY);if(saved){const p=normalize(JSON.parse(saved));if(p.updatedAt>=project.updatedAt)setProject(p);}}catch{}
 root?.addEventListener?.('storage',event=>{if(event.key===ACTIVE_KEY&&event.newValue)try{setProject(JSON.parse(event.newValue));}catch{}});
 const script=root?.document?.currentScript?.src;
 const ready=root?.document&&typeof root.fetch==='function'?root.fetch(new URL('character-art/studio-project.json',script||root.location.href),{cache:'no-store'})
  .then(r=>r.ok?r.json():null).then(p=>{if(p&&p.updatedAt>=project.updatedAt)setProject(p);}).catch(()=>{}):Promise.resolve();
 return Object.freeze({SCHEMA,VERSION,DRAFT_KEY,ACTIVE_KEY,empty,defaults,normalize,clone,setProject,getProject,character,maskFor,maskStamp,orderFor,
  sampleKeys,poseWeight,rotationStep,groupDeltas,groupState,composeGroup,placement,placements,whole,begin,end,sourceCrop,timeFor,original,storeDraft,readDraft,applyLocal,ready,get revision(){return revision;}});
});
