'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../assets/character-edit');
const plain=value=>JSON.parse(JSON.stringify(value));
function editor({polys=[[[0,0],[200,0],[200,200],[0,200]]],scale=1,region=0}={}){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{handlers:{},dataset:{},classList:{add(){},remove(){}},addEventListener(type,fn){this.handlers[type]=fn;},getContext(){return new Proxy({},{get:()=>()=>{}});},getBoundingClientRect(){return {left:20,top:30};},focus(){},setPointerCapture(){}});return nodes.get(id);};
 const initial=E.normalize({...E.empty(),characters:{sentinel:{layers:{weapon:{x:9,keys:[{time:100,rotation:20}]}}},hero:{placement:{x:12}}}});
 const api={...E,maskFor:(id,key,fallback)=>ctx.testEditor.project().characters[id]?.layers[key]?.mask||fallback};
 const ctx=vm.createContext({window:{ParryArtEdits:api},document:{getElementById:node,addEventListener(){}},devicePixelRatio:1,performance:{now:()=>0},ResizeObserver:class{observe(){}},fixture:{initial,polys,scale,region}});
 let source=fs.readFileSync('assets/art-studio.js','utf8');
 source=source.replace('requestAnimationFrame(tick);init();',`
  project=clone(fixture.initial);loaded=true;selected='weapon';mode='mask';region=fixture.region;
  model={parts:{weapon:{mask:fixture.polys}},width:1445,height:1088,unit:1,origin:[0,0]};view={x:7,y:11,scale:fixture.scale};
  refresh=()=>{};refreshTimeline=()=>{};refreshInspector=()=>{};refreshMaskControls=()=>{};saveDraft=()=>{};setRuntime=()=>{};
  updateModel=()=>model;drawMask=()=>{};$('zoom').value=String(fixture.scale);
  globalThis.testEditor={project:()=>clone(project),history:()=>history.length,undo,
   pan:()=>({...pan}),view:()=>({...view}),render,drawingPoints:()=>drawing?.points,
   drawing:value=>drawing=value,mode:value=>mode=value,loaded:value=>loaded=value};
 `);
 vm.runInContext(source,ctx);
 const event=(x,y,extra={})=>({clientX:20+7+x*scale,clientY:30+11+y*scale,button:0,pointerId:1,preventDefault(){},...extra});
 const fire=(type,x,y,extra)=>node('editorCanvas').handlers[type](event(x,y,extra));
 const doubleClick=(x,y)=>{for(let i=0;i<2;i++){fire('pointerdown',x,y);fire('pointerup',x,y);}fire('dblclick',x,y);};
 return {fire,doubleClick,api:ctx.testEditor,node,initial,project:()=>plain(ctx.testEditor.project()),status:()=>node('status').textContent};
}
test('edge double-click inserts one projected point in order, preserves the rest, and supports undo/redo',()=>{
 const e=editor();e.doubleClick(90,5);
 assert.equal(e.api.history(),1);const saved=e.project();
 assert.deepEqual(saved.characters.sentinel.layers.weapon.mask,[[[0,0],[90,0],[200,0],[200,200],[0,200]]]);
 assert.equal(saved.characters.sentinel.layers.weapon.x,9);
 assert.deepEqual(saved.characters.sentinel.layers.weapon.keys,e.initial.characters.sentinel.layers.weapon.keys);
 assert.deepEqual(saved.characters.hero,e.initial.characters.hero);
 assert.deepEqual(E.normalize(saved),saved,'new geometry survives save/import validation');
 e.api.undo(true);assert.deepEqual(e.project(),e.initial);e.api.undo(false);assert.deepEqual(e.project(),saved);
 e.fire('pointerdown',90,0);e.fire('pointermove',95,22);e.fire('pointerup',95,22);
 assert.deepEqual(e.project().characters.sentinel.layers.weapon.mask[0][1],[95,22]);
 assert.equal(e.api.history(),2);e.api.undo(true);assert.deepEqual(e.project(),saved);
});
test('closing edge and selected region work at different zoom levels with a constant screen hit area',()=>{
 const first=[[300,300],[400,300],[350,400]],second=[[0,0],[200,0],[200,200],[0,200]];
 for(const scale of [.25,1,2]){
  const e=editor({polys:[first,second],region:1,scale});e.doubleClick(5/scale,100);
  assert.deepEqual(e.project().characters.sentinel.layers.weapon.mask,[first,[...second,[0,100]]]);
  const outside=editor({scale});outside.doubleClick(100,11/scale);assert.equal(outside.api.history(),0);
 }
});
test('existing handles, empty space, secondary clicks, and redraw mode do not insert points or dirty the project',()=>{
 for(const [x,y]of [[0,0],[4,3],[100,100],[210,210]]){
  const e=editor();e.doubleClick(x,y);assert.deepEqual(e.project(),e.initial);assert.equal(e.api.history(),0);
 }
 const e=editor();e.fire('dblclick',100,0,{button:2});assert.equal(e.api.history(),0);
 e.api.drawing({points:[],add:false});e.doubleClick(100,0);assert.equal(e.api.history(),0);
 e.api.drawing(null);e.api.loaded(false);e.fire('dblclick',100,0);assert.equal(e.api.history(),0);
});
test('short edges can gain a point even inside the larger existing drag hit area',()=>{
 const e=editor({polys:[[[0,0],[20,0],[100,100],[0,100]]]});e.doubleClick(10,0);
 assert.equal(e.api.history(),1);
 assert.deepEqual(e.project().characters.sentinel.layers.weapon.mask[0],[[0,0],[10,0],[20,0],[100,100],[0,100]]);
});
test('a full polygon reports its limit without losing edits, and degenerate edges are safe',()=>{
 const full=Array.from({length:512},(_,i)=>[i%2?200:0,i]);const e=editor({polys:[full]});
 e.doubleClick(100,.5);assert.equal(e.api.history(),0);assert.match(e.status(),/512/);assert.deepEqual(e.project(),e.initial);
 const duplicate=editor({polys:[[[0,0],[0,0],[200,0],[0,200]]]});duplicate.doubleClick(100,0);
 assert.deepEqual(duplicate.project().characters.sentinel.layers.weapon.mask[0],[[0,0],[0,0],[100,0],[200,0],[0,200]]);
});
test('middle drag pans in screen pixels at any zoom without changing artwork, drawing points, or history',()=>{
 for(const scale of [.25,1,2]){
  const e=editor({scale});e.api.drawing({points:[[1,2]],add:false});e.api.render();const before=e.api.view();
  let prevented=false;e.fire('pointerdown',80,60,{button:1,preventDefault(){prevented=true;}});
  e.fire('pointermove',180,100);e.fire('pointerup',180,100,{button:1});e.api.render();
  assert.equal(prevented,true);assert.deepEqual(plain(e.api.pan()),{x:100*scale,y:40*scale});
  const after=e.api.view();assert.equal(after.x-before.x,100*scale);assert.equal(after.y-before.y,40*scale);assert.equal(after.scale,before.scale);
  assert.deepEqual(plain(e.api.drawingPoints()),[[1,2]]);assert.deepEqual(e.project(),e.initial);assert.equal(e.api.history(),0);
 }
});
test('pan cancellation restores the view, capture loss ends panning, and fit view recenters it',()=>{
 const e=editor();e.fire('pointerdown',80,60,{button:1});e.fire('pointermove',150,90);
 e.fire('pointercancel',150,90);assert.deepEqual(plain(e.api.pan()),{x:0,y:0});
 e.fire('pointerdown',80,60,{button:1});e.fire('pointermove',180,100);e.fire('lostpointercapture',180,100);
 e.fire('pointermove',280,200);assert.deepEqual(plain(e.api.pan()),{x:100,y:40});
 e.node('zoom').value='2';e.node('fitView').handlers.click();assert.deepEqual(plain(e.api.pan()),{x:0,y:0});assert.equal(e.node('zoom').value,'1');
 assert.equal(e.api.history(),0);assert.deepEqual(e.project(),e.initial);
});
test('after panning, edge insertion and handle dragging still address the correct source coordinates',()=>{
 const e=editor({scale:2});e.fire('pointerdown',80,60,{button:1});e.fire('pointermove',180,100);e.fire('pointerup',180,100,{button:1});e.api.render();
 const v=e.api.view(),at=(type,x,y)=>e.fire(type,0,0,{clientX:20+v.x+x*v.scale,clientY:30+v.y+y*v.scale});
 at('dblclick',100,0);assert.deepEqual(e.project().characters.sentinel.layers.weapon.mask[0][1],[100,0]);
 at('pointerdown',100,0);at('pointermove',110,20);at('pointerup',110,20);
 const p=e.project().characters.sentinel.layers.weapon.mask[0][1];assert.ok(Math.abs(p[0]-110)<1e-8&&Math.abs(p[1]-20)<1e-8);assert.equal(e.api.history(),2);
});
test('panning cannot hijack an active edit, another pointer, or the fixed battle preview',()=>{
 const e=editor();e.fire('pointerdown',0,0);e.fire('pointerdown',0,0,{button:1});e.fire('pointerup',0,0,{button:1});e.fire('pointermove',20,25);e.fire('pointerup',20,25);
 assert.deepEqual(plain(e.api.pan()),{x:0,y:0});assert.deepEqual(e.project().characters.sentinel.layers.weapon.mask[0][0],[20,25]);
 e.fire('pointerdown',0,0,{button:1});e.fire('pointermove',100,100,{pointerId:2});e.fire('pointerup',100,100,{pointerId:2,button:1});
 assert.deepEqual(plain(e.api.pan()),{x:0,y:0});e.fire('pointermove',50,50);e.fire('pointerup',50,50,{button:1});assert.deepEqual(plain(e.api.pan()),{x:50,y:50});
 e.api.mode('position');e.node('viewMode').value='battle';e.fire('pointerdown',0,0,{button:1});e.fire('pointermove',100,100);e.fire('pointerup',100,100,{button:1});assert.deepEqual(plain(e.api.pan()),{x:50,y:50});
});
