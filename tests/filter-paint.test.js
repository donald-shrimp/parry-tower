'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../assets/filter-paint-core');
const source=()=>new Uint8ClampedArray([190,120,40,255,130,75,20,255,70,40,15,180,240,210,130,255,10,12,14,255,111,77,55,0]);
const state=()=>({filters:[C.filter(1,'布'),C.filter(2,'鎧')],images:[{id:'front',name:'画像.png',width:3,height:2,source:'data:image/png;base64,AAAA',mask:new Uint8Array([0,1,1,2,0,0])}],activeImage:'front',selectedFilter:1});

test('filters keep source shading, fine variations, ink and exact alpha without flattening colours',()=>{
 const original=source(),before=original.slice(),f={...C.filter(),hue:-120,saturation:90,brightness:90,contrast:100};
 const result=C.colourPixels(original,f);assert.deepEqual(original,before);
 for(let i=0;i<original.length;i+=4)assert.equal(result[i+3],original[i+3]);
 assert.deepEqual([...result.slice(16,20)],[10,12,14,255]);assert.deepEqual([...result.slice(20)],[111,77,55,0]);
 assert.equal(new Set([0,4,8,12].map(i=>[...result.slice(i,i+3)].join(','))).size,4,'shadow and highlight remain different colours');
 assert.ok(result[0]+result[1]+result[2]>result[8]+result[9]+result[10],'bright folds remain brighter than dark folds');
 const subtle=new Uint8ClampedArray([190,120,40,255,191,121,41,255,192,122,42,255]);
 const shades=C.colourPixels(subtle,f);assert.equal(new Set([0,4,8].map(i=>[...shades.slice(i,i+3)].join(','))).size,3,'small texture variations survive');
 const identity=C.colourPixels(original,{...C.filter(),hue:0,saturation:100,brightness:100,contrast:100});assert.deepEqual(identity,original);
});

test('paint selects filter assignments at source pixels and leaves transparent pixels untouched',()=>{
 const rgba=new Uint8ClampedArray(8*6*4);for(let i=3;i<rgba.length;i+=4)rgba[i]=255;rgba[(2*8+3)*4+3]=0;
 const mask=new Uint8Array(48),r=C.paintSegment(mask,rgba,8,6,{x:1.5,y:2.5},{x:6.5,y:2.5},.6,2);
 assert.equal(r.count,5);assert.equal(mask[2*8+3],0);assert.equal(mask[2*8+1],2);assert.equal(mask[1*8+1],0);
 C.paintSegment(mask,rgba,8,6,{x:1.5,y:2.5},{x:6.5,y:2.5},.6,0);assert.equal(mask.some(Boolean),false);
 C.paintSegment(mask,rgba,8,6,{x:-10,y:0},{x:100,y:0},1,1);assert.equal(mask.length,48);
});

test('polygon assignment handles concave shapes and transparent holes',()=>{
 const rgba=new Uint8ClampedArray(6*6*4);for(let i=3;i<rgba.length;i+=4)rgba[i]=255;rgba[(1*6+1)*4+3]=0;
 const mask=new Uint8Array(36);C.polygon(mask,rgba,6,6,[{x:0,y:0},{x:5,y:0},{x:5,y:2},{x:2,y:2},{x:2,y:5},{x:0,y:5}],3);
 assert.equal(mask[1*6+1],0);assert.equal(mask[1*6+4],3);assert.equal(mask[4*6+1],3);assert.equal(mask[4*6+4],0);assert.equal(mask[5*6],0);
});

test('composition uses the assigned filter only, preserves alpha, and reuses cached full-image filters',()=>{
 const s=state(),original=source(),before=original.slice(),cache=new Map();s.filters[0].hue=-125;s.filters[1].saturation=0;
 const out=C.compose(original,s.images[0].mask,s.filters,cache,undefined,null,3);
 assert.deepEqual([...out.slice(0,4)],[...original.slice(0,4)]);assert.deepEqual([...out.slice(4,8)],[...C.colourPixels(original,s.filters[0]).slice(4,8)]);
 const stored=cache.get(1);s.images[0].mask[0]=1;C.compose(original,s.images[0].mask,s.filters,cache,out,{x:0,y:0,width:1,height:1},3);assert.equal(cache.get(1),stored);assert.deepEqual(original,before);
 s.filters[0].enabled=false;C.compose(original,s.images[0].mask,s.filters,cache,out,null,3);assert.deepEqual([...out.slice(4,12)],[...original.slice(4,12)]);
});

test('editable data round-trips source image, independent image masks and shared filter settings',()=>{
 const s=state();s.images.push({...s.images[0],id:'contact',mask:new Uint8Array([2,2,0,1,1,0])});s.filters[0].hue=135;
 const restored=C.unpack(JSON.parse(JSON.stringify(C.pack(s))));assert.deepEqual(restored,s);restored.images[0].mask[0]=2;assert.equal(restored.images[1].mask[0],2);assert.equal(s.images[0].mask[0],0);
 assert.deepEqual(C.encode(new Uint8Array([0,0,0,1,1,2])),[3,0,2,1,1,2]);
});

test('invalid masks, external image URLs, duplicate ids and excessive dimensions are rejected',()=>{
 const attempt=change=>{const p=C.pack(state());change(p);assert.throws(()=>C.unpack(p));};
 attempt(p=>p.images[0].mask=[100,1]);attempt(p=>p.images[0].mask=[5,0]);attempt(p=>p.images[0].mask=[6,12]);attempt(p=>p.images[0].mask=[-2,0]);
 attempt(p=>p.images[0].source='https://example.com/a.png');attempt(p=>p.images[0].width=100000);attempt(p=>p.filters.push({...p.filters[0]}));attempt(p=>p.filters[0].hue=Infinity);attempt(p=>p.kind='other');
});

test('undo and redo restore masks and filter settings across images without mutating snapshots',()=>{
 let s=state();const h=C.history(100);h.push(C.snapshot(s));s.images[0].mask[0]=2;s.filters[0].hue=-90;
 s=h.undo(s);assert.equal(s.images[0].mask[0],0);assert.equal(s.filters[0].hue,35);s=h.redo(s);assert.equal(s.images[0].mask[0],2);assert.equal(s.filters[0].hue,-90);
 h.push(C.snapshot(s));assert.equal(h.canRedo,false);h.clear();assert.equal(h.canUndo,false);
});

test('king starter contains editable masks for both original poses with adjustable filters',()=>{
 const p=JSON.parse(fs.readFileSync('assets/character-art/palette-candidates/endking-paint-starter.json','utf8'));
 for(const im of p.images){im.source='data:image/png;base64,'+fs.readFileSync('assets/'+im.asset).toString('base64');delete im.asset;}
 const s=C.unpack(p);assert.deepEqual(s.images.map(im=>im.id),['ready','contact']);assert.equal(s.filters.length,4);
 for(const im of s.images)assert.ok([1,2,3,4].every(id=>im.mask.includes(id)));
 assert.equal(s.filters[1].name,'布');assert.notEqual(s.filters[0].saturation,s.filters[1].saturation);
});
