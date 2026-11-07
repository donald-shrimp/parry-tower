'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const M=require('../assets/copy-editor-model'),{createPreviewServer}=require('../scripts/serve-local');

test('copy drafts keep hidden text, round-trip all B items and reject malformed imports',()=>{
 const project=M.defaults();project.entries.B01.lower={text:'好きな文言 {value}',visible:false};
 const imported=M.normalize(JSON.parse(JSON.stringify(project)));
 assert.equal(imported.entries.B01.lower.text,'好きな文言 {value}');assert.equal(imported.entries.B01.lower.visible,false);
 assert.equal(M.defaults().entries.B01.lower.visible,true);
 assert.deepEqual(M.entries.map(entry=>entry.id.split('-')[0]).filter((id,index,ids)=>ids.indexOf(id)===index),
  Array.from({length:12},(_,i)=>'B'+String(i+1).padStart(2,'0')));
 assert.equal(M.format('塔貨+{value}',{value:35}),'塔貨+35');
 assert.throws(()=>M.normalize({schema:'wrong',version:1,entries:{}}));
 imported.entries.B01.lower.visible='false';assert.throws(()=>M.normalize(imported));
});

test('local copy save writes only the draft, retains backup and rejects foreign/invalid requests',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'parry-copy-')),server=createPreviewServer(folder);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,url=base+'/__copy-editor/project';
 const headers={'Content-Type':'application/json','Origin':base,'X-Parry-Copy-Editor':'1'};
 try{
  assert.equal((await(await fetch(url)).json()).project,null);
  const project=M.defaults();project.entries.B08.lower.visible=false;
  let response=await fetch(url,{method:'POST',headers,body:JSON.stringify(project)});assert.equal(response.status,200);
  const file=path.join(folder,'.local-only','copy-editor','project.json');
  assert.equal(JSON.parse(await fs.readFile(file)).entries.B08.lower.visible,false);
  project.entries.B08.upper.text='HPを捧げる';
  response=await fetch(url,{method:'POST',headers,body:JSON.stringify(project)});assert.equal(response.status,200);
  const backup=JSON.parse(await fs.readFile(path.join(path.dirname(file),'project.backup.json')));
  assert.notEqual(backup.entries.B08.upper.text,'HPを捧げる');
  assert.equal((await(await fetch(url)).json()).project.entries.B08.upper.text,'HPを捧げる');
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,Origin:'https://example.org'},body:JSON.stringify(project)})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers,body:'{bad'})).status,400);
  assert.equal((await fetch(url,{method:'POST',headers,body:'{}'})).status,422);
  assert.deepEqual(await fs.readdir(folder),['.local-only']);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'parry-copy-'));
  await fs.rm(folder,{recursive:true,force:true});
 }
});
