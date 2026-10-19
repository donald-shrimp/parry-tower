/* Pure source-pixel painting and colour processing. No game or storage state. */
(function(root,factory){'use strict';const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.ParryFilterPaint=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MAX_PIXELS=8_000_000,MAX_TOTAL=24_000_000,MAX_IMAGES=8,MAX_FILTERS=12;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const copyFilter=f=>({...f});
 function filter(id=1,name='フィルタ '+id){return {id,name,hue:35,saturation:110,brightness:100,contrast:100,opacity:100,preserveInk:true,enabled:true};}
 function encode(mask){const out=[];if(!mask.length)return out;let value=mask[0],count=1;for(let i=1;i<mask.length;i++){if(mask[i]===value)count++;else{out.push(count,value);value=mask[i];count=1;}}out.push(count,value);return out;}
 function decode(runs,length,ids){
  if(!Array.isArray(runs)||runs.length%2||runs.length>length*2)throw Error('塗り分けデータの形式が違います');
  const out=new Uint8Array(length);let at=0;
  for(let i=0;i<runs.length;i+=2){const n=runs[i],v=runs[i+1];if(!Number.isSafeInteger(n)||n<1||at+n>length||!Number.isSafeInteger(v)||v<0||v>MAX_FILTERS||v&&!ids.has(v))throw Error('塗り分けデータが範囲外です');out.fill(v,at,at+n);at+=n;}
  if(at!==length)throw Error('画像と塗り分けの大きさが一致しません');return out;
 }
 function pack(state){return {kind:'parry-filter-paint',version:1,updatedAt:Date.now(),activeImage:state.activeImage,selectedFilter:state.selectedFilter,filters:state.filters.map(copyFilter),images:state.images.map(im=>({id:im.id,name:im.name,width:im.width,height:im.height,source:im.source,mask:encode(im.mask)}))};}
 function unpack(data){
  if(data?.kind!=='parry-filter-paint'||data.version!==1||!Array.isArray(data.filters)||!data.filters.length||data.filters.length>MAX_FILTERS||!Array.isArray(data.images)||data.images.length>MAX_IMAGES)throw Error('この工房の編集データではありません');
  const ids=new Set(),filters=data.filters.map(raw=>{
   if(!raw||!Number.isInteger(raw.id)||raw.id<1||raw.id>MAX_FILTERS||ids.has(raw.id))throw Error('フィルタの指定が正しくありません');ids.add(raw.id);
   const f={...filter(raw.id),...raw};f.name=String(raw.name||'フィルタ '+raw.id).slice(0,60);
   for(const [key,a,b]of [['hue',-180,180],['saturation',0,250],['brightness',0,200],['contrast',0,200],['opacity',0,100]])if(!Number.isFinite(f[key])||f[key]<a||f[key]>b)throw Error('フィルタの数値が範囲外です');
   f.enabled=f.enabled!==false;f.preserveInk=f.preserveInk!==false;
   return Object.fromEntries(Object.keys(filter()).map(k=>[k,f[k]]));
  });
  let total=0;const imageIds=new Set(),images=data.images.map(im=>{
   if(!im||typeof im.id!=='string'||im.id.length>80||imageIds.has(im.id)||!Number.isSafeInteger(im.width)||!Number.isSafeInteger(im.height)||im.width<1||im.height<1||im.width*im.height>MAX_PIXELS||im.width>8192||im.height>8192)throw Error('画像の大きさ・識別子が正しくありません');imageIds.add(im.id);total+=im.width*im.height;if(total>MAX_TOTAL)throw Error('画像の合計が大きすぎます');
   if(typeof im.source!=='string'||im.source.length>50_000_000||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(im.source))throw Error('元画像はPNGを含む編集データが必要です');
   return {id:im.id,name:String(im.name||'画像').slice(0,120),width:im.width,height:im.height,source:im.source,mask:decode(im.mask,im.width*im.height,ids)};
  });
  return {filters,images,activeImage:imageIds.has(data.activeImage)?data.activeImage:images[0]?.id||null,selectedFilter:ids.has(data.selectedFilter)?data.selectedFilter:filters[0].id};
 }
 function snapshot(state){return {...state,filters:state.filters.map(copyFilter),images:state.images.map(im=>({...im,mask:im.mask.slice()}))};}
 function history(limit=40_000_000){
  const past=[],future=[];const bytes=s=>s.images.reduce((n,i)=>n+i.mask.byteLength,0);
  function trim(){let total=[...past,...future].reduce((n,s)=>n+bytes(s),0);while(total>limit&&past.length>1)total-=bytes(past.shift());while(total>limit&&future.length>1)total-=bytes(future.shift());while(past.length>40)past.shift();}
  return {push(s){past.push(s);future.length=0;trim();},undo(s){if(!past.length)return null;future.push(snapshot(s));const prev=past.pop();trim();return prev;},redo(s){if(!future.length)return null;past.push(snapshot(s));const next=future.pop();trim();return next;},clear(){past.length=0;future.length=0;},get canUndo(){return !!past.length;},get canRedo(){return !!future.length;}};
 }
 function paintSegment(mask,alpha,w,h,a,b,radius,value){
  const x0=clamp(Math.floor(Math.min(a.x,b.x)-radius),0,w-1),x1=clamp(Math.ceil(Math.max(a.x,b.x)+radius),0,w-1),y0=clamp(Math.floor(Math.min(a.y,b.y)-radius),0,h-1),y1=clamp(Math.ceil(Math.max(a.y,b.y)+radius),0,h-1);
  const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;let count=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const t=d?clamp(((x+.5-a.x)*dx+(y+.5-a.y)*dy)/d,0,1):0;
   if((x+.5-a.x-dx*t)**2+(y+.5-a.y-dy*t)**2<=radius*radius){const p=y*w+x;if(alpha[p*4+3]&&mask[p]!==value){mask[p]=value;count++;}}
  }return {count,rect:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}};
 }
 function polygon(mask,alpha,w,h,points,value){
  if(points.length<3)return 0;let count=0;
  const low=clamp(Math.floor(Math.min(...points.map(p=>p.y))),0,h-1),high=clamp(Math.ceil(Math.max(...points.map(p=>p.y))),0,h-1);
  for(let y=low;y<=high;y++){
   const nodes=[];for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a.y>y+.5)!==(b.y>y+.5))nodes.push(a.x+(y+.5-a.y)*(b.x-a.x)/(b.y-a.y));
   }nodes.sort((a,b)=>a-b);
   for(let n=0;n+1<nodes.length;n+=2)for(let x=Math.max(0,Math.ceil(nodes[n]-.5));x<Math.min(w,Math.ceil(nodes[n+1]-.5));x++){const p=y*w+x;if(alpha[p*4+3]&&mask[p]!==value){mask[p]=value;count++;}}
  }return count;
 }
 function colourPixels(source,f){
  const out=new Uint8ClampedArray(source);if(!f.enabled)return out;
  const theta=f.hue*Math.PI/180,C=Math.cos(theta),S=Math.sin(theta),sat=f.saturation/100,bright=f.brightness/100,contrast=f.contrast/100,opacity=f.opacity/100;
  for(let i=0;i<source.length;i+=4){
   const r=source[i],g=source[i+1],bl=source[i+2];if(!source[i+3]||f.preserveInk&&Math.max(r,g,bl)<43)continue;
    const v=[(.213+.787*C-.213*S)*r+(.715-.715*C-.715*S)*g+(.072-.072*C+.928*S)*bl,
     (.213-.213*C+.143*S)*r+(.715+.285*C+.140*S)*g+(.072-.072*C-.283*S)*bl,
     (.213-.213*C-.787*S)*r+(.715-.715*C+.715*S)*g+(.072+.928*C+.072*S)*bl].map(n=>clamp(n,0,255));
    const y=v[0]*.213+v[1]*.715+v[2]*.072;
    const values=v.map(n=>clamp((clamp(y+(n-y)*sat,0,255)*bright-127.5)*contrast+127.5,0,255));
   for(let k=0;k<3;k++)out[i+k]=Math.round(source[i+k]+(values[k]-source[i+k])*opacity);
  }return out;
 }
 function compose(source,mask,filters,cache,target=new Uint8ClampedArray(source),rect=null,width){
  const lookup=new Map(filters.map(f=>[f.id,f])),used=new Set();
  const bounds=rect||{x:0,y:0,width:width||mask.length,height:width?mask.length/width:1},w=width||mask.length;
  for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++){const p=y*w+x,id=mask[p],f=lookup.get(id);if(f?.enabled)used.add(id);}
  for(const id of used)if(!cache.has(id))cache.set(id,colourPixels(source,lookup.get(id)));
  for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++){
   const p=y*w+x,k=p*4,f=lookup.get(mask[p]),pixels=f?.enabled?cache.get(f.id):source;
   target[k]=pixels[k];target[k+1]=pixels[k+1];target[k+2]=pixels[k+2];target[k+3]=source[k+3];
  }return target;
 }
 return {MAX_PIXELS,MAX_TOTAL,MAX_IMAGES,MAX_FILTERS,filter,encode,decode,pack,unpack,snapshot,history,paintSegment,polygon,colourPixels,compose};
});
