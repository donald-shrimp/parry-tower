'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {createPreviewServer}=require('../scripts/serve-local'),E=require('../assets/character-edit');
test('local studio saves its validated project and default bundle, keeps a backup and rejects cross-origin or malformed writes',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'parry-studio-')),server=createPreviewServer(folder);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const headers={'Content-Type':'application/json','X-Parry-Art-Studio':'1','Origin':base};
 try{
  assert.equal((await fetch(base+'/__art-studio/project')).status,200);
  const a={...E.empty(),updatedAt:100,characters:{sentinel:{placement:{x:20,y:0,scale:1}},guardian:{effects:{swordBlurDuration:80},layers:{weapon:{x:20,poseWindow:[1276.8,1377.6,1420.8,1421]}}}}};
  a.characters.guardian.groups=[{parts:['upper0','weapon'],anchor:'upper0',pivot:[0,0],x:0,y:0,rotation:-60,keys:[],poseWindow:[1140,1390,1420.8,1421]}];
  let r=await fetch(base+'/__art-studio/project',{method:'POST',headers,body:JSON.stringify(a)});assert.equal(r.status,200);assert.equal((await r.json()).saved,true);
  const file=path.join(folder,'assets','character-art','studio-project.json');assert.equal(JSON.parse(await fs.readFile(file)).characters.sentinel.placement.x,20);
  assert.equal(JSON.parse(await fs.readFile(file)).characters.guardian.effects.swordBlurDuration,80);
  assert.deepEqual(JSON.parse(await fs.readFile(file)).characters.guardian.layers.weapon.poseWindow,[1276.8,1377.6,1420.8,1421]);
  assert.equal(JSON.parse(await fs.readFile(file)).characters.guardian.groups[0].rotation,-60);
  r=await fetch(base+'/__art-studio/project',{method:'POST',headers:{...headers,Origin:'https://example.org'},body:JSON.stringify(a)});assert.equal(r.status,403);
  r=await fetch(base+'/__art-studio/project',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(a)});assert.equal(r.status,403);
  r=await fetch(base+'/__art-studio/project',{method:'POST',headers,body:'{broken'});assert.equal(r.status,400);
  r=await fetch(base+'/__art-studio/project',{method:'POST',headers,body:'{}'});assert.equal(r.status,422);
  const b={...E.empty(),updatedAt:200};r=await fetch(base+'/__art-studio/project',{method:'POST',headers,body:JSON.stringify(b)});assert.equal(r.status,200);
  const backup=JSON.parse(await fs.readFile(path.join(folder,'assets','character-art','studio-project.backup.json')));assert.equal(backup.updatedAt,100);
  assert.deepEqual(backup.characters.guardian.layers.weapon.poseWindow,[1276.8,1377.6,1420.8,1421]);
  assert.equal(backup.characters.guardian.groups[0].rotation,-60);
  assert.equal(JSON.parse(await (await fetch(base+'/assets/character-art/studio-project.json')).text()).updatedAt,200);
  const shipped={window:{}};vm.runInNewContext(await (await fetch(base+'/assets/character-art-defaults.js')).text(),shipped);
  assert.equal(shipped.window.ParryArtDefaults.updatedAt,200);assert.deepEqual(JSON.parse(JSON.stringify(shipped.window.ParryArtDefaults)),E.normalize(b));
  assert.equal((await fetch(base+'/.git/config')).status,403);assert.equal((await fetch(base+'/anything',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.isAbsolute(folder)&&folder.startsWith(path.join(os.tmpdir(),'parry-studio-')));await fs.rm(folder,{recursive:true,force:true});}
});
