/* Optional flat vector hero for art=flat. No combat state is modified. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ParryHeroFlat=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
 'use strict';
 const url='./assets/character-art/svg/hero-flat.svg';
 const ids=['cape','sword','body','right-arm','shield','left-arm','head'];
 let status='idle',pending=null,images=[];
 function extract(svgText){
  const parser=new root.DOMParser();
  const doc=parser.parseFromString(svgText,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error('Invalid hero-flat SVG');
  const svg=doc.documentElement;
  if(svg.localName!=='svg'||svg.getAttribute('viewBox')!=='0 0 1024 1024')throw Error('Unexpected viewBox');
  return ids.map(id=>{
   const el=svg.querySelector('g#'+id);
   if(!el)throw Error('Missing SVG part: '+id);
   const xml='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    +'<style>.line{stroke:#03256e;stroke-width:10;stroke-linecap:round;stroke-linejoin:round}.noline{stroke:none}</style>'
    +new root.XMLSerializer().serializeToString(el)+'</svg>';
   return {id,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml)};
  });
 }
 function preload(){
  if(pending)return pending;
  if(!root||typeof root.document==='undefined'||typeof root.fetch!=='function'||typeof root.Image!=='function'
     ||typeof root.DOMParser!=='function'||typeof root.XMLSerializer!=='function')return Promise.resolve(false);
  status='loading';
  pending=root.fetch(url).then(r=>{if(!r.ok)throw Error('SVG HTTP '+r.status);return r.text();})
   .then(t=>Promise.all(extract(t).map(p=>new Promise((resolve,reject)=>{
    const img=new root.Image();
    img.onload=()=>resolve({id:p.id,img});
    img.onerror=()=>reject(Error('Failed to load SVG part '+p.id));
    img.src=p.src;
   })))).then(parts=>{images=parts;status='ready';return true;})
   .catch(err=>{status='failed';root.console?.warn?.('[flat hero] falling back to original art',err);return false;});
  return pending;
 }
 function drawHero(ctx,pose){
  if(!ctx||!pose||status!=='ready')return false;
  const {now=0,lift=0,push=0,action=0,guardHeld=false,heldLift=0,lastStrikeKind='',lastImpactAt=-99999}=pose;
  ctx.save();
  // Map original 1024px flat artwork into legacy feet-at-zero game coordinates.
  ctx.translate(-512*.12,-870*.12);
  ctx.scale(.12,.12);
  for(const {id,img} of images){
   ctx.save();
   if(id==='cape'){
    ctx.translate(470,500);ctx.rotate(Math.sin(now/320)*.025+push*.04);ctx.translate(-470,-500);
   }else if(id==='sword'){
    ctx.translate(391,595);ctx.rotate(-action*.17);ctx.translate(-391,-595);
   }else if(id==='right-arm'){
    ctx.translate(lift*6,-lift*48);
   }else if(id==='shield'){
    ctx.translate(lift*18,-lift*65+push*7);
    ctx.translate(770,710);ctx.rotate(-lift*.13+push*.06);ctx.translate(-770,-710);
   }else if(id==='head'){
    ctx.translate(0,Math.sin(now/450)*3);
   }
   ctx.drawImage(img,0,0,1024,1024);
   ctx.restore();
  }
  if(guardHeld&&heldLift>=1||lastStrikeKind==='just'&&now-lastImpactAt<170){
   ctx.save();ctx.beginPath();
   ctx.ellipse(770+lift*18,715-lift*65,148,207,0,0,Math.PI*2);
   ctx.strokeStyle='#b9f7ff';ctx.lineWidth=14;ctx.globalAlpha=.65;ctx.stroke();ctx.restore();
  }
  ctx.restore();return true;
 }
 if(root?.document && /(?:^|[?&])art=flat(?:&|$)/.test(root.location?.search||''))preload();
 return Object.freeze({preload,drawHero,ready:()=>status==='ready',status:()=>status});
});