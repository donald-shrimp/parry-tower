'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../assets/character-edit');
const plain=value=>JSON.parse(JSON.stringify(value));
function editor({polys=[[[0,0],[200,0],[200,200],[0,200]]],scale=1,region=0}={}){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},getContext(){return {};},getBoundingClientRect(){return {left:20,top:30};},focus(){},setPointerCapture(){}});return nodes.get(id);};
 const initial=E.normalize({...E.empty(),characters:{sentinel:{layers:{weapon:{x:9,keys:[{time:100,rotation:20}]}}},hero:{placement:{x:12}}}});
 const api={...E,maskFor:(id,key,fallback)=>ctx.testEditor.project().characters[id]?.layers[key]?.mask||fallback};
 const ctx=vm.createContext({window:{ParryArtEdits:api},document:{getElementById:node,addEventListener(){}},performance:{now:()=>0},ResizeObserver:class{observe(){}},fixture:{initial,polys,scale,region}});
 let source=fs.readFileSync('assets/art-studio.js','utf8');
 source=source.replace('requestAnimationFrame(tick);init();',`
  project=clone(fixture.initial);loaded=true;selected='weapon';mode='mask';region=fixture.region;
  model={parts:{weapon:{mask:fixture.polys}},width:1445,height:1088};view={x:7,y:11,scale:fixture.scale};
  refresh=()=>{};refreshTimeline=()=>{};refreshInspector=()=>{};refreshMaskControls=()=>{};saveDraft=()=>{};setRuntime=()=>{};
  globalThis.testEditor={project:()=>clone(project),history:()=>history.length,undo,
   drawing:value=>drawing=value,mode:value=>mode=value,loaded:value=>loaded=value};
 `);
 vm.runInContext(source,ctx);
 const event=(x,y,extra={})=>({clientX:20+7+x*scale,clientY:30+11+y*scale,button:0,pointerId:1,preventDefault(){},...extra});
 const fire=(type,x,y,extra)=>node('editorCanvas').handlers[type](event(x,y,extra));
 const doubleClick=(x,y)=>{for(let i=0;i<2;i++){fire('pointerdown',x,y);fire('pointerup',x,y);}fire('dblclick',x,y);};
 return {fire,doubleClick,api:ctx.testEditor,initial,project:()=>plain(ctx.testEditor.project()),status:()=>node('status').textContent};
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
