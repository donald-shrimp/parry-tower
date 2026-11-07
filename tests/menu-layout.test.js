'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const M=require('../assets/menu-layout'),{render}=require('../scripts/adopt-menu-layout'),{createPreviewServer}=require('../scripts/serve-local');

test('layout drafts preserve every action, validate dimensions and round-trip the adopted settings',()=>{
 const project=M.defaults();project.screens.title.buttons.reverse();project.screens.death.hidden=['records'];project.screens.pause.desktop.mainSize=24;
 project.screens.title.mobile.secondarySize=14;project.screens.title.desktop.secondarySize=20;
 const normalized=M.normalize(project);assert.deepEqual(normalized,project);
 normalized.screens.title.mobile.gap=20;assert.equal(project.screens.title.mobile.gap,8);
 const legacy=JSON.parse(JSON.stringify(project));delete legacy.screens.title.mobile.secondarySize;delete legacy.screens.title.desktop.secondarySize;delete legacy.screens.title.pixelSecondary;
 const restored=M.normalize(legacy);assert.equal(restored.screens.title.mobile.secondarySize,12);assert.equal(restored.screens.title.desktop.secondarySize,12);
 assert.deepEqual(restored.screens.title.buttons,project.screens.title.buttons);assert.equal(restored.screens.pause.desktop.mainSize,24);
 assert.equal(restored.screens.title.pixelSecondary,true);project.screens.pause.pixelSecondary=false;
 assert.equal(M.primary('title',project.screens.title,false),'startBtn');assert.equal(M.primary('title',project.screens.title,true),'continueBtn');
 project.screens.title.main='practiceBtn';assert.equal(M.primary('title',project.screens.title,true),'practiceBtn');
 const context={module:{exports:{}}};vm.runInNewContext(render(project),context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.module.exports)),project);
 for(const mutate of [p=>p.screens.title.buttons.pop(),p=>p.screens.title.buttons[1]=p.screens.title.buttons[0],
  p=>p.screens.pause.hidden.push('actions'),p=>p.screens.title.mobile.mainSize=200,p=>p.screens.title.desktop.columns=1.5,
  p=>p.screens.title.main='newRunConfirm',p=>p.screens.title.pixelMain='true',p=>p.screens.constructor={},p=>p.screens.title.mobile.toString=1,
  p=>p.screens.title.mobile.secondarySize=9,p=>p.screens.title.desktop.secondarySize=25,p=>p.screens.title.mobile.secondarySize='14',p=>p.screens.title.pixelSecondary='true']){
  const invalid=M.defaults();mutate(invalid);assert.throws(()=>M.normalize(invalid));
 }
 assert.throws(()=>M.normalize({schema:'wrong',version:1,screens:{}}));
});

test('layout saves retain a backup and never overwrite copy drafts or accept invalid writes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'parry-layout-')),server=createPreviewServer(root);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,url=base+'/__layout-editor/project';
 const headers={'Content-Type':'application/json','Origin':base,'X-Parry-Layout-Editor':'1'};
 const copyFolder=path.join(root,'.local-only','copy-editor');await fs.mkdir(copyFolder,{recursive:true});await fs.writeFile(path.join(copyFolder,'project.json'),'user copy draft');
 try{
  assert.equal((await(await fetch(url)).json()).project,null);
  const project=M.defaults();project.screens.title.mobile.columns=1;project.screens.title.mobile.secondarySize=14;project.screens.title.desktop.secondarySize=20;
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(project)})).status,200);
  project.screens.title.mobile.columns=3;
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(project)})).status,200);
  const folder=path.join(root,'.local-only','layout-editor'),saved=await fs.readFile(path.join(folder,'project.json'),'utf8');
  assert.equal(JSON.parse(await fs.readFile(path.join(folder,'project.backup.json'),'utf8')).screens.title.mobile.columns,1);
  assert.equal((await(await fetch(url)).json()).project.screens.title.mobile.columns,3);
  const loaded=(await(await fetch(url)).json()).project;assert.equal(loaded.screens.title.mobile.secondarySize,14);assert.equal(loaded.screens.title.desktop.secondarySize,20);
  for(const [options,code]of [
   [{headers:{...headers,Origin:'https://example.org'},body:JSON.stringify(project)},403],
   [{headers:{...headers,'X-Parry-Layout-Editor':'0'},body:JSON.stringify(project)},403],
   [{headers:{...headers,'Content-Type':'text/plain'},body:JSON.stringify(project)},415],
   [{headers,body:'{invalid'},400],[{headers,body:'{}'},422],[{headers,body:' '.repeat(200001)},413]
  ])assert.equal((await fetch(url,{method:'POST',...options})).status,code);
  assert.equal(await fs.readFile(path.join(folder,'project.json'),'utf8'),saved);
  assert.equal(await fs.readFile(path.join(copyFolder,'project.json'),'utf8'),'user copy draft');
 }finally{
  await new Promise(resolve=>server.close(resolve));
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'parry-layout-'));
  await fs.rm(root,{recursive:true,force:true});
 }
});
