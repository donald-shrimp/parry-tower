/* Local, non-destructive image filter painting. Only the assignment mask is painted. */
(()=>{
 'use strict';const C=window.ParryFilterPaint,$=id=>document.getElementById(id),clone=C.snapshot;
 const canvas=$('paintCanvas'),ctx=canvas.getContext('2d'),maskCanvas=$('maskCanvas'),mc=maskCanvas.getContext('2d'),guide=$('guideCanvas'),gc=guide.getContext('2d'),viewport=$('viewport'),surface=$('surface');
 const history=C.history(),swatches=['#92b9e8','#bb8bdc','#e3b85e','#d6e9ef','#df8e9f','#70c9ad','#efaa75','#a7adf1','#c9cf72','#88d4d5','#df9bc6','#afc2d5'];
 const numeric=['hue','saturation','brightness','contrast','opacity'];
 let state={filters:[C.filter()],images:[],activeImage:null,selectedFilter:1},buffer=null,tool='brush',zoom=1,hover=null,polygon=[],drag=null,space=false,busy=false,token=0,frame=0,dirty=null,full=false,field=null,revision=0,draftTimer,dbPromise;
 const image=()=>state.images.find(im=>im.id===state.activeImage),filter=()=>state.filters.find(f=>f.id===state.selectedFilter);
 const status=message=>{$('status').textContent=message;};
 const swatch=id=>swatches[(id-1)%swatches.length];
 const snapshot=()=>clone(state);
 function openDB(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('parry-filter-paint',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);req.onblocked=()=>reject(Error('下書き用データベースを開けません'));});return dbPromise;
 }
 async function draftRead(){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('projects').objectStore('projects').get('draft');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async function draftWrite(data){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data,'draft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 function changed(){revision++;$('draftStatus').textContent='下書きを保存中…';clearTimeout(draftTimer);draftTimer=setTimeout(async()=>{const at=revision;try{await draftWrite(C.pack(state));if(revision===at)$('draftStatus').textContent='このブラウザに下書き保存済み';}catch{$('draftStatus').textContent='下書きを保存できません。「編集データを保存」を使ってください。';}},700);}
 function commit(before,message){history.push(before);changed();updateHistory();if(message)status(message);}
 function finishField(){if(field){if(field.revision!==revision)history.push(field.before);field=null;updateHistory();}}
 function beginField(){if(!field)field={before:snapshot(),revision};}
 function updateHistory(){$('undo').disabled=!history.canUndo||busy;$('redo').disabled=!history.canRedo||busy;}
 function updateFilters(){
  $('filterList').replaceChildren();for(const f of state.filters){const button=document.createElement('button');button.type='button';button.className='filter';button.setAttribute('aria-pressed',String(f.id===state.selectedFilter));button.dataset.filter=String(f.id);const chip=document.createElement('span');chip.className='swatch';chip.style.background=swatch(f.id);const name=document.createElement('span');name.textContent=f.name+(f.enabled?'':'（非表示）');button.append(chip,name);button.addEventListener('click',()=>{finishField();cancelPolygon();state.selectedFilter=f.id;updateFilters();updateSettings();drawGuide();changed();});$('filterList').append(button);}
  $('addFilter').disabled=state.filters.length>=C.MAX_FILTERS||busy;$('deleteFilter').disabled=state.filters.length<=1||busy;
 }
 function updateSettings(){const f=filter();$('filterName').value=f.name;for(const id of numeric){$(id).value=f[id];$(id+'Out').textContent=f[id]+(id==='hue'?'°':'%');}$('preserveInk').checked=f.preserveInk;$('filterEnabled').checked=f.enabled;}
 function updateImages(){
  $('images').replaceChildren();for(const im of state.images){const o=document.createElement('option');o.value=im.id;o.textContent=im.name+' · '+im.width+'×'+im.height;$('images').append(o);}$('images').value=state.activeImage||'';
  if(!state.images.length){const o=document.createElement('option');o.textContent='画像を読み込んでください';$('images').append(o);}
  $('exportPNG').disabled=!state.images.length||busy;for(const id of ['paintAll','clearFilter','fit','zoomIn','zoomOut'])$(id).disabled=!state.images.length||busy;
 }
 function point(event){const r=surface.getBoundingClientRect();return {x:(event.clientX-r.left)/zoom,y:(event.clientY-r.top)/zoom};}
 function setZoom(next,anchor=null){
  if(!image())return;const vp=viewport.getBoundingClientRect(),sx=anchor?anchor.clientX-vp.left:viewport.clientWidth/2,sy=anchor?anchor.clientY-vp.top:viewport.clientHeight/2;
  const px=(viewport.scrollLeft+sx-24)/zoom,py=(viewport.scrollTop+sy-24)/zoom;zoom=Math.max(.05,Math.min(4,next));surface.style.width=image().width*zoom+'px';surface.style.height=image().height*zoom+'px';
  $('zoom').value=zoom*100;$('zoomOutLabel').textContent=Math.round(zoom*100)+'%';viewport.scrollLeft=Math.max(0,px*zoom-sx+24);viewport.scrollTop=Math.max(0,py*zoom-sy+24);drawGuide();
 }
 function fit(){if(image())setZoom(Math.min((viewport.clientWidth-48)/image().width,(viewport.clientHeight-48)/image().height,1));}
 function cancelPolygon(){polygon=[];$('finishPolygon').disabled=true;$('cancelPolygon').disabled=true;drawGuide();}
 function drawGuide(){
  if(!buffer)return;gc.clearRect(0,0,guide.width,guide.height);gc.lineWidth=1.5/zoom;gc.strokeStyle=swatch(state.selectedFilter);gc.setLineDash([]);
  if(polygon.length){gc.beginPath();polygon.forEach((p,i)=>i?gc.lineTo(p.x,p.y):gc.moveTo(p.x,p.y));if(hover)gc.lineTo(hover.x,hover.y);gc.stroke();for(const p of polygon){gc.beginPath();gc.arc(p.x,p.y,3/zoom,0,Math.PI*2);gc.fillStyle='#fff3c7';gc.fill();}}
  if(hover&&['brush','erase'].includes(tool)&&!space){gc.strokeStyle=tool==='erase'?'#fff':swatch(state.selectedFilter);gc.beginPath();gc.arc(hover.x,hover.y,Number($('brushSize').value)/2,0,Math.PI*2);gc.stroke();gc.setLineDash([3/zoom,3/zoom]);gc.strokeStyle='#101521';gc.stroke();gc.setLineDash([]);}
 }
 function requestRender(rect=null){
  if(!buffer)return;if(!rect)full=true;else if(!dirty)dirty=rect;else{const x=Math.min(dirty.x,rect.x),y=Math.min(dirty.y,rect.y),x1=Math.max(dirty.x+dirty.width,rect.x+rect.width),y1=Math.max(dirty.y+dirty.height,rect.y+rect.height);dirty={x,y,width:x1-x,height:y1-y};}
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
 }
 function render(){
  if(!buffer||!image())return;const im=image(),rect=full?null:dirty;full=false;dirty=null;
  C.compose(buffer.original.data,im.mask,state.filters,buffer.cache,buffer.output.data,rect,im.width);
  if($('showOriginal').checked)ctx.putImageData(buffer.original,0,0);else if(rect)ctx.putImageData(buffer.output,0,0,rect.x,rect.y,rect.width,rect.height);else ctx.putImageData(buffer.output,0,0);
  if($('showMask').checked){
   const area=rect||{x:0,y:0,width:im.width,height:im.height},colors=swatches.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
   for(let y=area.y;y<area.y+area.height;y++)for(let x=area.x;x<area.x+area.width;x++){const p=y*im.width+x,k=p*4,id=im.mask[p],c=id?colors[id-1]:[0,0,0];buffer.overlay.data[k]=c[0];buffer.overlay.data[k+1]=c[1];buffer.overlay.data[k+2]=c[2];buffer.overlay.data[k+3]=id&&buffer.original.data[k+3]?110:0;}
   mc.putImageData(buffer.overlay,0,0,area.x,area.y,area.width,area.height);
  }else mc.clearRect(0,0,im.width,im.height);drawGuide();
 }
 function decodeImage(source){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.naturalWidth&&img.naturalHeight?resolve(img):reject(Error('画像を読み込めません'));img.onerror=()=>reject(Error('画像を読み込めません'));img.src=source;});}
 async function activate(resetView=true){
  const stamp=++token;cancelPolygon();hover=null;buffer=null;const im=image();updateImages();updateFilters();updateSettings();surface.hidden=!im;$('empty').hidden=!!im;
  if(!im)return;
  try{const img=await decodeImage(im.source);if(stamp!==token)return;if(img.naturalWidth!==im.width||img.naturalHeight!==im.height)throw Error('元画像と塗り分けのサイズが一致しません');
   for(const c of [canvas,maskCanvas,guide]){c.width=im.width;c.height=im.height;}ctx.clearRect(0,0,im.width,im.height);ctx.drawImage(img,0,0);
   const original=ctx.getImageData(0,0,im.width,im.height);buffer={original,output:new ImageData(new Uint8ClampedArray(original.data),im.width,im.height),overlay:ctx.createImageData(im.width,im.height),cache:new Map()};
   if(resetView)fit();else setZoom(zoom);requestRender();status(im.name+' · '+filter().name+' の適用範囲を塗れます');
  }catch(error){status(error.message);}
 }
 async function validateImages(next){for(const im of next.images){const decoded=await decodeImage(im.source);if(decoded.naturalWidth!==im.width||decoded.naturalHeight!==im.height)throw Error('編集データと元画像のサイズが一致しません');}}
 async function replace(next,message){finishField();const before=snapshot();state=next;history.push(before);changed();await activate();updateHistory();status(message);}
 function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('ファイルを読み込めません'));r.readAsDataURL(file);});}
 async function job(action){if(busy)return;finishField();busy=true;updateHistory();$('loadKing').disabled=true;$('imageFiles').disabled=true;$('projectFile').disabled=true;try{await action();}catch(error){status(error.message);}finally{busy=false;$('loadKing').disabled=false;$('imageFiles').disabled=false;$('projectFile').disabled=false;updateHistory();updateImages();updateFilters();}}
 async function addImages(files){
  const list=[...files];if(!list.length)return;if(list.length+state.images.length>C.MAX_IMAGES)throw Error('1つの編集データに追加できる画像は8枚までです');
  const next=clone(state);let total=next.images.reduce((n,im)=>n+im.width*im.height,0);
  for(const [i,file]of list.entries()){
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>25_000_000)throw Error('PNG・JPEG・WebP（1枚25MBまで）を選んでください');
   const img=await decodeImage(await readFile(file)),w=img.naturalWidth,h=img.naturalHeight;total+=w*h;if(w*h>C.MAX_PIXELS||w>8192||h>8192||total>C.MAX_TOTAL)throw Error('1枚800万画素、合計2400万画素まで追加できます');
   const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0);const id='image-'+Date.now()+'-'+i;
   next.images.push({id,name:file.name.slice(0,120),source:c.toDataURL('image/png'),width:w,height:h,mask:new Uint8Array(w*h)});next.activeImage=id;
  }await replace(next,'画像を追加しました。左でフィルタを選び、適用したい範囲を塗ってください。');
 }
 async function loadKing(){
  const response=await fetch('./assets/character-art/palette-candidates/endking-paint-starter.json',{cache:'no-store'});if(!response.ok)throw Error('王の開始データを読み込めません');const starter=await response.json();
  const allowed=new Set(['character-art/rework/guardian/guardian-ready-guard-v7.png','character-art/rework/guardian/guardian-contact-v7.png']);
  for(const im of starter.images){if(!allowed.has(im.asset))throw Error('開始画像の指定が違います');const img=await decodeImage('./assets/'+im.asset),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);im.source=c.toDataURL('image/png');delete im.asset;}
  const next=C.unpack(starter);await validateImages(next);await replace(next,'王の構え・振り下ろしを読み込みました。フィルタは共通、範囲は画像ごとに直せます。');
 }
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 function saveProject(){finishField();download(new Blob([JSON.stringify(C.pack(state))],{type:'application/json'}),'filter-paint-project.json');status('元画像・フィルタ・適用範囲を含む編集データを書き出しました。');}
 async function exportPNG(){
  finishField();if(!buffer||!image())return;C.compose(buffer.original.data,image().mask,state.filters,buffer.cache,buffer.output.data,null,image().width);
  const c=document.createElement('canvas');c.width=image().width;c.height=image().height;c.getContext('2d').putImageData(buffer.output,0,0);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('PNGを書き出せませんでした');
  download(blob,image().name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*]/g,'_')+'-filtered.png');status('フィルタ適用後のPNGを書き出しました。原寸・透明度を保持しています。');
 }
 function setTool(next){finishField();cancelPolygon();tool=next;for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===tool));surface.style.cursor=tool==='pan'?'grab':tool==='pick'?'copy':'crosshair';status(({brush:'ドラッグでフィルタの適用範囲を塗ります。',erase:'ドラッグで範囲指定を消し、元画像へ戻します。',polygon:'輪郭に沿って点を置き、「囲みを塗る」で範囲を確定します。',pick:'指定済みの範囲をクリックすると、そのフィルタを選びます。',pan:'ドラッグで表示を移動します。'})[tool]);drawGuide();}
 function finishPolygon(){if(!buffer||polygon.length<3)return;const before=snapshot(),count=C.polygon(image().mask,buffer.original.data,image().width,image().height,polygon,state.selectedFilter);cancelPolygon();if(count){commit(before,'囲んだ範囲へフィルタを指定しました。');requestRender();}}
 surface.addEventListener('pointerdown',event=>{
  if(busy||!buffer||event.button!==0)return;event.preventDefault();finishField();const p=point(event);hover=p;
  if(space||tool==='pan'){surface.setPointerCapture(event.pointerId);drag={pan:true,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};return;}
  if(tool==='pick'||event.altKey){const x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=image().width||y>=image().height)return;const id=image().mask[y*image().width+x];if(id){state.selectedFilter=id;updateFilters();updateSettings();status(filter().name+' を選びました。');changed();}else status('ここはフィルタ未指定の原画です。');drawGuide();return;}
  if(tool==='polygon'){if(!polygon.length||Math.hypot(p.x-polygon.at(-1).x,p.y-polygon.at(-1).y)>1/zoom)polygon.push(p);$('finishPolygon').disabled=polygon.length<3;$('cancelPolygon').disabled=false;drawGuide();return;}
  surface.setPointerCapture(event.pointerId);drag={before:snapshot(),last:p,count:0};const result=C.paintSegment(image().mask,buffer.original.data,image().width,image().height,p,p,Number($('brushSize').value)/2,tool==='erase'?0:state.selectedFilter);drag.count+=result.count;requestRender(result.rect);
 });
 surface.addEventListener('pointermove',event=>{
  if(!buffer)return;const p=point(event);hover=p;$('coordinates').textContent=Math.floor(p.x)+', '+Math.floor(p.y)+' px';
  if(drag?.pan){viewport.scrollLeft=drag.left-(event.clientX-drag.x);viewport.scrollTop=drag.top-(event.clientY-drag.y);return;}
  if(drag){const result=C.paintSegment(image().mask,buffer.original.data,image().width,image().height,drag.last,p,Number($('brushSize').value)/2,tool==='erase'?0:state.selectedFilter);drag.last=p;drag.count+=result.count;requestRender(result.rect);}drawGuide();
 });
 function finishStroke(){if(!drag)return;if(!drag.pan&&drag.count)commit(drag.before,tool==='erase'?'範囲指定を消して原画へ戻しました。':filter().name+' の適用範囲を更新しました。');drag=null;}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,finishStroke);
 surface.addEventListener('pointerleave',()=>{if(!drag){hover=null;drawGuide();}});surface.addEventListener('dblclick',()=>{if(tool==='polygon')finishPolygon();});
 for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>setTool(b.dataset.tool));
 $('finishPolygon').addEventListener('click',finishPolygon);$('cancelPolygon').addEventListener('click',cancelPolygon);
 $('brushSize').addEventListener('input',()=>{$('brushOut').textContent=$('brushSize').value+' px';drawGuide();});
 $('fit').addEventListener('click',fit);$('zoom').addEventListener('input',()=>setZoom(Number($('zoom').value)/100));$('zoomIn').addEventListener('click',()=>setZoom(zoom*1.3));$('zoomOut').addEventListener('click',()=>setZoom(zoom/1.3));
 viewport.addEventListener('wheel',event=>{if(event.ctrlKey&&image()){event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.002),event);}},{passive:false});
 for(const id of ['showOriginal','showMask'])$(id).addEventListener('change',()=>requestRender());
 $('images').addEventListener('change',()=>{finishStroke();finishField();state.activeImage=$('images').value;activate();changed();});
 $('addFilter').addEventListener('click',()=>{finishField();if(state.filters.length>=C.MAX_FILTERS)return;const before=snapshot(),id=Array.from({length:C.MAX_FILTERS},(_,i)=>i+1).find(id=>!state.filters.some(f=>f.id===id));state.filters.push(C.filter(id));state.selectedFilter=id;commit(before,'フィルタを追加しました。数値を決めて、使いたい範囲を塗ってください。');updateFilters();updateSettings();});
 for(const id of ['filterName',...numeric,'preserveInk','filterEnabled']){
  $(id).addEventListener('focus',beginField);
  $(id).addEventListener('input',()=>{beginField();const f=filter(),key=id==='filterName'?'name':id==='filterEnabled'?'enabled':id;
   f[key]=id==='filterName'?$(id).value:id==='preserveInk'||id==='filterEnabled'?$(id).checked:Number($(id).value);
   buffer?.cache.delete(f.id);if(numeric.includes(id))$(id+'Out').textContent=f[key]+(id==='hue'?'°':'%');updateFilters();requestRender();changed();
  });$(id).addEventListener('change',finishField);$(id).addEventListener('blur',finishField);
 }
 $('paintAll').addEventListener('click',()=>{if(!buffer)return;finishField();const before=snapshot();for(let i=0;i<image().mask.length;i++)if(buffer.original.data[i*4+3])image().mask[i]=state.selectedFilter;commit(before,'画像全体をこのフィルタの適用範囲にしました。');requestRender();});
 $('clearFilter').addEventListener('click',()=>{if(!buffer)return;finishField();const before=snapshot();for(let i=0;i<image().mask.length;i++)if(image().mask[i]===state.selectedFilter)image().mask[i]=0;commit(before,'このフィルタの範囲指定を消しました。');requestRender();});
 $('deleteFilter').addEventListener('click',()=>{finishField();if(state.filters.length<=1)return;const before=snapshot(),id=state.selectedFilter;for(const im of state.images)for(let i=0;i<im.mask.length;i++)if(im.mask[i]===id)im.mask[i]=0;state.filters=state.filters.filter(f=>f.id!==id);state.selectedFilter=state.filters[0].id;buffer?.cache.delete(id);commit(before,'フィルタを削除しました。「戻す」で復元できます。');updateFilters();updateSettings();requestRender();});
 async function undo(redo=false){finishStroke();finishField();const previous=(redo?history.redo:history.undo)(state);if(previous){state=previous;changed();await activate(false);updateHistory();status(redo?'やり直しました。':'1つ前の操作へ戻しました。');}}
 $('undo').addEventListener('click',()=>undo());$('redo').addEventListener('click',()=>undo(true));
 $('imageFiles').addEventListener('change',event=>job(async()=>{await addImages(event.target.files);event.target.value='';}));
 $('projectFile').addEventListener('change',event=>job(async()=>{const file=event.target.files[0];if(!file)return;if(file.size>250_000_000)throw Error('編集データが大きすぎます');const next=C.unpack(JSON.parse(await file.text()));await validateImages(next);await replace(next,'編集データを読み込みました。フィルタと適用範囲を再編集できます。');event.target.value='';}));
 for(const type of ['dragenter','dragover'])viewport.addEventListener(type,event=>{event.preventDefault();viewport.classList.add('dragover');});viewport.addEventListener('dragleave',()=>viewport.classList.remove('dragover'));viewport.addEventListener('drop',event=>{event.preventDefault();viewport.classList.remove('dragover');job(()=>addImages(event.dataTransfer.files));});
 $('loadKing').addEventListener('click',()=>job(loadKing));$('saveProject').addEventListener('click',saveProject);$('exportPNG').addEventListener('click',()=>job(exportPNG));
 document.addEventListener('keydown',event=>{
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();if(!busy)undo(event.shiftKey);return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveProject();return;}
  if(event.code==='Space'){event.preventDefault();space=true;surface.style.cursor='grab';return;}
  if(event.key==='Escape')cancelPolygon();if(event.key==='Enter'&&polygon.length)finishPolygon();
  const next={b:'brush',e:'erase',p:'polygon',i:'pick',h:'pan'}[event.key.toLowerCase()];if(next)setTool(next);
 });document.addEventListener('keyup',event=>{if(event.code==='Space'){space=false;surface.style.cursor=tool==='pan'?'grab':'crosshair';}});window.addEventListener('blur',()=>{space=false;finishStroke();});
 window.addEventListener('beforeunload',()=>{finishStroke();finishField();});
 async function start(){
  updateImages();updateFilters();updateSettings();
  await job(async()=>{try{const data=await draftRead();if(data){const restored=C.unpack(data);await validateImages(restored);state=restored;await activate();$('draftStatus').textContent='前回の下書きを復元しました';return;}}catch{$('draftStatus').textContent='下書き保存が使えない場合は編集データを書き出してください。';}
   if(new URLSearchParams(location.search).get('starter')==='endking')await loadKing();else $('draftStatus').textContent='操作後、このブラウザへ下書きを自動保存します。';});
 }
 start();
})();
